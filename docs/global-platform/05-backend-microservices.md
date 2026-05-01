# 05 — Backend Microservices Architecture

---

## Service Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (Kong)                                   │
│  Rate limiting · JWT validation · Request routing · Circuit breaker          │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
     ┌──────────┬───────────────────┼──────────────────┬──────────────┐
     │          │                   │                  │              │
┌────▼────┐ ┌───▼────┐ ┌──────────▼──────────┐ ┌─────▼─────┐ ┌─────▼──────┐
│  User   │ │Booking │ │      Payment         │ │  Content  │ │   Search   │
│ Service │ │Service │ │      Service         │ │  Service  │ │  Service   │
│  :3001  │ │ :3002  │ │       :3003          │ │   :3004   │ │   :3005    │
└─────────┘ └────────┘ └─────────────────────┘ └───────────┘ └────────────┘
     │          │                   │                  │              │
┌────▼────┐ ┌───▼────┐ ┌───────────▼─────────┐ ┌─────▼─────┐ ┌─────▼──────┐
│Notifi-  │ │  Geo   │ │       Legal          │ │Translat-  │ │   Media    │
│cation   │ │Service │ │      Service         │ │  ion Svc  │ │  Service   │
│Service  │ │ :3007  │ │       :3008          │ │   :3009   │ │   :3010    │
│  :3006  │ └────────┘ └─────────────────────┘ └───────────┘ └────────────┘
└─────────┘
     │
┌────▼────┐ ┌──────────────┐
│  AI/ML  │ │    Audit     │
│ Service │ │   Service    │
│  :3011  │ │    :3012     │
└─────────┘ └──────────────┘
```

---

## 1. User Service

**Responsibility:** Authentication, profiles, KYC, freelancer/client accounts

```typescript
// NestJS module structure
user-service/
├── modules/
│   ├── auth/
│   │   ├── strategies/           ← JWT, OTP, OAuth (Google, LinkedIn)
│   │   ├── guards/
│   │   └── auth.service.ts
│   ├── profile/
│   │   ├── freelancer.service.ts
│   │   └── client.service.ts
│   ├── kyc/
│   │   ├── kyc.service.ts        ← Country-specific KYC flow
│   │   └── providers/
│   │       ├── india/            ← Aadhaar + PAN via Digilocker
│   │       ├── uae/              ← Emirates ID via UAE PASS
│   │       ├── germany/          ← IDnow or Veriff
│   │       ├── us/               ← Stripe Identity or Persona
│   │       └── australia/        ← AUSTRAC-compliant
│   └── preferences/
│       └── preferences.service.ts

// REST API endpoints
POST   /v1/auth/send-otp
POST   /v1/auth/verify-otp
POST   /v1/auth/oauth/{provider}
POST   /v1/auth/refresh
POST   /v1/auth/logout
GET    /v1/users/me
PATCH  /v1/users/me
GET    /v1/users/{id}/public        ← Public freelancer profile
POST   /v1/kyc/submit
GET    /v1/kyc/status
```

**Auth Methods by Country:**

| Country | Primary Auth | OAuth | Enterprise |
|---|---|---|---|
| India | OTP (SMS via MSG91) | Google | SAML (B2B) |
| UAE | OTP (SMS) + UAE PASS | Google | SAML |
| Germany | Email+Password | Google, LinkedIn | SAML |
| USA | Email+Password | Google, LinkedIn, Apple | SAML |
| Australia | Email+Password | Google | SAML |

---

## 2. Booking Service

**Responsibility:** Job posting, proposals, contracts, milestones, escrow lifecycle

```
States:
draft → published → proposals_open → freelancer_selected → 
contract_active → milestone_in_review → completed | disputed
```

```typescript
// REST API
POST   /v1/bookings                    ← Post a job
GET    /v1/bookings?country=IN&status=open
GET    /v1/bookings/{id}
PATCH  /v1/bookings/{id}
POST   /v1/bookings/{id}/proposals     ← Freelancer submits proposal
PATCH  /v1/bookings/{id}/proposals/{proposalId}/accept
POST   /v1/bookings/{id}/contract      ← Generate contract
POST   /v1/bookings/{id}/milestones
PATCH  /v1/bookings/{id}/milestones/{milestoneId}/submit
PATCH  /v1/bookings/{id}/milestones/{milestoneId}/approve
POST   /v1/bookings/{id}/dispute
```

**Events emitted (to Kafka/SQS):**
```
booking.created          → notification-service, search-service (index)
booking.proposal.received → notification-service
booking.contract.signed  → payment-service (fund escrow)
booking.milestone.approved → payment-service (release escrow)
booking.completed        → review-service, analytics-service
booking.disputed         → support queue
```

---

## 3. Payment Service

**Responsibility:** Multi-gateway abstraction, escrow, payouts, invoicing, tax

```typescript
// payment-service/src/gateways/

