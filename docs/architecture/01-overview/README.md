# QuickHire — Project Overview

## What Is This Product?

QuickHire is an **on-demand B2C marketplace** that connects customers who need technical services (software development, design, devops, etc.) with verified professionals managed through an internal staff pool. The product's UVP is "hire a tech expert in 10 minutes" — backed by a structured booking system, dedicated Project Manager assignment, and real-time workspace chat.

It is **not** a freelance platform like Upwork. The customer hires from QuickHire's own vetted resource pool. QuickHire owns the supply (resources + PMs) and intermediates the relationship.

---

## Core Business Entities

| Entity | Description | DB Role |
|---|---|---|
| **Customer** | End-user who books services | `users` with `role: user` |
| **Service** | A technical offering (e.g. "React Developer") | `services` collection |
| **Job** | The primary booking record (v3 flow) | `jobs` collection |
| **Booking** (legacy) | Older booking record (v1/v2 flow) | `bookings` collection |
| **PM** | Project Manager assigned after payment | `users` with `role: pm` |
| **Resource** | Field technical expert doing the work | `users` with `role: resource` |
| **Payment** | Razorpay order + status | `payments` collection |
| **Chat** | Per-booking conversation | `messages` collection |
| **Ticket** | Customer support request | `tickets` collection |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                │
│                                                                       │
│   Browser (Next.js 16 / React 19)                                   │
│   ├─ App Router (28 page routes)                                    │
│   ├─ Redux Toolkit (13 slices)                                      │
│   ├─ Socket.io client (realtime chat + notifications)               │
│   ├─ next-intl (8 locales: en/hi/ar/de/es/fr/zh-CN/ja)            │
│   └─ MUI 7 + Tailwind 4 (UI)                                       │
└────────────────────┬────────────────────────────────────────────────┘
                     │  HTTPS / WSS
┌────────────────────▼────────────────────────────────────────────────┐
│                      API / BACKEND LAYER                             │
│                                                                       │
│   Node.js ESM + Express 4.21  (Modular Monolith)                   │
│   ├─ 35 route namespaces / 27 modules                               │
│   ├─ JWT RS256 auth + Redis blocklist                               │
│   ├─ BullMQ workers (notifications / lifecycle / email / analytics) │
│   ├─ Socket.io server + Redis pub/sub adapter                       │
│   └─ Prometheus metrics (/metrics)                                  │
└──┬──────────────┬──────────────┬──────────────┬──────────────────┘
   │              │              │              │
┌──▼──┐     ┌────▼────┐   ┌─────▼─────┐  ┌────▼────────────┐
│ DB  │     │  Redis  │   │Meilisearch│  │   AWS Services  │
│     │     │         │   │           │  │                 │
│Mongo│     │sessions │   │full-text  │  │S3 (chat files)  │
│DB   │     │cache    │   │search     │  │SES (email)      │
│20   │     │pub/sub  │   │bookings + │  │SNS (push)       │
│coll.│     │BullMQ   │   │articles   │  │SQS (queues)     │
└─────┘     └─────────┘   └───────────┘  └─────────────────┘
```

---

## Technology Stack

### Backend
| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Runtime | Node.js ESM | 20 | JavaScript runtime |
| Framework | Express | 4.21 | HTTP server |
| Database | MongoDB | 6.9 driver | Primary data store (no ORM) |
| Cache/Sessions | Redis (ioredis) | 5.4 | OTP store, blocklist, pub/sub, BullMQ |
| Queue | BullMQ | 5.76 | Background jobs |
| Realtime | Socket.io | 4.8 + redis-adapter | Chat + notifications |
| Search | Meilisearch | 0.44 | Full-text search (bookings, articles) |
| Auth | jsonwebtoken | 9.0 | JWT RS256 / HS256 |
| Payment | Razorpay SDK | 2.9 | Indian payment gateway |
| File storage | AWS S3 SDK v3 | 3.658 | Chat attachments + invoices |
| Email | AWS SES SDK v3 | 3.658 | Transactional emails |
| Push | AWS SNS SDK v3 | 3.658 | Mobile push notifications |
| SMS | MSG91 / mock | — | OTP delivery |
| Monitoring | Sentry | 10.50 | Error tracking |
| Metrics | prom-client | 15.1 | Prometheus metrics |
| Logging | pino | 9.4 | Structured JSON logs |
| Validation | zod | 3.23 | Runtime schema validation |
| PDF gen | pdfkit (+ inline) | 0.15 | Invoice generation |

### Frontend
| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js | 16.1.6 | App Router SSR/CSR |
| UI library | React | 19.2.3 | Component rendering |
| State | Redux Toolkit | 2.11 | Global state (13 slices) |
| Component UI | MUI | 7.3 | Material design components |
| Styling | Tailwind CSS | 4.2 | Utility CSS |
| i18n | next-intl | 4.9 | Locale routing + messages |
| HTTP client | Axios | 1.13 | API calls + interceptors |
| Realtime | socket.io-client | 4.8 | Chat + notification socket |
| Carousel | Swiper | 12.1 | Homepage sliders |
| Notifications | react-hot-toast | 2.6 | Toast messages |
| Testing | Jest + Playwright | 30 + 1.59 | Unit + E2E |

---

## Multi-Country / Multi-Locale Support

QuickHire ships with **8 locales** and **5 countries**:

| Country | Currency | Primary Locale | Payment Gateway |
|---|---|---|---|
| IN (India) | INR | en / hi | Razorpay |
| AE (UAE) | AED | en / ar | (stripe / tabby — future) |
| DE (Germany) | EUR | de | (stripe — future) |
| AU (Australia) | AUD | en | (stripe — future) |
| US (United States) | USD | en / es | (stripe — future) |

Geo detection priority: Cloudflare `CF-IPCountry` → `X-Country` override → Accept-Language → default IN.

Service `pricing[]` field stores a per-country array: `{ country, currency, basePrice, tax, surgeRules }`.

---

## Key Architectural Decisions

1. **Modular monolith, not microservices** — all modules share a single process, one MongoDB connection, one Redis connection. Suitable for current traffic. Split points for eventual microservices are clear (payments, notifications, search).

2. **Native MongoDB driver (no Mongoose)** — deliberate choice for flexibility. No schema enforcement at the database layer; Zod validates at the API boundary.

3. **`jobs` collection is the primary booking record** — a "v3 flow" decision. The `bookings` collection exists from an older flow (v1/v2). Some code crosses both, which is the main legacy debt item.

4. **BullMQ over in-process workers** — migrated from in-process setInterval tickers to BullMQ for horizontal scaling. The lifecycle tick is a repeating BullMQ job (every 60s) rather than cron.

5. **Socket.io with Redis adapter** — enables multi-pod horizontal scaling; all pods share the pub/sub channel.

6. **JWT RS256 in production, HS256 fallback in dev** — the env validator auto-detects if `JWT_PRIVATE_KEY` is a PEM key and falls back gracefully.

7. **i18n-object fields** — service `name` and `description` can be stored as `{ en: "...", hi: "...", ar: "..." }` objects. The frontend axios interceptor flattens these to a string for the active locale before any component renders it.
