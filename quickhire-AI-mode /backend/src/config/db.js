import { MongoClient } from 'mongodb';
import { env } from './env.js';
import { logger } from './logger.js';
import { buildCountrySeedDocuments } from './country.config.js';

let client;
let db;

export async function connectDb() {
  if (db) return db;
  client = new MongoClient(env.MONGO_URI, {
    retryWrites: true,
    maxPoolSize: 50,
    minPoolSize: 5,
    maxIdleTimeMS: 60_000,
    waitQueueTimeoutMS: 5_000,
    serverSelectionTimeoutMS: 10_000,  // 10s for both dev & prod — 2s was too tight
    heartbeatFrequencyMS: 10_000,
    socketTimeoutMS: 45_000,
    connectTimeoutMS: 10_000,
    compressors: ['zlib'],
  });
  try {
    await client.connect();
    db = client.db(env.MONGO_DB);
    logger.info({ db: env.MONGO_DB }, 'mongo connected');
  } catch (e) {
    logger.warn({ err: e.message }, '⚠️  MongoDB unavailable — auth will use in-memory fallback (dev mode)');
    return null;
  }

  // Monitor connection pool events for Prometheus (optional — only in dev/staging)
  if (env.NODE_ENV !== 'production') {
    client.on('connectionPoolCreated', () => logger.debug('mongo pool created'));
    client.on('connectionCreated', () => logger.debug('mongo connection created'));
    client.on('connectionClosed', () => logger.debug('mongo connection closed'));
  }

  await ensureIndexes(db);
  await seedCountries(db);  // upsert canonical country configs on every boot
  return db;
}

export function getDb() {
  if (!db) throw new Error('DB not connected');
  return db;
}

export async function closeDb() {
  if (client) await client.close();
}

/**
 * Upsert canonical COUNTRY_CONFIG into the `countries` collection on every boot.
 * Safe to run repeatedly — uses replaceOne with upsert; never deletes existing records.
 * DB records win at runtime (geo middleware merges DB on top of canonical config).
 */
async function seedCountries(db) {
  try {
    const col = db.collection('countries');
    const docs = buildCountrySeedDocuments();
    const ops = docs.map((doc) => ({
      replaceOne: { filter: { code: doc.code }, replacement: doc, upsert: true },
    }));
    const result = await col.bulkWrite(ops, { ordered: false });
    logger.info(
      { upserted: result.upsertedCount, modified: result.modifiedCount },
      'countries collection synced with COUNTRY_CONFIG',
    );
  } catch (err) {
    // Non-fatal: geo middleware falls back to in-memory COUNTRY_CONFIG
    logger.warn({ err: err.message }, 'countries seed failed — geo will use in-memory defaults');
  }
}

