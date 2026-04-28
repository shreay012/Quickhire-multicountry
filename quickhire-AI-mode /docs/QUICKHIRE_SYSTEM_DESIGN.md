# QuickHire — Production System Design & Implementation Blueprint

> **Author scope:** Principal Architect (AWS-grade)
> **Target:** End-to-end blueprint for the 4-app QuickHire platform — Customer Web, Admin Panel, PM App, Resource App
> **Stack:** Node.js + Express + MongoDB + Redis + Socket.IO on AWS (ECS Fargate)
> **Status:** Production-ready reference (no placeholders)

---

## Table of Contents

1. [High-Level Architecture (AWS)](#1-high-level-architecture-aws)
2. [Authentication System (Role-Based)](#2-authentication-system-role-based)
3. [Microservice Breakdown](#3-microservice-breakdown)
4. [API Design](#4-api-design)
5. [Socket.IO Architecture](#5-socketio-architecture)
6. [Booking Lifecycle Flow](#6-booking-lifecycle-flow)
7. [Frontend Architecture (Next.js)](#7-frontend-architecture-nextjs)
8. [Backend Architecture](#8-backend-architecture)
9. [Chat System Design](#9-chat-system-design)
10. [Payment Flow (Razorpay)](#10-payment-flow-razorpay)
11. [Notification System](#11-notification-system)
12. [DevOps (AWS)](#12-devops-aws)
13. [Database Design](#13-database-design)
14. [Error Handling Strategy](#14-error-handling-strategy)
15. [Scalability Plan](#15-scalability-plan)
16. [Code Structure & Samples](#16-code-structure--samples)

---

## 1. High-Level Architecture (AWS)

### 1.1 Decision: Modular Monolith → Microservices (phased)

**Phase 1 (0 → 50K MAU):** Modular monolith on ECS Fargate. One repo, multiple bounded contexts (auth, booking, chat, payment, notification). Faster to ship, single deploy pipeline, shared Mongo cluster.

**Phase 2 (50K → 500K MAU):** Extract latency-critical or independently scalable services first:
- `chat-service` (WebSocket fan-out, isolated scaling)
- `notification-service` (queue consumer, can scale to zero)
- `payment-service` (PCI scope isolation, slower deploy cadence)

**Why not microservices day-1:** Premature distribution → distributed transaction pain, no team to own each service, observability cost > benefit.

### 1.2 AWS Topology

```
                       ┌───────────────────────┐
                       │   Route 53 (DNS)      │
                       │  *.quickhire.services │
                       └──────────┬────────────┘
                                  │
                       ┌──────────▼────────────┐
                       │  CloudFront (CDN)     │ ── S3 (static, images, invoices)
                       │  WAF + Shield Std.    │
                       └──────────┬────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
   ┌────────▼────────┐  ┌─────────▼─────────┐  ┌────────▼─────────┐
   │ Customer Web    │  │  Admin Panel      │  │ PM / Resource    │
   │ (Next.js SSR    │  │  (Next.js SPA     │  │ (Expo OTA / RN)  │
   │  on Vercel or   │  │   on S3+CF)       │  │                  │
   │  ECS)           │  │                   │  │                  │
   └────────┬────────┘  └─────────┬─────────┘  └────────┬─────────┘
            │                     │                     │
            └─────────────────────┼─────────────────────┘
                                  │ HTTPS / WSS
                       ┌──────────▼────────────┐
                       │  ALB (HTTP+WS)        │
                       │  Target groups:       │
                       │   /api/*    → API TG  │
                       │   /socket/* → WS TG   │
                       └──────────┬────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────▼────────┐       ┌────────▼────────┐       ┌────────▼─────────┐
│ ECS Fargate    │       │ ECS Fargate     │       │ ECS Fargate      │
│ api-service    │       │ chat-service    │       │ worker-service   │
│ (auth, booking,│       │ (Socket.IO,     │       │ (SQS consumers,  │
│  job, payment, │       │  sticky via ALB │       │  cron, invoice   │
│  user, admin)  │       │  + Redis adptr) │       │  PDF, emails)    │
│ HPA: 2→20      │       │ HPA: 2→30       │       │ HPA: 1→10        │
└───┬────────────┘       └────────┬────────┘       └────────┬─────────┘
    │                             │                         │
    │       ┌─────────────────────┼─────────────────────┐   │
    │       │                     │                     │   │
┌───▼───────▼──┐         ┌────────▼────────┐    ┌───────▼───▼──────┐
│ MongoDB Atlas│         │ ElastiCache     │    │ Amazon SQS       │
│ M30 Replica  │         │ Redis (cluster) │    │ - notifications  │
│ Set (3 nodes)│         │ - Session/cache │    │ - invoices       │
│ + Search idx │         │ - SocketIO adp  │    │ - emails         │
│ + Analytics  │         │ - Rate limit    │    │ DLQ on each      │
└──────────────┘         │ - Pub/Sub       │    └──────────────────┘
                         └─────────────────┘             │
                                                ┌───────▼────────┐
                                                │ SNS → FCM/APNS │
                                                │      → SES     │
                                                └────────────────┘

  Side systems:
  • S3 buckets: chat-attachments, invoices, service-media (signed URLs)
  • Secrets Manager: JWT secrets, Razorpay keys, Mongo URI
  • CloudWatch: logs + metrics + alarms
  • X-Ray: distributed tracing
  • KMS: encryption keys
```

### 1.3 Key AWS Decisions

| Concern | Choice | Why |
|---|---|---|
| Compute | **ECS Fargate** (not EKS) | No node management; Kubernetes complexity not justified for 3 services |
| Load Balancer | **ALB** with WebSocket support | Native sticky sessions, path-based routing, HTTP/2 |
| Sticky sessions | ALB cookie stickiness on `/socket/*` TG | Required for Socket.IO long-poll fallback |
| Database | **MongoDB Atlas M30+** on AWS (same VPC via PrivateLink) | Managed, multi-AZ, point-in-time restore |
| Cache + Pub/Sub | **ElastiCache for Redis** (cluster mode disabled, replica enabled) | Socket.IO Redis adapter, BullMQ jobs, rate limit |
| Queue | **SQS Standard** with DLQ | Simpler than Kafka; throughput sufficient. Use Kafka only if >10K msg/s sustained |
| File storage | **S3** + CloudFront signed URLs | Direct browser → S3 upload via presigned PUT |
| Push | **SNS → FCM (Android) / APNS (iOS)** + Web Push via service worker | One SNS topic per user, fan-out |
| Email | **SES** | Transactional (OTP fallback, invoices, status updates) |
| Secrets | **AWS Secrets Manager** with rotation | JWT signing keys rotated quarterly |
| CDN | **CloudFront** in front of S3 + ALB | Static + API edge cache for `GET /services` |
| WAF | **AWS WAF** managed rules + rate limit | OWASP top 10, bot protection on `/auth/*` |

### 1.4 WebSocket Scaling Strategy

- **Stateless app nodes** + **Redis adapter** (`@socket.io/redis-adapter`) so any node can deliver to any room.
- ALB sticky sessions only to keep a client pinned (helps polling fallback). Pure WebSocket connections don't strictly need sticky, but enabling it costs nothing.
- Capacity planning: ~10K concurrent connections per Fargate task (2 vCPU / 4GB). HPA on `ActiveConnections` custom metric (publish from app to CloudWatch).
- **Failover:** On Fargate task termination, ALB drains 30s → client auto-reconnects (Socket.IO `reconnectionAttempts: 5`, exponential backoff). Redis adapter ensures no message loss for delivered messages; in-flight messages persist via `messages` collection (chat) + at-least-once via SQS (notifications).

---

## 2. Authentication System (Role-Based)

### 2.1 JWT Structure

```json
{
  "sub": "user_64a3...",
  "role": "user | admin | pm | resource | guest",
  "sessionId": "ses_a1b2c3",
  "iat": 1714000000,
  "exp": 1714604800,
  "iss": "quickhire.services",
  "aud": "quickhire-api"
}
```

- **Algorithm:** RS256 (asymmetric). Private key in Secrets Manager, public key shipped to services.
- **Access token TTL:** 7 days (mobile UX). **Refresh token TTL:** 30 days, stored hashed in `sessions` collection.
- **Guest token:** same shape, `role: "guest"`, scope-limited at middleware layer.

### 2.2 Middleware Architecture

```
Request
  → requestId + logger middleware
  → helmet + CORS
  → rateLimit (Redis-backed: per IP for /auth, per user otherwise)
  → authMiddleware (verify JWT, attach req.user = {id, role, sessionId})
  → roleGuard(['admin'])      ← per-route
  → bodyValidator (Joi/Zod schema)
  → controller
  → errorMiddleware (centralized)
```

`authMiddleware` is **always** mounted; routes opt-out via the `PUBLIC_ENDPOINTS` set or by mounting before the middleware on a separate router.

### 2.3 Role Matrix

| Endpoint group | guest | user | pm | admin | resource |
|---|---|---|---|---|---|
| `/services` GET | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/bookings` POST | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/chat/send/*` | ❌ | ✅ | ✅ | ✅ | ❌ |
| `/admin/*` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/pm/bookings` | ❌ | ❌ | ✅ | ✅ | ❌ |
| `/resource/tasks` | ❌ | ❌ | ❌ | ✅ | ✅ |

### 2.4 Token Refresh

- Sliding refresh: client calls `POST /auth/refresh` with refresh token in `httpOnly` cookie (web) or secure storage (mobile).
- Server verifies refresh token, checks `sessions.revoked == false`, rotates refresh token (single-use), returns new access token.
- On logout: mark session `revoked: true`, push `sessionId` to Redis blocklist with TTL = remaining access token life.

### 2.5 OTP Flow

```
POST /auth/send-otp   { mobile, role }
  → rate limit: 3/min, 10/hour per mobile
  → generate 4-digit OTP, store in Redis: otp:{mobile} = hash, EX 300
  → enqueue SMS via SNS / MSG91
POST /auth/verify-otp { mobile, otp, fcmToken }
  → bcrypt.compare against Redis
  → on success: upsert User, create Session, sign JWT, return { token, user, isNewUser }
  → store fcmToken on user for push
```

---

## 3. Microservice Breakdown

> Phase 1 = modules in monolith. Phase 2 = extract to standalone services. Contracts below are stable across both phases.

### 3.1 Auth Service
**Responsibilities:** OTP issuance/verification, JWT signing, session management, guest tokens, token refresh, logout.
**Key APIs:** `/auth/send-otp`, `/auth/verify-otp`, `/auth/guest-access`, `/auth/refresh`, `/auth/logout`.
**DB:** `users`, `sessions`, `otp_attempts` (TTL).
**Comms:** Emits `user.created` and `user.logged_in` to SNS topic for analytics + notification subscription.

### 3.2 User Service
**Responsibilities:** Profile CRUD, avatar upload (S3 presign), FCM token management, address book.
**APIs:** `/user/profile` (GET/PUT), `/user/devices` (POST/DELETE).
**DB:** `users`, `user_devices`.
**Comms:** Reads from Auth (sub claim).

### 3.3 Service Catalog Service
**Responsibilities:** Service listings, categories, availability slots, pricing rules.
**APIs:** `/services`, `/services/:id`, `/services/category/:cat`, `/admin/availability`.
**DB:** `services`, `service_categories`, `availability_rules`.
**Cache:** Redis `services:all` TTL 300s, invalidated on admin update via pub/sub.

### 3.4 Booking Service
**Responsibilities:** Create/update/cancel bookings, status transitions, history (event-sourced), assignment.
**APIs:** `/bookings`, `/bookings/:id`, `/bookings/:id/cancel`, `/bookings/:id/extend`, `/customer/bookings`, `/bookingHistories/getBookingHistory`.
**DB:** `bookings`, `booking_histories` (immutable event log).
**Comms:**
- Subscribes: `payment.verified` → transitions `pending` → `confirmed`.
- Publishes: `booking.created`, `booking.confirmed`, `booking.assigned`, `booking.completed`.

### 3.5 Job Service
**Responsibilities:** Pricing engine, job records (the unit of work derived from a booking), resource assignment, work logs.
**APIs:** `/jobs`, `/jobs/:id`, `/jobs/pricing`, `/resource/tasks`.
**DB:** `jobs`, `job_logs`.

### 3.6 Payment Service
**Responsibilities:** Razorpay order creation, signature verification, webhook handler, refunds, invoice generation.
**APIs:** `/payments/create-order`, `/payments/verify`, `/payments/status/:id`, `/payments/history`, `/payments/invoice/download/:jobId`, `POST /payments/webhook` (Razorpay).
**DB:** `payments`, `invoices`.
**Comms:** Publishes `payment.verified`, `payment.failed`. Worker generates PDF invoice → S3 → email via SES.

### 3.7 Chat Service
**Responsibilities:** Persist messages, serve history, real-time delivery via Socket.IO, attachments via S3 presign, typing/seen events.
**APIs (HTTP):** `GET /chat/messages/:customerId`, `POST /chat/send/:customerId`, `POST /chat/seen/:messageId`, `POST /chat/upload-url`.
**Sockets:** see §5.
**DB:** `messages` (sharded by `roomId` if needed at scale).

### 3.8 Notification Service
**Responsibilities:** Aggregate platform events → user notifications, push via FCM/APNS/Web Push, email via SES, in-app via socket.
**APIs:** `/notifications`, `/notifications/:id/read`, `/notifications/mark-all-read`.
**DB:** `notifications`.
**Comms:** SQS consumer for `notification.dispatch` queue. Fan-out to socket (`notification` event in user room) + push provider.

### 3.9 Admin Service
**Responsibilities:** Booking confirmation, PM assignment, dashboard analytics, service catalog mgmt, user moderation.
**APIs:** `/admin/bookings`, `/admin/bookings/:id/confirm`, `/admin/bookings/:id/assign-pm`, `/admin/dashboard`, `/admin/users`.
**DB:** Reads from all collections; writes to `bookings`, `services`, `audit_logs`.

### 3.10 Ticket / Support Service
**Responsibilities:** Support tickets, ticket messages, escalation.
**APIs:** `/tickets`, `/ticket-messages/:ticketId`.
**DB:** `tickets`, `ticket_messages`.

---

## 4. API Design

### 4.1 Conventions
- Base: `https://api.quickhire.services/api`
- Versioning: header `X-API-Version: 1` (minor) + `/v1` prefix when breaking
- Auth: `Authorization: Bearer <jwt>`
- Content: `application/json`; `multipart/form-data` for uploads
- IDs: Mongo ObjectId strings
- Timestamps: ISO 8601 UTC

### 4.2 Standard Response Envelope

```json
// Success
{ "success": true, "data": <T>, "meta": { "page": 1, "pageSize": 10, "total": 47 } }

// Error
{
  "success": false,
  "error": {
    "code": "BOOKING_NOT_FOUND",
    "message": "Booking 64a3... not found",
    "details": { "bookingId": "64a3..." },
    "requestId": "req_a1b2c3"
  }
}
```

### 4.3 Endpoint Catalog (canonical, matches existing client)

#### Auth
| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/auth/send-otp` | public | `{mobile, role}` | `{success, message}` |
| POST | `/auth/verify-otp` | public | `{mobile, otp, fcmToken}` | `{token, user, isNewUser}` |
| POST | `/auth/guest-access` | public | `{}` | `{token}` |
| POST | `/auth/refresh` | refresh cookie | `{}` | `{token}` |
| POST | `/auth/logout` | bearer | `{}` | `{success}` |

#### Bookings
| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/bookings` | user | Create. Validates slot via Redis lock `slot:{serviceId}:{startTs}` |
| GET | `/bookings` | user | List own |
| GET | `/bookings/:id` | user/pm/admin | Owner check |
| PATCH | `/bookings/:id` | user (limited fields) | |
| POST | `/bookings/:id/cancel` | user/admin | `{reason}` |
| POST | `/bookings/:id/extend` | user | `{additionalHours, newEndTime}` |
| GET | `/customer/bookings` | user | `?servicesStatus=...&page=...&pageSize=...` |
| GET | `/bookingHistories/getBookingHistory` | user/pm/admin | `?bookingId=&serviceId=` |

#### Services
`GET /services`, `GET /services/:id`, `GET /services/category/:c`, `GET /admin/availability?duration=N`.

#### Jobs
`GET /jobs/:id`, `POST /jobs`, `PUT /jobs/:id?service=create`, `POST /jobs/pricing`.

#### Payments
`POST /payments/create-order`, `POST /payments/verify`, `GET /payments/status/:id`, `GET /payments/history`, `POST /payments/invoice/download/:jobId`, `POST /payments/webhook` (Razorpay-only IP allowlist + signature).

#### Chat
`GET /chat/messages/:customerId?serviceId=`, `POST /chat/send/:customerId`, `POST /chat/seen/:messageId`, `POST /chat/upload-url`.

### 4.4 Validation
Joi/Zod per route. Reject early. Example `POST /bookings`:

```js
const bookingSchema = z.object({
  serviceId: z.string().regex(/^[0-9a-f]{24}$/),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  duration: z.number().int().min(1).max(720),
  requirements: z.string().max(5000).optional(),
  technologies: z.array(z.string().max(40)).max(20).optional(),
});
```

### 4.5 Error Codes (canonical set)
`AUTH_INVALID_OTP`, `AUTH_TOKEN_EXPIRED`, `AUTH_FORBIDDEN`, `VALIDATION_ERROR`, `RESOURCE_NOT_FOUND`, `BOOKING_SLOT_TAKEN`, `PAYMENT_VERIFICATION_FAILED`, `RATE_LIMITED`, `INTERNAL_ERROR`.

---

## 5. Socket.IO Architecture

### 5.1 Server bootstrap
- Path: `/api/socket.io`
- Transports: `['websocket']` preferred, `polling` fallback
- Adapter: `@socket.io/redis-adapter` over ElastiCache
- Auth: middleware reads `socket.handshake.auth.token` OR `socket.handshake.query.token`, verifies JWT, attaches `socket.data.user`

### 5.2 Room Conventions

| Purpose | Room ID | Joined by |
|---|---|---|
| Chat (assigned) | `${pmId}_service_${serviceId}` | customer + pm + admin observer |
| Chat (pre-assignment) | `service_${serviceId}_pending_${userId}` | customer + admin |
| Notifications | `user_${userId}` | the user (any role) |
| Support ticket | `ticket_${ticketId}` | customer + support agent |
| Admin broadcast | `role_admin` | all admins |

A user joins multiple rooms simultaneously.

### 5.3 Events

| Event | Direction | Payload | Notes |
|---|---|---|---|
| `connect` | C↔S | — | server emits `connected` with serverTime |
| `chat:join` | C→S | `{roomId}` | server validates membership |
| `chat:leave` | C→S | `{roomId}` | |
| `message` | C→S→C | `{roomId, msgType, msg, attachmentUrl?, tempId}` | server persists, broadcasts `message:new` |
| `message:new` | S→C | full Message doc + `tempId` for client ack | |
| `typing` | C→S→C | `{roomId, isTyping}` | not persisted; throttled 2s |
| `seen` | C→S→C | `{roomId, messageId}` | persists `seenBy[]` on message |
| `notification` | S→C | full Notification doc | delivered to `user_${userId}` |
| `booking:status` | S→C | `{bookingId, status, updatedAt}` | broadcast on transitions |
| `presence` | S→C | `{userId, online}` | optional |

### 5.4 Scaling
- **Horizontal:** N Fargate tasks behind ALB (sticky cookie). All tasks subscribe via Redis adapter — `io.to(room).emit(...)` works cross-node.
- **Backpressure:** if a socket has >256 queued messages, server force-disconnects → client reconnect + history fetch.
- **Hot rooms:** if a single room exceeds 1K participants (admin broadcast), use Redis pub/sub directly + chunked emits to avoid head-of-line blocking.

### 5.5 Failover
- Task crash → ALB drains, client `disconnect` → auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, 16s; 5 attempts).
- On reconnect, client re-joins last room and calls `GET /chat/messages/...?since=<lastMessageId>` to backfill (delta sync).
- Redis AZ failure → ElastiCache Multi-AZ failover (~30s); Socket.IO adapter reconnects automatically.

---

## 6. Booking Lifecycle Flow

### 6.1 State Machine

```
            ┌─────────┐  payment.verified   ┌───────────┐
   create → │ pending │ ──────────────────► │ confirmed │
            └────┬────┘                     └─────┬─────┘
                 │ cancel                         │ admin assigns PM
                 ▼                                ▼
            ┌──────────┐                  ┌──────────────────┐
            │cancelled │                  │ assigned_to_pm   │
            └──────────┘                  └────────┬─────────┘
                                                   │ pm starts work
                                                   ▼
                                          ┌────────────────┐
                                          │ in_progress    │
                                          └────────┬───────┘
                                                   │ work delivered + customer accepts
                                                   ▼
                                          ┌────────────────┐
                                          │ completed      │
                                          └────────────────┘
```

Allowed transitions enforced in `BookingService.transition(bookingId, nextStatus, actor)` — anything else → `INVALID_TRANSITION`.

### 6.2 Cross-app Sequence

```
Customer (Web)                Backend                       Admin / PM / Resource
──────────────                ────────                       ─────────────────────
Browse /services       ──►  GET /services (cached)
Open /service-details  ──►  GET /services/:id
Open /book-your-...    ──►  POST /jobs/pricing
Confirm booking        ──►  POST /bookings           ──►   booking.created → admin
                                                            socket: booking:new in role_admin
Razorpay modal         ──►  POST /payments/create-order
                       ◄──  orderId
Pay (Razorpay)         ──►  POST /payments/verify
                            → emits payment.verified
                            → BookingService transitions → confirmed
                            → socket booking:status to user_${userId}
                                                          Admin sees confirmed booking
                                                          Clicks "Assign PM"
                                                    ◄──   POST /admin/bookings/:id/assign-pm
                            transitions → assigned_to_pm
                            socket booking:status to user + pm rooms
                                                          PM opens app, sees assignment
                                                          Joins chat room ${pmId}_service_${sid}
Customer opens /chat   ──►  joins same room
                            chat HTTP history + WS realtime
                                                          PM clicks "Start work"
                                                    ◄──   PATCH /bookings/:id (status=in_progress)
                                                          Resource gets task in app
                                                    ◄──   PATCH /jobs/:id (logs progress)
                                                          On delivery:
                                                    ◄──   PATCH /bookings/:id (status=completed)
                            invoice job → SQS → worker → S3 PDF → SES email
                            notification → user
```

### 6.3 Concurrency / Idempotency
- `POST /bookings`: idempotency key `Idempotency-Key` header (UUID); server stores in Redis 24h.
- Slot reservation: `SETNX slot:{serviceId}:{startTs} {bookingId} EX 60` during checkout; released on payment success/failure.
- `POST /payments/verify`: deduped by `razorpay_payment_id` unique index on `payments`.

---

## 7. Frontend Architecture (Next.js)

### 7.1 Folder Structure (already in repo, canonical)

```
app/
  layout.jsx                     ← ReduxProvider → GuestAccessProvider → ThemeRegistry → SocketProvider → ToastProvider
  (home-page)/page.jsx
  login/page.jsx
  book-your-resource/...
  booking-workspace/[id]/...
  chat/page.jsx
components/
  auth/        layout/        providers/        common/        ui/
features/
  homepage/    booking/       services/         profile/       cart/    notification/
lib/
  endpoints.js
  axios/axiosInstance.js
  services/   (authApi, bookingApi, chatApi, paymentApi, chatSocketService, ...)
  redux/
    store/index.js
    store/hooks.js
    slices/   (authSlice, bookingSlice, chatSlice, notificationSlice, ...)
    providers/ReduxProvider.jsx
  utils/      (authHelpers, userHelpers, chatHelpers)
```

### 7.2 State Management Pattern
- One slice per domain. Async work in `createAsyncThunk`. Selectors colocated.
- Persisted slice: `auth` only (via localStorage rehydrate in `initializeAuth` thunk — avoids redux-persist hydration mismatch with App Router SSR).
- No business logic in components — components dispatch thunks, read via selectors.

### 7.3 API Integration Pattern
- All HTTP via `lib/services/*Api.js` modules → never call `axios` from a component.
- All endpoint paths centralized in `lib/endpoints.js`.
- Axios interceptors handle: token injection (user vs guest), 401 cleanup, request id propagation.

### 7.4 Auth + Guest Mode
- On first paint: `GuestAccessProvider` decides user/guest/none and bootstraps tokens before any data fetch.
- `LayoutWrapper` dispatches `initializeAuth` to hydrate Redux from localStorage.
- `useRequireAuth(redirectTo='/login')` hook for protected pages.

### 7.5 Socket Integration
- Single `SocketProvider` owns the connection lifetime tied to login/logout via `storage` event + custom `userLoggedIn` event for same-tab login.
- `chatSocketService` is a singleton — components call `connect({roomId, callbacks})` and `disconnect()` in effect cleanups.

---

## 8. Backend Architecture

### 8.1 Folder Structure (modular monolith)

```
src/
  config/
    env.js              ← zod-validated process.env
    db.js               ← mongoose connect (with retry)
    redis.js            ← ioredis (single + pub/sub clients)
    logger.js           ← pino + requestId binding
    aws.js              ← S3, SQS, SNS, SES clients
  modules/
    auth/
      auth.controller.js
      auth.service.js
      auth.repository.js
      auth.routes.js
      auth.validators.js
    user/                 ...
    service/              ...
    booking/              ...
    job/                  ...
    payment/
      payment.controller.js
      payment.service.js
      payment.webhook.js  ← Razorpay webhook (raw body)
      payment.routes.js
    chat/
      chat.controller.js
      chat.service.js
      chat.repository.js
      chat.socket.js      ← socket.io namespace + handlers
      chat.routes.js
    notification/
      notification.service.js
      notification.consumer.js  ← SQS consumer
      push.adapter.js
    admin/                ...
    ticket/               ...
  middleware/
    auth.middleware.js
    role.middleware.js
    rateLimit.middleware.js
    error.middleware.js
    requestId.middleware.js
    validate.middleware.js
  socket/
    index.js              ← io setup + redis adapter + auth middleware
  workers/
    invoice.worker.js
    notification.worker.js
    email.worker.js
  utils/
    asyncHandler.js
    AppError.js
    pagination.js
    idempotency.js
  app.js                  ← express app
  server.js               ← http server + io attach + graceful shutdown
tests/
  unit/  integration/  e2e/
Dockerfile
docker-compose.yml
```

### 8.2 Layered Pattern

```
HTTP route  →  Controller (HTTP concerns)
                 → Service (business logic, transactions, events)
                   → Repository (Mongo queries, no business logic)
                   → External adapters (Razorpay, S3, SES)
                 → emits domain events (Redis pub/sub or SQS)
```

Strict rule: controllers never touch the DB; repositories never know about HTTP.

### 8.3 Middleware Order

```js
app.use(requestIdMiddleware);
app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(rateLimitMiddleware);
app.use('/api', routes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
```

### 8.4 Logging
- `pino` JSON logs → stdout → CloudWatch Logs.
- Per-request child logger with `requestId`, `userId`, `route`.
- Sample rate 100% for errors, 10% for 2xx in prod.

---

## 9. Chat System Design

### 9.1 Hybrid Approach
- **HTTP (`GET /chat/messages/:customerId`)** for first-load history with pagination (`?before=<msgId>&limit=50`).
- **WebSocket** for live deltas after the page is open.
- **HTTP `POST /chat/send/...`** is the source of truth; the same handler also emits the socket event. This guarantees persistence even if socket delivery fails.

### 9.2 Message Schema

```js
{
  _id,
  roomId: "pm123_service_svc456",
  serviceId,
  bookingId?,
  senderId,
  senderRole: "user" | "pm" | "admin",
  msgType: 0 | 1,           // 0 text, 1 attachment
  msg: String,
  attachment: {
    url, key, mime, size, name
  } | null,
  firstMsg: 0 | 1,
  seenBy: [{ userId, at }],
  deliveredTo: [{ userId, at }],
  createdAt, updatedAt
}
```

Indexes: `{roomId:1, createdAt:-1}`, `{senderId:1, createdAt:-1}`, TTL on soft-deleted messages.

### 9.3 File Upload via S3 (presigned)

```
Client: POST /chat/upload-url { mime, size }
  → server validates (size ≤ 25MB, mime allowlist)
  → returns { uploadUrl, key, expiresIn: 300 }
Client: PUT directly to S3 (uploadUrl)
Client: POST /chat/send/:customerId { msgType: 1, attachmentKey: key, msg?: '' }
  → server resolves S3 key → public CloudFront URL (or signed GET)
  → persists message → emits socket
```

This avoids piping large files through the API tier.

### 9.4 Typing & Seen
- `typing` event: throttled client-side (emit every 2s while typing, single `isTyping: false` on stop). Not persisted.
- `seen` event: persisted into `seenBy[]` (idempotent `$addToSet`). Server emits to room so other participants update read receipts.

---

## 10. Payment Flow (Razorpay)

### 10.1 Order → Verify → Webhook (defense in depth)

```
1. Frontend ──► POST /payments/create-order { jobId, amount }
                Server creates Razorpay order via SDK,
                persists Payment{status:'created', orderId, amount}
                returns { orderId, key, amount, currency }

2. Frontend opens Razorpay checkout. User pays.

3. Razorpay calls handler with { payment_id, order_id, signature }
   Frontend ──► POST /payments/verify {...}
                Server: verify HMAC-SHA256(order_id|payment_id, secret) === signature
                Update Payment{status:'paid'}
                Emit payment.verified → Booking transitions to 'confirmed'

4. Razorpay also POSTs ──► /payments/webhook (server-to-server)
                Idempotent: dedupe by event.id (unique index)
                Used to recover if step 3 was lost (network drop on client)
                Same status transition logic, no double-charge
```

### 10.2 Invoice
- On `payment.verified`: enqueue `{paymentId, jobId}` to SQS `invoice-generation`.
- Worker renders PDF (puppeteer / pdfkit) → uploads to S3 (`invoices/{userId}/{jobId}.pdf`) → updates payment doc → emails via SES with signed URL valid 7 days.
- Customer-initiated download (`POST /payments/invoice/download/:jobId`) returns the same S3 signed URL or streams via API.

### 10.3 Refunds
Admin endpoint `POST /admin/payments/:id/refund {amount, reason}` calls Razorpay refund API, persists `refunds[]` on payment doc, emits `payment.refunded`.

---

## 11. Notification System

### 11.1 Channels
| Channel | Use case | Delivery |
|---|---|---|
| In-app socket | Active session | `notification` event in `user_${userId}` |
| Push (FCM/APNS) | App backgrounded | SNS topic per device endpoint |
| Web Push | Browser closed | VAPID + service worker |
| Email (SES) | Critical (payment, invoice, account) | Templated |
| SMS | OTP only | SNS / MSG91 |

### 11.2 Pipeline

```
Domain event (booking.confirmed)
  → publish to SQS notification-dispatch
  → notification-worker:
      1. Resolve user preferences (channels enabled)
      2. Persist Notification doc (for in-app list)
      3. Emit socket event to user_${userId}
      4. If push enabled & user offline → SNS publish
      5. If email channel for this event type → SES send
  → DLQ on failure after 3 retries; CloudWatch alarm
```

### 11.3 Schema

```js
{
  _id, userId, type: 'BOOKING_CONFIRMED',
  title, body, data: { bookingId, ... },
  channels: ['in_app','push'],
  read: false, readAt?,
  createdAt
}
```
Index: `{userId:1, createdAt:-1}`, partial index `{userId:1, read:1}` on `read=false`.

---

## 12. DevOps (AWS)

### 12.1 CI/CD (GitHub Actions)

```
.github/workflows/
  ci.yml         ← on PR: lint, test, build, docker scan (Trivy)
  deploy-dev.yml ← on merge to develop: build → ECR → ECS update-service (dev)
  deploy-prod.yml← on tag v*: build → ECR → ECS rolling deploy (prod) with manual approval gate
```

Steps:
1. Checkout, setup Node 20
2. `pnpm install --frozen-lockfile`
3. `pnpm lint && pnpm test --coverage`
4. Build Docker image, tag `git_sha`
5. `docker scan` (Trivy) — fail on HIGH/CRITICAL
6. Push to ECR
7. `aws ecs update-service --force-new-deployment` (rolling, min 100% / max 200%)
8. CodeDeploy (optional) for blue/green on payment-service

### 12.2 Dockerfile (multi-stage)

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod=false

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build && pnpm prune --prod

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app .
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3000/healthz || exit 1
CMD ["node", "src/server.js"]
```

### 12.3 ECS Task Definition (key bits)
- CPU 1024 / Memory 2048 (api), 2048/4096 (chat).
- Sidecar: AWS X-Ray daemon, CloudWatch agent.
- Secrets injected via Secrets Manager ARN.
- Logs: `awslogs` driver to `/ecs/quickhire-api`.

### 12.4 Auto Scaling
- Target tracking on CPU 60% AND ALB `RequestCountPerTarget` 200.
- Chat service: custom CloudWatch metric `WebsocketConnections` target 6000 per task.
- Step scaling for SQS workers on `ApproximateNumberOfMessagesVisible`.

### 12.5 Monitoring
- **Metrics:** CloudWatch (ECS, ALB, ElastiCache, RDS) + custom (login success rate, payment success rate, socket reconnects).
- **Tracing:** AWS X-Ray, propagated via `traceparent` header through SQS message attributes.
- **Logs:** CloudWatch Logs → Logs Insights queries; optional ship to OpenSearch (ELK).
- **Alarms:** 5xx > 1% / 5min, p95 latency > 800ms, DLQ depth > 0, Mongo replica lag > 10s, Razorpay webhook 4xx spike.

### 12.6 Secrets
- AWS Secrets Manager. Quarterly rotation lambda for JWT keys (publishes new public key, accepts both old/new for grace period).

---

## 13. Database Design

### 13.1 Why MongoDB
Document model fits booking/job/message domain with nested arrays. Flexible service schema. Atlas Search for service discovery.

### 13.2 Collections

#### `users`
```js
{
  _id, role, // 'user'|'pm'|'admin'|'resource'
  mobile: { type:String, unique:true, sparse:true },
  email, name, avatarUrl,
  fcmTokens: [{ token, platform, createdAt }],
  meta: { isProfileComplete, lastLoginAt, status:'active'|'suspended' },
  createdAt, updatedAt
}
```
Indexes: `{mobile:1}` unique sparse, `{role:1, status:1}`, `{email:1}` unique sparse.

#### `sessions`
```js
{ _id, userId, refreshTokenHash, ip, ua, revoked, createdAt, expiresAt }
```
Indexes: `{userId:1, revoked:1}`, TTL on `expiresAt`.

#### `services`
```js
{
  _id, slug, title, category, description, icon,
  pricing: { hourly:Number, currency:'INR', tiers:[...] },
  technologies:[String], availability:{...}, active:Boolean,
  createdAt, updatedAt
}
```
Indexes: `{slug:1}` unique, `{category:1, active:1}`, Atlas Search on `title, description, technologies`.

#### `bookings`
```js
{
  _id, userId, serviceId, jobId,
  status, // enum
  startTime, endTime, duration,
  requirements, technologies:[String],
  pricing: { subtotal, tax, total, currency },
  pmId?, resourceId?,
  cancellation: { reason, by, at } | null,
  createdAt, updatedAt
}
```
Indexes: `{userId:1, status:1, createdAt:-1}`, `{pmId:1, status:1}`, `{status:1, createdAt:-1}`, `{serviceId:1, startTime:1}`.

#### `booking_histories` (event log, append-only)
```js
{ _id, bookingId, serviceId, fromStatus, toStatus, actor:{id,role}, note, at }
```
Index: `{bookingId:1, at:-1}`.

#### `jobs`
```js
{
  _id, bookingId, userId, serviceId, pmId, resourceId,
  title, description, deliverables:[...],
  pricing, status, startedAt, completedAt,
  logs:[{by, at, type, message}]
}
```

#### `messages`
See §9.2.

#### `payments`
```js
{
  _id, userId, jobId, bookingId,
  provider:'razorpay',
  orderId:String, paymentId:{type:String, unique:true, sparse:true},
  amount, currency, status:'created'|'paid'|'failed'|'refunded',
  signatureValid:Boolean,
  refunds:[{ refundId, amount, reason, at }],
  invoice:{ key, url, generatedAt },
  rawWebhookEvents:[{ id, at, type }],
  createdAt, updatedAt
}
```
Indexes: `{userId:1, createdAt:-1}`, `{orderId:1}` unique, `{paymentId:1}` unique sparse, `{jobId:1}`.

#### `notifications`
See §11.3.

#### `tickets` / `ticket_messages` / `audit_logs`
Standard shapes, audit_logs append-only `{actor, action, target, before, after, at}`.

### 13.3 Relationships
References by ObjectId, no cascading. Joins via `$lookup` only on admin/analytics paths; hot read paths denormalize (`bookings.serviceTitle`, etc.) and rebuild on service rename via background job.

---

## 14. Error Handling Strategy

### 14.1 `AppError` class

```js
class AppError extends Error {
  constructor(code, message, status = 400, details = {}) {
    super(message);
    this.code = code; this.status = status; this.details = details;
    this.isOperational = true;
  }
}
```

### 14.2 Global Handler

```js
function errorMiddleware(err, req, res, next) {
  const requestId = req.id;
  if (!err.isOperational) req.log.error({ err, requestId }, 'unhandled');
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: status >= 500 ? 'Something went wrong' : err.message,
      details: err.details,
      requestId,
    },
  });
}
```

### 14.3 Async wrapper

```js
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
```

### 14.4 Retries
- Outbound HTTP (Razorpay, FCM, SES): exponential backoff with jitter (3 attempts, 200ms base).
- SQS consumers: visibility-timeout-driven retry → DLQ after `maxReceiveCount=3`.
- Mongo writes: rely on driver retryWrites; never wrap in app loops.

### 14.5 Process safety
- `process.on('unhandledRejection'|'uncaughtException')` → log + graceful shutdown (let ECS restart).
- Graceful shutdown on `SIGTERM`: stop accepting connections, drain Socket.IO (emit `server:shutdown`), close Mongo + Redis, exit 0.

---

## 15. Scalability Plan

### 15.1 Horizontal
- All services stateless → scale on CPU/RPS/connections.
- Sticky sessions only for chat (cookie-based ALB).
- Idempotency keys for all writes that may be retried.

### 15.2 Database
- **Read scaling:** Atlas read replicas, `readPreference=secondaryPreferred` for analytics & history endpoints.
- **Write scaling:** Shard `messages` by `roomId` once collection > 100GB. Booking write rate ceiling ~5K/s on M60 — well beyond Year-1 plan.
- **Hot indexes:** monitor via Performance Advisor; add `{userId,status,createdAt}` style compounds early.

### 15.3 Caching (Redis)
- `services:all` list (TTL 5min, invalidate on admin update via pub/sub).
- `service:{id}` detail (TTL 10min).
- Session blocklist for revoked JWTs.
- Per-user rate limit counters.
- Socket.IO adapter pub/sub.

### 15.4 WebSocket
- See §5.4. Aim for ≤60% socket-CPU-utilisation per task.
- Geographic scaling: launch second region behind Route 53 latency routing once ROW traffic > 25%.

### 15.5 CDN
- CloudFront in front of all static + GET-only public APIs (`/services`, `/services/:id`) with 60s TTL and `Cache-Control: public, s-maxage=60, stale-while-revalidate=120`.
- Origin shield enabled to protect Mongo on cache stampede.

### 15.6 Cost Controls
- Fargate Spot for worker tier (non-critical).
- Reserved capacity / Savings Plans for steady baseline.
- S3 Intelligent-Tiering for invoices, lifecycle to Glacier after 1 year.
- Mongo Atlas auto-scaling within bounded tier ceiling.

---

## 16. Code Structure & Samples

### 16.1 Sample Controller — `booking.controller.js`

```js
// src/modules/booking/booking.controller.js
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import * as bookingService from './booking.service.js';

export const createBooking = asyncHandler(async (req, res) => {
  const idemKey = req.header('Idempotency-Key');
  const booking = await bookingService.create({
    userId: req.user.id,
    payload: req.body,
    idemKey,
    actor: req.user,
  });
  res.status(201).json({ success: true, data: booking });
});

export const getBookingById = asyncHandler(async (req, res) => {
  const booking = await bookingService.getById(req.params.id, req.user);
  if (!booking) throw new AppError('RESOURCE_NOT_FOUND', 'Booking not found', 404);
  res.json({ success: true, data: booking });
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const updated = await bookingService.cancel(req.params.id, req.body.reason, req.user);
  res.json({ success: true, data: updated });
});

export const listCustomerBookings = asyncHandler(async (req, res) => {
  const { servicesStatus, page = 1, pageSize = 10 } = req.query;
  const result = await bookingService.listForCustomer({
    userId: req.user.id,
    statuses: servicesStatus ? servicesStatus.split(',') : null,
    page: Number(page),
    pageSize: Number(pageSize),
  });
  res.json({ success: true, data: result.items, meta: result.meta });
});
```

### 16.2 Sample Service — `booking.service.js`

```js
import { AppError } from '../../utils/AppError.js';
import * as repo from './booking.repository.js';
import { publish } from '../../config/redis.js';
import { acquireLock, releaseLock, idempotencyGetOrSet } from '../../utils/idempotency.js';

const ALLOWED = {
  pending:        ['confirmed', 'cancelled'],
  confirmed:      ['assigned_to_pm', 'cancelled'],
  assigned_to_pm: ['in_progress', 'cancelled'],
  in_progress:    ['completed', 'cancelled'],
  completed:      [],
  cancelled:      [],
};

export async function create({ userId, payload, idemKey, actor }) {
  if (idemKey) {
    const cached = await idempotencyGetOrSet(`booking:${userId}:${idemKey}`, null);
    if (cached) return cached;
  }
  const slotKey = `slot:${payload.serviceId}:${payload.startTime}`;
  const locked = await acquireLock(slotKey, 60);
  if (!locked) throw new AppError('BOOKING_SLOT_TAKEN', 'Selected slot is no longer available', 409);

  try {
    const booking = await repo.insert({
      userId, ...payload, status: 'pending', createdAt: new Date(),
    });
    await repo.appendHistory(booking._id, {
      bookingId: booking._id, serviceId: booking.serviceId,
      fromStatus: null, toStatus: 'pending', actor: { id: actor.id, role: actor.role }, at: new Date(),
    });
    await publish('booking.created', { bookingId: booking._id, userId });
    if (idemKey) await idempotencyGetOrSet(`booking:${userId}:${idemKey}`, booking, 86400);
    return booking;
  } finally {
    // keep the slot lock until payment success/failure releases it
  }
}

export async function transition(bookingId, nextStatus, actor, note = '') {
  const booking = await repo.findById(bookingId);
  if (!booking) throw new AppError('RESOURCE_NOT_FOUND', 'Booking not found', 404);
  if (!ALLOWED[booking.status]?.includes(nextStatus)) {
    throw new AppError('INVALID_TRANSITION', `Cannot move ${booking.status} → ${nextStatus}`, 409);
  }
  const updated = await repo.updateStatus(bookingId, nextStatus);
  await repo.appendHistory(bookingId, {
    bookingId, serviceId: booking.serviceId,
    fromStatus: booking.status, toStatus: nextStatus,
    actor: { id: actor.id, role: actor.role }, note, at: new Date(),
  });
  await publish(`booking.${nextStatus}`, { bookingId, userId: booking.userId, pmId: booking.pmId });
  return updated;
}

export async function cancel(id, reason, actor) {
  return transition(id, 'cancelled', actor, reason);
}

export async function getById(id, user) {
  const b = await repo.findById(id);
  if (!b) return null;
  const isOwner = String(b.userId) === user.id;
  const isPm    = String(b.pmId)   === user.id;
  if (!isOwner && !isPm && user.role !== 'admin') {
    throw new AppError('AUTH_FORBIDDEN', 'Forbidden', 403);
  }
  return b;
}

export async function listForCustomer({ userId, statuses, page, pageSize }) {
  const filter = { userId };
  if (statuses?.length) filter.status = { $in: statuses };
  const [items, total] = await Promise.all([
    repo.find(filter, { skip: (page - 1) * pageSize, limit: pageSize, sort: { createdAt: -1 } }),
    repo.count(filter),
  ]);
  return { items, meta: { page, pageSize, total } };
}
```

### 16.3 Sample Repository — `booking.repository.js`

```js
import { getDb } from '../../config/db.js';

const col = () => getDb().collection('bookings');
const histCol = () => getDb().collection('booking_histories');

export const insert = async (doc) => {
  const r = await col().insertOne(doc);
  return { _id: r.insertedId, ...doc };
};
export const findById = (id) => col().findOne({ _id: id });
export const updateStatus = (id, status) =>
  col().findOneAndUpdate({ _id: id }, { $set: { status, updatedAt: new Date() } }, { returnDocument: 'after' }).then(r => r.value);
export const find = (q, { skip, limit, sort }) =>
  col().find(q).sort(sort).skip(skip).limit(limit).toArray();
export const count = (q) => col().countDocuments(q);
export const appendHistory = (bookingId, event) => histCol().insertOne(event);
```

### 16.4 Sample Routes — `booking.routes.js`

```js
import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { roleGuard } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createBookingSchema, cancelSchema } from './booking.validators.js';
import * as ctrl from './booking.controller.js';

const r = Router();
r.use(authMiddleware);
r.post('/',                roleGuard(['user']),         validate(createBookingSchema),  ctrl.createBooking);
r.get('/:id',              roleGuard(['user','pm','admin']),                            ctrl.getBookingById);
r.post('/:id/cancel',      roleGuard(['user','admin']), validate(cancelSchema),         ctrl.cancelBooking);
r.get('/customer/bookings',roleGuard(['user']),                                         ctrl.listCustomerBookings);
export default r;
```

### 16.5 Sample Auth Middleware

```js
// src/middleware/auth.middleware.js
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';
import { redis } from '../config/redis.js';
import { JWT_PUBLIC_KEY } from '../config/env.js';

const PUBLIC = new Set([
  '/api/auth/send-otp',
  '/api/auth/verify-otp',
  '/api/auth/guest-access',
  '/api/miscellaneous/contact-us',
  '/api/payments/webhook',
]);

export async function authMiddleware(req, _res, next) {
  if (PUBLIC.has(req.path)) return next();
  const header = req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new AppError('AUTH_TOKEN_MISSING', 'Missing token', 401));
  try {
    const claims = jwt.verify(token, JWT_PUBLIC_KEY, { algorithms: ['RS256'], audience: 'quickhire-api' });
    const blocked = await redis.get(`blocklist:${claims.sessionId}`);
    if (blocked) throw new AppError('AUTH_TOKEN_REVOKED', 'Session revoked', 401);
    req.user = { id: claims.sub, role: claims.role, sessionId: claims.sessionId };
    next();
  } catch (e) {
    next(new AppError('AUTH_TOKEN_INVALID', 'Invalid or expired token', 401));
  }
}
```

### 16.6 Sample Socket Implementation

```js
// src/socket/index.js
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { pubClient, subClient } from '../config/redis.js';
import { JWT_PUBLIC_KEY } from '../config/env.js';
import { registerChatHandlers } from '../modules/chat/chat.socket.js';
import { logger } from '../config/logger.js';

export function attachSocketIO(httpServer) {
  const io = new Server(httpServer, {
    path: '/api/socket.io',
    cors: { origin: process.env.ALLOWED_ORIGINS.split(','), credentials: true },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
  });

  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      const claims = jwt.verify(token, JWT_PUBLIC_KEY, { algorithms: ['RS256'] });
      socket.data.user = { id: claims.sub, role: claims.role };
      next();
    } catch (e) { next(new Error('UNAUTHORIZED')); }
  });

  io.on('connection', (socket) => {
    const { id: userId, role } = socket.data.user;
    socket.join(`user_${userId}`);
    if (role === 'admin') socket.join('role_admin');
    logger.info({ userId, role, sid: socket.id }, 'socket connected');

    registerChatHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      logger.info({ userId, sid: socket.id, reason }, 'socket disconnected');
    });
  });

  return io;
}
```

```js
// src/modules/chat/chat.socket.js
import * as chatService from './chat.service.js';
import { logger } from '../../config/logger.js';

export function registerChatHandlers(io, socket) {
  const user = socket.data.user;

  socket.on('chat:join', async ({ roomId }, ack) => {
    const allowed = await chatService.canJoinRoom(user, roomId);
    if (!allowed) return ack?.({ ok: false, error: 'FORBIDDEN' });
    socket.join(roomId);
    ack?.({ ok: true });
  });

  socket.on('chat:leave', ({ roomId }) => socket.leave(roomId));

  socket.on('message', async (payload, ack) => {
    try {
      const msg = await chatService.persistAndBroadcast({
        sender: user, ...payload,
      });
      io.to(payload.roomId).emit('message:new', { ...msg, tempId: payload.tempId });
      ack?.({ ok: true, messageId: msg._id });
    } catch (e) {
      logger.error({ err: e, user }, 'message failed');
      ack?.({ ok: false, error: e.code || 'INTERNAL' });
    }
  });

  socket.on('typing', ({ roomId, isTyping }) => {
    socket.to(roomId).emit('typing', { userId: user.id, isTyping });
  });

  socket.on('seen', async ({ roomId, messageId }) => {
    await chatService.markSeen(messageId, user.id);
    io.to(roomId).emit('seen', { messageId, userId: user.id, at: new Date() });
  });
}
```

### 16.7 Sample Redux Slice — `bookingSlice.js`

```js
// lib/redux/slices/bookingSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { bookingService } from '../../services/bookingApi';

export const fetchOngoingBookings = createAsyncThunk(
  'booking/fetchOngoing',
  async ({ page = 1, pageSize = 10 } = {}, { rejectWithValue }) => {
    try {
      const res = await bookingService.getOngoingBookings({
        page, pageSize,
        statuses: 'confirmed,assigned_to_pm,in_progress',
      });
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.error || { message: e.message });
    }
  }
);

export const createBooking = createAsyncThunk(
  'booking/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await bookingService.createBooking(payload);
      return res.data;
    } catch (e) {
      return rejectWithValue(e.response?.data?.error || { message: e.message });
    }
  }
);

export const cancelBooking = createAsyncThunk(
  'booking/cancel',
  async ({ bookingId, reason }, { rejectWithValue }) => {
    try {
      const res = await bookingService.cancelBooking(bookingId, reason);
      return { bookingId, data: res.data };
    } catch (e) {
      return rejectWithValue(e.response?.data?.error || { message: e.message });
    }
  }
);

const initialState = {
  ongoing: { items: [], meta: { page: 1, pageSize: 10, total: 0 }, status: 'idle', error: null },
  current: null,
  createStatus: 'idle',
  createError: null,
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setCurrentBooking(state, { payload }) { state.current = payload; },
    clearCurrentBooking(state) { state.current = null; },
    applyBookingStatusEvent(state, { payload }) {
      const { bookingId, status } = payload;
      const idx = state.ongoing.items.findIndex(b => b._id === bookingId);
      if (idx !== -1) state.ongoing.items[idx].status = status;
      if (state.current?._id === bookingId) state.current.status = status;
    },
    resetCreate(state) { state.createStatus = 'idle'; state.createError = null; },
  },
  extraReducers: (b) => {
    b.addCase(fetchOngoingBookings.pending,   (s) => { s.ongoing.status = 'loading'; s.ongoing.error = null; })
     .addCase(fetchOngoingBookings.fulfilled, (s, { payload }) => {
        s.ongoing.status = 'succeeded';
        s.ongoing.items  = payload.items || payload.data || [];
        s.ongoing.meta   = payload.meta || s.ongoing.meta;
      })
     .addCase(fetchOngoingBookings.rejected,  (s, { payload }) => { s.ongoing.status = 'failed'; s.ongoing.error = payload; })
     .addCase(createBooking.pending,   (s) => { s.createStatus = 'loading'; s.createError = null; })
     .addCase(createBooking.fulfilled, (s, { payload }) => { s.createStatus = 'succeeded'; s.current = payload; })
     .addCase(createBooking.rejected,  (s, { payload }) => { s.createStatus = 'failed';    s.createError = payload; })
     .addCase(cancelBooking.fulfilled, (s, { payload }) => {
        const i = s.ongoing.items.findIndex(b => b._id === payload.bookingId);
        if (i !== -1) s.ongoing.items[i].status = 'cancelled';
      });
  },
});

