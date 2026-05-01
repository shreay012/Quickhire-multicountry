# 07 — Database Schema Design

---

## Database Architecture

```
PostgreSQL (primary relational store)
├── Schema: platform          ← Core business data
├── Schema: content           ← CMS content
├── Schema: legal             ← Legal documents
├── Schema: translations      ← i18n strings
├── Schema: payments          ← Financial records (extra isolation)
└── Schema: audit             ← Immutable audit log

Redis
├── DB 0: Sessions + auth tokens
├── DB 1: Translations cache
├── DB 2: Content/CMS cache
├── DB 3: Rate limiting counters
├── DB 4: Feature flags cache
└── DB 5: Application cache (pricing, geo, config)

Typesense / Elasticsearch
├── Index: services_IN, services_AE, services_DE, services_US, services_AU
├── Index: freelancers
├── Index: jobs
└── Index: articles (knowledge base for chatbot)
```

---

## PostgreSQL Core Schema

### Country & Locale Config

```sql
-- countries (source of truth for all geo config — can override COUNTRY_CONFIG code)
CREATE TABLE platform.countries (
  code          CHAR(2) PRIMARY KEY,           -- 'IN', 'AE', 'DE', 'US', 'AU'
  name          VARCHAR(100) NOT NULL,
  currency      CHAR(3) NOT NULL,
  tax_rate      DECIMAL(5,4),                  -- NULL for US (TaxJar)
  tax_label     VARCHAR(20),                   -- 'GST', 'VAT', 'MwSt.'
  default_locale VARCHAR(10) NOT NULL,
  aws_region    VARCHAR(50) NOT NULL,
  active        BOOLEAN DEFAULT true,
  config        JSONB,                          -- Full COUNTRY_CONFIG as JSONB
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE platform.country_locales (
  country_code  CHAR(2) REFERENCES platform.countries(code),
  locale        VARCHAR(10) NOT NULL,           -- 'en', 'hi', 'ar', 'de'
  is_default    BOOLEAN DEFAULT false,
  direction     CHAR(3) DEFAULT 'ltr',          -- 'ltr' or 'rtl'
  active        BOOLEAN DEFAULT true,
  PRIMARY KEY (country_code, locale)
);
```

### Users

```sql
CREATE TABLE platform.users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             VARCHAR(320) UNIQUE,
  phone             VARCHAR(20),
  phone_country     CHAR(2) REFERENCES platform.countries(code),
  role              VARCHAR(20) NOT NULL,        -- 'client', 'freelancer', 'admin'
  status            VARCHAR(20) DEFAULT 'active',-- active, suspended, banned, deleted
  country_code      CHAR(2) REFERENCES platform.countries(code),
  preferred_locale  VARCHAR(10) DEFAULT 'en',
  preferred_currency CHAR(3),
  email_verified    BOOLEAN DEFAULT false,
  phone_verified    BOOLEAN DEFAULT false,
  kyc_status        VARCHAR(20) DEFAULT 'not_started', -- not_started, pending, approved, rejected
  kyc_level         INTEGER DEFAULT 0,           -- 0=none, 1=basic, 2=enhanced
  is_featured       BOOLEAN DEFAULT false,
  metadata          JSONB,                       -- Flexible country-specific fields
  gdpr_consent_at   TIMESTAMPTZ,                 -- For DE/EU users
  deleted_at        TIMESTAMPTZ,                 -- Soft delete (GDPR right to erasure)
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE platform.user_profiles (
  user_id           UUID PRIMARY KEY REFERENCES platform.users(id),
  display_name      VARCHAR(200),
  bio               TEXT,                        -- Stored in default locale; translations separate
  avatar_url        VARCHAR(500),
  location_country  CHAR(2),
  location_city     VARCHAR(100),
  timezone          VARCHAR(50),
  languages         VARCHAR(10)[],              -- ['en', 'hi', 'ar']
  portfolio_url     VARCHAR(500),
  linkedin_url      VARCHAR(500),
  github_url        VARCHAR(500),
  hourly_rate       DECIMAL(10,2),
  hourly_currency   CHAR(3),
  availability      VARCHAR(20),                -- 'full_time', 'part_time', 'not_available'
  response_time_hrs INTEGER,
  total_earnings    DECIMAL(15,2) DEFAULT 0,
  total_jobs        INTEGER DEFAULT 0,
  rating_avg        DECIMAL(3,2),
  rating_count      INTEGER DEFAULT 0,
  top_rated         BOOLEAN DEFAULT false,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE platform.user_skills (
  user_id  UUID REFERENCES platform.users(id),
  skill_id UUID REFERENCES platform.skills(id),
  level    VARCHAR(20),                         -- 'beginner', 'intermediate', 'expert'
  PRIMARY KEY (user_id, skill_id)
);

-- Sessions (refresh token store)
CREATE TABLE platform.sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES platform.users(id),
  token_hash      VARCHAR(200) NOT NULL,        -- bcrypt of refresh token
  device_info     JSONB,
  ip_address      INET,
  country_code    CHAR(2),
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Services & Pricing

```sql
CREATE TABLE platform.categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         VARCHAR(200) UNIQUE NOT NULL,
  parent_id    UUID REFERENCES platform.categories(id),
  icon_url     VARCHAR(500),
  sort_order   INTEGER,
  active       BOOLEAN DEFAULT true
);

