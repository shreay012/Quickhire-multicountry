# 03 — Technology Stack

---

## Why This Stack Beats the Alternatives

### Next.js 15 (Frontend)

| Why Next.js | Detail |
|---|---|
| ISR + on-demand revalidation | Service pages rebuild in < 1s on CMS publish, served from CDN globally |
| App Router = server components | Zero-JS rendering for static content; critical for SEO and performance |
| Built-in i18n routing | `[country]/[locale]` segments with no third-party router needed |
| Vercel edge integration | Middleware runs at 100+ edge locations before origin |
| Streaming SSR | Faster TTFB for complex pages via React Suspense |
| Image optimization | Built-in `<Image>` + Cloudflare Images for WebP/AVIF |

### NestJS (Backend)

| Why NestJS | Detail |
|---|---|
| TypeScript-first | End-to-end type safety; shared types with frontend via workspace |
| Dependency injection | Testable, swappable implementations (perfect for gateway abstraction pattern) |
| Module system | Natural fit for microservice boundaries in a monorepo |
| Decorators | Clean RBAC guards: `@Roles(['admin', 'pm'])` on controller level |
| Pipes + interceptors | Centralized validation (Zod), logging, transform — not scattered |
| OpenAPI auto-generation | NestJS generates Swagger spec automatically — API contract always accurate |

### PostgreSQL (Primary Database)

| Why PostgreSQL | Detail |
|---|---|
| ACID | Financial data (payments, escrow, payouts) requires full transaction safety |
| JSONB | Flexible metadata columns (country config, gateway raw responses) without sacrificing query power |
| Row-level security | Per-country data isolation enforced at DB level, not just application |
| pgvector | Native vector similarity search for AI matching (Phase 2) |
| PrismaORM | Type-safe migrations, no raw SQL in business logic |
| Aurora compatibility | Can migrate to Aurora PostgreSQL for read scaling with zero code changes |

### Redis (Cache + Queues)

| Why Redis | Detail |
|---|---|
| BullMQ queues | Job queues for notifications, invoices, email — mature retry logic |
| Session store | Refresh tokens + blocklist (O(1) lookup) |
| Translation cache | Namespace-level caches; purge on CMS publish |
| Rate limiting | Atomic counter per user/IP/country (INCR + EXPIRE) |
| Distributed locks | Slot booking race condition prevention |
| Pub/sub | Socket.io Redis adapter for multi-pod realtime |

### Typesense (Search)

| Why Typesense over Algolia | Detail |
|---|---|
| Self-hosted | No per-search pricing at 10M+ queries; predictable cost |
| Typo tolerance | Built-in fuzzy search, no config needed |
| Faceted filtering | Skills, price range, country, rating — all native |
| Speed | < 50ms search results at 1M documents |
| Vector search (v0.25+) | AI-powered semantic similarity without external service |
| Simple ops | Single binary, no JVM, easy on Kubernetes |

### Cloudflare (Edge)

| Why Cloudflare | Detail |
|---|---|
| 300+ PoPs | User always hits a node < 20ms away |
| Workers | Run geo-detection, A/B routing, auth at the edge — zero origin hits |
| R2 | S3-compatible storage with no egress fees (critical for media CDN) |
| Images | On-the-fly resize/format conversion (WebP, AVIF) — saves 40–70% bandwidth |
| WAF | OWASP Top 10 + custom rules (India: block OTP brute force) |
| Turnstile | CAPTCHA-free bot detection (better UX than reCAPTCHA) |
| Analytics | Real-time traffic analytics per country without cookies |

### Strapi v5 (CMS)

| Why Strapi | Detail |
|---|---|
| Self-hosted | Full data ownership; no vendor lock-in; GDPR-friendly |
| Custom content types | Define exactly the fields needed: `pricing[]`, `country_codes[]`, `visibility_rules` |
| REST + GraphQL | Content Service can query via both |
| Webhooks | Publish event → hit Next.js revalidation endpoint → CDN cache purged |
| RBAC | Fine-grained CMS roles: legal team edits only legal docs, not service content |
| Multi-locale | Native i18n support per content type |
| Plugin ecosystem | Translation plugins, SEO plugins, image optimization |

---

## Stack That Was NOT Chosen and Why

| Technology | Reason Rejected |
|---|---|
| MongoDB | Not ACID-safe for financial data; poor JOIN performance for complex booking queries |
| Express.js | No native DI, no module system — would need to build NestJS patterns manually |
| Remix | Smaller ecosystem; fewer ISR/caching primitives vs Next.js |
| Algolia | $1.50/1000 searches; at 10M monthly searches = $15K/mo vs Typesense at $300/mo |
| Contentful | $2,500/mo for enterprise tier; vendor lock-in; less flexible schema |
| GraphQL (everywhere) | Premature for Phase 1–2; adds complexity; REST is simpler for most of our query patterns |
| Microservices from day 1 | Over-engineering; start as separate modules in monorepo, extract when team/scale requires |
| gRPC | Adds tooling complexity; REST is sufficient for our latency targets |
| Nuxt.js | Vue ecosystem; Next.js has better ISR, better TypeScript, better Vercel integration |
| Firebase | Vendor lock-in; limited SQL queries; not GDPR-friendly without extra config |

---

## Frontend Tech Stack Detail

```typescript
{
  "framework":    "next@15.x",
  "react":        "react@19.x",
  "language":     "TypeScript 5.5",
  "styling":      "tailwindcss@4 + @shadcn/ui",
  "state":        "zustand@5 (global) + tanstack-query@5 (server state)",
  "forms":        "react-hook-form@7 + zod@3",
  "i18n":         "next-intl@4",
  "icons":        "lucide-react",
  "charts":       "recharts@2",
  "animation":    "framer-motion@11",
  "rich-text":    "tiptap@2",
  "http":         "axios@1 (with interceptors) + native fetch (server components)",
  "testing":      "jest@29 + @testing-library/react + playwright@1.4",
  "linting":      "eslint@9 + prettier@3",
  "bundler":      "Next.js built-in (Turbopack)"
}
```

## Backend Tech Stack Detail

```typescript
{
  "framework":    "nestjs@11",
  "language":     "TypeScript 5.5",
  "orm":          "prisma@6 (PostgreSQL)",
  "validation":   "zod@3",
  "auth":         "passport@0.7 + @nestjs/jwt",
  "queue":        "bullmq@5 (Redis) → kafka.js@2 (Kafka at scale)",
  "cache":        "ioredis@5",
  "http-client":  "axios@1",
  "pdf":          "pdfkit@0.15 (invoices)",
  "search-sdk":   "typesense@2",
  "storage-sdk":  "@aws-sdk/client-s3@3",
  "email-sdk":    "@aws-sdk/client-ses@3",
  "sms":          "msg91-node (IN) + twilio (US/AU)",
  "ai":           "@anthropic-ai/sdk + openai@4",
  "translation":  "deepl-node@1.5",
  "tax":          "taxjar (US state tax)",
  "monitoring":   "@sentry/node@8 + prom-client@15",
  "tracing":      "@opentelemetry/sdk-node",
  "testing":      "jest@29 + supertest@7",
  "linting":      "eslint@9 + prettier@3"
}
```