interface PaymentGateway {
  createOrder(params: CreateOrderParams): Promise<OrderResponse>;
  capturePayment(params: CaptureParams): Promise<CaptureResponse>;
  createRefund(params: RefundParams): Promise<RefundResponse>;
  createPayout(params: PayoutParams): Promise<PayoutResponse>;
  normalizeWebhook(raw: unknown): NormalizedWebhookEvent;
  verifyWebhookSignature(payload: string, sig: string): boolean;
}

// Implementations:
class RazorpayGateway implements PaymentGateway { ... }   // India
class StripeGateway implements PaymentGateway { ... }      // UAE, DE, US, AU
class TelrGateway implements PaymentGateway { ... }        // UAE (MENA)
class SepaGateway implements PaymentGateway { ... }        // Germany
class BraintreeGateway implements PaymentGateway { ... }   // USA (PayPal + card)
class PinPaymentsGateway implements PaymentGateway { ... } // Australia

// Factory:
class PaymentGatewayFactory {
  static create(country: CountryCode): PaymentGateway {
    const config = COUNTRY_CONFIG[country];
    const gatewayName = config.primaryGateway;
    return GatewayRegistry.get(gatewayName);
  }
}

// REST API
POST   /v1/payments/escrow/fund          ← Fund escrow when contract signed
POST   /v1/payments/escrow/release       ← Release to freelancer
POST   /v1/payments/refund
POST   /v1/payments/payouts/schedule
GET    /v1/payments/invoice/{bookingId}
POST   /v1/payments/webhook/{gateway}    ← Normalized webhook handler

// Tax calculation
POST   /v1/payments/tax/calculate        ← Calls TaxJar (US) or uses config rate
GET    /v1/payments/tax/rates?country=IN
```

**Escrow Flow:**

```
Client pays → Funds held in platform escrow account
→ Contract active, work begins
→ Milestone submitted by freelancer
→ Client approves (or 7-day auto-approve)
→ Platform releases: freelancer_amount = total - platform_fee - tax_withholding
→ Invoice generated (PDF, country-specific template)
→ Payout triggered (next business day)
```

**Platform Fee by Country:**

| Country | Platform Fee (Client) | Platform Fee (Freelancer) | Tax Withholding |
|---|---|---|---|
| India | 5% | 10% | TDS if applicable |
| UAE | 5% | 8% | 0% (no VAT on services) |
| Germany | 5% | 10% | — |
| USA | 5% | 10% + 1099-NEC reporting | — |
| Australia | 5% | 10% | — |

---

## 4. Content Service (CMS API)

**Responsibility:** Serve all CMS content — pages, blocks, translations, config

```typescript
// REST API
GET    /v1/content/pages/{slug}?country=IN&locale=en
GET    /v1/content/blocks/{position}?country=IN&locale=en
GET    /v1/content/categories?country=IN
GET    /v1/content/services?country=IN&locale=en
GET    /v1/content/faqs?country=IN&locale=en
GET    /v1/content/blog?country=IN&locale=en&page=1
GET    /v1/content/blog/{slug}?country=IN&locale=en
GET    /v1/content/media?category=banners&country=IN
POST   /v1/content/revalidate (internal — triggers ISR purge)
```

**Caching:**
```
Content Service → Redis cache (TTL 1h)
                → CDN cache (TTL 1h, purged by CMS webhook on publish)
```

---

## 5. Search Service

**Responsibility:** Full-text search over services, freelancers, jobs

```typescript
// Backed by Typesense (fast search) + Elasticsearch (analytics queries)

// REST API
GET    /v1/search/services?q=react&country=IN&budget=5000-20000&sort=rating
GET    /v1/search/freelancers?q=react&country=IN&skills=react,typescript
GET    /v1/search/jobs?q=mobile&country=IN&type=hourly

// Indexing events (from Kafka):
// booking.completed → update freelancer stats in index
// user.profile.updated → reindex freelancer
// service.published → index service
// service.deleted → remove from index

// Response shape (unified):
{
  "hits": [...],
  "facets": {
    "skills": [...],
    "price_range": [...],
    "rating": [...],
    "country": [...]
  },
  "total": 1420,
  "page": 1,
  "per_page": 20
}
```

---

## 6. Notification Service

**Responsibility:** All communications — push, email, SMS, in-app, WhatsApp

```typescript
// Channels by country:
const NOTIFICATION_CHANNELS = {
  IN: ['in_app', 'push', 'sms_msg91', 'email_ses', 'whatsapp'],
  AE: ['in_app', 'push', 'sms', 'email_ses', 'whatsapp'],
  DE: ['in_app', 'push', 'email_ses'],   // SMS less common; GDPR compliance
  US: ['in_app', 'push', 'email_ses', 'sms_twilio'],
  AU: ['in_app', 'push', 'email_ses', 'sms_twilio'],
};

