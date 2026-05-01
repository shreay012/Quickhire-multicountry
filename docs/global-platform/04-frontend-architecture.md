# 04 — Frontend Architecture

---

## Framework: Next.js 15 App Router

```
Rendering Strategy per page type:
─────────────────────────────────────────────────────────────
Homepage, Category pages          → ISR (revalidate: 3600s)
Service listing                   → ISR (revalidate: 300s)
Individual service / freelancer   → ISR (revalidate: 3600s) + on-demand revalidation
Legal documents                   → ISR (revalidate: 86400s) + on-demand when CMS updates
Search results                    → SSR (dynamic, no cache)
Dashboard / profile               → CSR (auth-gated, no SSR needed)
Blog / FAQ / Help                 → ISR (revalidate: 3600s)
Checkout / Payment                → SSR (must have fresh pricing)
```

---

## Directory Structure

```
frontend/
├── app/
│   ├── layout.tsx                        ← Root layout — fonts, global providers
│   ├── page.tsx                          ← Root → redirect to detected country
│   ├── not-found.tsx
│   ├── [country]/                        ← e.g., "in", "ae", "de", "us", "au"
│   │   ├── layout.tsx                    ← Country layout: injects country config
│   │   ├── page.tsx                      ← Country homepage (ISR)
│   │   ├── [locale]/                     ← e.g., "hi", "ar", "de", "es"
│   │   │   ├── layout.tsx               ← Locale layout: RTL for 'ar'
│   │   │   └── page.tsx
│   │   ├── services/
│   │   │   ├── page.tsx                 ← Service catalogue
│   │   │   └── [slug]/
│   │   │       ├── page.tsx             ← Service detail (ISR)
│   │   │       └── opengraph-image.tsx  ← Dynamic OG image per service
│   │   ├── freelancers/
│   │   │   ├── page.tsx                 ← Freelancer listing
│   │   │   └── [username]/
│   │   │       └── page.tsx             ← Freelancer profile (ISR)
│   │   ├── categories/
│   │   │   └── [slug]/page.tsx
│   │   ├── search/
│   │   │   └── page.tsx                 ← SSR: dynamic search
│   │   ├── legal/
│   │   │   └── [document]/
│   │   │       └── page.tsx             ← Dynamic from CMS (ISR)
│   │   ├── blog/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── faq/page.tsx
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── (dashboard)/                 ← Route group — authenticated
│   │       ├── layout.tsx               ← Auth guard wrapper
│   │       ├── dashboard/page.tsx
│   │       ├── bookings/page.tsx
│   │       ├── bookings/[id]/page.tsx
│   │       ├── messages/page.tsx
│   │       ├── profile/page.tsx
│   │       ├── earnings/page.tsx
│   │       └── settings/page.tsx
├── components/
│   ├── cms/                             ← CMS-rendered block components
│   │   ├── BlockRenderer.tsx            ← Switches on block.type → component
│   │   ├── HeroBanner.tsx
│   │   ├── ServiceGrid.tsx
│   │   ├── TestimonialCarousel.tsx
│   │   ├── FaqAccordion.tsx
│   │   ├── RichText.tsx
│   │   └── MediaBlock.tsx
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── CountrySwitcher.tsx
│   ├── ui/                              ← Primitive components (shadcn/ui)
│   ├── forms/
│   ├── search/
│   │   ├── SearchBar.tsx
│   │   ├── FilterPanel.tsx
│   │   └── ResultCard.tsx
│   ├── payment/
│   │   ├── PaymentButton.tsx            ← Routes to correct gateway UI
│   │   ├── RazorpayCheckout.tsx
│   │   ├── StripeCheckout.tsx
│   │   └── PaymentSummary.tsx
│   └── providers/
│       ├── CountryProvider.tsx          ← Injects country config into context
│       ├── TranslationProvider.tsx      ← next-intl wrapper
│       ├── AuthProvider.tsx
│       └── ThemeProvider.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts                   ← Axios/fetch wrapper + interceptors
│   │   ├── cms.ts                      ← CMS API client
│   │   └── search.ts                   ← Typesense client
│   ├── i18n/
│   │   ├── request.ts                  ← next-intl server-side request handler
│   │   ├── navigation.ts               ← Locale-aware Link/redirect/useRouter
│   │   └── server.ts                   ← getTranslations() for server components
│   ├── hooks/
│   │   ├── useCountry.ts
│   │   ├── useTranslation.ts
│   │   ├── useCurrency.ts
│   │   └── useAuth.ts
│   └── utils/
│       ├── formatCurrency.ts           ← Uses Intl.NumberFormat per country
│       ├── formatDate.ts               ← Uses Intl.DateTimeFormat per country
│       └── tax.ts                      ← Tax computation per country
├── config/
│   ├── countries.ts                    ← COUNTRY_CONFIG (single source of truth)
│   └── routes.ts
├── middleware.ts                        ← Next.js Edge middleware
├── next.config.ts
├── i18n.ts
└── tailwind.config.ts
```

