# Booking Flow Sequence Diagrams

---

## 1. End-to-End Customer Booking Journey

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant FE as Frontend<br/>(Next.js)
    participant API as Express API
    participant Redis as Redis
    participant DB as MongoDB
    participant Razorpay as Razorpay
    participant BullMQ as BullMQ
    participant PM as Project Manager

    rect rgb(230, 245, 255)
        Note over C,FE: STEP 1 — Browse & Select Service
        C->>FE: Visit homepage / service-details
        FE->>API: GET /services
        API->>DB: find services { active: true }
        DB-->>API: service docs (with pricing[] array)
        API-->>FE: flattenI18nDeep(services, locale)
        FE-->>C: Service cards with localised names + prices
    end

    rect rgb(255, 245, 230)
        Note over C,FE: STEP 2 — Configure Booking
        C->>FE: /book-your-resource
        C->>FE: Select technologies, duration, type (hourly/project)
        FE->>API: POST /jobs/pricing<br/>{ serviceId, country, duration }
        API->>DB: find service by ID
        API->>API: resolveServicePrice(service, country)
        API->>API: apply 18% GST for IN
        API-->>FE: { subtotal, tax, total, currency }
        FE-->>C: Price breakdown
    end

    rect rgb(230, 255, 230)
        Note over C,FE: STEP 3 — Check Availability
        FE->>API: GET /bookings/availability?serviceId=&date=
        API->>API: buildAvailability(serviceId, 7 days)
        loop For each day × 2 slots
            API->>DB: countOccupants (3 queries: Date+Date+string)
        end
        API-->>FE: { slots: [{ date, time, available, instant }] }
        C->>FE: Select date + slot
    end

    rect rgb(255, 230, 255)
        Note over C,FE: STEP 4 — Checkout
        C->>FE: /checkout — fill name, email, requirements
        FE->>API: POST /jobs<br/>{ services:[{...}], preferredStartDate, slot, ... }
        API->>Redis: SET slot:lock:{serviceId}:{date}:{time} NX 30s
        alt slot taken (lock exists)
            API-->>FE: 409 SLOT_TAKEN
            FE-->>C: "Slot no longer available"
        end
        API->>DB: checkSlotBookable() — validates capacity
        API->>DB: INSERT jobs collection<br/>status: "pending"
        API->>DB: INSERT booking_histories<br/>{ from: null, to: "pending" }
        API->>Redis: DEL slot:lock (release after insert)
        API-->>FE: { jobId, status: "pending" }
    end

    rect rgb(255, 255, 220)
        Note over C,FE: STEP 5 — Payment
        FE->>API: POST /payments/create-order<br/>{ jobId }
        API->>DB: find job by jobId
        API->>Razorpay: orders.create({ amount (paise), currency: "INR" })
        Razorpay-->>API: { id: "order_xxx", amount }
        API->>DB: INSERT payments { status: "created" }
        API-->>FE: { orderId, keyId, amount }

        FE->>FE: Open Razorpay modal
        C->>FE: Pay via card / UPI / netbanking
        Razorpay-->>FE: onSuccess { payment_id, order_id, signature }

        FE->>API: POST /payments/verify<br/>{ paymentId, orderId, signature }<br/>+ Idempotency-Key header
        API->>Redis: GET pay-verify:{userId}:{idemKey}
        alt cached (retry)
            API-->>FE: { success: true, idempotent: true }
        end
        API->>API: HMAC-SHA256 verify signature
        API->>DB: UPDATE payments → { status: "paid" }
        API->>DB: UPDATE jobs → { status: "paid", paidAt }
        API->>API: bookingService.transition("confirmed")
        API->>DB: INSERT booking_histories { from: "pending", to: "confirmed" }
        API->>BullMQ: Enqueue notification (BOOKING_CONFIRMED)
        API->>API: autoAssignPm(jobId) [async]
        API-->>FE: { paymentId, status: "paid" }
        FE-->>C: Redirect /payment-success
    end

    rect rgb(220, 255, 255)
        Note over API,PM: STEP 6 — PM Auto-Assignment (async)
        API->>DB: Find all active PMs
        API->>DB: countDocuments active jobs per PM
        API->>DB: findOneAndUpdate jobs<br/>{ pmId: { $exists: false } } → set pmId = lowestLoadPM
        alt assigned successfully (modifiedCount=1)
            API->>DB: UPDATE jobs { pmId, assignedAt }
            API->>BullMQ: Enqueue notification (ASSIGNED_TO_PM)<br/>→ customer + PM notified
            BullMQ->>DB: INSERT notifications (customer + PM)
            BullMQ-->>C: Push + in-app: "PM assigned"
            BullMQ-->>PM: Push + in-app: "New booking"
        end
    end

    rect rgb(255, 240, 220)
        Note over C,PM: STEP 7 — Booking Workspace
        C->>FE: /booking-workspace?jobId=
        FE->>API: GET /jobs/:id
        API->>DB: find job, populate services[], lookup PM
        API-->>FE: Full job doc with PM details
        FE-->>C: Workspace — chat, resource info, timeline

        C->>FE: Send message in chat
        FE->>API: Socket emit "send-message"<br/>{ roomId, content, type }
        API->>DB: INSERT messages
        API->>API: Broadcast "new-message" to room
        PM-->>FE: Receives message in real-time
    end