// Template system: all templates in CMS
// Template keys: "booking.created.email.subject", "booking.created.email.body"
// Variables: {{ client_name }}, {{ freelancer_name }}, {{ amount }}, {{ currency }}
// Templates stored per locale + country → fetched from Content Service

// Consumer of Kafka events:
// booking.created → send confirmation to both parties
// payment.captured → send receipt
// milestone.approved → send payout notification
// kyc.approved → send welcome notification
```

---

## 7. Geo Service

**Responsibility:** Country config, geo-IP lookup, tax rate resolution

```typescript
// REST API
GET    /v1/geo/detect             ← IP → country (called by edge middleware)
GET    /v1/geo/config/{country}   ← Full country config (COUNTRY_CONFIG)
GET    /v1/geo/tax?country=US&state=CA&amount=1000  ← TaxJar integration for US
GET    /v1/geo/currencies         ← All supported currencies
GET    /v1/geo/exchange-rates     ← Display-only rates (not for payment)

// Internally used by: all services to validate country context
```

---

## 8. Legal Service

**Responsibility:** Country-specific legal documents, versioning, user acceptance

```typescript
// REST API
GET    /v1/legal/{country}/{document}     ← Latest published version
GET    /v1/legal/{country}/{document}/{version}
POST   /v1/legal/acceptance               ← Record user accepting T&C
GET    /v1/legal/acceptance/status?userId=&country=&document=
GET    /v1/legal/diff/{country}/{document}?from=v1&to=v2  ← Show changes

// Documents per country:
// IN: terms_of_service, privacy_policy, refund_policy, cookie_policy
// AE: terms_of_service, privacy_policy, refund_policy, cookie_policy
// DE: terms_of_service, datenschutzerklaerung, widerrufsbelehrung,
//     impressum, agb, cookie_richtlinie
// US: terms_of_service, privacy_policy, refund_policy, ccpa_notice, cookie_policy
// AU: terms_of_service, privacy_policy, refund_policy, cookie_policy
```

---

## 9. Translation Service

**Responsibility:** Serve dynamic translations, manage translation pipeline

```typescript
// REST API
GET    /v1/translations/{namespace}?locale=hi&country=IN
GET    /v1/translations/keys/{namespace}           ← Admin: all keys
POST   /v1/translations/keys                       ← Admin: create key
PATCH  /v1/translations/{keyId}/{locale}/{country} ← Admin: update translation
POST   /v1/translations/machine-translate          ← Trigger DeepL for key
POST   /v1/translations/publish                    ← Publish + trigger CDN purge

// Machine translation pipeline:
// 1. Admin creates new translation key with English default
// 2. System auto-triggers DeepL API for each target locale
// 3. Translations go to "review" status (not published)
// 4. Human reviewer edits + publishes
// 5. CDN cache purged for affected namespace+locale+country
```

---

## 10. AI/ML Service

**Responsibility:** Matching, recommendations, chatbot, fraud detection, pricing AI

```typescript
// REST API
POST   /v1/ai/match              ← Match job to top 10 freelancers
POST   /v1/ai/recommend/services ← Personalized service recommendations
POST   /v1/ai/chat               ← RAG chatbot (country-specific knowledge base)
POST   /v1/ai/moderate           ← Content moderation (profile text, messages)
POST   /v1/ai/fraud-score        ← Transaction fraud scoring
GET    /v1/ai/pricing-suggest?serviceId=&country=IN  ← AI pricing recommendations
```

---

## Service Communication Standards

### Synchronous (REST — same request path)
Used when: frontend needs a response, latency matters
```
Frontend → API Gateway → Service A → Service B (internal HTTP call)
```

### Asynchronous (Events — fire and forget)
Used when: decoupled side effects (notifications, indexing, analytics)
```
Service A → Publish event to SQS/Kafka topic
Service B → Consumes event, processes independently
```

### Event Schema (all events)
```typescript
interface DomainEvent<T = unknown> {
  id: string;           // UUID — for idempotency
  type: string;         // "booking.created", "payment.captured"
  version: '1.0';
  country: string;      // "IN", "AE", etc.
  actor: {
    userId: string;
    role: string;
  };
  payload: T;
  metadata: {
    correlationId: string;
    timestamp: string;   // ISO 8601
    service: string;     // emitting service name
  };
}
```

---

## Shared Libraries (NestJS Workspace)

```
packages/
├── common/
│   ├── dto/              ← Shared DTOs
│   ├── decorators/       ← @Country(), @Locale(), @CurrentUser()
│   ├── guards/           ← JwtAuthGuard, RolesGuard, CountryGuard
│   ├── interceptors/     ← LoggingInterceptor, TransformInterceptor
│   ├── filters/          ← GlobalExceptionFilter
│   ├── pipes/            ← ValidationPipe, ParseCountryPipe
│   └── types/            ← CountryCode, Currency, Locale enums
├── config/
│   └── countries.ts      ← COUNTRY_CONFIG (shared reference)
└── events/
    └── schemas/          ← Zod schemas for all domain events
```
