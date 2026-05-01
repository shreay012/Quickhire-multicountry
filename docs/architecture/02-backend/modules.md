# Backend Module Reference — All 27 Modules

Each module lives at `src/modules/<name>/` and is mounted via `src/routes.js`.

---

## 1. `auth` — `/auth`

**Business logic:** OTP-based mobile authentication. No passwords. Generates JWT access tokens (15m TTL, RS256) + bcrypt-hashed refresh tokens (30d TTL stored in MongoDB). Guest tokens (7d, `role: guest`) for unauthenticated browsing.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/auth/send-otp` | POST | Public | Rate-limited to 5 OTPs/min per mobile. Stores bcrypt-hashed OTP in Redis (300s TTL). Sends via MSG91/SNS/mock. |
| `/auth/verify-otp` | POST | Public | Verifies OTP against Redis hash. Upserts user. Creates session. Returns `{ token, refreshToken, user, isNewUser }`. |
| `/auth/guest-access` | POST | Public | Issues a 7-day guest JWT (no DB record). |
| `/auth/refresh` | POST | Public | Validates refresh token against session record. Issues new access token. |
| `/auth/logout` | POST | Any | Revokes session + adds access token sessionId to Redis blocklist until natural expiry. |

**Collections:** `users`, `sessions` (session records stored on users or separately — check auth.repository.js)  
**Redis keys:** `otp:{role}:{mobile}` (hashed OTP), `otp:rate:{mobile}` (rate counter), `blocklist:{sessionId}`  
**Edge cases:**
- `DEV_MASTER_OTP` env var bypasses Redis check (demo/staging only — dangerous in prod if set)
- Redis unavailable → falls back to in-process `memStore` (Map). This means OTP state is lost on pod restart in dev, but login still works.
- JWT_ALGORITHM auto-downgrades RS256 → HS256 if private key isn't PEM (dev convenience)
- `isNewUser` = `!user.meta?.isProfileComplete` — drives onboarding flow on FE

---

## 2. `user` — `/user`

**Business logic:** User profile management. Customers can read/update their own profile. Admin can list all users.

**Collections:** `users`

---

## 3. `service` — `/services`

**Business logic:** Service catalogue. Public read (no auth). Admin write (via `/admin/services`). Supports both legacy flat pricing (`pricing.hourly`) and new multi-country pricing array (`pricing[]`).

**Service document shape:**
```js
{
  slug: "react-developer-xyz",
  name: { en: "React Developer", hi: "..." },   // i18n object OR flat string
  title: "React Developer",                        // legacy fallback
  category: "frontend",
  description: { en: "...", hi: "..." },
  technologies: ["React", "TypeScript", "Redux"],
  pricing: [                                       // NEW multi-country
    {
      country: "IN", currency: "INR", basePrice: 800,
      unit: "per_hour", minDuration: 60, minCharge: 0,
      tax: { type: "GST", rate: 18, inclusive: false },
      surgeRules: [],
      cities: [], active: true
    },
    { country: "AE", currency: "AED", basePrice: 120, ... },
    { country: "US", currency: "USD", basePrice: 35, ... }
  ],
  hourlyRate: 800,          // legacy: still present for old code
  currency: "INR",          // legacy
  imageUrl: "...",
  active: true,
  faqs: [{ q: "...", a: "..." }]
}
```

**Collections:** `services`  
**Redis:** `cache:services:all`, `cache:services:{id}` (invalidated on admin write)

---

## 4. `booking` — `/bookings`, `/customer/bookings`, `/bookingHistories`

**Business logic:** Legacy booking management. This is the **v1/v2 flow** — newer code routes through the `jobs` collection. Mostly kept for history + admin compatibility. The booking state machine is fully implemented here and reused by the payment webhook.

**Booking status machine:**
```
pending → confirmed → assigned_to_pm → in_progress → completed
                   ↘                ↘             ↘
                   cancelled        cancelled      cancelled
                   (from paused too)
