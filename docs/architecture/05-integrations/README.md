# Third-Party Integrations

---

## 1. Razorpay (Payment Gateway)

**SDK:** `razorpay@2.9.4`  
**Config:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`

**Usage pattern:** Lazy import — Razorpay instance not created until first payment request. Prevents startup failure when keys not configured (dev mode).

```js
// Lazy initialization
let _rzp;
async function rzp() {
  if (_rzp) return _rzp;
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET)
    throw new AppError('CONFIG_ERROR', 'Razorpay keys not configured', 500);
  const Razorpay = (await import('razorpay')).default;
  _rzp = new Razorpay({ key_id, key_secret });
  return _rzp;
}
```

**API calls made:**
- `rzp.orders.create({ amount, currency, receipt, notes })` — amount in paise
- Client-side: `new Razorpay({ key_id, order_id, ... }).open()` (Razorpay JS SDK loaded by frontend)

**Webhook security:** Raw body buffer required for HMAC-SHA256 signature verification. Mounted with `express.raw()` before `express.json()` in app.js to preserve the buffer.

**Currency:** All transactions are INR only. Multi-currency not implemented (even though geo pricing is).

**Events handled:**
- `payment.captured` → mark paid + confirm booking + auto-assign PM
- `order.paid` → same as captured
- `payment.failed` → mark payment failed

**Deduplication:** `rawWebhookEvents[]` array on payment doc stores all received event IDs. Webhook handler checks `rawWebhookEvents.some(e => e.id === eventId)` before processing.

---

## 2. AWS S3 (File Storage)

**SDK:** `@aws-sdk/client-s3@3.658.0`, `@aws-sdk/s3-request-presigner@3.658.0`  
**Config:** `AWS_REGION` (default: ap-south-1), `S3_BUCKET_CHAT`, `S3_BUCKET_INVOICES`

**Usage:**

| Operation | When | Details |
|---|---|---|
| `PutObjectCommand` | Chat file upload | Direct backend upload after multer in-memory buffer |
| `PutObjectCommand` (presigned) | Direct browser upload | 5-minute presigned PUT URL |
| `GetObjectCommand` (presigned) | Attachment download | 1-hour presigned GET URL |
| Invoice PDF | After payment | `invoice.worker.js` uploads generated PDF to `S3_BUCKET_INVOICES` |

**Bucket structure:**
```
S3_BUCKET_CHAT/
  chat/{customerId}/{nanoid10}-{filename}
  chat/{userId}/{nanoid10}-{filename}       ← from upload-url flow

S3_BUCKET_INVOICES/
  invoices/invoice_{jobId}.pdf
```

**Allowed MIME types for chat:** image/jpeg, image/png, image/webp, image/gif, application/pdf, application/zip, text/plain  
**Max file size:** 25MB

**Key path validation:** `GET /chat/attachment-url?key=chat/...` — validates key starts with `chat/` to prevent path traversal.

---

## 3. AWS SES (Email)

**SDK:** `@aws-sdk/client-ses@3.658.0`  
**Config:** `SES_FROM` (default: no-reply@quickhire.services)

**Used by:** `email.worker.js` (SQS-backed email worker). Not called directly in main request path.

**Queue path:**
```
notification.service.js → SQS_EMAIL_URL → email.worker.js → SES.SendEmailCommand
```

**Status:** SES integration exists in workers but is not directly observable from main codebase routes. `SES_FROM` env var is validated.

---

## 4. AWS SNS (Push Notifications)

**SDK:** `@aws-sdk/client-sns@3.658.0`  
**Config:** No dedicated env var (uses AWS_REGION + default credentials)

**Flow:**
```
1. Device registers with FCM → gets FCM token
2. Backend creates SNS endpoint ARN for the FCM token (not in codebase — assumed pre-created)
3. user.fcmTokens[] stores: { token: "fcm_token", endpointArn: "arn:aws:sns:..." }
4. On notification: SNS.PublishCommand to each endpointArn
   Message structure: { default, GCM: JSON.stringify({ notification, data }) }
