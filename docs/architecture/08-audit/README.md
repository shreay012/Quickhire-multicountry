# Technical Audit — Debt, Security, Scalability & Dead Code

---

## Security Audit

### CRITICAL Issues

| # | Issue | Location | Risk |
|---|---|---|---|
| 1 | **OTP logged in plaintext** | `auth.service.js:135` | Anyone with backend log access can steal OTPs and hijack any account |
| 2 | **DEV_MASTER_OTP in all envs** | `env.js:49`, `auth.service.js:143` | Comment says "allowed in all environments for demo/staging" — if this is set in prod, any phone number can be authenticated with the known master code |
| 3 | **Auth tokens in localStorage** | `axiosInstance.js:17-20` | XSS on any page can steal the JWT. Helmet CSP partially mitigates but doesn't block all XSS vectors in a React SPA |
| 4 | **Guest tokens not revocable** | `auth.service.js:172` | Guest JWTs have no sessionId, so they cannot be added to the Redis blocklist. A stolen 7-day guest token remains valid for its full TTL |
| 5 | **Admin CRUD routes accept unvalidated `passthrough()` data** | `admin.routes.js:288`, `admin.routes.js:366` | Zod `.passthrough()` on staff and service schemas means any extra fields are written to MongoDB. Risk of injecting computed fields (e.g. `role`, `meta.status`) if not filtered |

### HIGH Issues

| # | Issue | Location | Risk |
|---|---|---|---|
| 6 | **Booking group chat collection mismatch** | `admin.routes.js:549` uses `chat` collection; `chat.service.js:7` uses `messages` collection | Admin booking messages and PM/customer messages are in different collections. The booking workspace and admin panel likely show different message sets |
| 7 | **Promo `/redeem` endpoint has no role guard** | `promo.routes.js:330` | The comment says "internal route" but it's reachable from any authenticated user. Any logged-in user can call `/promo/redeem` with arbitrary `promoId, bookingId, userId, discount` |
| 8 | **Rate limiting is global (per IP) not per-user** | `rateLimit.middleware.js` | A malicious user behind a NAT can be rate-limited based on IP shared with legitimate users. Per-user rate limiting (by req.user.id) should be layered for auth'd routes |
| 9 | **HS256 fallback in dev with weak secrets** | `env.js:68-75` | If `JWT_PRIVATE_KEY` is set to a short non-PEM string in production by accident, the system silently uses HS256 with that weak secret. Algorithm should be forced in prod. |
| 10 | **SNS endpoint ARN not validated on store** | `notification.service.js:66` | `user.fcmTokens[].endpointArn` is stored without validation. Malformed ARN would silently fail push but not throw |

### MEDIUM Issues

