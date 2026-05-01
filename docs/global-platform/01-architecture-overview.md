# 01 — Architecture Overview

---

## System Topology

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            USER BROWSER / MOBILE APP                             │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │ HTTPS
                          ┌────────────▼────────────┐
                          │    CLOUDFLARE NETWORK    │
                          │  • DDoS protection       │
                          │  • WAF (OWASP rules)     │
                          │  • Bot management        │
                          │  • TLS termination       │
                          │  • Geo-IP detection      │
                          │  • Workers (edge logic)  │
                          │  • Smart Routing         │
                          └────────────┬────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                         │
   ┌──────────▼──────────┐  ┌─────────▼────────┐   ┌──────────▼──────────┐
   │  VERCEL EDGE NETWORK │  │   CLOUDFLARE R2  │   │  CLOUDFLARE IMAGES  │
   │  Next.js 15 App      │  │  Static Assets   │   │  Media CDN          │
   │  ISR + SSR           │  │  (CSS/JS bundles)│   │  (User uploads)     │
   │  28 page routes      │  └──────────────────┘   └─────────────────────┘
   └──────────┬───────────┘
              │ Internal API calls
   ┌──────────▼───────────────────────────────────────────────────────────────┐
   │                          API GATEWAY LAYER                                │
   │              Kong Gateway / AWS API Gateway                               │
   │    • Rate limiting (per user + per IP + per country)                      │
   │    • JWT validation                                                       │
   │    • Request routing → microservices                                      │
   │    • Request/response logging                                             │
   │    • Circuit breaker                                                      │
   └──────────────────────────────────┬────────────────────────────────────────┘
                                      │
   ┌──────────────────────────────────▼────────────────────────────────────────┐
   │                        MICROSERVICES LAYER (NestJS)                        │
   │                                                                            │
   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │
   │  │  User   │ │ Booking │ │ Payment │ │ Content │ │  Search │ │ Notif  │ │
   │  │ Service │ │ Service │ │ Service │ │ Service │ │ Service │ │Service │ │
   │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └───┬────┘ │
   │       │           │           │            │            │          │      │
   │  ┌────┴────┐ ┌────┴────┐ ┌───┴─────┐ ┌───┴─────┐ ┌───┴────┐ ┌───┴────┐ │
   │  │  Geo   │ │  Legal  │ │ Review  │ │  Trans- │ │ Media  │ │  AI    │ │
   │  │Service │ │ Service │ │ Service │ │ lation  │ │Service │ │Service │ │
   │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └────────┘ └────────┘ │
   └──────────────────────────────────┬────────────────────────────────────────┘
                                      │
   ┌──────────────────────────────────▼────────────────────────────────────────┐
   │                           MESSAGE BUS (Kafka / SQS)                        │
   │   Events: user.registered · booking.created · payment.captured ·           │
   │           review.submitted · notification.enqueued · content.published     │
   └──────────────────────────────────┬────────────────────────────────────────┘
                                      │
   ┌──────────────────────────────────▼────────────────────────────────────────┐
   │                           DATA LAYER                                        │
   │                                                                            │
   │  ┌───────────────┐  ┌───────────────┐  ┌────────────┐  ┌──────────────┐  │
   │  │  PostgreSQL   │  │    Redis      │  │Typesense / │  │    AWS S3    │  │
   │  │  (primary)    │  │  (cache +     │  │Elasticsearch│  │  (media +    │  │
   │  │  per-region   │  │   queues +    │  │  (search)  │  │   invoices)  │  │
   │  │  replicas     │  │   sessions)   │  └────────────┘  └──────────────┘  │
   │  └───────────────┘  └───────────────┘                                     │
   └────────────────────────────────────────────────────────────────────────────┘
