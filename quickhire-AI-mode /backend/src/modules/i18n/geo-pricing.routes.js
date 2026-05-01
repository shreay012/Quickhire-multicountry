/**
 * Geo-Pricing API  (Phase 4)
 *
 * Per-country service pricing with surge rules.
 * Collection: geo_pricing { serviceId, country, basePrice, currency, surgeRules[] }
 *
 * Also exposes the payment gateway options and tax computation for checkout.
 */
import { Router } from 'express';
import { z } from 'zod';
import { adminGuard, permGuard } from '../../middleware/role.middleware.js';
import { auditAdmin } from '../../middleware/audit.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getDb } from '../../config/db.js';
import { ObjectId } from 'mongodb';
import { AppError } from '../../utils/AppError.js';
import { toObjectId } from '../../utils/oid.js';
import { PERMS } from '../../config/rbac.js';
import { getGatewayOptions, buildInvoiceBreakdown } from './gateway-router.js';

const r = Router();
const geoPricingCol = () => getDb().collection('geo_pricing');

/* ─── Public: get price for a service in caller's country ──── */
r.get('/price/:serviceId', asyncHandler(async (req, res) => {
  const country = req.geo?.country || req.query.country || 'IN';
  const serviceId = toObjectId(req.params.serviceId);

  // Try country-specific pricing first
  const geo = await geoPricingCol().findOne({ serviceId, country });
  if (geo) {
    return res.json({ success: true, data: { country, currency: geo.currency, basePrice: geo.basePrice, source: 'geo_override' } });
  }

  // Fallback to service's default price
  const svc = await getDb().collection('services').findOne({ _id: serviceId }, { projection: { hourlyRate: 1, pricing: 1 } });
  if (!svc) throw new AppError('RESOURCE_NOT_FOUND', 'Service not found', 404);

  const basePrice = svc.hourlyRate || svc.pricing?.hourly || 0;
  res.json({ success: true, data: { country, currency: req.geo?.currency || 'INR', basePrice, source: 'default' } });
}));

/* ─── Public: checkout pricing breakdown ─────────────────────── */
r.post('/checkout-preview', validate(z.object({
  subtotal: z.number().positive(),
  discount: z.number().min(0).default(0),
})), asyncHandler(async (req, res) => {
  const country = req.geo?.country || 'IN';
  const currency = req.geo?.currency || 'INR';

  // buildInvoiceBreakdown uses `code` (not `country`) for the country param
  const breakdown = buildInvoiceBreakdown({ subtotal: req.body.subtotal, discount: req.body.discount, code: country, currency });
  const gateways = getGatewayOptions(country, breakdown.total);

  res.json({ success: true, data: { breakdown, gateways, country, currency } });
}));

/* ─── Admin: CRUD geo pricing ────────────────────────────────── */
const geoPricingSchema = z.object({
  serviceId: z.string().regex(/^[0-9a-f]{24}$/),
  country: z.string().length(2).toUpperCase(),
  basePrice: z.number().positive(),
  currency: z.string().length(3).toUpperCase(),
  surgeRules: z.array(z.object({
    condition: z.string(), // e.g. 'weekend', 'holiday', 'peak_hour'
    multiplier: z.number().positive(),
  })).optional().default([]),
});

r.get('/admin', adminGuard, permGuard(PERMS.SERVICE_READ), asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.country) filter.country = req.query.country.toUpperCase();
  if (req.query.serviceId) filter.serviceId = toObjectId(req.query.serviceId);
  const items = await geoPricingCol().find(filter).sort({ country: 1 }).toArray();
  res.json({ success: true, data: items });
}));

r.post('/admin', adminGuard, permGuard(PERMS.SERVICE_WRITE), auditAdmin, validate(geoPricingSchema), asyncHandler(async (req, res) => {
  const serviceId = toObjectId(req.body.serviceId, 'serviceId');
  const country = req.body.country.toUpperCase();
  const now = new Date();
  await geoPricingCol().updateOne(
    { serviceId, country },
    { $set: { ...req.body, serviceId, country, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
  const doc = await geoPricingCol().findOne({ serviceId, country });
  res.json({ success: true, data: doc });
}));

r.delete('/admin/:id', adminGuard, permGuard(PERMS.SERVICE_WRITE), auditAdmin, asyncHandler(async (req, res) => {
  await geoPricingCol().deleteOne({ _id: toObjectId(req.params.id) });
  res.json({ success: true });
}));

export default r;
