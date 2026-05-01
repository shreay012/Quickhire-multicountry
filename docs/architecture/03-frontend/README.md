# Frontend Architecture

**Location:** `frontend/`  
**Framework:** Next.js 16.1.6 (App Router)  
**React:** 19.2.3  
**Language:** JavaScript (no TypeScript)

---

## Directory Structure

```
frontend/
├── app/                    ← Next.js App Router (28 page routes)
│   ├── layout.jsx          ← Root layout + provider tree
│   ├── globals.css
│   └── (home-page)/        ← Homepage (route group, no URL segment)
│   └── service-details/    ← Individual pages...
├── components/
│   ├── auth/               ← Login, OTP forms
│   ├── common/             ← Shared UI (buttons, cards, inputs)
│   ├── layout/             ← Navbar, Footer, LayoutWrapper
│   ├── providers/          ← React context providers
│   │   ├── ClientProviders.jsx   ← Groups SocketProvider + ToastProvider
│   │   ├── SocketProvider.jsx    ← Global Socket.io connection
│   │   ├── ToastProvider.jsx     ← Toast notification context
│   │   ├── ThemeRegistryFixed.jsx← MUI SSR-safe theme
│   │   └── RegionInitializer.jsx ← Boots Redux region slice from cookies
│   ├── staff/              ← Admin/PM/Resource panel components
│   └── ui/                 ← Primitive UI components
├── features/               ← Page-level feature slices (components + logic)
│   ├── homepage/
│   ├── booking/
│   ├── notification/
│   ├── faq/
│   ├── logout/
│   ├── about/
│   ├── profile/
│   ├── cart/
│   └── services/
├── lib/
│   ├── axios/
│   │   ├── axiosInstance.js     ← Main axios client + interceptors
│   │   └── staffApi.js          ← Staff portal axios client
│   ├── hooks/              ← Custom React hooks
│   ├── i18n/               ← next-intl config, locale config, flattenI18nDeep
│   ├── redux/
│   │   ├── store/          ← Redux store configuration
│   │   ├── slices/         ← 13 Redux slices
│   │   └── providers/      ← ReduxProvider wrapper
│   ├── services/           ← Service layer (chatSocketService, etc.)
│   └── utils/              ← Pure utility functions
├── messages/               ← i18n message JSON files
│   ├── en.json
│   ├── hi.json
│   ├── ar.json
│   ├── de.json
│   └── cms/                ← CMS content files per locale
├── public/                 ← Static assets
│   ├── images/
│   ├── videos/
│   └── fonts/
├── middleware.js            ← Next.js Edge middleware (geo detection)
├── next.config.js
├── i18n.js                  ← next-intl request handler
└── tailwind.config.js
```

---

## Provider Tree (Root Layout)

```jsx
<html lang={locale} dir={dir}>       ← RTL support for Arabic
  <NextIntlClientProvider>            ← i18n messages + locale context
    <ReduxProvider>                   ← Redux store
      <ThemeRegistry>                 ← MUI theme (SSR-safe)
        <ClientProviders>             ← Groups client-side providers
          ├── <SocketProvider>        ← Socket.io connection lifecycle
          ├── <ToastProvider>         ← Toast context
          └── <RegionInitializer>     ← Reads qh_locale/qh_currency cookies → Redux
          <LayoutWrapper>             ← Navbar + Footer (hides on admin/pm/resource)
            {children}
```

---

## Page Routes (28 total)

| Route | Auth | Role | Description |
|---|---|---|---|
| `/` | Public | Any | Homepage — hero, service list, how it works |
| `/service-details` | Public | Any | Service detail page with pricing |
| `/book-your-resource` | Public (login at checkout) | customer | Booking configuration (technologies, duration, type) |
| `/cart` | Soft (guest ok) | customer | Cart review + promo code |
| `/checkout` | Required | customer | Details form + payment trigger |
| `/payment-success` | Required | customer | Post-payment confirmation |
| `/booking-workspace` | Required | customer/pm | Real-time booking workspace + chat |
| `/booking-ongoing` | Required | customer | Active booking status view |
| `/profile` | Required | customer | Customer profile management |
| `/notifications` | Required | customer | Notification centre |
| `/chat` | Required | customer/pm | Chat list/interface |
| `/support-chat` | Required | customer | Support chat / ticket creation |
| `/login` | Public | — | OTP login for customers |
| `/staff-login` | Public | — | OTP login for staff (pm/resource/admin) |
| `/admin` | Required | admin roles | Admin panel |
| `/pm` | Required | pm | PM dashboard |
| `/resource` | Required | resource | Resource dashboard |
| `/about-us` | Public | — | Static about page |
| `/how-it-works` | Public | — | Static how-it-works page |
| `/faq` | Public | — | FAQ (also feeds chatbot) |
| `/contact-us` | Public | — | Contact form |
| `/terms-and-conditions` | Public | — | Legal |
| `/cancellation-and-refund-policy` | Public | — | Legal |
| `/test-chat` | Public | — | Chat testing page (dev tool) |

---

## Redux Store — 13 Slices

```js
store = {
  auth:         authSlice,          // isAuthenticated, user, token, loading, error
  booking:      bookingSlice,       // current booking draft, jobId, status
  user:         userSlice,          // current user profile
  services:     discoverSlice,      // service catalogue list
  userProfile:  userProfileSlice,   // editable profile state
  availability: availabilitySlice,  // 7-day slot grid
  pricing:      pricingSlice,       // computed pricing for current selection
  payment:      paymentSlice,       // payment status, orderId
  tickets:      ticketSlice,        // support tickets
  dashboard:    dashboardSlice,     // admin/PM dashboard stats
  notifications: notificationsSlice, // notification list + unread count
  cart:         cartSlice,          // cart items, promo code, totals
  region:       regionSlice,        // country, currency, locale (from cookies)
}
```

