# 11 — Legal Document System

---

## Design Principles

1. **Every legal document is country-specific** — There is no "global T&C." Each country has its own version authored by local legal counsel.
2. **Every change is versioned** — Immutable version history; users are re-prompted when material changes occur.
3. **Acceptance is recorded immutably** — The exact document version a user accepted, with timestamp and IP, is stored forever (even after the document is updated).
4. **Deployment is CMS-driven** — Legal team updates documents in the CMS; no code deployment required.
5. **Germany gets special treatment** — Impressum, Widerrufsrecht, and DSGVO compliance are mandatory, enforced at the routing layer.

---

## Document Types by Country

```typescript
export const LEGAL_DOCUMENTS = {
  IN: [
    { type: 'terms_of_service',      label: 'Terms of Service',      required_at: 'signup' },
    { type: 'privacy_policy',         label: 'Privacy Policy',        required_at: 'signup' },
    { type: 'refund_policy',          label: 'Refund & Cancellation', required_at: 'checkout' },
    { type: 'cookie_policy',          label: 'Cookie Policy',         required_at: 'first_visit' },
    { type: 'freelancer_agreement',   label: 'Freelancer Agreement',  required_at: 'freelancer_signup' },
  ],
  AE: [
    { type: 'terms_of_service',       label: 'Terms of Service',      required_at: 'signup' },
    { type: 'privacy_policy',         label: 'Privacy Policy',        required_at: 'signup' },
    { type: 'refund_policy',          label: 'Refund Policy',         required_at: 'checkout' },
    { type: 'cookie_policy',          label: 'Cookie Policy',         required_at: 'first_visit' },
    { type: 'freelancer_agreement',   label: 'Freelancer Agreement',  required_at: 'freelancer_signup' },
  ],
  DE: [
    { type: 'agb',                    label: 'Allgemeine Geschäftsbedingungen (AGB)', required_at: 'signup' },
    { type: 'datenschutzerklaerung',  label: 'Datenschutzerklärung (DSGVO)',          required_at: 'signup' },
    { type: 'widerrufsbelehrung',     label: 'Widerrufsrecht',                        required_at: 'checkout' },
    { type: 'impressum',              label: 'Impressum',             required_at: 'page' }, // Must be accessible at all times
    { type: 'cookie_richtlinie',      label: 'Cookie-Richtlinie',     required_at: 'first_visit' },
    { type: 'auftragsverarbeitung',   label: 'Auftragsverarbeitungsvertrag (AVV)', required_at: 'freelancer_signup' }, // GDPR DPA
    { type: 'freelancer_vereinbarung', label: 'Freiberufler-Vereinbarung',          required_at: 'freelancer_signup' },
  ],
  US: [
    { type: 'terms_of_service',       label: 'Terms of Service',        required_at: 'signup' },
    { type: 'privacy_policy',         label: 'Privacy Policy',          required_at: 'signup' },
    { type: 'ccpa_notice',            label: 'CCPA Privacy Notice',     required_at: 'signup' }, // California users
    { type: 'refund_policy',          label: 'Refund Policy',           required_at: 'checkout' },
    { type: 'cookie_policy',          label: 'Cookie Policy',           required_at: 'first_visit' },
    { type: 'independent_contractor', label: 'Independent Contractor Agreement', required_at: 'freelancer_signup' },
    { type: 'w9_acknowledgement',     label: 'W-9 Tax Form Acknowledgement',     required_at: 'freelancer_payout' },
  ],
  AU: [
    { type: 'terms_of_service',       label: 'Terms of Service',         required_at: 'signup' },
    { type: 'privacy_policy',         label: 'Privacy Policy (Privacy Act 1988)', required_at: 'signup' },
    { type: 'refund_policy',          label: 'Refund Policy (ACL)',       required_at: 'checkout' },
    { type: 'cookie_policy',          label: 'Cookie Policy',            required_at: 'first_visit' },
    { type: 'freelancer_agreement',   label: 'Freelancer Agreement',     required_at: 'freelancer_signup' },
  ],
} as const;
```

---

