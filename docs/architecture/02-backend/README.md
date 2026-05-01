# Backend Architecture

**Location:** `quickhire-AI-mode /backend/`  
**Entry:** `src/server.js`  
**Runtime:** Node.js 20, ESM modules (`"type": "module"`)

---

## Boot Sequence

```
server.js
  1. initSentry()                   ← MUST be first (catches all subsequent imports)
  2. connectDb()                    ← MongoDB connection
  3. buildApp()                     ← Express app construction
  4. http.createServer(app)
  5. attachSocketIO(server)         ← Socket.io + Redis adapter
  6. app.set('io', getIO())         ← Make io available inside HTTP handlers
  7. initMeilisearch()              ← Non-blocking; degrades to MongoDB fallback
  8. startQueueWorkers()            ← BullMQ queues + workers
  9. setupQueueDashboard(app)       ← Bull-Board UI at /admin/queues
 10. server.listen(env.PORT)        ← Default :4000
```

**Graceful shutdown sequence (SIGTERM / SIGINT):**
1. Stop accepting new HTTP connections (`server.close()`)
2. Emit `server:shutdown` to all Socket.io clients (2s grace window)
3. Close Socket.io
4. Stop BullMQ workers (wait up to 30s for in-flight jobs)
5. Close MongoDB
6. Close Redis
7. `process.exit(0)`

---

## Express Middleware Chain (in order)

```
1.  requestIdMiddleware          → attach req.id (nanoid, for correlation)
2.  pinoHttp                     → structured HTTP access logs
3.  helmet()                     → security headers (CSP, HSTS, etc.)
4.  cors()                       → ALLOWED_ORIGINS env whitelist
──── SPECIAL ────────────────────────────────────────────────────────
    POST /payments/webhook       → express.raw() + paymentWebhookHandler
         (Razorpay needs raw buffer for HMAC verification)
──── NORMAL BODY PARSING ────────────────────────────────────────────
5.  express.json({ limit:'1mb' })
6.  express.urlencoded()
7.  sanitizeMongo                → strips MongoDB operators from body
8.  sanitizeXss                  → strips XSS payloads
9.  geoMiddleware                → req.geo = { country, currency, lang, timezone }
──── HEALTH / METRICS ───────────────────────────────────────────────
    GET /healthz  → { ok: true }
    GET /readyz   → { ok: true }
    GET /metrics  → Prometheus text format
──── PROTECTION ─────────────────────────────────────────────────────
10. metricsMiddleware             → prom-client request counter/duration
11. rateLimit()                  → 120 req/min per IP (env.RATE_LIMIT_PER_MIN)
12. authMiddleware               → JWT verification + Redis blocklist
──── ROUTES ─────────────────────────────────────────────────────────
13. routes (all modules)
──── ERROR HANDLING ─────────────────────────────────────────────────
14. notFoundMiddleware            → 404 for unmatched paths
15. sentryErrorHandler()          → Sentry capture
16. errorMiddleware               → JSON error response formatter
```

---

## Public Paths (auth bypassed)

```
POST /auth/send-otp
POST /auth/verify-otp
POST /auth/guest-access
POST /auth/refresh
POST /miscellaneous/contact-us
POST /payments/webhook
GET  /healthz
GET  /readyz
GET  /metrics
GET  /i18n/geo
GET  /i18n/countries
GET  /i18n/currencies
GET  /chatbot/suggested
POST /chatbot/message
POST /promo/validate

GET  /services/*          (all service listing)
GET  /cms/*               (all CMS content)
GET  /i18n/translations/* (locale messages)
GET  /search/articles     (public article search)
GET  /reviews/user/*
GET  /reviews/booking/*
```

---

## Config Files (`src/config/`)

| File | Purpose |
|---|---|
| `env.js` | Zod schema validation of all env vars. Fails fast on startup if any required var is missing. Also handles JWT PEM key escaping and RS256→HS256 auto-fallback for dev. |
| `db.js` | MongoDB connection. Exports `getDb()` — lazy accessor used across all modules. |
| `redis.js` | ioredis connection. Exports `redis`, `pubClient`, `subClient` (separate for pub/sub). |
| `rbac.js` | ROLES enum + ADMIN_ROLES set + PERMS permission groups. Single source of truth for all role checks. |
| `aws.js` | AWS SDK clients: `s3`, `ses`, `sns`, `sqs`. Uses default credential chain (env vars / IAM role). |
| `meilisearch.js` | Meilisearch client. `isMeiliReady()` flag prevents failures when unavailable. |
| `logger.js` | pino logger. Structured JSON in production, pretty-print in dev. |
| `metrics.js` | prom-client registry. Exports `connectedSockets` gauge + HTTP request histogram. |
| `sentry.js` | Sentry init + `setSentryUser()` + `sentryErrorHandler()`. Initialized before any other import in server.js. |

