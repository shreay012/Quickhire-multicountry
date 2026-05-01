# 20 — Implementation Roadmap

---

## 18-Month Execution Plan

---

## Sprint 0 — Architecture Setup (Weeks 1–2)

**Goal:** Repository structure, CI/CD skeleton, dev environment working for entire team.

```
✅ Set up NestJS monorepo (workspace)
✅ Set up Next.js 15 App Router frontend
✅ PostgreSQL schema v1 (core tables)
✅ Redis connection + basic caching pattern
✅ Kong API Gateway config (local Docker)
✅ GitHub Actions CI pipeline (lint + test + build)
✅ Terraform IaC skeleton for ap-south-1
✅ COUNTRY_CONFIG source of truth established
✅ Shared packages: common, config, events
✅ Dev environment: docker-compose with all services
✅ Commit standards + branching strategy documented
```

---

## Month 1–2 — Core Platform (India MVP)

### Backend Services
```
Week 1–2: User Service
  - OTP auth (MSG91 for IN)
  - JWT RS256 access + refresh tokens
  - User profile (client + freelancer)
  - RBAC middleware

Week 3–4: Booking Service
  - Create/list/get bookings
  - Proposal submission
  - Contract generation
  - State machine transitions

Week 5–6: Payment Service (India)
  - Razorpay gateway implementation
  - Create order → verify → capture
  - Webhook handler + dedup
  - Escrow logic
  - GST invoice generation (PDF)

Week 7–8: Content Service + CMS
  - Strapi v5 setup with custom content types
  - Services catalogue API
  - Category tree
  - CMS-driven page blocks
  - Translation key scaffolding (en + hi)
```

### Frontend
```
Week 1–2: Project structure + routing
  - [country] + [locale] segments
  - Geo middleware (Cloudflare Worker)
  - Next.js Edge middleware
  - Country provider + context

Week 3–4: Core pages (ISR)
  - Homepage (CMS-driven blocks)
  - Service listing + filtering
  - Service detail page
  - Freelancer profile page

Week 5–6: Auth + booking flow
  - Login (OTP)
  - Sign up
  - Book a service (multi-step form)
  - Cart + checkout

Week 7–8: Dashboard + payment
  - Client dashboard
  - Freelancer dashboard
  - Razorpay payment integration
  - Post-payment screen
```

### Infrastructure
```
Week 1: AWS ap-south-1 via Terraform
  - EKS cluster
  - RDS PostgreSQL Multi-AZ
  - ElastiCache Redis
  - S3 buckets
  - CloudFront

Week 2: Cloudflare setup
  - DNS
  - WAF rules
  - Workers (geo-detection)
  - Page Rules + Cache Rules

Week 8: Production deploy
  - Staging environment live
  - Production environment live
  - Monitoring: CloudWatch + Sentry
```

---

## Month 3 — Hindi Language + SEO Foundation

```
Content:
  - All UI strings extracted to translation keys
  - Hindi translations: professional translation (not machine only)
  - RTL infrastructure (CSS logical properties ready for Arabic)
  - CMS: translation manager UI in admin panel

SEO:
  - hreflang tags on all ISR pages
  - Sitemap generation (/in/sitemap.xml)
  - Structured data: Service schema, FreelancerProfile schema
  - Meta tag system (CMS-driven per page)
  - OpenGraph images (dynamic, per service)
  - Robots.txt per country

Legal:
  - India T&C, Privacy Policy, Refund Policy in CMS
  - Legal acceptance modal on signup
  - Document versioning system
  - User acceptance recording

Performance:
  - Lighthouse CI in GitHub Actions (block deploy if LCP > 2.5s)
  - Image optimization (Cloudflare Images)
  - Bundle analysis + code splitting
```

---

## Month 4–5 — UAE Launch

