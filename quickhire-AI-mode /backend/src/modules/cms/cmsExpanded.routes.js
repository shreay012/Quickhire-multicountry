/**
 * CMS Expansion  (Phase 3)
 *
 * Adds:
 *  - Pages (slug-based, country-aware, versioned, SEO meta)
 *  - Banners (A/B variants, country-aware, scheduled, segment)
 *  - Notification templates (per event/channel/lang/country)
 *  - Blog / help-center articles (basic)
 *
 * All admin writes require growth or above role.
 */
import { Router } from 'express';
import { z } from 'zod';
import { adminGuard, permGuard } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getDb } from '../../config/db.js';
import { ObjectId } from 'mongodb';
import { AppError } from '../../utils/AppError.js';
import { toObjectId } from '../../utils/oid.js';
import { paginate, buildMeta } from '../../utils/pagination.js';
import { PERMS } from '../../config/rbac.js';
import { redis } from '../../config/redis.js';

const r = Router();

const pagesCol = () => getDb().collection('cms_pages');
const bannersCol = () => getDb().collection('cms_banners');
const templatesCol = () => getDb().collection('notification_templates');
const articlesCol = () => getDb().collection('cms_articles');

/* ═══════════════════════════════════════════════════════════════
   PAGES
═══════════════════════════════════════════════════════════════ */

const pageSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-/]+$/),
  title: z.string().min(1).max(200),
  blocks: z.array(z.any()).default([]),
  seo: z.object({
    metaTitle: z.string().max(70).optional(),
    metaDescription: z.string().max(160).optional(),
    keywords: z.array(z.string()).optional().default([]),
  }).optional().default({}),
  country: z.string().optional(),
  lang: z.string().default('en'),
  status: z.enum(['draft', 'published']).default('draft'),
});