```

**Gap:** SNS endpoint ARN creation (step 2) is not implemented in this codebase. The `endpointArn` field must be populated externally or via a separate mobile registration endpoint.

---

## 5. AWS SQS (Message Queues)

**SDK:** `@aws-sdk/client-sqs@3.658.0`  
**Config:** `SQS_NOTIFICATION_URL`, `SQS_INVOICE_URL`, `SQS_EMAIL_URL`

**All optional** — SQS is only used when URLs are configured. The main notification path uses BullMQ/Redis instead.

| Queue | Producer | Consumer | When triggered |
|---|---|---|---|
| `SQS_INVOICE_URL` | `payment.routes.js` after successful verify | `invoice.worker.js` | Payment verified |
| `SQS_NOTIFICATION_URL` | Legacy path | `notification.worker.js` | Fallback notification path |
| `SQS_EMAIL_URL` | Email trigger points | `email.worker.js` | Transactional emails |

**Current status:** SQS is a secondary/legacy path. BullMQ is the primary queue system. The SQS workers are run as separate processes (not started by server.js).

---

## 6. Meilisearch (Full-Text Search)

**SDK:** `meilisearch@0.44.1`  
**Config:** `MEILISEARCH_URL` (default: http://localhost:7700), `MEILISEARCH_KEY`

**Initialization:** Non-blocking. If Meilisearch is unavailable, `initMeilisearch()` logs a warning and sets `isMeiliReady()` flag to false. All search routes fall back to MongoDB.

**Indexes:**
- `bookings` — booking search for admin/ops (customerName, status, serviceTitle, pmName)
- `resources` — staff search (name, skills, specialization)
- `articles` — public article/FAQ search (powers chatbot + help centre)

**Reindex trigger:** `POST /search/reindex` (super_admin) — runs `src/scripts/reindex.js`.

**Chatbot usage:** Retrieves relevant article chunks by searching `articles` index with the user's question. Falls back to MongoDB keyword regex search.

---

## 7. Sentry (Error Tracking)

**SDK:** `@sentry/node@10.50.0`  
**Config:** `SENTRY_DSN`, `APP_VERSION`

**Init order:** Must be the very first import in `server.js` before any other code that could throw.

**Context:** `setSentryUser(req.user)` called in auth middleware — every error captured after auth includes the user ID and role.

**Express handler:** `sentryErrorHandler()` is the second-to-last middleware, after routes but before the custom error formatter. Captures all unhandled errors with request context.

---

## 8. MSG91 / SMS Providers

**Config:** `SMS_PROVIDER` (mock | msg91 | sns), `MSG91_AUTH_KEY`

**Provider selection:**

| Value | Behavior |
|---|---|
| `mock` | Logs OTP to console: `[MOCK SMS]` |
| `msg91` | HTTP GET to MSG91 API (route 4 = transactional). Falls back to log on failure. |
| `sns` | (enum value exists but not implemented in code) |

**MSG91 API:**
```
GET https://api.msg91.com/api/sendhttp.php
  ?authkey={MSG91_AUTH_KEY}
  &mobiles=91{mobile}
  &message={encodedOtp}
  &route=4&country=91
```
8-second timeout. On any failure: falls back to `[OTP FALLBACK LOG]` in backend logs.

---

## 9. Anthropic / Claude API (AI Chatbot)

**Config:** `ANTHROPIC_API_KEY`  
**Used by:** `chatbot.routes.js`

**Flow:**
```
User sends question
  → Rate limit: 10 messages/min (Redis counter)
  → retrieveContext(question): Meilisearch or keyword fallback
    Returns 3 most relevant article chunks (600 chars each)
  → Call Claude API with system prompt + context + question
  → Return AI answer + source citations
```

**Model:** Not pinned in code — uses whatever model the API key has access to. Should be updated to pin a specific model (claude-opus-4-7 or claude-sonnet-4-6).

---

## 10. prom-client (Prometheus Metrics)

**Config:** None (always enabled)  
**Endpoint:** `GET /metrics`

**Custom metrics:**
- `connected_sockets` gauge — currently connected Socket.io clients (inc/dec on connect/disconnect)
- Standard Node.js process metrics (memory, CPU, event loop)
- HTTP request duration histogram (from `metricsMiddleware`)

**Monitoring config:** `monitoring/` directory in backend (likely Prometheus/Grafana config).

---

## Integration Dependency Map

```
Razorpay:    payment.routes.js + payment.webhook.js
S3:          chat.routes.js + invoice.worker.js
SES:         email.worker.js
SNS:         notification.service.js (push notifications)
SQS:         payment.routes.js (invoice) + workers/
Redis:       auth, caching, BullMQ, Socket.io adapter
Meilisearch: search.routes.js + chatbot.routes.js
Sentry:      server.js (first import) + auth.middleware.js + error.middleware.js
MSG91:       auth.service.js (OTP)
Claude API:  chatbot.routes.js
prom-client: app.js + socket/index.js
```