```

---

## Design Principles

### 1. Country is a First-Class Entity

Every database row, every API request, every content block, and every configuration value carries a `country_code`. There is no "global default" that silently applies everywhere — every record explicitly declares its country scope or is tagged as `GLOBAL`.

```
users           → country_code column
services        → country_code (scope)
pricing         → country_code (per-country rows)
legal_documents → country_code (required)
payment_methods → country_code array
feature_flags   → country_codes array
content_blocks  → country_codes + locale
```

### 2. CMS-First Architecture

No page text, pricing display, legal content, FAQ, or category name is hardcoded in application code. The CMS is the single source of truth. The application renders; the CMS decides what to render.

```
App code asks: "give me the hero banner for IN locale hi"
CMS returns:   { headline: "...", subheadline: "...", cta: "..." }
App renders:   exactly that, with no knowledge of what the text says
```

### 3. Translation is a Pipeline, Not a Map

Translations are not static JSON files. They live in the database, are served via API, cached at the CDN edge, and can be updated without a deployment. Translation pipeline:

```
Source string (en) → Human review → Machine fallback → Edge cache → Client
```

### 4. Edge Decides First

Before any request reaches the origin servers, Cloudflare Workers resolve:
- Country (from IP geolocation, Accept-Language, cookie, or explicit user choice)
- Locale (from country → language mapping + user preference)
- Currency (from country config)
- Which regional origin to route to

This means the origin never has to figure out "where is this user from" — it's already known.

### 5. Payment is an Abstraction

Product code never references "Razorpay", "Stripe", or any gateway name. It calls:
```
paymentService.createOrder({ amount, currency, country, metadata })
paymentService.capturePayment({ orderId, metadata })
paymentService.refund({ paymentId, amount, reason })
```

The payment abstraction layer routes to the correct gateway, handles webhook normalization, and returns a unified response shape.

---

## Architecture Decision Log

| Decision | Chosen | Rejected | Reason |
|---|---|---|---|
| URL structure | Path segments `/in/` | Subdomains `in.` | Better domain authority consolidation for SEO |
| Frontend framework | Next.js 15 App Router | Remix, Nuxt | Ecosystem maturity, Vercel edge integration, ISR |
| Backend framework | NestJS (TypeScript) | Express, Fastify | Dependency injection, module system, decorator metadata for enterprise |
| Primary database | PostgreSQL | MongoDB | ACID compliance for financial data; relational integrity for bookings |
| Search engine | Typesense (primary) + Elasticsearch (analytics) | Algolia | Self-hosted cost at scale; Typesense for speed, ES for complex aggregations |
| Message bus | AWS SQS + EventBridge | Kafka | Lower ops overhead; EventBridge for cross-service routing; Kafka if throughput > 100K events/s |
| CMS | Strapi v5 (self-hosted) or Sanity | Contentful, Prismic | Strapi: full data ownership + custom field types; Sanity: real-time collaboration |
| Translation storage | Database + CDN cache | Flat JSON files | Allows runtime updates without deployments |
| Deployment | AWS (primary) + Vercel (frontend) | GCP, Azure | Best-in-class services per layer; Vercel for Next.js edge optimization |
| Service communication | REST (sync) + SQS events (async) | gRPC | REST for simplicity across teams; events for decoupling |
| Feature flags | GrowthBook (self-hosted) | LaunchDarkly | Open-source, country/segment targeting, free at scale |
| CDN | Cloudflare (global) + CloudFront (origin shield) | Fastly | Cloudflare Workers for edge logic; price/performance |

---

## Non-Negotiable Requirements by Country

### India (IN)
- GST 18% applied on all services
- Rupee (INR) display, no other currency accepted at payment
- PAN/GST invoice generation mandatory for B2B
- RBI compliance for payment aggregators
- Data must reside in India (IT Act §43A)
- OTP via SMS (MSG91 / Fast2SMS)
- Hindi language as secondary (not optional)

### UAE (AE)
- VAT 5% applied
- AED display
- Arabic RTL layout required
- Telr or PayTabs as primary gateway (Stripe available)
- PDPL (Personal Data Protection Law) compliance
- Data residency: UAE region

### Germany (DE)
- VAT 19% applied
- EUR display
- GDPR compliance (consent banners, right to erasure, DPA)
- SEPA Direct Debit as payment option
- German language mandatory (not English-only)
- Impressum (legal notice) page mandatory
- Data residency: EU (Frankfurt)

### USA (US)
- No national sales tax (state-level varies — handle via TaxJar)
- USD display
- CCPA compliance (California privacy rights)
- ACH bank transfer option
- SSN/EIN for US freelancer payouts (W9/1099)
- FCRA compliance for background checks (if applicable)

### Australia (AU)
- GST 10% applied
- AUD display
- Australian Privacy Act compliance
- BSB/bank transfer for payouts
- ABN required for Australian freelancer payouts