// Public: GET /api/cms-x/pages/:slug?lang=en&country=IN
r.get('/pages/:slug', asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const country = req.query.country;
  const lang = req.query.lang || 'en';

  const cacheKey = `cms:page:${slug}:${lang}:${country || 'all'}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return res.json({ success: true, data: JSON.parse(cached) });

  // Try country-specific first, then fallback to generic
  const page = await pagesCol().findOne({
    slug,
    lang,
    status: 'published',
    $or: [{ country }, { country: { $exists: false } }],
  }) || await pagesCol().findOne({ slug, lang: 'en', status: 'published', country: { $exists: false } });

  if (!page) throw new AppError('RESOURCE_NOT_FOUND', 'Page not found', 404);

  await redis.set(cacheKey, JSON.stringify(page), 'EX', 300).catch(() => {});
  res.json({ success: true, data: page });
}));

// Admin: list pages
r.get('/pages', adminGuard, permGuard(PERMS.CMS_READ), asyncHandler(async (req, res) => {
  const p = paginate(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.lang) filter.lang = req.query.lang;
  const [items, total] = await Promise.all([
    pagesCol().find(filter).sort({ updatedAt: -1 }).skip(p.skip).limit(p.limit).toArray(),
    pagesCol().countDocuments(filter),
  ]);
  res.json({ success: true, data: items, meta: buildMeta({ page: p.page, pageSize: p.pageSize, total }) });
}));

// Admin: create page
r.post('/pages', adminGuard, permGuard(PERMS.CMS_WRITE), validate(pageSchema), asyncHandler(async (req, res) => {
  const now = new Date();
  const doc = { ...req.body, version: 1, createdBy: new ObjectId(req.user.id), createdAt: now, updatedAt: now, publishedAt: req.body.status === 'published' ? now : null };
  const ins = await pagesCol().insertOne(doc);
  res.status(201).json({ success: true, data: { _id: ins.insertedId, ...doc } });
}));

// Admin: update page
r.put('/pages/:id', adminGuard, permGuard(PERMS.CMS_WRITE), validate(pageSchema.partial()), asyncHandler(async (req, res) => {
  const id = toObjectId(req.params.id);
  const $set = { ...req.body, updatedAt: new Date() };
  if ($set.status === 'published') $set.publishedAt = new Date();
  delete $set._id;
  await pagesCol().updateOne({ _id: id }, { $set, $inc: { version: 1 } });
  // Invalidate cache for this page
  const page = await pagesCol().findOne({ _id: id });
  if (page) await redis.del(`cms:page:${page.slug}:${page.lang}:${page.country || 'all'}`).catch(() => {});
  res.json({ success: true, data: page });
}));

// Admin: delete page
r.delete('/pages/:id', adminGuard, permGuard(PERMS.CMS_WRITE), asyncHandler(async (req, res) => {
  await pagesCol().deleteOne({ _id: toObjectId(req.params.id) });
  res.json({ success: true });
}));

/* ═══════════════════════════════════════════════════════════════
   BANNERS
═══════════════════════════════════════════════════════════════ */

const bannerSchema = z.object({
  title: z.string().max(200).optional(),
  image: z.string().url(),
  link: z.string().optional(),
  country: z.string().optional(),
  segment: z.array(z.string()).default(['all']),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime(),
  // A/B variant: 'A' or 'B' — serve to 50% of users each
  abVariant: z.enum(['A', 'B', 'all']).default('all'),
  active: z.boolean().default(true),
  position: z.enum(['hero', 'inline', 'popup', 'sidebar']).default('hero'),
});

// Public: GET /api/cms-x/banners?country=IN&position=hero
r.get('/banners', asyncHandler(async (req, res) => {
  const now = new Date();
  const filter = {
    active: true,
    validFrom: { $lte: now },
    validTo: { $gte: now },
  };
  if (req.query.country) filter.$or = [{ country: req.query.country }, { country: { $exists: false } }];
  if (req.query.position) filter.position = req.query.position;

  const items = await bannersCol().find(filter).sort({ createdAt: -1 }).limit(10).toArray();
  res.json({ success: true, data: items });
}));

// Admin: list all
r.get('/banners/all', adminGuard, permGuard(PERMS.CMS_READ), asyncHandler(async (req, res) => {
  const p = paginate(req.query);
  const [items, total] = await Promise.all([
    bannersCol().find({}).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).toArray(),
    bannersCol().countDocuments({}),
  ]);
  res.json({ success: true, data: items, meta: buildMeta({ page: p.page, pageSize: p.pageSize, total }) });
}));

// Admin: create banner
r.post('/banners', adminGuard, permGuard(PERMS.CMS_WRITE), validate(bannerSchema), asyncHandler(async (req, res) => {
  const now = new Date();
  const doc = { ...req.body, validFrom: new Date(req.body.validFrom), validTo: new Date(req.body.validTo), createdBy: new ObjectId(req.user.id), createdAt: now, updatedAt: now };
  const ins = await bannersCol().insertOne(doc);
  res.status(201).json({ success: true, data: { _id: ins.insertedId, ...doc } });
}));

// Admin: update banner
r.put('/banners/:id', adminGuard, permGuard(PERMS.CMS_WRITE), validate(bannerSchema.partial()), asyncHandler(async (req, res) => {
  const id = toObjectId(req.params.id);
  const $set = { ...req.body, updatedAt: new Date() };
  if ($set.validFrom) $set.validFrom = new Date($set.validFrom);
  if ($set.validTo) $set.validTo = new Date($set.validTo);
  delete $set._id;
  await bannersCol().updateOne({ _id: id }, { $set });
  res.json({ success: true });
}));

r.delete('/banners/:id', adminGuard, permGuard(PERMS.CMS_WRITE), asyncHandler(async (req, res) => {
  await bannersCol().deleteOne({ _id: toObjectId(req.params.id) });
  res.json({ success: true });
}));

/* ═══════════════════════════════════════════════════════════════
   NOTIFICATION TEMPLATES
═══════════════════════════════════════════════════════════════ */

const templateSchema = z.object({
  event: z.string().min(1), // e.g. 'booking_created'
  channel: z.enum(['email', 'sms', 'push', 'inapp']),
  lang: z.string().default('en'),
  country: z.string().optional(),
  subject: z.string().max(200).optional(),
  body: z.string().min(1),
  // Handlebars-style vars: {{userName}}, {{bookingId}}
  vars: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

// Public / internal: get template by event+channel+lang
r.get('/notification-templates/:event', asyncHandler(async (req, res) => {
  const { event } = req.params;
  const channel = req.query.channel || 'inapp';
  const lang = req.query.lang || 'en';
  const country = req.query.country;

  const filter = { event, channel, active: true };
  // Try country+lang, then lang, then 'en'
  const template = await templatesCol().findOne({ ...filter, lang, country }) ||
    await templatesCol().findOne({ ...filter, lang }) ||
    await templatesCol().findOne({ ...filter, lang: 'en' });

  if (!template) throw new AppError('RESOURCE_NOT_FOUND', 'Template not found', 404);
  res.json({ success: true, data: template });
}));

r.get('/notification-templates', adminGuard, permGuard(PERMS.CMS_READ), asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.event) filter.event = req.query.event;
  if (req.query.channel) filter.channel = req.query.channel;
  const items = await templatesCol().find(filter).sort({ event: 1, channel: 1, lang: 1 }).limit(200).toArray();
  res.json({ success: true, data: items });
}));

r.post('/notification-templates', adminGuard, permGuard(PERMS.CMS_WRITE), validate(templateSchema), asyncHandler(async (req, res) => {
  const now = new Date();
  const doc = { ...req.body, createdBy: new ObjectId(req.user.id), createdAt: now, updatedAt: now };
  const ins = await templatesCol().insertOne(doc);
  res.status(201).json({ success: true, data: { _id: ins.insertedId, ...doc } });
}));

r.put('/notification-templates/:id', adminGuard, permGuard(PERMS.CMS_WRITE), validate(templateSchema.partial()), asyncHandler(async (req, res) => {
  const id = toObjectId(req.params.id);
  await templatesCol().updateOne({ _id: id }, { $set: { ...req.body, updatedAt: new Date() } });
  res.json({ success: true });
}));

/* ═══════════════════════════════════════════════════════════════
   ARTICLES (blog / help center)
═══════════════════════════════════════════════════════════════ */

const articleSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  category: z.string().default('help'),
  lang: z.string().default('en'),
  country: z.string().optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(['draft', 'published']).default('draft'),
  seo: z.object({
    metaTitle: z.string().max(70).optional(),
    metaDescription: z.string().max(160).optional(),
  }).optional().default({}),
});

r.get('/articles', asyncHandler(async (req, res) => {
  const filter = { status: 'published' };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.lang) filter.lang = req.query.lang;
  const items = await articlesCol().find(filter).sort({ publishedAt: -1 }).limit(50).project({ content: 0 }).toArray();
  res.json({ success: true, data: items });
}));

r.get('/articles/:slug', asyncHandler(async (req, res) => {
  const article = await articlesCol().findOne({ slug: req.params.slug, status: 'published' });
  if (!article) throw new AppError('RESOURCE_NOT_FOUND', 'Article not found', 404);
  res.json({ success: true, data: article });
}));

r.post('/articles', adminGuard, permGuard(PERMS.CMS_WRITE), validate(articleSchema), asyncHandler(async (req, res) => {
  const now = new Date();
  const doc = { ...req.body, publishedAt: req.body.status === 'published' ? now : null, createdBy: new ObjectId(req.user.id), createdAt: now, updatedAt: now };
  const ins = await articlesCol().insertOne(doc);
  res.status(201).json({ success: true, data: { _id: ins.insertedId, ...doc } });
}));

r.put('/articles/:id', adminGuard, permGuard(PERMS.CMS_WRITE), validate(articleSchema.partial()), asyncHandler(async (req, res) => {
  const id = toObjectId(req.params.id);
  const $set = { ...req.body, updatedAt: new Date() };
  if ($set.status === 'published') $set.publishedAt = new Date();
  delete $set._id;
  await articlesCol().updateOne({ _id: id }, { $set });
  res.json({ success: true });
}));

export default r;
