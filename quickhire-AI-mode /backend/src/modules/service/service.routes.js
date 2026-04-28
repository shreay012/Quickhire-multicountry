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

const r = Router();
const col = () => getDb().collection('services');

// Maintain old cache keys for backward compatibility during migration
const CACHE_ALL = CACHE_KEYS.SERVICES_LIST;
const CACHE_ONE = CACHE_KEYS.SERVICES_DETAIL;
const TTL = CACHE_TTL.SHORT;

r.get('/', asyncHandler(async (_req, res) => {
  const cached = await getCacheValue(CACHE_ALL);
  if (cached) return res.json({ success: true, data: cached, cached: true });
  const items = await col().find({ active: { $ne: false } }).toArray();
  await setCacheValue(CACHE_ALL, items, TTL);
  res.json({ success: true, data: items });
}));

r.get('/:id', asyncHandler(async (req, res) => {
  const raw = req.params.id;
  const cached = await getCacheValue(CACHE_ONE(raw));
  if (cached) return res.json({ success: true, data: cached, cached: true });

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
  await setCacheValue(CACHE_ONE(raw), svc, TTL);
  res.json({ success: true, data: svc });
}));

// Admin-only writes
const upsertSchema = z.object({
  slug: z.string().min(2),
  title: z.string().min(2),
  category: z.string().min(2),
  description: z.string().optional(),
  icon: z.string().url().optional(),
  pricing: z.object({
    hourly: z.number().nonnegative(),
    currency: z.string().default('INR'),
    tiers: z.array(z.object({
      duration: z.number(),
      pricePerHour: z.number(),
    })).optional(),
  }),
  technologies: z.array(z.string()).optional(),
  active: z.boolean().default(true),
});

r.post('/', roleGuard(['admin']), validate(upsertSchema), asyncHandler(async (req, res) => {
  const r2 = await col().insertOne({ ...req.body, createdAt: new Date(), updatedAt: new Date() });
  await invalidateCache();
  res.status(201).json({ success: true, data: { _id: r2.insertedId, ...req.body } });
}));

r.put('/:id', roleGuard(['admin']), validate(upsertSchema.partial()), asyncHandler(async (req, res) => {
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
  const keysToDelete = [CACHE_ALL];
  if (id) keysToDelete.push(CACHE_ONE(id));
  await deleteCacheValue(keysToDelete);
  await publish('services.invalidated', { id });
}

export default r;