paid → assigned_to_pm (also valid transition)
```

Every transition writes to `booking_histories` and:
- Emits Redis pub/sub event (`booking.{status}`)
- Emits Socket.io event to `user_{userId}` and `user_{pmId}` rooms
- Enqueues push notification

**Idempotency:** Booking creation uses `Idempotency-Key` header + Redis cache (24h TTL) to prevent double-booking.  
**Slot locking:** Distributed Redis lock (`slot:{serviceId}:{startTime}`) held during DB insert, released immediately after.

**Collections:** `bookings`, `booking_histories`  
**Key function:** `transition(id, nextStatus, actor, note, extra)` — validates state machine, writes history, emits events.

---

## 5. `job` — `/jobs`

**Business logic:** Primary booking record for the **v3 flow**. Every new booking from the current frontend creates a `job` document. Handles pricing calculation, slot validation, idempotency, and the full booking lifecycle once payment is received.

**Two accepted shapes:**
```
v3 (current):  { services: [{ serviceId, durationTime, technologyIds, selectedDays, preferredStartDate, bookingType, timeSlot }] }
legacy:        { bookingId, serviceId, title, description, pricing }
```

**Job document:**
```js
{
  userId: ObjectId,
  serviceId: ObjectId,
  services: [...],           // v3 array
  technologyIds: [],
  selectedDays: 1,
  requirements: "",
  preferredStartDate: Date,
  preferredEndDate: Date,
  durationTime: 8,           // hours
  startTime: "09:00",
  endTime: "13:00",
  timeSlot: { startTime, endTime },
  bookingType: "later" | "instant",
  title: "React Developer",
  status: "pending",         // see state machine below
  pricing: { hourly, subtotal, tax, total, currency },
  pmId: ObjectId,
  projectManager: { _id, name, mobile },
  resourceId: ObjectId,
  assignedResource: { _id, name, mobile },
  paidAt: Date,
  startedAt: Date,           // PM sets when work begins
  endReminderSentAt: Date,   // lifecycle tick sets to prevent duplicate reminders
  autoAssignedAt: Date,
  logs: [{ by, role, type, message, at }],
  history: [{ at, actorRole, event, note }],
  createdAt, updatedAt
}
```

**Slot validation** (on job create):
- 7-day rolling window (today + 6)
- 2 fixed slots: 09:00–13:00, 14:00–18:00
- No weekends, no holidays (from `system_config`)
- Same-day: must have ≥60 min before slot start (10 min for instant)
- Capacity: counts occupants in `bookings` + `jobs` for that slot
- Race safety: Redis distributed lock (`slot:lock:{serviceId}:{date}:{startTime}`)

**Pricing calculation (POST /jobs/pricing):**
```
subtotal = hourly × durationTime × selectedDays
tax = subtotal × 0.18 (GST)
total = subtotal + tax
```
Country resolved from: `CF-IPCountry` header → `qh_country` cookie → locale → default IN.

**Collections:** `jobs`, `services`

---

## 6. `payment` — `/payments`

**Business logic:** Razorpay order creation → client-side payment → server-side signature verification → booking confirmation → auto PM assignment → invoice enqueue.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/payments/create-order` | POST | user | Creates Razorpay order in paise. Stores pending payment doc. Falls back to mock mode if no keys configured. |
| `/payments/verify` | POST | user | Verifies HMAC-SHA256 signature. Marks payment `paid`. Transitions booking to `confirmed`. Triggers PM auto-assign. Enqueues invoice. Idempotent via `Idempotency-Key` header. |
| `/payments/webhook` | POST | Public (signature) | Razorpay webhook. Same effect as `/verify` but server-initiated. Dedupes by Razorpay event ID. |
| `/payments/status/:paymentId` | GET | user/admin | Payment status lookup. |
| `/payments/history` | GET | user | Paginated payment history. |
| `/payments/invoice/download/:jobId` | POST | user/admin | Returns PDF invoice. If `invoice.url` on payment doc → redirect to S3. Else generates minimal inline PDF. |