export const { setCurrentBooking, clearCurrentBooking, applyBookingStatusEvent, resetCreate } = bookingSlice.actions;

export const selectOngoing       = (s) => s.booking.ongoing;
export const selectCurrentBooking= (s) => s.booking.current;
export const selectCreateStatus  = (s) => ({ status: s.booking.createStatus, error: s.booking.createError });

export default bookingSlice.reducer;
```

### 16.8 Sample Worker — `notification.consumer.js`

```js
// src/modules/notification/notification.consumer.js
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { dispatch } from './notification.service.js';
import { logger } from '../../config/logger.js';

const sqs = new SQSClient({});
const QueueUrl = process.env.SQS_NOTIFICATION_URL;

export async function runConsumer() {
  while (true) {
    const { Messages = [] } = await sqs.send(new ReceiveMessageCommand({
      QueueUrl, MaxNumberOfMessages: 10, WaitTimeSeconds: 20, VisibilityTimeout: 60,
    }));
    await Promise.all(Messages.map(async (m) => {
      try {
        const evt = JSON.parse(m.Body);
        await dispatch(evt);
        await sqs.send(new DeleteMessageCommand({ QueueUrl, ReceiptHandle: m.ReceiptHandle }));
      } catch (e) {
        logger.error({ err: e, body: m.Body }, 'notification dispatch failed');
        // leave message: SQS will redeliver until DLQ
      }
    }));
  }
}
```

---

## Appendix A — Implementation Checklist

- [ ] Bootstrap monolith repo with module structure (§8.1)
- [ ] Wire Mongo + Redis + AWS SDK + Pino + Socket.IO + Redis adapter
- [ ] Implement Auth (OTP, JWT RS256, sessions, guest, refresh)
- [ ] Implement Service catalog + admin availability with Redis caching
- [ ] Implement Booking module with state machine + idempotency + slot lock
- [ ] Implement Job + Pricing
- [ ] Implement Payment module incl. webhook + signature verification
- [ ] Implement Chat (HTTP + Socket + S3 presigned uploads)
- [ ] Implement Notification (SQS consumer + socket fan-out + push/email)
- [ ] Implement Admin endpoints (confirm, assign PM, dashboard)
- [ ] Implement PM + Resource APIs
- [ ] CI/CD pipelines + Dockerfile + ECS task defs + Terraform/CDK for infra
- [ ] CloudWatch dashboards + alarms + X-Ray
- [ ] Load test chat to 50K concurrent (artillery + socketio-client)
- [ ] Game-day exercise: kill chat task, verify reconnect + history backfill
- [ ] Security review: WAF rules, Secrets rotation, OWASP top 10 sweep