```

---

## 2. Booking State Machine

```mermaid
stateDiagram-v2
    [*] --> pending : POST /jobs (slot locked + inserted)
    pending --> confirmed : Payment verified (/payments/verify)
    pending --> cancelled : Customer cancels or no payment
    confirmed --> in_progress : Admin / PM marks started
    confirmed --> cancelled : Admin cancels pre-start
    in_progress --> completed : lifecycle tick (auto when deadline passed)\nor manual completion
    in_progress --> escalated : Admin escalates issue
    escalated --> in_progress : Issue resolved
    completed --> [*]
    cancelled --> [*]

    note right of pending
        Auto-transitions:
        30min before end → reminder sent
        Past deadline + in_progress → auto-complete
    end note

    note right of confirmed
        PM assigned here (async, after payment)
        Booking workspace unlocked
    end note
```

---

## 3. Slot Availability & Locking

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant API as Express API
    participant Redis as Redis
    participant DB as MongoDB

    Note over FE,DB: Availability Check (read-only, no lock)
    FE->>API: GET /bookings/availability?serviceId=&startDate=
    loop 7 days × 2 slots = 14 checks
        API->>DB: Query 1: jobs collection (Date type preferredStartDate)
        API->>DB: Query 2: jobs collection (string ISO prefix regex)
        API->>DB: Query 3: bookings collection (legacy)
        API->>API: count = sum of 3 queries
        API->>API: available = (capacity - count) > 0
    end
    API-->>FE: 14-slot grid with available:bool + instant:bool

    Note over FE,DB: Slot Booking (with distributed lock)
    FE->>API: POST /jobs { serviceId, date, slot }
    API->>Redis: SET slot:lock:{serviceId}:{date}:{time} = 1 NX EX 30
    alt lock acquired
        API->>DB: checkSlotBookable() — re-verify capacity
        alt still available
            API->>DB: INSERT jobs (status: pending)
            API->>Redis: DEL slot:lock (explicit release)
            API-->>FE: { jobId }
        else capacity hit between check and lock
            API->>Redis: DEL slot:lock
            API-->>FE: 409 SLOT_FULL
        end
    else lock exists (another booking in progress)
        API-->>FE: 409 SLOT_TAKEN
    end
```

---

## 4. Lifecycle Tick (BullMQ Repeating Job)

```mermaid
sequenceDiagram
    autonumber
    participant BullMQ as BullMQ<br/>(lifecycle queue)
    participant Handler as lifecycle.handler.js
    participant DB as MongoDB
    participant NotifQ as notifications queue

    Note over BullMQ: Fires every 60 seconds
    BullMQ->>Handler: Process lifecycle job

    Handler->>DB: Find up to 500 jobs<br/>status: in_progress<br/>sorted by endTime ASC

    loop For each active job
        Handler->>Handler: now = Date.now()

        alt endTime - now <= 30min AND endReminderSentAt not set
            Handler->>DB: UPDATE job { endReminderSentAt: now }
            Handler->>NotifQ: Enqueue BOOKING_ENDING_SOON<br/>→ customer + PM
        end

        alt now > endTime AND status = in_progress AND startedAt set
            Handler->>DB: UPDATE job status → "completed"
            Handler->>DB: INSERT booking_histories { from: in_progress, to: completed }
            Handler->>NotifQ: Enqueue BOOKING_COMPLETED
        end
    end

    Note over Handler: Does NOT auto-start bookings<br/>(prevents ghost countdowns if PM not ready)
```

---

## 5. Razorpay Webhook (Dedup + Idempotency)

```mermaid
sequenceDiagram
    autonumber
    participant RP as Razorpay
    participant API as Express API<br/>(webhook handler)
    participant DB as MongoDB

    RP->>API: POST /payments/webhook<br/>x-razorpay-signature: {sig}<br/>raw body (express.raw())

    API->>API: HMAC-SHA256(webhook_secret, rawBody)
    API->>API: timingSafeEqual(computed, header sig)
    alt invalid signature
        API-->>RP: 400 INVALID_SIGNATURE
    end

    API->>DB: Find payment by orderId
    API->>API: Check rawWebhookEvents[].some(e => e.id === event.id)
    alt duplicate event
        API-->>RP: 200 OK (already processed)
    end

    API->>DB: $push rawWebhookEvents { id, event, at }

    alt event = payment.captured OR order.paid
        API->>DB: UPDATE payment { status: "paid" }
        API->>DB: UPDATE job { status: "paid" }
        API->>API: bookingService.transition("confirmed")
        Note over API: If already confirmed → INVALID_TRANSITION<br/>logged silently, not re-thrown
    else event = payment.failed
        API->>DB: UPDATE payment { status: "failed" }
    end

    API-->>RP: 200 OK
```
