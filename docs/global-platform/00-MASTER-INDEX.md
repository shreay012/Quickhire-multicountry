# Global Marketplace Platform — Enterprise Architecture Blueprint
## Principal Product Architect | Production-Grade | Upwork/Fiverr Scale

> **Platform:** On-demand freelance/hiring marketplace  
> **Target Markets:** India · UAE · Germany · USA · Australia  
> **Scale Target:** 10M+ users, 100K concurrent, 99.99% uptime  
> **Architecture Style:** CMS-first · API-first · Geo-native · Multi-tenant capable  
> **Documented:** 2026-04-30

---

## Document Index

| # | Document | What It Covers |
|---|---|---|
| 01 | [Architecture Overview](01-architecture-overview.md) | System topology, design principles, decision log |
| 02 | [URL & Domain Strategy](02-url-domain-strategy.md) | Geo-routing, subdirectory vs subdomain, hreflang, SEO |
| 03 | [Technology Stack](03-technology-stack.md) | Final stack decisions with rationale |
| 04 | [Frontend Architecture](04-frontend-architecture.md) | Next.js App Router, ISR, dynamic rendering, i18n |
| 05 | [Backend Microservices](05-backend-microservices.md) | All 12 services, APIs, event contracts |
| 06 | [CMS Architecture](06-cms-architecture.md) | Headless CMS, schema, page builder, content types |
| 07 | [Database Schema](07-database-schema.md) | PostgreSQL schema, Redis, Elasticsearch, media |
| 08 | [Translation Engine](08-translation-engine.md) | Dynamic i18n, TMS integration, AI translation pipeline |
| 09 | [Geo-Detection & Routing](09-geo-detection-routing.md) | Cloudflare Workers, edge middleware, country config |
| 10 | [Payment Gateway Abstraction](10-payment-gateway-abstraction.md) | Multi-gateway, country routing, currency, escrow |
| 11 | [Legal Document System](11-legal-document-system.md) | Country-specific T&C, privacy, refund, versioning |
| 12 | [Feature Flags & Config](12-feature-flags-config.md) | Country/user/role based flags, A/B testing |
| 13 | [SEO Architecture](13-seo-architecture.md) | Localization, hreflang, sitemaps, structured data |
| 14 | [Security Architecture](14-security-architecture.md) | Auth, RBAC, GDPR, data residency, fraud |
| 15 | [CDN & Caching Strategy](15-cdn-caching-strategy.md) | Cloudflare, Redis, ISR, edge caching layers |
| 16 | [Infrastructure & DevOps](16-infrastructure-devops.md) | Multi-region AWS/GCP, CI/CD, IaC, monitoring |
| 17 | [Search Architecture](17-search-architecture.md) | Typesense, Elasticsearch, faceted search, ranking |
| 18 | [Scalability Roadmap](18-scalability-roadmap.md) | Phase 1–4 scaling plan, bottleneck matrix |
| 19 | [API Design Standards](19-api-design-standards.md) | REST conventions, versioning, error codes |
| 20 | [Implementation Roadmap](20-implementation-roadmap.md) | 18-month sprint plan, team structure, milestones |

---

## The 5 Golden Principles

```
1. EVERYTHING from the CMS       — no hardcoded copy, pricing, legal, or config
2. COUNTRY is a first-class entity — every table, every API, every route is country-aware
3. EDGE decides the locale        — Cloudflare Worker resolves country before any origin hit
4. PAYMENT is an abstraction      — no gateway name leaks into product code
5. CONTENT is served, not built   — ISR + CDN means pages render once, serve millions
```

---

## Target Country Configuration Summary

| Country | Code | Currency | Language(s) | Payment Gateway | Legal Regime | Data Residency |
|---|---|---|---|---|---|---|
| India | IN | INR | en, hi | Razorpay, PayU | IT Act, Consumer Protection | Mumbai (ap-south-1) |
| UAE | AE | AED | en, ar | Stripe, Telr, PayTabs | UAE Cyber Crime Law | UAE (me-central-1) |
| Germany | DE | EUR | de, en | Stripe, SEPA | GDPR, German BGB | Frankfurt (eu-central-1) |
| USA | US | USD | en, es | Stripe, Braintree | CCPA, SOC2 | N. Virginia (us-east-1) |
| Australia | AU | AUD | en | Stripe, Pin Payments | Australian Privacy Act | Sydney (ap-southeast-2) |