```
Backend:
  - Stripe gateway implementation (UAE)
  - AED currency + 5% VAT calculation
  - UAE-specific KYC flow (Emirates ID)
  - Arabic language support in notification templates
  - Telr gateway as fallback

Frontend:
  - Arabic (ar) locale + RTL layout
  - AED price display (Intl.NumberFormat)
  - UAE legal pages in CMS (T&C, Privacy, Refund)
  - UAE homepage variant (CMS blocks)

Infrastructure:
  - me-central-1 region: EKS + RDS + Redis
  - Data residency: UAE user data stays in me-central-1
  - Cloudflare: AE route → me-central-1 origin
  - UAE payment webhook endpoint configured
```

---

## Month 6–8 — Germany Launch (GDPR Compliance)

```
Legal & Compliance (MUST be done before launch):
  - Impressum page live and reachable
  - DSGVO Datenschutzerklärung
  - Widerrufsbelehrung
  - AGB (German T&C)
  - AVV (GDPR DPA for freelancers)
  - Cookie consent banner (GDPR-compliant)
  - GDPR: right to erasure flow implemented
  - GDPR: data export flow implemented
  - DPA agreements ready for B2B clients

Backend:
  - Stripe SEPA Direct Debit for DE
  - 19% MwSt. calculation
  - German invoice format (Steuernummer, USt-IdNr.)
  - eu-central-1 data residency enforcement
  - GDPR consent table + consent recording API
  - Right to erasure: user data anonymization (not deletion — preserves audit)

Frontend:
  - German (de) locale
  - GDPR consent banner (blocking on first visit)
  - Consent preference center
  - German date/number formatting (1.000,00 €, DD.MM.YYYY)
  - Footer: Impressum link prominent (required by law)

Infrastructure:
  - eu-central-1: EKS + RDS + Redis
  - Email via SES eu-central-1 (GDPR: EU data)
  - SES from address: noreply@platform.de
```

---

## Month 9–12 — USA + Australia Launch

```
USA (Month 9–10):
  - Stripe (USD) + ACH bank transfer
  - TaxJar integration (50-state sales tax)
  - 1099-NEC reporting system
  - W-9 acknowledgement on payout setup
  - CCPA privacy notice
  - Independent Contractor Agreement
  - "Do Not Sell My Information" page
  - us-east-1 data residency

Australia (Month 10–11):
  - Stripe (AUD) + Pin Payments fallback
  - 10% GST calculation
  - ABN validation for AU freelancers
  - Australian Privacy Act compliance
  - ap-southeast-2 data residency

Shared (Month 11–12):
  - Spanish (es) locale for US Hispanic market
  - Escrow maturity: milestone-based payout
  - Review + rating system
  - Dispute resolution workflow
  - Automated KYC (Stripe Identity for US/AU)
```

---

## Month 13–18 — Platform Maturity

```
AI & Matching:
  - AI-powered freelancer-job matching (Typesense vector)
  - AI chatbot (RAG over help articles)
  - Pricing suggestion AI
  - Content moderation AI (profiles, messages)

B2B:
  - Company accounts (multi-seat)
  - Team billing
  - Custom contracts
  - Invoice with company details
  - SSO/SAML for enterprise clients

Analytics:
  - Real-time analytics dashboard (admin)
  - Per-country revenue reports
  - Freelancer performance reports
  - Client acquisition funnel
  - Elasticsearch for complex aggregations

Mobile Apps:
  - React Native (or Flutter) — iOS + Android
  - Push notifications (FCM + APNs)
  - Biometric auth

Platform Features:
  - Featured listings (paid promotion)
  - Skill assessments / tests
  - Portfolio showcase
  - Video calls (Daily.co or Agora integration)
  - Time tracking (for hourly contracts)
```

---

## Technology Stack Final Decision

