# Realtime, Queues, Workers & Cron

---

## Socket.io Architecture

### Server Setup

```
attachSocketIO(httpServer):
  Path:        /api/socket.io
  Transports:  websocket, polling (fallback)
  Ping:        timeout=30s, interval=25s
  Adapter:     Redis pub/sub (createAdapter(pubClient, subClient))
               → enables horizontal scaling (multiple pods share events)
  Auth:        JWT verification in io.use() middleware
               - Token from socket.handshake.auth.token or .query.token
               - Verifies RS256/HS256 same as HTTP middleware
               - Attaches socket.data.user = { id, role, sessionId }
```

### Room Architecture

| Room | Members | Events |
|---|---|---|
| `user_{userId}` | Every connected user (auto-join on connect) | `booking:status`, `booking:assigned`, `booking:end-reminder`, `notification`, `notification:new`, `message:new`, `server:shutdown` |
| `role_admin` | All admin-role users | `booking:new`, `booking:assigned`, `notification:new` |
| `service_{serviceId}_pending_{userId}` | Customer + any PM (pre-assignment) | `new-message`, `typing`, `user_typing` |
| `{pmId}_service_{serviceId}` | Customer + assigned PM (post-assignment) | `new-message`, `typing`, `user_typing` |
| `booking_{bookingId}` | Admin booking group chat room | `new-message` |
| `ticket_{ticketId}` | Customer + admin for ticket thread | `message:new` |

### Event Reference

| Event | Direction | Payload | Trigger |
|---|---|---|---|
| `connected` | Server→Client | `{ userId, role, serverTime }` | On socket connect |
| `booking:new` | Server→Admin | `{ bookingId, userId }` | New booking created |
| `booking:status` | Server→User | `{ bookingId, status, updatedAt }` | Any status transition |
| `booking:assigned` | Server→PM + Admin | `{ bookingId, pmId? }` | PM auto or manual assignment |
| `booking:end-reminder` | Server→User | `{ bookingId, minutesLeft }` | 30min before booking end |
| `notification` (legacy) | Server→User | Notification doc | Any notification |
| `notification:new` | Server→User | Notification doc | Any notification |
| `message:new` | Server→User | Message doc | Chat message received |
| `new-message` | Server→Room | Message doc | Chat message in room |
| `typing` + `user_typing` | Server→Room | `{ userId, isTyping }` | Typing indicator |
| `server:shutdown` | Server→All | `{ at }` | Graceful shutdown |

### Chat Socket Handlers (`chat.socket.js`)

Socket.io events from client (in addition to HTTP routes):
- `join-room` → `socket.join(roomId)` after `canJoinRoom()` authorization check
- `send-message` → `persistAndBroadcast()` + broadcast to room
- `typing` → broadcast typing indicator to room
- `mark-seen` → `markSeen(messageId, userId)`

---

## BullMQ Queue System

### Queue Registry

| Queue | Concurrency | Purpose |
|---|---|---|
| `notifications` | 10 | All notification fan-out (in-app + push) |
| `lifecycle` | 1 | Booking status auto-transitions (60s repeating tick) |
| `emails` | 5 (default) | Transactional emails via SES |
| `analytics` | 5 (default) | Async analytics/reporting tasks |

### Redis Connection

BullMQ uses a **dedicated Redis connection** (separate from pub/sub):
```js
const bullConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,    // required by BullMQ
  enableReadyCheck: false,
})
```

### Job Options (defaults)
```js
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },   // 2s → 4s → 8s
  removeOnComplete: { age: 3600 },                   // keep 1h
  removeOnFail: { age: 86400 }                       // keep 24h
}
```

### Notification Queue Handler