## Database Schema

```sql
CREATE TABLE legal.documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type             VARCHAR(100) NOT NULL,        -- 'terms_of_service', 'impressum', etc.
  country_code     CHAR(2) NOT NULL,
  locale           VARCHAR(10) NOT NULL,         -- 'en', 'hi', 'de', 'ar'
  version          VARCHAR(20) NOT NULL,          -- 'v1.0', 'v1.1', 'v2.0'
  version_number   INTEGER NOT NULL,             -- 1, 2, 3 (for ordering)
  is_material_change BOOLEAN DEFAULT false,      -- True = re-prompt existing users
  title            TEXT NOT NULL,
  content_html     TEXT NOT NULL,               -- Full HTML from CMS editor
  content_md       TEXT,                         -- Markdown source
  summary          TEXT,                         -- Plain language summary
  changelog        TEXT,                         -- Bullet list of changes
  effective_date   DATE NOT NULL,
  expiry_date      DATE,                         -- NULL = current version
  status           VARCHAR(20) DEFAULT 'draft',  -- draft, review, approved, published, archived
  approved_by      UUID,
  approved_at      TIMESTAMPTZ,
  published_by     UUID,
  published_at     TIMESTAMPTZ,
  archived_at      TIMESTAMPTZ,
  checksum         CHAR(64),                     -- SHA-256 of content (tamper evidence)
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(type, country_code, locale, version)
);

-- Immutable acceptance log
CREATE TABLE legal.user_acceptances (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES platform.users(id),
  document_id      UUID NOT NULL REFERENCES legal.documents(id),
  document_type    VARCHAR(100) NOT NULL,        -- Denormalized for query speed
  document_version VARCHAR(20) NOT NULL,         -- Denormalized
  country_code     CHAR(2) NOT NULL,
  locale           VARCHAR(10) NOT NULL,
  accepted_at      TIMESTAMPTZ DEFAULT NOW(),
  ip_address       INET NOT NULL,
  user_agent       TEXT,
  method           VARCHAR(20) DEFAULT 'checkbox', -- 'checkbox', 'api', 'implicit'
  UNIQUE(user_id, document_id)
);
-- APPEND-ONLY: enforced via trigger
```

---

## Legal Service API

```typescript
// GET /v1/legal/IN/terms_of_service
// Returns: latest published version in user's locale (falls back to 'en')

@Get(':country/:type')
async getDocument(
  @Param('country') country: string,
  @Param('type') type: string,
  @Query('locale') locale = 'en',
  @Query('version') version?: string,
): Promise<LegalDocumentResponse> {
  // Cache key: legal:{country}:{type}:{locale}:{version}
  const cacheKey = `legal:${country}:${type}:${locale}:${version ?? 'latest'}`;
  const cached = await this.redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const doc = await this.legalRepo.findOne({
    where: {
      countryCode: country,
      type,
      locale,
      status: 'published',
      ...(version ? { version } : {}),
    },
    order: { versionNumber: 'DESC' },
  });

  if (!doc) {
    // Fallback to English
    return this.getDocument(country, type, 'en', version);
  }

  const result: LegalDocumentResponse = {
    type: doc.type,
    version: doc.version,
    effectiveDate: doc.effectiveDate,
    title: doc.title,
    content: doc.contentHtml,
    summary: doc.summary,
    changelog: doc.changelog,
    isMaterialChange: doc.isMaterialChange,
  };

  await this.redis.setex(cacheKey, 86400, JSON.stringify(result));
  return result;
}

// POST /v1/legal/acceptance — Record user accepting a document
@Post('acceptance')
async recordAcceptance(
  @Body() dto: RecordAcceptanceDto,
  @CurrentUser() user: User,
  @RealIp() ip: string,
  @UserAgent() ua: string,
): Promise<void> {
  const doc = await this.legalRepo.findOneOrFail({ where: { id: dto.documentId } });

  await this.acceptanceRepo.save({
    userId: user.id,
    documentId: doc.id,
    documentType: doc.type,
    documentVersion: doc.version,
    countryCode: doc.countryCode,
    locale: doc.locale,
    ipAddress: ip,
    userAgent: ua,
    method: dto.method ?? 'checkbox',
  });

  // Emit to audit log
  await this.auditService.log({
    action: 'legal.document.accepted',
    actorId: user.id,
    resourceType: 'legal_document',
    resourceId: doc.id,
    metadata: { version: doc.version, type: doc.type },
  });
}

// GET /v1/legal/acceptance/status — Check if user has accepted all required docs
@Get('acceptance/status')
async getAcceptanceStatus(
  @CurrentUser() user: User,
  @Query('country') country: string,
): Promise<AcceptanceStatusResponse> {
  const required = LEGAL_DOCUMENTS[country].filter(d => d.required_at === 'signup');
  const accepted = await this.acceptanceRepo.find({
    where: { userId: user.id, countryCode: country },
  });

  const pending = required.filter(req => {
    const latestDoc = this.getLatestVersion(req.type, country);
    const userAccepted = accepted.find(a =>
      a.documentType === req.type && a.documentVersion === latestDoc.version
    );
    return !userAccepted;
  });

  return {
    allAccepted: pending.length === 0,
    pending: pending.map(d => ({
      type: d.type,
      label: d.label,
      documentId: this.getLatestVersion(d.type, country).id,
    })),
  };
}
```