```
Frontend:
  Framework:       Next.js 15 (App Router)
  Language:        TypeScript
  Styling:         Tailwind CSS 4 + shadcn/ui
  State:           Zustand (lightweight, no boilerplate vs Redux)
  Data fetching:   TanStack Query (React Query)
  i18n:            next-intl 4
  Forms:           React Hook Form + Zod
  Rich text:       Tiptap (CMS editor)
  Charts:          Recharts

Backend:
  Framework:       NestJS 11 (TypeScript)
  ORM:             Prisma (type-safe, migration management)
  Validation:      Zod
  Auth:            Passport.js (JWT + OAuth strategies)
  Queue:           BullMQ (Redis-backed, dev) → Kafka (production)
  API:             REST (OpenAPI spec) → GraphQL Federation (Phase 3)
  Testing:         Jest + Supertest

CMS:
  Primary:         Strapi v5 (self-hosted, full data ownership)
  Alternative:     Sanity (better real-time collaboration)
  Rich text:       Portable Text (Sanity) or Slate.js (Strapi)

Database:
  Primary:         PostgreSQL 16 (RDS) + Prisma ORM
  Cache:           Redis 7 (ElastiCache)
  Search:          Typesense 0.26 (fast, typo-tolerant)
  Analytics:       Elasticsearch 8 (complex aggregations)
  Vector search:   pgvector (Phase 2) → Pinecone (Phase 3)

Infrastructure:
  Cloud:           AWS (primary)
  Container:       Docker + Kubernetes (EKS)
  IaC:             Terraform + Helm
  CDN:             Cloudflare (global) + CloudFront (origin shield)
  Frontend host:   Vercel
  Secrets:         AWS Secrets Manager
  Monitoring:      Prometheus + Grafana + Jaeger + Sentry

Payments:
  India:           Razorpay
  UAE:             Stripe + Telr
  Germany:         Stripe + SEPA
  USA:             Stripe + Braintree (ACH)
  Australia:       Stripe + Pin Payments
  Tax:             TaxJar (US) + manual config (others)
  FX Rates:        Wise API (display only)

Communications:
  Email:           AWS SES (per-region)
  SMS:             MSG91 (IN) + Twilio (US/AU) + local providers
  Push:            FCM (Android) + APNs (iOS) via AWS SNS
  WhatsApp:        WhatsApp Business API (IN + AE priority)

AI/ML:
  LLM:             Anthropic Claude API (chatbot + moderation)
  Embeddings:      OpenAI text-embedding-3-small
  Translation:     DeepL API
  Image AI:        Cloudflare AI (image moderation)
```

---

## Definition of "Done" — Production Ready

Before any country launch is declared production-ready, all of these must pass:

```
Legal:
  ✅ All required legal documents published in CMS
  ✅ Legal acceptance recording working
  ✅ Material change re-prompt flow tested
  ✅ GDPR (DE) or equivalent compliance confirmed by legal counsel
  ✅ Cookie consent implemented (if required)

Payments:
  ✅ All gateways for that country tested end-to-end (happy path + failure)
  ✅ Webhook handlers verified with real test events
  ✅ Tax calculation audited by local accountant
  ✅ Invoice template approved by local accountant
  ✅ Payout flow tested with real bank account

SEO:
  ✅ hreflang tags verified (Google Search Console)
  ✅ Sitemap submitted
  ✅ Structured data validated (Rich Results Test)
  ✅ Core Web Vitals pass (Lighthouse CI green)
  ✅ Robots.txt correct

Security:
  ✅ Penetration test passed (OWASP Top 10)
  ✅ Data residency verified (no cross-region leakage)
  ✅ Secrets rotated and in Secrets Manager
  ✅ WAF rules tuned for country
  ✅ DDoS simulation passed

Performance:
  ✅ Load test: 2× expected launch traffic
  ✅ LCP < 2.5s from country's primary city
  ✅ API P99 < 500ms under load
  ✅ Database queries under load < 100ms P99

Operations:
  ✅ Runbooks written for all P1/P2 incidents
  ✅ On-call rotation established
  ✅ Alerts configured and tested
  ✅ Rollback procedure tested
  ✅ Data backup restore tested
```