---

## Axios Instances

### `axiosInstance.js` (customer + main)

```
Base URL:    NEXT_PUBLIC_API_URL || "http://localhost:4000"
Timeout:     20 seconds
Request:     Injects "Authorization: Bearer {token || guestToken}"
             Removes Content-Type for FormData (let browser set boundary)
Response:    - 401 on protected page → clearAuthStorage + redirect /login
             - All responses: flattenI18nDeep(data, activeLocale)
               (converts { en: "...", hi: "..." } → "..." for active locale)
```

### `staffApi.js` (admin/pm/resource)

Separate axios instance for the staff portal with its own auth handling. Staff auth is separate because staff login (`/staff-login`) is a different code path.

---

## i18n System

### Locales (8)

| Locale | Language | Direction |
|---|---|---|
| `en` | English | LTR |
| `hi` | Hindi | LTR |
| `ar` | Arabic | RTL |
| `de` | German | LTR |
| `es` | Spanish | LTR |
| `fr` | French | LTR |
| `zh-CN` | Chinese Simplified | LTR |
| `ja` | Japanese | LTR |

### Geo Detection Chain

**Frontend (Edge middleware.js):**
```
1. CF-IPCountry (Cloudflare) → COUNTRY_REGIONS map → locale + currency
2. Accept-Language header → matching locale
3. Existing qh_locale / qh_currency cookies (highest priority, user override)
4. Defaults: locale=en, currency=INR
```
Cookies: `qh_locale`, `qh_currency`, `qh_country` (1-year TTL)

**Backend (geo.middleware.js):**
```
1. CF-IPCountry header
2. X-Country override header
3. Accept-Language
4. Default: IN
```
Attaches `req.geo = { country, currency, lang, timezone, gateways }` to every request.

### `flattenI18nDeep` Function

Critical frontend utility in `lib/i18n/flattenI18nDeep.js`:
```
Input:  { name: { en: "React Developer", hi: "रिएक्ट डेवलपर" }, ... }
Output: { name: "React Developer", ... }  (for locale=en)
```
Applied in axios response interceptor on **every API response**. This means service names, descriptions, and any other i18n object fields are automatically normalized before reaching Redux/components.

---

## Socket.io Client Architecture

`SocketProvider.jsx` manages the global connection:

```
Login detected (via localStorage polling + "userLoggedIn" custom event):
  → chatSocketService.connect({
      baseUrl: "http://localhost:5000",   ← HARDCODED (see bug below)
      path: "/api/socket.io",
      userId: user._id,
      authToken: token,
      onNotificationReceived: (data) → showToast() + setNotifications()
      onMessageReceived: (data) → ...
      onConnected: () → setIsConnected(true)
    })

Browser notification:
  → Requests Notification.permission if default
  → Shows browser notification for received events

Socket cleanup:
  → Logout triggers disconnect (not in SocketProvider, handled by logout action)
```

**Bug:** `baseUrl` is hardcoded to `http://localhost:5000` in SocketProvider. Should use `NEXT_PUBLIC_API_URL` env var.

---

## Next.js Configuration

```js
// next.config.js
{
  images: { domains: [...] },
  // next-intl plugin wraps config
}
```

---

## Key Frontend Flows

### Login Flow (Customer)
```
/login page
  → Enter mobile
  → POST /auth/send-otp
  → Enter OTP
  → POST /auth/verify-otp
  → Store { token, refreshToken, user, userType, isNewUser } in localStorage
  → dispatch(window.dispatchEvent(new Event('userLoggedIn')))
     ← SocketProvider listens for this to connect socket
  → Redirect: ?next param or /profile (new user) or /booking-workspace
```

### Staff Login Flow (Admin/PM/Resource)
```
/staff-login page
  → Same OTP flow but role is inferred from user.role in DB
  → Different redirect: /admin | /pm | /resource
  → staffApi.js handles subsequent requests
```

### Guest → Authenticated Transition
```
Guest browses → adds to cart → clicks checkout
  → Prompted to login at checkout step 4
  → guestData = JSON.stringify({ booking draft }) saved to localStorage
  → After login: retrieve guestData → restore booking state
  → Continue checkout from where they left off
```

---

## State Management Patterns

### Auth State
- Persisted to localStorage manually (not via redux-persist)
- Redux `auth` slice mirrors localStorage on init
- Cleared on logout + 401 from protected page

### Booking State  
- Multi-step form stored in `booking` slice
- `cartSlice` holds selected services + quantities + promo
- `pricingSlice` holds computed subtotal/tax/total from `/jobs/pricing`
- `availabilitySlice` holds the 7-day slot grid

### Notifications
- Populated from `GET /notifications` on mount
- Updated in real-time via SocketProvider socket events
- Unread count displayed in navbar

---

## Testing

```
Unit:  Jest + @testing-library/react  (components + slices)
E2E:   Playwright  (booking flow, auth, guest flow)

Notable E2E tests (from test-results/):
  - Guest booking flow preserved after navigation
  - Guest data persists in localStorage
  - Redirect to login on booking page
  - isAuthenticated = false for guests
  - Booking page loads without infinite loop errors
```