**Payment document:**
```js
{
  userId, jobId, bookingId,
  provider: "razorpay" | "mock",
  orderId: "order_...",
  paymentId: "pay_...",
  amount: 944,             // in INR (not paise)
  currency: "INR",
  status: "created" | "paid" | "failed",
  signatureValid: true,
  rawWebhookEvents: [{ id, type, at }],
  invoice: { url },        // S3 URL when generated
  createdAt, updatedAt
}
```

**Dev mock mode:** When `RAZORPAY_KEY_ID` is absent, creates fake order/payment IDs, marks payment `paid` immediately, and triggers PM auto-assign. The frontend receives a mock response that skips the actual Razorpay SDK call.

**Collections:** `payments`, `jobs`  
**AWS:** SQS `SQS_INVOICE_URL` — enqueues invoice generation job after successful payment

---

## 7. `chat` — `/chat`

**Business logic:** Per-booking real-time chat between customer, PM, and admin. Supports file attachments (images, PDF, zip, txt — up to 25MB). Two room conventions:

```
Pre-PM-assignment:  service_{serviceId}_pending_{userId}
Post-PM-assignment: {pmId}_service_{serviceId}
Admin override:     booking_{bookingId}  (used by admin panel)
```

| Route | Method | Auth | Description |
|---|---|---|---|
| `/chat/messages/:customerId?serviceId=` | GET | user/pm/admin | Message history (newest 50, cursor paginated via `before=`). Populates `msg_from` with sender name/role. |
| `/chat/send/:customerId` | POST | user/pm/admin | Persist + broadcast message. Supports multipart upload (file goes to S3). Notifies non-sender participants. |
| `/chat/seen/:messageId` | POST/GET | user/pm/admin | Mark message seen (`seenBy[]` array). |
| `/chat/typing/:customerId` | POST | user/pm/admin | Broadcast typing event (no persistence). |
| `/chat/upload-url` | POST | user/pm/admin | Generate presigned PUT URL for direct browser → S3 upload (5min expiry). |
| `/chat/attachment-url?key=` | GET | user/pm/admin | Generate presigned GET URL for private S3 object (1h expiry). |

**Message document:**
```js
{
  roomId: "service_X_pending_Y",
  serviceId, bookingId,
  senderId, senderRole,
  msgType: 0,    // 0=text, 1=attachment
  msg: "...",
  attachment: { url, key, mime, size, name },
  firstMsg: 0,
  seenBy: [{ userId, at }],
  deliveredTo: [],
  createdAt
}
```

**Socket events emitted:** `new-message` (to room), `message:new` (to `user_{id}`), `typing` + `user_typing` (to room)  
**Collections:** `messages`, `users`  
**AWS:** S3 bucket `S3_BUCKET_CHAT`

---

## 8. `notification` — `/notifications`

**Business logic:** Multi-channel notification fan-out: in-app (Socket.io) + push (SNS → FCM). Persists all notifications to MongoDB for the notification centre UI.

**Notification types triggered across the system:**
```
BOOKING_CREATED, BOOKING_CONFIRMED, BOOKING_ASSIGNED_TO_PM
BOOKING_IN_PROGRESS, BOOKING_COMPLETED, BOOKING_CANCELLED
BOOKING_END_REMINDER (30min before end)
CHAT_MESSAGE, ticket_message, admin_alert
booking_assigned (PM/resource assignment)
pm_unavailable (no PM available for auto-assign)
```

**Channels:** `in_app` (socket emit on `notification` + `notification:new`) + `push` (SNS per FCM endpoint ARN)

**Enqueue path (current):**
```
caller → enqueueNotification() → BullMQ notifications queue → handleNotificationJob() → dispatch()
```
Fallback: if BullMQ not ready → inline `dispatch()`.

**Collections:** `notifications`, `users` (for FCM tokens)  
**AWS:** SNS `PublishCommand` with `GCM` message structure  

**Routes:**
```
GET  /notifications          ← paginated list for current user
POST /notifications/read/:id ← mark one read
POST /notifications/read-all ← mark all read
```

---

## 9. `admin` — `/admin`

**Business logic:** Staff admin panel backend. Protected by `adminGuard` (any of 7 admin roles) + `auditAdmin` middleware (logs every write). Individual routes further guarded by `permGuard(PERMS.X)`.