-- Category names stored in translations table (not hardcoded)

CREATE TABLE platform.skills (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug   VARCHAR(200) UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true
);

CREATE TABLE platform.services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            VARCHAR(300) NOT NULL,
  category_id     UUID REFERENCES platform.categories(id),
  country_code    CHAR(2) REFERENCES platform.countries(code),
  freelancer_id   UUID REFERENCES platform.users(id),
  status          VARCHAR(20) DEFAULT 'draft',  -- draft, active, paused, archived
  delivery_days   INTEGER,
  revisions       INTEGER DEFAULT 3,
  -- SEO fields (per country/locale via translations)
  -- Actual title/description/tags → translations table
  seo_metadata    JSONB,
  featured        BOOLEAN DEFAULT false,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(slug, country_code)
);

-- All pricing is country-specific rows, never a single flat value
CREATE TABLE platform.service_pricing (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id      UUID REFERENCES platform.services(id),
  country_code    CHAR(2) REFERENCES platform.countries(code),
  tier_name       VARCHAR(50),                  -- 'basic', 'standard', 'premium'
  amount          DECIMAL(12,2) NOT NULL,
  currency        CHAR(3) NOT NULL,
  unit            VARCHAR(30),                  -- 'per_hour', 'per_project', 'per_day'
  tax_included    BOOLEAN DEFAULT false,
  active          BOOLEAN DEFAULT true,
  UNIQUE(service_id, country_code, tier_name)
);

-- Service content (title, description) are in translations table
-- service.id + locale + country → translation lookup
```

### Bookings / Jobs

```sql
CREATE TYPE booking_status AS ENUM (
  'draft', 'published', 'proposals_open', 'freelancer_selected',
  'contract_active', 'milestone_submitted', 'milestone_in_review',
  'completed', 'disputed', 'cancelled', 'refunded'
);

CREATE TABLE platform.bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID REFERENCES platform.users(id),
  freelancer_id     UUID REFERENCES platform.users(id),
  service_id        UUID REFERENCES platform.services(id),
  country_code      CHAR(2) REFERENCES platform.countries(code),
  status            booking_status NOT NULL DEFAULT 'draft',
  title             TEXT NOT NULL,
  description       TEXT,
  budget_min        DECIMAL(12,2),
  budget_max        DECIMAL(12,2),
  budget_currency   CHAR(3),
  agreed_amount     DECIMAL(12,2),
  agreed_currency   CHAR(3),
  type              VARCHAR(20),                -- 'fixed', 'hourly'
  duration_days     INTEGER,
  started_at        TIMESTAMPTZ,
  deadline_at       TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  dispute_reason    TEXT,
  metadata          JSONB,
  idempotency_key   VARCHAR(100) UNIQUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE platform.booking_histories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID REFERENCES platform.bookings(id),
  from_status booking_status,
  to_status   booking_status NOT NULL,
  actor_id    UUID REFERENCES platform.users(id),
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE platform.milestones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID REFERENCES platform.bookings(id),
  title           TEXT NOT NULL,
  description     TEXT,
  amount          DECIMAL(12,2) NOT NULL,
  currency        CHAR(3) NOT NULL,
  due_date        DATE,
  status          VARCHAR(30) DEFAULT 'pending',
  submitted_at    TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  released_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Payments (Isolated Schema)