async function ensureIndexes(db) {
  await Promise.all([
    db.collection('users').createIndex({ mobile: 1 }, { unique: true, sparse: true }),
    db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true }),
    db.collection('users').createIndex({ role: 1, 'meta.status': 1 }),

    db.collection('sessions').createIndex({ userId: 1, revoked: 1 }),
    db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),

    db.collection('services').createIndex({ slug: 1 }, { unique: true, sparse: true }),
    db.collection('services').createIndex({ category: 1, active: 1 }),

    db.collection('bookings').createIndex({ userId: 1, status: 1, createdAt: -1 }),
    db.collection('bookings').createIndex({ pmId: 1, status: 1 }),
    db.collection('bookings').createIndex({ status: 1, createdAt: -1 }),
    db.collection('bookings').createIndex({ serviceId: 1, startTime: 1 }),

    db.collection('booking_histories').createIndex({ bookingId: 1, at: -1 }),

    db.collection('jobs').createIndex({ bookingId: 1 }),
    db.collection('jobs').createIndex({ resourceId: 1, status: 1 }),
    // Missing indexes identified in audit — prevent full-collection scans
    db.collection('jobs').createIndex({ status: 1 }),
    db.collection('jobs').createIndex({ userId: 1, createdAt: -1 }),
    db.collection('jobs').createIndex({ 'schedule.endTime': 1, status: 1 }), // lifecycle tick
    db.collection('notifications').createIndex({ userId: 1, read: 1, createdAt: -1 }),
    db.collection('messages').createIndex({ senderId: 1, createdAt: -1 }),

    db.collection('payments').createIndex({ orderId: 1 }, { unique: true }),
    db.collection('payments').createIndex({ paymentId: 1 }, { unique: true, sparse: true }),
    db.collection('payments').createIndex({ userId: 1, createdAt: -1 }),

    db.collection('notifications').createIndex({ userId: 1, createdAt: -1 }),
    db.collection('notifications').createIndex({ userId: 1, read: 1 }),

    db.collection('tickets').createIndex({ userId: 1, createdAt: -1 }),
    db.collection('ticket_messages').createIndex({ ticketId: 1, createdAt: 1 }),

    // Phase 5: Growth & Trust
    db.collection('jobs').createIndex({ userId: 1, status: 1, createdAt: -1 }),  // customer cancel/reschedule
    db.collection('jobs').createIndex({ pmId: 1, status: 1, createdAt: -1 }),   // PM scorecard
    db.collection('jobs').createIndex({ 'pricing.total': 1, createdAt: -1 }),   // analytics revenue
    db.collection('reviews').createIndex({ bookingId: 1, fromId: 1 }, { unique: true }),
    db.collection('reviews').createIndex({ toId: 1, moderationStatus: 1, createdAt: -1 }),
    db.collection('tips').createIndex({ bookingId: 1, fromId: 1 }, { unique: true }),
    db.collection('chatbot_logs').createIndex({ userId: 1, createdAt: -1 }),
    db.collection('reschedule_history').createIndex({ bookingId: 1, createdAt: -1 }),

    // Phase 5: Analytics — compound indexes for aggregation pipelines
    db.collection('jobs').createIndex({ status: 1, 'pricing.total': 1, createdAt: -1 }),
    db.collection('payments').createIndex({ status: 1, createdAt: -1 }),

    // Phase 3: Promo
    db.collection('promo_redemptions').createIndex({ code: 1, userId: 1 }),
    db.collection('promo_redemptions').createIndex({ userId: 1, createdAt: -1 }),

    // Phase 6: Search — text index for MongoDB fallback (when Meilisearch is down)
    db.collection('cms_articles').createIndex(
      { title: 'text', content: 'text', tags: 'text' },
      { weights: { title: 10, tags: 5, content: 1 }, name: 'articles_text' },
    ),

    // ── Multi-country indexes (Phase 7 — Global Platform) ──────────────
    // Users: country-scoped queries and analytics
    db.collection('users').createIndex({ country: 1, role: 1, createdAt: -1 }),
    db.collection('users').createIndex({ country: 1, 'meta.status': 1 }),

    // Services: country-scoped catalogue browsing
    db.collection('services').createIndex({ country: 1, active: 1, category: 1 }),
    db.collection('services').createIndex({ country: 1, active: 1, createdAt: -1 }),

    // Bookings: country-scoped analytics and ops queries
    db.collection('bookings').createIndex({ country: 1, status: 1, createdAt: -1 }),

    // Payments: booking lookup + country analytics + webhook dedup
    db.collection('payments').createIndex({ bookingId: 1 }),
    db.collection('payments').createIndex({ country: 1, status: 1, createdAt: -1 }),
    db.collection('payments').createIndex({ 'rawWebhookEvents.id': 1 }, { sparse: true }),

    // Countries collection: config lookups
    db.collection('countries').createIndex({ code: 1 }, { unique: true }),
    db.collection('countries').createIndex({ active: 1 }),

    // Legal document system
    db.collection('legal_documents').createIndex({ countryCode: 1, docType: 1, status: 1 }),
    db.collection('legal_documents').createIndex({ countryCode: 1, docType: 1, version: 1 }, { unique: true }),
    db.collection('legal_documents').createIndex({ status: 1, publishedAt: -1 }),
    db.collection('legal_acceptances').createIndex({ userId: 1, docType: 1, version: 1, countryCode: 1 }),
    db.collection('legal_acceptances').createIndex({ userId: 1, acceptedAt: -1 }),

    // Promo: country-scoped code lookups + fraud guard
    db.collection('promo_codes').createIndex({ code: 1 }, { unique: true }),
    db.collection('promo_codes').createIndex({ active: 1, validFrom: 1, validTo: 1 }),
    db.collection('promo_codes').createIndex({ 'scope.country': 1, active: 1 }),
    db.collection('promo_redemptions').createIndex({ codeId: 1, userId: 1 }),  // per-user limit check

    // Refunds (created by analytics.handler)
    db.collection('refunds').createIndex({ bookingId: 1 }, { unique: true, sparse: true }),
    db.collection('refunds').createIndex({ paymentId: 1 }),
    db.collection('refunds').createIndex({ status: 1, createdAt: -1 }),
    db.collection('refunds').createIndex({ country: 1, status: 1, createdAt: -1 }),

    // FX rates (refreshed by analytics queue)
    db.collection('fx_rates').createIndex({ _id: 1 }),
  ]);
}
