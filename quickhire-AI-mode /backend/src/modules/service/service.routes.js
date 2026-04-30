import { Router } from 'express';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { roleGuard } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { getDb } from '../../config/db.js';
import { redis, publish } from '../../config/redis.js';
import { AppError } from '../../utils/AppError.js';
import { toObjectId } from '../../utils/oid.js';
import { getCacheValue, setCacheValue, deleteCacheValue } from '../../utils/cache.js';
import { CACHE_KEYS, CACHE_TTL } from '../../utils/cache.keys.js';
import {
  ServiceUpsertSchema,
  COUNTRIES,
  LOCALE_TO_COUNTRY,
  getPricingForCountry,
  listSupportedCountries,
} from './service.model.js';
import { computeQuote } from './pricing.service.js';

const r = Router();
const col = () => getDb().collection('services');

const CACHE_ALL = CACHE_KEYS.SERVICES_LIST;
const CACHE_ONE = CACHE_KEYS.SERVICES_DETAIL;
const TTL = CACHE_TTL.SHORT;

// Resolve client country: explicit query param wins, then header (set by
// Cloudflare or geo middleware), then locale fallback, then IN.
function resolveCountry(req) {
  const fromQuery = String(req.query.country || '').toUpperCase();
  if (COUNTRIES.includes(fromQuery)) return fromQuery;
  const fromHeader = String(req.headers['cf-ipcountry'] || req.headers['x-country'] || '').toUpperCase();
  if (COUNTRIES.includes(fromHeader)) return fromHeader;
  const locale = String(req.cookies?.qh_locale || req.headers['accept-language'] || '').split(',')[0].split('-')[0];
  if (LOCALE_TO_COUNTRY[locale]) return LOCALE_TO_COUNTRY[locale];
  return 'IN';
}

// Strip pricing[] entries that don't apply to the resolved country, while
// keeping the legacy flat fields untouched. Also flatten an i18n name/desc
// down to the request's locale so the wire stays small.
function projectForCountry(service, country, locale = 'en') {
  if (!service) return service;
  const out = { ...service };

  // Localize i18n strings to a flat string for older clients
  for (const f of ['name', 'description']) {
    const v = out[f];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[`${f}I18n`] = v;
      out[f] = v[locale] || v.en || Object.values(v)[0];
    }
  }

  if (Array.isArray(out.pricing)) {
    const match = getPricingForCountry(out, country);
    out.activePricing = match || null;
    out.supportedCountries = listSupportedCountries(out);
  }
  return out;
}

r.get('/', asyncHandler(async (req, res) => {
  const country = resolveCountry(req);
  const locale = String(req.cookies?.qh_locale || 'en');
  const cacheKey = `${CACHE_ALL}:${country}:${locale}`;

  const cached = await getCacheValue(cacheKey);
  if (cached) return res.json({ success: true, data: cached, country, cached: true });

  const items = await col().find({ active: { $ne: false } }).toArray();
  const projected = items.map((s) => projectForCountry(s, country, locale));
  await setCacheValue(cacheKey, projected, TTL);
  res.json({ success: true, data: projected, country });
}));

r.get('/:id', asyncHandler(async (req, res) => {
  const raw = req.params.id;
  const country = resolveCountry(req);
  const locale = String(req.cookies?.qh_locale || 'en');
  const cacheKey = `${CACHE_ONE(raw)}:${country}:${locale}`;

  const cached = await getCacheValue(cacheKey);
  if (cached) return res.json({ success: true, data: cached, country, cached: true });

  // Accept Mongo ObjectId, slug, or slugified name (e.g. "React-Developer").
  let svc = null;
  if (/^[0-9a-fA-F]{24}$/.test(raw)) {
    svc = await col().findOne({ _id: new ObjectId(raw) });
  }
  if (!svc) {
    const variants = Array.from(new Set([
      raw,
      raw.toLowerCase(),
      raw.replace(/-/g, ' '),
      raw.replace(/-/g, ' ').toLowerCase(),
    ]));
    svc = await col().findOne({
      $or: [
        { slug: { $in: variants } },
        { name: { $in: variants } },
        { name: { $regex: `^${raw.replace(/-/g, '[ -]')}$`, $options: 'i' } },
      ],
    });
  }
  if (!svc) throw new AppError('RESOURCE_NOT_FOUND', 'Service not found', 404);

  const projected = projectForCountry(svc, country, locale);
  await setCacheValue(cacheKey, projected, TTL);
  res.json({ success: true, data: projected, country });
}));

// Compute a country-specific quote. Useful for the booking stepper after
// the customer picks duration / start time.
const quoteSchema = z.object({
  country: z.string().length(2).optional(),
  durationMinutes: z.coerce.number().int().positive(),
  when: z.string().datetime().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  city: z.string().optional(),
});

r.get('/:id/quote', validate(quoteSchema, 'query'), asyncHandler(async (req, res) => {
  const raw = req.params.id;
  const country = String(req.query.country || resolveCountry(req)).toUpperCase();
  if (!COUNTRIES.includes(country)) {
    throw new AppError('VALIDATION_ERROR', `Unsupported country: ${country}`, 400);
  }

  let svc = null;
  if (/^[0-9a-fA-F]{24}$/.test(raw)) svc = await col().findOne({ _id: new ObjectId(raw) });
  if (!svc) svc = await col().findOne({ slug: raw.toLowerCase() });
  if (!svc) throw new AppError('RESOURCE_NOT_FOUND', 'Service not found', 404);

  const quote = await computeQuote({
    service: svc,
    countryCode: country,
    durationMinutes: Number(req.query.durationMinutes),
    when: req.query.when ? new Date(req.query.when) : new Date(),
    address: {
      state: req.query.state,
      zip: req.query.zip,
      city: req.query.city,
    },
  });

  res.json({ success: true, data: quote });
}));

r.post('/', roleGuard(['admin']), validate(ServiceUpsertSchema), asyncHandler(async (req, res) => {
  const r2 = await col().insertOne({ ...req.body, createdAt: new Date(), updatedAt: new Date() });
  await invalidateCache();
  res.status(201).json({ success: true, data: { _id: r2.insertedId, ...req.body } });
}));

r.put('/:id', roleGuard(['admin']), validate(ServiceUpsertSchema.partial()), asyncHandler(async (req, res) => {
  const id = toObjectId(req.params.id);
  const r2 = await col().findOneAndUpdate(
    { _id: id },
    { $set: { ...req.body, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
  await invalidateCache(req.params.id);
  res.json({ success: true, data: r2.value || r2 });
}));

r.delete('/:id', roleGuard(['admin']), asyncHandler(async (req, res) => {
  const id = toObjectId(req.params.id);
  await col().updateOne({ _id: id }, { $set: { active: false, updatedAt: new Date() } });
  await invalidateCache(req.params.id);
  res.json({ success: true });
}));

async function invalidateCache(id) {
  // Country-projected cache keys live under the same namespace prefix, so
  // just publish + clear the legacy keys; per-country reads will repopulate.
  const keysToDelete = [CACHE_ALL];
  if (id) keysToDelete.push(CACHE_ONE(id));
  await deleteCacheValue(keysToDelete);
  await publish('services.invalidated', { id });
}

export default r;