| # | Issue | Location | Risk |
|---|---|---|---|
| 11 | **No CSRF protection** | `app.js` | No CSRF tokens for state-changing requests. Mitigated partly by `Authorization: Bearer` header requirement (CSRF can't set headers), but cookie-based auth would be vulnerable |
| 12 | **S3 key path validation only on download** | `chat.routes.js:164` | Upload key is generated server-side (safe), but presigned URL requests accept any `key` starting with `chat/`. A user could generate download URLs for other users' files if they know the key format |
| 13 | **MongoDB operator injection mitigation** | `sanitize.middleware.js` | `express-mongo-sanitize` strips keys with `$` prefix. But if any route uses `$where` or similar MongoDB operators on user input, this could still be exploitable |

---

## Technical Debt

### HIGH Priority

| # | Issue | Location | Impact |
|---|---|---|---|
| 1 | **Dual booking collections** | `jobs` + `bookings` | `getById()` in booking.service.js has fallback logic to check both. Admin routes query `jobs` but some booking routes query `bookings`. Future dev must understand both. |
| 2 | **No MongoDB indexes defined in code** | Entire codebase | All queries run without guaranteed indexes. On scale (10K+ jobs), queries on `userId`, `status`, `pmId`, `roomId` will do full collection scans. See collections.md for required indexes. |
| 3 | **`i18n-object` fields require runtime normalization** | All service name/desc fields | Services store `name` as either `string` or `{ en, hi, ... }`. The `flattenI18nDeep` axios interceptor normalizes on every response. Any code that reads `service.name` without going through axios (e.g. raw DB queries in admin) gets the raw object. `job.title` stores the flat string at creation time via `flatTitle()` — correct but brittle. |
| 4 | **Pricing dual schema** | `service.model.js` | Services have two pricing formats: legacy flat `{ hourly, currency }` and new array `pricing[]`. Four separate resolvers exist (`resolveServicePrice` in job.routes.js, `getPricingForCountry` in service.model.js, etc.). Any future pricing change must update all resolvers. |
| 5 | **`preferredStartDate` stored as either Date or ISO string** | `availability.service.js:76-81` | `countOccupants()` runs TWO separate queries: one with `$gte`/`$lt` Date bounds, one with `$regex` string prefix. This is a workaround for inconsistent frontend date types. Doubles DB load on every slot check. |

### MEDIUM Priority

| # | Issue | Location | Impact |
|---|---|---|---|
| 6 | **SocketProvider hardcodes localhost:5000** | `SocketProvider.jsx:69` | Socket.io connects to `http://localhost:5000` instead of `NEXT_PUBLIC_API_URL`. Frontend socket will never connect in any deployed environment other than local dev. |
| 7 | **OTP logs leak to production** | `auth.service.js:135` | `logger.info({ otp }, '[DEV OTP]')` labeled "for local testing" but has no `NODE_ENV !== 'production'` guard. Every OTP is logged in production Render logs. |
| 8 | **50+ deployment .md files at root** | Project root | Duplicate, outdated deployment documentation clutters the repo. Should be consolidated into one `DEPLOY.md` or the `docs/` folder. |
| 9 | **SQS workers not started by server.js** | `workers/` | The `notification.worker.js`, `invoice.worker.js`, `email.worker.js` are standalone scripts with separate npm scripts. They are not referenced or started by `server.js`. Invoice generation after payment uses SQS enqueue (`SQS_INVOICE_URL`) but the consumer worker is never started by the main app. |
| 10 | **BullMQ `emails` and `analytics` queues created but no handlers** | `queue/index.js:29-34` | `QUEUES.EMAILS` and `QUEUES.ANALYTICS` are initialized but no `registerWorker()` call exists for them. Jobs enqueued to these queues will sit forever. |

### LOW Priority

| # | Issue | Location | Impact |
|---|---|---|---|
| 11 | **`review` module exists but no routes in routes.js** | Mismatch | `reviewRoutes` is imported and mounted at `/reviews`. The module exists. Low priority. |
| 12 | **`mockPreloadedState` in production Redux store** | `store/index.js:16` | Redux store initializes with `preloadedState: mockPreloadedState`. If this contains any mock data, it pollutes the initial state in production. |
| 13 | **`console.log` debug statements in SocketProvider** | `SocketProvider.jsx:21,27,...` | Extensive `console.log` with emoji left in production code. Leaks internal state to browser console. |
| 14 | **`test-chat` page exposed in production** | `app/test-chat/` | Dev testing page accessible at `/test-chat`. No auth guard. Should be removed or gated. |
| 15 | **Inline PDF generation** | `payment.routes.js:219-236` | Hand-crafted PDF spec string as a fallback when no invoice URL exists. Fragile and produces minimal output. Should use pdfkit (already a dependency) or generate via worker. |

---

## Dead Code / Unused

| Item | Location | Status |
|---|---|---|
| `booking_rooms` admin endpoint uses `chat` collection | `admin.routes.js:549` | Likely dead — all active chat uses `messages` collection |
| `src/workers/lifecycle.worker.js` | `workers/` | Replaced by `queue/lifecycle.handler.js` BullMQ version |
| `src/workers/notification.worker.js` | `workers/` | Partially replaced by BullMQ notification handler |
| SQS notification path | `notification.service.js` | Fallback only; BullMQ is primary |
| Legacy `bookings` collection | `bookings` | New bookings go to `jobs`. Old records only. |
| `GET /bookings/available-slots` | `booking.routes.js:30` | Alias for `/bookings/availability`. Comment says "kept for FE compat" |
| `POST /admin/bookings/:id/confirm` (POST duplicate) | `admin.routes.js:145` | Duplicates `PATCH /admin/bookings/:id/confirm` at line 128 |

---

## Performance Bottlenecks

| # | Issue | Where | Fix |
|---|---|---|---|
| 1 | **No indexes** | All collections | Create indexes listed in collections.md |
| 2 | **`countOccupants` runs 3 queries per slot** | `availability.service.js:78` | Two job queries (Date + string) + one booking query. For 2 slots × 7 days = 42 DB queries per `buildAvailability()` call. Cache result for 30s per service. |
| 3 | **`hydrateJobs()` runs on every admin list request** | `admin.routes.js:37` | Already batched (good). But no caching. Add short-TTL Redis cache for admin dashboard. |
| 4 | **`computeScorecard()` aggregates over 90 days per staff** | `scorecard.routes.js:30` | 3 aggregation pipelines per staff member. Leaderboard endpoint runs this for all PMs (up to 50). Redis 10min cache is the only protection. Consider precomputing via background job. |
| 5 | **`autoAssignPm` counts jobs per PM sequentially** | `pm.assign.js:38` | `Promise.all` for counts is parallel — already good. But if there are 100 PMs, this is still 100 countDocuments calls per payment. Should use aggregation pipeline. |
| 6 | **Socket.io adapter pub/sub on every message** | All emitTo() calls | Every `emitTo()` publishes to Redis pub/sub even if no other pod exists. Acceptable but adds ~1ms latency per emit. |
| 7 | **Notification fan-out to all admins** | `pm.assign.js:14-23` | On every payment, queries all admin users and enqueues a notification per admin. If there are 50 admins, this is 50 BullMQ jobs per booking. Consider a single `role_admin` push route. |

---

## Scalability Recommendations

### Short-term (Before 10K users)
1. **Create MongoDB indexes** (see collections.md) — biggest single impact
2. **Fix SocketProvider hardcoded URL** — socket doesn't work in production
3. **Remove OTP from production logs** — security + GDPR
4. **Gate DEV_MASTER_OTP** — add `NODE_ENV !== 'production'` guard
5. **Add slot availability caching** (30s Redis) — reduces DB load 42x per booking attempt

### Medium-term (10K–100K users)
6. **Extract BullMQ workers to separate containers** — isolates queue processing load
7. **Add read replicas for MongoDB** — analytics/dashboard queries hit primary now
8. **Implement per-user rate limiting** on top of per-IP
9. **Add connection pooling limits** to MongoDB client
10. **Precompute scorecards** via nightly BullMQ job instead of on-demand aggregation

### Long-term (100K+ users / enterprise)
11. **Extract payments module** to independent service — PCI compliance boundary
12. **Extract notifications** to dedicated service — fan-out at scale
13. **Event sourcing** for booking state — `booking_histories` is already append-only, extend this pattern
14. **Multi-region deployment** — geo-routing for IN/AE/DE/AU/US customers
15. **Switch from JWT localStorage to HttpOnly cookies** — security hardening
16. **MongoDB Atlas Search or dedicated Elastic** — Meilisearch not designed for 10M+ document scale

---

## Production Readiness Checklist

| Item | Status | Notes |
|---|---|---|
| Health check endpoint | ✅ | `/healthz` + `/readyz` |
| Graceful shutdown | ✅ | SIGTERM/SIGINT handled |
| Structured logging | ✅ | pino JSON logs |
| Error tracking | ✅ | Sentry integrated |
| Metrics | ✅ | Prometheus `/metrics` |
| Rate limiting | ✅ | 120 req/min/IP |
| Input validation | ✅ | Zod on all routes |
| SQL/NoSQL injection protection | ✅ | express-mongo-sanitize |
| XSS protection | ✅ | sanitizeXss middleware + Helmet |
| CORS | ✅ | ALLOWED_ORIGINS whitelist |
| Non-root Docker user | ✅ | `USER app` in Dockerfile |
| MongoDB indexes | ❌ | None defined in code |
| Production OTP log removal | ❌ | OTP logged in all envs |
| DEV_MASTER_OTP guard | ❌ | Allowed in all envs |
| Socket URL configuration | ❌ | Hardcoded localhost |
| Unused queue workers | ❌ | emails + analytics queues never consumed |
| Invoice worker started | ❌ | SQS invoice enqueue but consumer not running |
| Load testing | ✅ | k6 scripts for API + socket + burst |
| Runbooks | ✅ | `runbooks/` directory |
| E2E tests | ✅ | Playwright |
