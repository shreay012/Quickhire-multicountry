# QuickHire — Master Architecture Index

> **Project:** QuickHire — On-demand tech talent marketplace  
> **Stack:** Next.js 16 · React 19 · Redux Toolkit · Node.js ESM · Express 4 · MongoDB · Redis · BullMQ · Socket.io  
> **Documented:** 2026-04-30

---

## Table of Contents

| # | Document | Coverage |
|---|---|---|
| 1 | [Project Overview](01-overview/README.md) | Product, entities, high-level architecture, tech stack |
| 2 | [Backend Architecture](02-backend/README.md) | Boot sequence, middleware chain, module registry |
| 3 | [All 27 Backend Modules](02-backend/modules.md) | Per-module: routes, business logic, collections, edge cases |
| 4 | [Frontend Architecture](03-frontend/README.md) | App Router, 28 pages, Redux slices, providers, i18n |
| 5 | [Database & Collections](04-data/collections.md) | All 20 collections, field shapes, relationships |
| 6 | [Third-party Integrations](05-integrations/README.md) | Razorpay, AWS S3/SES/SNS/SQS, Meilisearch, Sentry, SMS |
| 7 | [Deployment & Infrastructure](06-infra/README.md) | Docker, Render, Vercel, GitHub Actions, env vars |
| 8 | [Auth & RBAC Flow](07-flows/auth-flow.md) | OTP, JWT, refresh, guest, role matrix |
| 9 | [Booking Flow](07-flows/booking-flow.md) | End-to-end from service selection → completion |
| 10 | [Payment Flow](07-flows/payment-flow.md) | Razorpay order → webhook → PM assignment |
| 11 | [Realtime & Queues](07-flows/realtime-queues.md) | Socket.io rooms, BullMQ, lifecycle cron, workers |
| 12 | [Technical Debt & Audit](08-audit/README.md) | Security gaps, dead code, scaling risks, recommendations |
| 13 | [System Topology Diagram](diagrams/01-system-topology.md) | Full infrastructure map — all services, ports, data flows |
| 14 | [Auth Sequence Diagrams](diagrams/02-auth-sequence.md) | OTP login, token refresh, request auth, logout, guest |
| 15 | [Booking Sequence Diagrams](diagrams/03-booking-sequence.md) | End-to-end booking, state machine, slot locking, lifecycle |
| 16 | [Role & Permission Matrix](diagrams/04-role-matrix.md) | All 10 roles × 26 permissions, route guards, portals |
| 17 | [Socket.io Room Topology](diagrams/05-socket-rooms.md) | Rooms, events, fan-out, Redis adapter, client state machine |

---

## Quick Reference

### Roles (10 total)
`super_admin` · `admin` · `ops` · `finance` · `support` · `growth` · `viewer` · `pm` · `resource` · `customer`

### Backend API Prefixes
```
/auth          /user          /services      /bookings      /jobs
/payments      /chat          /notifications /admin         /tickets
/pm            /resource      /dashboard     /cms           /ops
/pool          /scorecards    /bulk          /admin-ops     /promo
/referral      /cms-x         /flags         /i18n          /geo-pricing
/analytics     /reviews       /customer      /chatbot       /search
```

### MongoDB Collections (20)
`users` · `jobs` · `bookings` · `payments` · `messages` · `notifications`  
`tickets` · `ticket_messages` · `services` · `booking_histories`  
`cms_content` · `cms_articles` · `promo_codes` · `promo_redemptions`  
`reviews` · `staff_leaves` · `kyc_documents` · `countries` · `system_config` · `chat`

### Frontend Pages (28 routes)
```
/                           (home-page)
/service-details            /book-your-resource    /cart
/checkout                   /payment-success       /profile
/booking-workspace          /booking-ongoing       /chat
/notifications              /support-chat          /login
/staff-login                /admin                 /pm
/resource                   /about-us              /how-it-works
/faq                        /contact-us            /terms-and-conditions
/cancellation-and-refund-policy                    /test-chat
```