**Sub-sections:**

### Dashboard
- `GET /admin/dashboard` — aggregate stats (totalUsers, totalBookings, revenue, bookingsByStatus)
- `GET /admin/dashboard/stats` — richer KPIs (totalCustomers, pendingBookings, activeJobs, totalRevenue, totalPMs, totalResources)
- `GET /admin/dashboard/revenue` — 6-month revenue time series
- `GET /admin/dashboard/recent-activity` — last 10 hydrated jobs

### Bookings
- `GET /admin/bookings` — paginated list with hydratedJobs (customerName, serviceName, amount, pmName, resourceName)
- `GET /admin/bookings/:id`
- `PATCH /admin/bookings/:id/confirm`
- `PATCH /admin/bookings/:id/reject`
- `POST /admin/bookings/:id/assign-pm` — manual PM override (also emits socket + notification)
- `POST /admin/bookings/:id/assign-resource` — checks for double-booking conflict
- `GET /admin/bookings/:id/messages` — booking group chat
- `POST /admin/bookings/:id/messages` — send as admin

### Users
- `GET /admin/users?role=pm|resource|customer`
- `PATCH /admin/users/:id/status` — activate/suspend

### Services (CRUD)
- `GET/POST /admin/services`
- `GET/PUT/DELETE /admin/services/:id` — soft-delete (sets `active: false, deletedAt`)

### PMs & Resources
- `GET/POST/PUT/DELETE /admin/pms`
- `GET/POST/PUT/DELETE /admin/resources`
- `GET /admin/pms-list` — lightweight picker for FE dropdowns
- `GET /admin/resources-list`

### Tickets
- `GET /admin/tickets?status=open`
- `GET /admin/tickets/:id/detail` — ticket + messages
- `PATCH /admin/tickets/:id/status`
- `POST /admin/tickets/:id/message`

### Scheduling
- `GET /admin/scheduling-config` — slot capacity + holidays
- `PUT /admin/scheduling-config` — update capacity/holidays (`PERMS.SCHEDULE_WRITE`)

### CMS (proxy)
- `GET/PUT /admin/cms/:key`

**`hydrateJobs()`** — utility that populates customerName, serviceName, pmName, resourceName, amount on raw job docs for admin tables. Runs a single batched lookup of all referenced user + service IDs.

---

## 10. `ticket` — `/tickets`

**Business logic:** Customer support ticket system with message threading.

| Route | Method | Auth | Description |
|---|---|---|---|
| `/tickets/ticket` | POST | user | Create ticket (subject, description, optional bookingId) |
| `/tickets/user/all-tickets` | GET | user/admin | List user's tickets |
| `/:ticketId` | GET | user/admin | Get ticket + message thread |
| `/:id/message` (via admin) | POST | admin | Admin reply (emits to `ticket_{id}` socket room) |

**Collections:** `tickets`, `ticket_messages`  
**Socket room:** `ticket_{ticketId}`

---

## 11. `misc` — `/miscellaneous`

**Business logic:** Miscellaneous public endpoints.
- `POST /miscellaneous/contact-us` — stores contact form submissions

---

## 12. `pm` — `/pm`

**Business logic:** Project Manager dashboard — their assigned jobs, ability to start/pause/complete work, resource coordination.

**Key files:**
- `pm.routes.js` — PM panel endpoints
- `pm.assign.js` — `autoAssignPm()` function (called after payment)

**Auto-assign algorithm (`autoAssignPm`):**
1. Look up all PMs with `meta.status ≠ inactive`
2. Count active jobs (`assigned_to_pm | in_progress | paused`) per PM
3. Pick PM with fewest active jobs (round-robin by load)
4. `findOneAndUpdate` with `{ pmId: { $exists: false } }` filter — prevents double-assignment on concurrent calls
5. If `modifiedCount === 0` → another process already assigned, skip notifications
6. If no PM available → notify all admins to assign manually

---

## 13. `resource` — `/resource`