```sql
CREATE TABLE payments.transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id            UUID REFERENCES platform.bookings(id),
  milestone_id          UUID REFERENCES platform.milestones(id),
  payer_id              UUID REFERENCES platform.users(id),
  payee_id              UUID REFERENCES platform.users(id),
  gateway               VARCHAR(50) NOT NULL,   -- 'razorpay', 'stripe', 'telr'
  gateway_order_id      VARCHAR(200),
  gateway_payment_id    VARCHAR(200),
  gateway_raw           JSONB,                  -- Full gateway response
  status                VARCHAR(30) NOT NULL,   -- created, paid, failed, refunded
  amount                DECIMAL(12,2) NOT NULL,
  currency              CHAR(3) NOT NULL,
  tax_amount            DECIMAL(12,2) DEFAULT 0,
  platform_fee          DECIMAL(12,2) DEFAULT 0,
  freelancer_amount     DECIMAL(12,2),          -- amount - tax - platform_fee
  country_code          CHAR(2) NOT NULL,
  idempotency_key       VARCHAR(200) UNIQUE,
  raw_webhook_events    JSONB DEFAULT '[]',     -- Dedup array
  invoice_url           VARCHAR(500),
  paid_at               TIMESTAMPTZ,
  refunded_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments.payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id   UUID REFERENCES platform.users(id),
  transaction_id  UUID REFERENCES payments.transactions(id),
  gateway         VARCHAR(50),                  -- 'razorpay_payout', 'stripe_payout'
  gateway_payout_id VARCHAR(200),
  amount          DECIMAL(12,2) NOT NULL,
  currency        CHAR(3) NOT NULL,
  method          VARCHAR(30),                  -- 'bank_transfer', 'upi', 'wise'
  status          VARCHAR(20) DEFAULT 'pending',
  scheduled_at    TIMESTAMPTZ,
  processed_at    TIMESTAMPTZ,
  country_code    CHAR(2) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Legal Documents Schema

```sql
CREATE TABLE legal.documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            VARCHAR(100) NOT NULL,        -- 'terms_of_service', 'privacy_policy', 'impressum'
  country_code    CHAR(2) REFERENCES platform.countries(code),
  locale          VARCHAR(10) NOT NULL,
  version         VARCHAR(20) NOT NULL,          -- 'v1.0', 'v2.0'
  status          VARCHAR(20) DEFAULT 'draft',   -- draft, published, archived
  effective_date  DATE NOT NULL,
  content         TEXT NOT NULL,                -- HTML or Markdown from CMS
  summary         TEXT,                         -- Plain-language summary (AUS/UK style)
  changelog       TEXT,                         -- What changed from previous version
  published_by    UUID,
  published_at    TIMESTAMPTZ,
  archived_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE legal.user_acceptances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES platform.users(id),
  document_id     UUID REFERENCES legal.documents(id),
  accepted_at     TIMESTAMPTZ DEFAULT NOW(),
  ip_address      INET,
  user_agent      TEXT,
  country_code    CHAR(2),
  UNIQUE(user_id, document_id)
);
```

### Translations Schema

```sql
CREATE TABLE translations.namespaces (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL  -- 'common', 'services', 'checkout', 'emails'
);

CREATE TABLE translations.keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace_id UUID REFERENCES translations.namespaces(id),
  key          VARCHAR(500) NOT NULL,
  default_en   TEXT NOT NULL,        -- English default (always required)
  context      TEXT,
  UNIQUE(namespace_id, key)
);

CREATE TABLE translations.values (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id       UUID REFERENCES translations.keys(id),
  locale       VARCHAR(10) NOT NULL,
  country_code CHAR(2),              -- NULL = applies globally for this locale
  value        TEXT NOT NULL,
  status       VARCHAR(20) DEFAULT 'draft',
  method       VARCHAR(20),          -- 'human', 'deepl', 'openai'
  published_at TIMESTAMPTZ,
  UNIQUE(key_id, locale, COALESCE(country_code, ''))
);
```

### Audit Log (Immutable)

```sql
CREATE TABLE audit.events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID,
  actor_role    VARCHAR(50),
  actor_ip      INET,
  country_code  CHAR(2),
  action        VARCHAR(200) NOT NULL,  -- 'user.login', 'booking.status.changed'
  resource_type VARCHAR(100),
  resource_id   UUID,
  before_state  JSONB,
  after_state   JSONB,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
-- NEVER UPDATE OR DELETE from this table (append-only)
-- Use PostgreSQL row-level security to enforce
ALTER TABLE audit.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_insert_only ON audit.events FOR INSERT WITH CHECK (true);
CREATE POLICY audit_no_update ON audit.events FOR UPDATE USING (false);
CREATE POLICY audit_no_delete ON audit.events FOR DELETE USING (false);
```

---

## Required PostgreSQL Indexes

```sql
-- High-priority (run before first user)
CREATE INDEX idx_users_country ON platform.users(country_code);
CREATE INDEX idx_users_role_status ON platform.users(role, status);
CREATE INDEX idx_users_email ON platform.users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_services_country_status ON platform.services(country_code, status);
CREATE INDEX idx_services_category ON platform.services(category_id, country_code);
CREATE INDEX idx_bookings_client ON platform.bookings(client_id, status);
CREATE INDEX idx_bookings_freelancer ON platform.bookings(freelancer_id, status);
CREATE INDEX idx_bookings_country ON platform.bookings(country_code, status);
CREATE INDEX idx_transactions_booking ON payments.transactions(booking_id);
CREATE INDEX idx_transactions_status ON payments.transactions(status, country_code);
CREATE INDEX idx_translations_lookup ON translations.values(key_id, locale, country_code);
CREATE INDEX idx_audit_actor ON audit.events(actor_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit.events(resource_type, resource_id, created_at DESC);
```

---

## Data Residency Strategy

Each country's sensitive user data lives in its own regional PostgreSQL cluster:

```
India (ap-south-1):     platform_IN database → users, bookings, payments for IN
UAE (me-central-1):     platform_AE database → users, bookings, payments for AE
Germany (eu-central-1): platform_DE database → users, bookings, payments for DE
USA (us-east-1):        platform_US database → users, bookings, payments for US
Australia (ap-se-2):    platform_AU database → users, bookings, payments for AU

Global (us-east-1):     platform_GLOBAL database → categories, skills, config
```

The application layer uses a **database router** that selects the correct connection based on `country_code` in the request context:

```typescript
@Injectable()
class DatabaseRouter {
  getConnection(country: CountryCode): DataSource {
    return this.connections[country] ?? this.globalConnection;
  }
}
```
