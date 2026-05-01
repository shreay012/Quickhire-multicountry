# Payment Flow — Razorpay

---

## Happy Path (Full Flow)

```
Customer                Frontend              Backend              Razorpay             Webhook
   │                       │                     │                     │                     │
   │  Click "Pay Now"      │                     │                     │                     │
   │──────────────────────>│                     │                     │                     │
   │                       │  POST /payments/create-order              │                     │
   │                       │  { jobId, amount }  │                     │                     │
   │                       │────────────────────>│                     │                     │
   │                       │                     │  Find job by jobId  │                     │
   │                       │                     │  rzp.orders.create()│                     │
   │                       │                     │────────────────────>│                     │
   │                       │                     │  { id: "order_...", amount: 755200 (paise) }
   │                       │                     │<────────────────────│                     │
   │                       │                     │  INSERT payments    │                     │
   │                       │                     │  status: "created"  │                     │
   │                       │  { orderId, keyId, amount, currency }     │                     │
   │                       │<────────────────────│                     │                     │
   │                       │                     │                     │                     │
   │                       │  Open Razorpay modal│                     │                     │
   │                       │  (Razorpay JS SDK)  │                     │                     │
   │  Enter card/UPI/netbanking                  │                     │                     │
   │──────────────────────>│                     │                     │                     │
   │                       │                     │                     │  Razorpay charges   │
   │                       │                     │                     │  → onSuccess callback
   │                       │  Receives:          │                     │                     │
   │                       │  razorpay_payment_id│                     │                     │
   │                       │  razorpay_order_id  │                     │                     │
   │                       │  razorpay_signature │                     │                     │
   │                       │                     │                     │                     │
   │                       │  POST /payments/verify                    │                     │
   │                       │  (+ Idempotency-Key header)               │                     │
   │                       │────────────────────>│                     │                     │
   │                       │                     │  HMAC-SHA256 verify │                     │
   │                       │                     │  sha256(orderId|paymentId) = signature?   │
   │                       │                     │                     │                     │
   │                       │                     │  UPDATE payments → paid                   │
   │                       │                     │  bookingService.transition → "confirmed"  │
   │                       │                     │  jobs UPDATE → status:"paid", paidAt      │
   │                       │                     │  autoAssignPm(jobId) ← async             │
   │                       │                     │  SQS.send(invoice message)               │
   │                       │  { paymentId, status: "paid" }            │                     │
   │                       │<────────────────────│                     │                     │
   │  Redirect to          │                     │                     │                     │
   │  /payment-success     │                     │                     │                     │
   │                       │                     │                     │                     │
   │                       │                     │                   Razorpay webhook fires  │
   │                       │                     │                     │  POST /payments/webhook
   │                       │                     │<────────────────────────────────────────│
   │                       │                     │  Verify webhook signature               │
   │                       │                     │  Dedup by event.id (rawWebhookEvents[]) │
   │                       │                     │  Same effects as /verify                │
   │                       │                     │  (idempotent — already paid, skip)      │
   │                       │                     │────────────────────────────────────────>│
   │                       │                     │  { ok: true }                           │
```

---

## Razorpay Signature Verification

```
/payments/verify:
  expected = HMAC-SHA256(key_secret, "{order_id}|{payment_id}")
  timingSafeEqual(expected, received)    ← prevents timing attacks

/payments/webhook:
  expected = HMAC-SHA256(webhook_secret, raw_body_buffer)
  timingSafeEqual(expected, x-razorpay-signature header)
  Note: must use express.raw() — JSON parse destroys signature
```

---

## Idempotency

Payment verification is idempotent. On retry (network failure, browser refresh):
```
idemKey = Idempotency-Key header || "{orderId}:{paymentId}"
cached = redis.get("pay-verify:{userId}:{idemKey}")
if (cached) → return { success: true, data: cached, idempotent: true }
```
Result stored for 24 hours.

---

## Mock / Dev Mode

When `RAZORPAY_KEY_ID` or `RAZORPAY_KEY_SECRET` is absent:

**create-order:**
- Generates `order_dev_{timestamp}` and `pay_dev_{timestamp}`
- Inserts payment with `status: "paid"`, `mock: true`
- Immediately marks job as `paid`
- Triggers `autoAssignPm`

**verify:**
- Skips signature check (logs warning)
- Accepts any `razorpay_payment_id` / `razorpay_order_id`

This lets the entire booking → payment → PM assignment flow run in dev without real Razorpay keys.

---

## Invoice Flow

```
After payment:
  1. Backend enqueues to SQS_INVOICE_URL: { paymentId, jobId }
  2. invoice.worker.js (SQS consumer) generates PDF + uploads to S3 (SQS_INVOICE_URL)
  3. Updates payments doc: invoice.url = "https://{S3_BUCKET_INVOICES}.s3.../invoice_{jobId}.pdf"

GET /payments/invoice/download/:jobId:
  1. Find payment by jobId with status: "paid"
  2. If payment.invoice.url exists → return { url } (FE redirects to S3)
  3. Else: generate minimal inline PDF (hand-built PDF spec, no external dep)
     → streams as application/pdf attachment
```

---

## Payment Document Lifecycle

```
INSERT { status: "created" }      ← create-order
UPDATE { status: "paid", paymentId, signatureValid: true }  ← verify
  OR
UPDATE { status: "failed" }       ← webhook payment.failed
```

---

## Known Issues

1. **Double payment path:** Both `/payments/verify` (client-triggered) and the Razorpay webhook can mark a payment `paid`. Code handles this with idempotency (`rawWebhookEvents[]` dedup + idempotency key), but the booking `transition()` call in both paths may see an `INVALID_TRANSITION` error (already confirmed) — this is silently logged, not re-thrown. Correct behavior but confusing logs.

2. **Amount in payment doc is INR, not paise:** The `amount` field on the payment document stores INR (e.g. 7552), while Razorpay API receives paise (755200). This is correct but worth noting for any finance reporting that queries this field.

3. **Currency hardcoded to INR:** Payment is always processed in INR regardless of customer's geo. Multi-currency checkout is not implemented — only the pricing display adapts to country.
