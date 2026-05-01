# Booking Flow — End to End

## Overview

The booking flow has **two historical versions** in this codebase:

| Version | Collection | When | Notes |
|---|---|---|---|
| v1/v2 (legacy) | `bookings` | Old code | Still referenced; booking.routes.js handles it |
| v3 (current) | `jobs` | All new bookings | This is what the frontend uses today |

**All documentation below refers to the v3 flow.**

---

## Customer Journey (Step by Step)

```
Step 1: Service Discovery
  → GET /services  (public, cached in Redis)
  → Customer picks a service (e.g. "React Developer")
  → Redux: services slice updated (discoverSlice)

Step 2: Service Details
  → /service-details page
  → Displays service info, pricing per country, tech stack
  → Pricing resolved server-side by geo middleware

Step 3: Book Your Resource (/book-your-resource)
  → Select technologies
  → Select duration (days × hours)
  → Select booking type: "later" (scheduled) or "instant"

Step 4: Availability Slot Selection
  → GET /bookings/availability?serviceId= (or /jobs/pricing for price)
  → Backend builds 7-day grid: 2 slots/day (09:00–13:00, 14:00–18:00)
  → Slot disabled if: weekend / holiday / capacity full / past
  → Instant booking: checks current time is within an active slot
  → Redux: availabilitySlice updated

Step 5: Cart (/cart)
  → Customer reviews selection + pricing
  → Redux: cartSlice updated
  → Promo code input → POST /promo/validate → discount applied
  → POST /promo/auto-apply for best code suggestion

Step 6: Details + Login (/checkout)
  → If guest: prompted to login at this step (guestData preserved in localStorage)
  → Customer enters requirements

Step 7: Job Creation
  → POST /jobs  { services: [{ serviceId, durationTime, technologyIds, selectedDays,
                              preferredStartDate, bookingType, timeSlot, requirements }] }
  → Backend validates slot → acquires Redis lock → checks capacity → inserts job
  → Returns { job: { _id, status: "pending", pricing } }
  → Redux: bookingSlice updated with jobId

Step 8: Checkout → Payment (/checkout)
  → POST /payments/create-order { jobId, amount }
  → Backend creates Razorpay order (or mock)
  → Frontend opens Razorpay payment modal

Step 9: Payment
  → Customer pays via Razorpay modal
  → On success: POST /payments/verify { razorpay_payment_id, razorpay_order_id, razorpay_signature }
  → Backend: HMAC verify → mark payment paid → transition job → auto-assign PM

Step 10: Payment Success (/payment-success)
  → Customer sees confirmation
  → Socket: receives "booking:status" event → status = "assigned_to_pm"
  → Toast notification + push notification sent

Step 11: Booking Workspace (/booking-workspace)
  → Customer's real-time dashboard for the active booking
  → Chat with PM (Socket.io)
  → Timeline of status changes
  → Extend booking option
  → Download invoice
```

---

## State Machine — Job Status

```
                    [pending]
                       │
              (payment verified)
                       ▼
                    [paid]
                       │
              (PM auto-assigned)
                       ▼
              [assigned_to_pm]
                       │
             (PM starts work)
             (sets startedAt)
                       ▼
              [in_progress] ◄──── resume from ────► [paused]
                       │
         (durationTime hours elapsed from startedAt)
         OR (PM marks complete)
                       ▼
                  [completed]

Any state except completed → [cancelled]
```

All transitions are validated by `ALLOWED` map in `booking.service.js`:
```js
const ALLOWED = {
  pending:        ['confirmed', 'cancelled'],
  paid:           ['assigned_to_pm', 'cancelled'],
  scheduled:      ['assigned_to_pm', 'cancelled'],
  confirmed:      ['assigned_to_pm', 'cancelled'],
  assigned_to_pm: ['in_progress', 'paused', 'cancelled'],
  paused:         ['in_progress', 'cancelled'],
  in_progress:    ['completed', 'paused', 'cancelled'],
  completed:      [],
  cancelled:      [],
};
```

---

## Auto PM Assignment (after payment)