---

## Translation System (Dynamic, Database-backed)

### Architecture

```
Translations are NOT in JSON files.
They live in PostgreSQL → served via Translation Service API → cached at CDN.

Flow:
1. Server Component calls getTranslations(namespace, country, locale)
2. Translation Service looks up: translations table WHERE namespace + locale + country
3. Returns: { key: "translated_value", ... }
4. Cached in Redis: translations:{locale}:{country}:{namespace} (TTL: 1h)
5. CDN caches: /api/translations/{locale}/{country}/{namespace} (TTL: 1h, purge on update)
```

### Database Schema for Translations

```sql
CREATE TABLE translation_namespaces (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,  -- "common", "services", "legal", "checkout"
  description TEXT
);

CREATE TABLE translation_keys (
  id UUID PRIMARY KEY,
  namespace_id UUID REFERENCES translation_namespaces(id),
  key VARCHAR(500) NOT NULL,          -- "hero.headline", "button.bookNow"
  default_value TEXT,                 -- English fallback
  context TEXT,                       -- Hint for translators
  UNIQUE(namespace_id, key)
);

CREATE TABLE translations (
  id UUID PRIMARY KEY,
  key_id UUID REFERENCES translation_keys(id),
  locale VARCHAR(10) NOT NULL,        -- "hi", "ar", "de", "es"
  country_code CHAR(2),               -- NULL = applies to all countries
  value TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'draft', -- draft, review, published
  translated_by VARCHAR(100),         -- "human" | "deepl" | "openai"
  reviewed_by UUID,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(key_id, locale, country_code)
);
```

### CMS-side: Admin can edit translations

The Admin Panel has a Translation Manager:
- Browse all namespaces
- Edit any key per locale and country
- Machine translate (DeepL API) with one click
- Human review queue
- Publish immediately → triggers cache purge via CDN tag

---

## Rendering Strategy Detail

### ISR with On-Demand Revalidation

```typescript
// app/[country]/services/[slug]/page.tsx

export async function generateStaticParams() {
  // Pre-build all service pages for all countries at build time
  const services = await getServicesForAllCountries();
  return services.map(s => ({ country: s.country, slug: s.slug }));
}

export const revalidate = 3600; // Fallback: rebuild every hour

export async function generateMetadata({ params }) {
  const country = params.country.toUpperCase();
  const service = await getService(params.slug, country);
  return {
    title: service.seoTitle,
    description: service.seoDescription,
    alternates: { canonical: `/${params.country}/services/${params.slug}/` },
    openGraph: { ... }
  };
}

export default async function ServicePage({ params }) {
  const country = params.country.toUpperCase();
  const locale = params.locale || COUNTRY_CONFIG[country].defaultLocale;

  const [service, pricing, translations] = await Promise.all([
    getService(params.slug, country),
    getPricing(params.slug, country),
    getTranslations('services', country, locale),
  ]);

  return <ServiceDetail service={service} pricing={pricing} t={translations} />;
}
```