---

## Utility Files (`src/utils/`)

| File | Exports | Purpose |
|---|---|---|
| `AppError.js` | `AppError(code, message, status)` | Typed error class for consistent API error shape |
| `asyncHandler.js` | `asyncHandler(fn)` | Express async wrapper — bubbles errors to `next()` |
| `idempotency.js` | `idempotencyGetOrSet`, `acquireLock`, `releaseLock` | Redis-based idempotency keys + distributed locks |
| `oid.js` | `toObjectId(id, field)` | Safe ObjectId coercion with descriptive 400 error |
| `pagination.js` | `paginate(query)`, `buildMeta(...)` | Consistent pagination helpers |
| `cache.js` | `cacheGet`, `cacheSet`, `cacheDel` | Redis cache wrappers with TTL |
| `cache.keys.js` | `CACHE_KEYS` constants | Namespaced Redis key conventions |

---

## Source Directory Structure

```
src/
├── server.js          ← Entry point
├── app.js             ← Express app builder
├── routes.js          ← Central route mounting (35 prefixes)
├── config/            ← All external connections + RBAC
│   ├── env.js         ← Zod env validation
│   ├── db.js          ← MongoDB
│   ├── redis.js       ← Redis
│   ├── rbac.js        ← Roles + permissions
│   ├── aws.js         ← S3 / SES / SNS / SQS
│   ├── meilisearch.js ← Search client
│   ├── logger.js      ← Pino
│   ├── metrics.js     ← Prometheus
│   └── sentry.js      ← Error tracking
├── middleware/
│   ├── auth.middleware.js      ← JWT verify + blocklist
│   ├── role.middleware.js      ← roleGuard / permGuard / adminGuard
│   ├── audit.middleware.js     ← Admin action audit log
│   ├── cache.middleware.js     ← HTTP response caching
│   ├── error.middleware.js     ← Global error handler
│   ├── rateLimit.middleware.js ← Per-IP rate limiter
│   ├── requestId.middleware.js ← Request correlation ID
│   ├── sanitize.middleware.js  ← MongoDB injection + XSS
│   └── validate.middleware.js  ← Zod schema validation
├── modules/           ← 27 feature modules (see modules.md)
├── socket/
│   └── index.js       ← Socket.io server + Redis adapter + JWT auth
├── queue/
│   ├── index.js       ← BullMQ queue manager
│   ├── setup.js       ← Queue initialization + worker registration
│   ├── notification.handler.js  ← Notification job handler
│   ├── lifecycle.handler.js     ← Booking lifecycle tick
│   └── dashboard.js   ← Bull-Board monitoring UI
├── workers/           ← Standalone worker scripts (legacy + SQS-backed)
│   ├── email.worker.js
│   ├── invoice.worker.js
│   ├── lifecycle.worker.js
│   └── notification.worker.js
└── utils/             ← Shared helpers
```

---

## Error Response Shape

All errors follow:
```json
{
  "success": false,
  "error": {
    "code": "AUTH_TOKEN_MISSING",
    "message": "Missing auth token",
    "requestId": "abc123"
  }
}
```

Error codes are uppercase snake case. Common codes:
- `AUTH_TOKEN_MISSING` / `AUTH_TOKEN_INVALID` / `AUTH_TOKEN_REVOKED` (401)
- `AUTH_FORBIDDEN` (403)
- `RESOURCE_NOT_FOUND` (404)
- `RESOURCE_CONFLICT` (409)
- `VALIDATION_ERROR` (422)
- `RATE_LIMITED` (429)
- `INVALID_TRANSITION` (409) — booking state machine violation
- `BOOKING_SLOT_TAKEN` (409) — slot race condition
- `PAYMENT_VERIFICATION_FAILED` (400)
- `PROMO_EXPIRED` / `PROMO_EXHAUSTED` / `PROMO_ALREADY_USED` (400)