```
handleNotificationJob(job):
  data = { userId, type, title, body, data, channels }
  → calls dispatch() which:
    1. Inserts into notifications collection
    2. emitTo(user_{userId}, 'notification', doc)
    3. emitTo(user_{userId}, 'notification:new', doc)
    4. pushToUser(userId, payload):
       - Find user.fcmTokens with endpointArn
       - For each: SNS.PublishCommand to device endpoint ARN
       - Message structure: GCM (FCM) JSON format
```

### Notification Enqueue Path

```
Any module calls:
  enqueueNotification({ userId, type, title, body, data })
    → tries BullMQ enqueue
    → fallback: inline dispatch() if BullMQ not ready
```

This pattern handles the startup window when queues aren't initialized yet.

---

## Lifecycle Cron (Booking Auto-transitions)

### Design

Instead of `setInterval`, uses BullMQ repeating job:
```js
queue.add('tick', { type: 'lifecycle_tick' }, {
  repeat: { every: 60_000, key: 'lifecycle_tick' },
  removeOnComplete: false,
  removeOnFail: false,
})
```

**Why:** BullMQ repeating jobs use Redis locks — only one pod processes the tick at a time. Prevents duplicate transitions in multi-pod deployments.

### What the tick does

1. Loads up to 500 jobs with active statuses (sorted by soonest end time)
2. **30-min reminder:** If `in_progress` + ≤30min remaining + `!endReminderSentAt` → notifies customer + PM
3. **Auto-complete:** If `in_progress` + `startedAt` + now ≥ startedAt + durationTime → transitions to `completed`

### Window Resolution Priority
```
1. job.schedule.date + job.schedule.start/end (admin-set schedule)
2. services[0].preferredStartDate + startTime + endTime/durationTime
3. job.startTime + job.endTime (legacy flat)
```

---

## Workers (`src/workers/`)

Legacy standalone worker scripts. These were the original worker pattern before BullMQ migration. They poll SQS queues.

| Worker | SQS Queue | Purpose |
|---|---|---|
| `notification.worker.js` | `SQS_NOTIFICATION_URL` | Legacy SQS notification processor |
| `invoice.worker.js` | `SQS_INVOICE_URL` | Invoice PDF generation + S3 upload |
| `email.worker.js` | `SQS_EMAIL_URL` | Email sending via SES |
| `lifecycle.worker.js` | — | Legacy in-process lifecycle tick (replaced by queue) |

**Current state:** The BullMQ system (queue/setup.js) is the primary worker path. The SQS workers (`workers/`) are legacy/supplementary. The `package.json` scripts `worker:notifications`, `worker:invoice`, `worker:email` still exist but are not started by `server.js` — they run as separate processes or are unused.

---

## Bull-Board Dashboard

Available at `/admin/queues` (requires admin auth).
Provides a UI to inspect queue depths, retry failed jobs, and view job details.

```js
setupQueueDashboard(app):
  Uses @bull-board/express
  Mounted at /admin/queues
  All 4 queues registered for monitoring
```

---

## Redis Key Namespace Reference

| Key Pattern | TTL | Purpose |
|---|---|---|
| `otp:{role}:{mobile}` | 300s | Bcrypt-hashed OTP |
| `otp:rate:{mobile}` | 60s | OTP rate limit counter |
| `blocklist:{sessionId}` | Token TTL | Revoked session |
| `slot:{serviceId}:{startTime}` | 60s | Booking slot lock (legacy) |
| `slot:lock:{serviceId}:{date}:{startTime}` | 10s | Slot race lock (v3) |
| `idempotency:{type}:{userId}:{key}` | 86400s | Idempotent operation cache |
| `pay-verify:{userId}:{idemKey}` | 86400s | Payment verify idempotency |
| `cache:services:all` | Manual invalidation | All services list |
| `cache:services:{id}` | Manual invalidation | Single service |
| `cache:cms:{key}` | Manual invalidation | CMS content block |
| `scorecard:{staffId}:{role}` | 600s | Scorecard computation |
| `scorecards:leaderboard:{role}:{limit}` | 600s | Leaderboard |