**Business logic:** Field resource (tech professional) panel. Resources see their assigned jobs, can log work, and chat with PM.

---

## 14. `dashboard` — `/dashboard`

**Business logic:** Customer-facing dashboard. Shows booking history, active bookings, stats.

---

## 15. `cms` — `/cms`, `/cms-x`

**Business logic:** Content management. Two route files:
- `cms.routes.js` — standard CMS (FAQs, homepage content, banners)
- `cmsExpanded.routes.js` — extended CMS (articles, guides, blog posts)

**`cms.defaults.js`** — seed data for default CMS content.

**Collections:** `cms_content` (key-value content blocks), `cms_articles` (long-form content)  
**Redis:** `cache:cms:{key}` (invalidated on admin write)

---

## 16. `ops` — `/ops`

**Business logic:** Internal operations tooling for the ops team. Covers bulk status updates, manual overrides, operational reports.

---

## 17. `pool` — `/pool`

**Business logic:** Full PM/Resource talent pool management. Extended staff profiles, leave management, KYC, capacity dashboard.

| Route | Auth | Description |
|---|---|---|
| `GET /pool/staff?role=pm&city=&skill=` | POOL_READ | Filtered staff list with projection (no password/FCM) |
| `GET /pool/staff/:id` | POOL_READ | Individual profile + active booking count |
| `PATCH /pool/staff/:id` | POOL_WRITE | Update skills, capacity, availability windows, bio |
| `PATCH /pool/staff/:id/status` | POOL_WRITE | Set status: active/suspended/on_leave |
| `GET/POST /pool/leaves` | POOL_READ/WRITE | Leave management. On create: checks for booking conflicts. |
| `DELETE /pool/leaves/:id` | POOL_WRITE | Revoke leave, restore active status. |
| `GET/POST /pool/kyc` | KYC_READ/WRITE | KYC document management |
| `PATCH /pool/kyc/:id/review` | KYC_WRITE | Approve/reject KYC, sets `meta.kycVerified` on user |
| `GET /pool/capacity?role=pm` | POOL_READ | Utilisation overview: active bookings vs max capacity per staff |

**Collections:** `users`, `staff_leaves`, `kyc_documents`  
**Key data:** `availabilityWindows: [{ day: 'MON', from: '09:00', to: '18:00' }]`, `capacity: 5` (max concurrent bookings)

---

## 18. `scorecard` — `/scorecards`

**Business logic:** Performance analytics for PMs and Resources. Auto-computed (no manual input). Cached in Redis for 10 minutes. Computes over last 90 days.

**Metrics computed:**
- Booking funnel: total / completed / cancelled / inProgress + rates
- Rating: avg from `reviews` collection + count
- Revenue: total + avg per booking
- `completionRate` and `cancellationRate` as percentages

**Leaderboard:** `GET /scorecards?role=pm&limit=20` — sorted by completionRate desc, then rating desc.

**Collections:** `jobs`, `reviews`, `users`  
**Redis:** `scorecard:{staffId}:{role}` (10min TTL), `scorecards:leaderboard:{role}:{limit}` (10min TTL)

---

## 19. `bulk` — `/bulk`

**Business logic:** Bulk operations for admin — bulk import/export of users, jobs, or services via CSV.

---

## 20. `promo` — `/promo`

**Business logic:** Promo code engine with full admin CRUD + customer validation + auto-apply at checkout.

**Code types:** `flat_off`, `pct_off`, `free_service`, `first_booking`, `referral`, `bogo`  
**Targeting:** country, city, serviceIds[], userSegment, minCartValue  
**Limits:** total usage cap, per-user limit (default: 1), validity window

**Key flows:**
- `POST /promo/validate` — validate code for a cart without committing (returns discount amount)
- `POST /promo/auto-apply` — find and apply the best available code for a cart
- `POST /promo/redeem` — record usage after payment (called internally, increments `usedCount`, writes `promo_redemptions`)
- `POST /promo/admin/:id/clone` — duplicate a code with new code string
- `POST /promo/admin/:id/expire` — immediately expire a code
- `GET /promo/admin/:id/preview` — estimated eligible bookings
- `GET /promo/admin/:id/analytics` — redemption count + total discount by day