```typescript
// CMS webhook → Next.js revalidation
// When admin publishes service update in CMS:

// POST /api/revalidate (Next.js route handler)
export async function POST(request: Request) {
  const secret = request.headers.get('x-revalidate-secret');
  if (secret !== process.env.REVALIDATION_SECRET) return new Response('Unauthorized', { status: 401 });

  const { type, slug, countries } = await request.json();

  // Revalidate specific pages only
  for (const country of countries) {
    await revalidatePath(`/${country.toLowerCase()}/services/${slug}`);
    await revalidatePath(`/${country.toLowerCase()}/services`); // listing page too
  }

  return Response.json({ revalidated: true });
}
```

---

## CMS-Driven Page Builder

### Block Renderer

Every page from the CMS is an array of content blocks. The frontend renders them dynamically:

```typescript
// components/cms/BlockRenderer.tsx

const BLOCK_COMPONENTS = {
  hero_banner:          HeroBanner,
  service_grid:         ServiceGrid,
  testimonial_carousel: TestimonialCarousel,
  faq_accordion:        FaqAccordion,
  rich_text:            RichText,
  cta_section:          CtaSection,
  stats_row:            StatsRow,
  video_embed:          VideoEmbed,
  image_gallery:        ImageGallery,
  pricing_table:        PricingTable,
  trust_badges:         TrustBadges,
  freelancer_showcase:  FreelancerShowcase,
  category_grid:        CategoryGrid,
} as const;

export function BlockRenderer({ blocks, country, locale }) {
  return (
    <>
      {blocks.map((block) => {
        const Component = BLOCK_COMPONENTS[block.type];
        if (!Component) return null;
        return (
          <Component
            key={block.id}
            {...block.data}
            country={country}
            locale={locale}
          />
        );
      })}
    </>
  );
}
```

### Country-Specific Block Visibility

Each block in the CMS has `visibility_rules`:
```json
{
  "type": "hero_banner",
  "data": { ... },
  "visibility": {
    "countries": ["IN", "AE"],   // Only show in India and UAE
    "locales": null,             // null = all locales
    "user_segments": null,       // null = all users
    "date_from": null,
    "date_to": null
  }
}
```

Blocks outside a country's scope are filtered server-side before rendering — the client never receives hidden block data.

---

## Currency Display & Formatting

```typescript
// lib/utils/formatCurrency.ts

export function formatCurrency(
  amount: number,
  currency: string,
  locale: string,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(getNumberLocale(locale, currency), {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'INR' ? 0 : 2,
    ...options,
  }).format(amount);
}

// Examples:
// formatCurrency(7552, 'INR', 'hi') → "₹7,552"       (Indian locale, no paise)
// formatCurrency(1000, 'AED', 'ar') → "١٬٠٠٠ د.إ.‏"  (Arabic numerals)
// formatCurrency(1000, 'EUR', 'de') → "1.000,00 €"    (German format)
// formatCurrency(1000, 'USD', 'en') → "$1,000.00"
```

---

## RTL Support (Arabic)

Arabic locale (`ar`) requires full RTL layout:

```typescript
// app/[country]/[locale]/layout.tsx

export default function LocaleLayout({ children, params }) {
  const isRTL = params.locale === 'ar';

  return (
    <html lang={params.locale} dir={isRTL ? 'rtl' : 'ltr'}>
      <body className={isRTL ? 'font-arabic' : 'font-inter'}>
        {children}
      </body>
    </html>
  );
}
```

```css
/* Tailwind RTL with @tailwindcss/rtl or CSS logical properties */
.card {
  padding-inline-start: 1rem;  /* replaces padding-left */
  padding-inline-end: 1rem;    /* replaces padding-right */
  margin-inline-start: auto;   /* replaces margin-left */
}
```

---

## Performance Targets

| Metric | Target | Strategy |
|---|---|---|
| LCP | < 2.5s | ISR + CDN serving, optimized images via Cloudflare Images |
| FID/INP | < 100ms | Minimal client JS, defer non-critical |
| CLS | < 0.1 | Skeleton loaders, image dimensions pre-set |
| TTFB | < 200ms | CDN edge serves ISR pages |
| Bundle size | < 200KB JS (first load) | Code splitting per country/locale chunk |
| Core Web Vitals | Pass | Automated Lighthouse CI in GitHub Actions |