```
autoAssignPm(jobId):
  1. Find job by jobId
  2. If job.pmId already exists → return { already: true }
  3. Find all active PMs (meta.status ≠ inactive)
  4. Count active jobs per PM: status IN [assigned_to_pm, in_progress, paused]
  5. Pick PM with fewest active jobs (round-robin by load)
  6. findOneAndUpdate with { pmId: { $exists: false } } filter
     ↑ This prevents double-assignment on concurrent calls
  7. If modifiedCount === 0 → another pod already assigned → skip
  8. If no PM available:
     → Notify all admins: "booking {shortId} needs manual PM assignment"
     → Return null
  9. On success:
     → Set job.status = "assigned_to_pm"
     → Set job.pmId, job.projectManager
     → Emit socket: user_{pmId} ← "booking:assigned"
     → Emit socket: user_{customerId} ← "booking:status" { status: "assigned_to_pm" }
     → Emit socket: role_admin ← "booking:assigned"
     → Enqueue notification to PM: "New booking assigned"
     → Enqueue notification to customer: "Project Manager assigned"
     → Notify all admins: "booking paid + PM assigned"
```

---

## Booking Lifecycle Tick (BullMQ recurring job)

Runs every **60 seconds** via BullMQ repeating job.

```
handleLifecycleTick():
  1. Find all jobs with status IN [paid, scheduled, confirmed, assigned_to_pm, in_progress, paused]
     Sort by soonest end time. Limit 500 per tick.
  
  2. For each job:
     a. Resolve window: { start, end } from:
        - job.schedule.date + job.schedule.start/end
        - services[0].preferredStartDate + startTime/endTime/durationTime
        - job.startTime + job.endTime (legacy)
     
     b. 30-minute end reminder (if in_progress + minsToEnd ≤ 30 + !endReminderSentAt):
        - Update: endReminderSentAt = now  (dedup flag)
        - Notify customer: "booking ends in ~{N} min, want to extend?"
        - Notify PM: "booking ends in ~{N} min"
        - Emit: user_{userId} ← "booking:end-reminder" { minutesLeft }
     
     c. Auto-complete (if in_progress + startedAt set):
        - computedDeadline = startedAt + durationTime hours
        - If now >= computedDeadline:
          - updateOne with { status: booking.status } filter (optimistic lock)
          - Insert booking_histories record
          - Emit: user_{userId} ← "booking:status" { status: "completed" }
          - Enqueue notification: "booking complete"
  
  IMPORTANT: The lifecycle tick does NOT auto-start bookings (no auto-transition
  to in_progress). The PM must explicitly start work. This prevents "ghost 
  countdowns" where the timer started before actual work began.
```

---

## Booking Extension

```
POST /bookings/:id/extend
  { additionalHours, newEndTime, hourlyRate, subtotal, gst, total }

  1. Validate owner or staff
  2. Add additionalHours to job.duration
  3. Compute new endTime
  4. Update pricing.extensionTotal += total
  5. Update pricing.totalPaid += total
  6. Returns updated job (no new payment flow — payment assumed handled client-side)
```

---

## Availability Grid Building

```
buildAvailability({ serviceId }):
  1. Load scheduling config: { slotCapacity, holidays }
  2. For each day in next 7 days:
     a. isWeekend = Sunday or Saturday
     b. isOff = date in holidays[]
     c. For each of 2 fixed slots:
        - countOccupants: count bookings + jobs in that slot for that service
          (double counts between Date and string dates — see known bug)
        - isPassed: same-day slot with < 60min remaining
        - isFull: occupants >= slotCapacity
        - isBooked = isFull || isPassed
     d. isAvailable = !isWeekend && !isOff && has at least 1 open slot
  3. Instant slot: is current time within an active slot? Capacity available?
  4. Returns: { availability: [...], instant: { available, slot }, slotCapacity }
```

---

## Slot Booking Race Condition Protection

```
Two mechanisms work together:

1. Redis distributed lock (job creation):
   key = "slot:lock:{serviceId}:{date}:{startTime}"
   TTL = 10 seconds
   → acquireLock() returns false if lock exists → 409 BOOKING_SLOT_TAKEN
   → Lock released immediately after job insert

2. Capacity check (within lock):
   checkSlotBookable() counts existing occupants
   → Returns { ok: false, reason: 'SLOT_FULL' } if at capacity

Both happen inside the lock window, so two concurrent requests
cannot both see "available" and both create a booking.
```

---

## Booking Workspace (/booking-workspace)

Real-time workspace UI for an active booking:

```
Frontend components:
  - JobStatus bar (live status from socket)
  - Chat panel (Socket.io messages, real-time)
  - Timeline (status history from booking_histories)
  - Resource profile card
  - Extend booking button (calls /bookings/:id/extend)
  - Download invoice (calls /payments/invoice/download/:jobId)
  - End reminder toast (triggered by "booking:end-reminder" socket event)
```