**Fraud guard:** per-user limit enforced via `promo_redemptions` count check.  
**Collections:** `promo_codes`, `promo_redemptions`

---

## 21. `promo/referral` — `/referral`

**Business logic:** Referral code management (subset of promo system).

---

## 22. `flags` — `/flags`

**Business logic:** Feature flag management for controlled rollouts and A/B tests. Admin CRUD. Client read.

---

## 23. `i18n` — `/i18n`, `/geo-pricing`

**Business logic:** Locale and geo-pricing configuration.

| Route | Description |
|---|---|
| `GET /i18n/geo` | Detect user's country/currency from IP (Cloudflare header) |
| `GET /i18n/countries` | List supported countries |
| `GET /i18n/currencies` | List supported currencies |
| `GET /i18n/translations/:locale` | Return message bundle for locale |
| `GET /geo-pricing/quote` | Multi-country price quote |

**Geo detection (backend `geoMiddleware`):** `CF-IPCountry` → `X-Country` override → Accept-Language → default IN. Loads country config from `countries` collection (5-min in-process cache). Falls back to hardcoded defaults.  
**Collections:** `countries`, `system_config`

---

## 24. `analytics` — `/analytics`

**Business logic:** Aggregated analytics for admin/growth dashboard. Revenue charts, conversion rates, popular services, booking volume by country.

---

## 25. `review` — `/reviews`

**Business logic:** Customer reviews of PMs and resources after booking completion. Moderation support.

**Collections:** `reviews`  
**Key fields:** `fromId` (reviewer), `toId` (PM or resource), `rating` (1-5), `text`, `bookingId`, `moderationStatus`

---

## 26. `customer` — `/customer`

**Business logic:** Customer-specific endpoints. Profile management, booking summaries, preferences.

---

## 27. `chatbot` — `/chatbot`

**Business logic:** AI help chatbot using RAG (Retrieval-Augmented Generation). Searches CMS articles for relevant context → sends to Claude API → returns answer with source citations.

**Rate limit:** 10 messages/min per user (Redis counter)  
**Context retrieval:** Meilisearch (preferred) → MongoDB keyword fallback  
**AI:** Anthropic Claude API (`ANTHROPIC_API_KEY`)  
**Public routes:** `GET /chatbot/suggested` (suggested questions), `POST /chatbot/message` (send message)  
**Collections:** `cms_articles`, `cms_content`

---

## 28. `search` — `/search`

**Business logic:** Full-text search across bookings, resources, and articles using Meilisearch. Falls back to MongoDB text query.

| Route | Auth | Description |
|---|---|---|
| `GET /search/bookings?q=` | BOOKING_READ | Full-text booking search |
| `GET /search/resources?q=` | POOL_READ | Resource search |
| `GET /search/articles?q=` | Public | Article/FAQ search |
| `POST /search/reindex` | super_admin | Trigger full reindex from MongoDB |

**Collections:** `jobs`, `users`, `cms_articles`  
**Meilisearch indexes:** `bookings`, `resources`, `articles`

---

## 29. `availability` — (no direct route, used by booking + job)

**Business logic:** Slot availability calculation engine. Not a route module — exports service functions used by booking and job modules.

**Key exports:**
- `buildAvailability({ serviceId })` — returns 7-day availability grid + instant slot status
- `checkSlotBookable({ serviceId, dateStr, startTime, bookingType })` — validates a specific slot
- `getSchedulingConfig()` / `setSchedulingConfig()` — reads/writes `system_config` collection
- `FIXED_SLOTS` — 2 slots: `09:00–13:00`, `14:00–18:00`

**Capacity counting:** counts both `bookings` (legacy) and `jobs` (v3) for a date+slot, using both Date field matches and ISO string prefix match (because FE sometimes sends string dates).

---

## 30. `adminOps` — `/admin-ops`

**Business logic:** Extended admin operations route (separate from main admin.routes.js). Covers ops-specific features like bulk reassignment, manual lifecycle triggers, system health.