---

## Material Change Flow

When legal team publishes a new version marked `is_material_change = true`:

```
1. CMS publishes new version → webhook to Legal Service
2. Legal Service:
   a. Archives previous version
   b. Sets new version as published
   c. Purges CDN cache for that document
   d. Identifies all affected users (country_code matches)
   e. Enqueues notification: "Our Terms have updated" per user
3. On next login for affected users:
   a. /v1/legal/acceptance/status returns pending: [new_version]
   b. Frontend shows blocking modal: "Please review and accept updated Terms"
   c. User cannot proceed until they accept
4. For users who don't login within 30 days:
   e. Send email: "Action required: Review updated Terms"
```

---

## Germany Special Requirements

### Impressum (Legal Notice — Mandatory by Law)

```html
<!-- Required content per German Telemedia Act §5 -->
<div class="impressum">
  <h1>Impressum</h1>
  <p><strong>Anbieter:</strong> [Platform GmbH]</p>
  <p><strong>Adresse:</strong> [Full address in Germany]</p>
  <p><strong>Vertretungsberechtigte Person:</strong> [CEO name]</p>
  <p><strong>Handelsregister:</strong> [HRB number, AG city]</p>
  <p><strong>Umsatzsteuer-ID:</strong> DE [number]</p>
  <p><strong>E-Mail:</strong> legal@platform.de</p>
  <p><strong>Telefon:</strong> [DE phone number]</p>
  <p><strong>Zuständige Aufsichtsbehörde:</strong> [if applicable]</p>
</div>
```

Must be reachable within 2 clicks from every page → footer link `/de/legal/impressum/`

### GDPR Consent (for DE, and any EU user)

```typescript
// Consent categories:
const CONSENT_CATEGORIES = {
  essential: {
    label: 'Notwendige Cookies',
    description: 'Für die Grundfunktionen erforderlich',
    required: true,   // Cannot be disabled
    cookies: ['qh_session', 'qh_csrf', 'qh_country'],
  },
  functional: {
    label: 'Funktionale Cookies',
    description: 'Für personalisierte Funktionen',
    required: false,
    cookies: ['qh_locale', 'qh_currency'],
  },
  analytics: {
    label: 'Analytische Cookies',
    description: 'Für Nutzungsanalyse (anonymisiert)',
    required: false,
    cookies: ['_ga', '_gid', 'plausible'],
  },
  marketing: {
    label: 'Marketing-Cookies',
    description: 'Für personalisierte Werbung',
    required: false,
    cookies: ['_fbp', 'fr'],
  },
};
```

Consent is stored in:
1. `user_consents` database table (for authenticated users)
2. `qh_consent` cookie (encrypted JSON for anonymous users)
3. Audit log (immutable record)
