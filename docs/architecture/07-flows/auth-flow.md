# Authentication & Authorization Flow

## Auth Strategy

QuickHire uses **OTP-based mobile authentication** — no passwords. The auth system has four token types:

| Token | TTL | Storage | Purpose |
|---|---|---|---|
| Access token | 15 minutes | Client localStorage | API authorization |
| Refresh token | 30 days | MongoDB session + client localStorage | Issue new access tokens |
| Guest token | 7 days | Client localStorage (`guestToken`) | Browse + start booking without login |
| Session blocklist | Until access token expiry | Redis | Revoke sessions on logout |

---

## OTP Login Flow (Sequence)

```
Customer                Frontend              Backend               Redis/Mongo
   │                       │                     │                      │
   │  Enter mobile         │                     │                      │
   │──────────────────────>│                     │                      │
   │                       │  POST /auth/send-otp │                      │
   │                       │  { mobile, role }   │                      │
   │                       │────────────────────>│                      │
   │                       │                     │  Check rate limit    │
   │                       │                     │  otp:rate:{mobile}   │
   │                       │                     │────────────────────>│
   │                       │                     │  if count > 5 → 429  │
   │                       │                     │                      │
   │                       │                     │  genOtp() → "1234"   │
   │                       │                     │  bcrypt.hash(otp)    │
   │                       │                     │  SET otp:{role}:{mob}│
   │                       │                     │  EX 300 (5min)       │
   │                       │                     │────────────────────>│
   │                       │                     │  sendSms(mobile)     │
   │                       │                     │  (MSG91 / mock)      │
   │                       │  { success: true }  │                      │
   │                       │<────────────────────│                      │
   │  OTP arrives via SMS  │                     │                      │
   │<──────────────────────│                     │                      │
   │                       │                     │                      │
   │  Enter OTP "1234"     │                     │                      │
   │──────────────────────>│                     │                      │
   │                       │  POST /auth/verify-otp                     │
   │                       │  { mobile, otp, fcmToken, role }           │
   │                       │────────────────────>│                      │
   │                       │                     │  GET otp:{role}:{mob}│
   │                       │                     │────────────────────>│
   │                       │                     │  bcrypt.compare()    │
   │                       │                     │  DEL otp:{role}:{mob}│
   │                       │                     │                      │
   │                       │                     │  upsertUser()        │
   │                       │                     │  (create if new)     │
   │                       │                     │                      │
   │                       │                     │  nanoid(48) refreshToken
   │                       │                     │  bcrypt.hash(refresh)│
   │                       │                     │  createSession()     │
   │                       │                     │  → MongoDB sessions  │
   │                       │                     │                      │
   │                       │                     │  jwt.sign({ sub, role, sessionId })
   │                       │                     │  algorithm: RS256    │
   │                       │                     │  expires: 15m        │
   │                       │  { token, refreshToken, user, isNewUser }  │
   │                       │<────────────────────│                      │
   │  Stored in localStorage                     │                      │
   │  token + user + userType                    │                      │
```

---

## Token Refresh Flow

```
Frontend                Backend                Redis / Mongo
   │                       │                       │
   │  POST /auth/refresh   │                       │
   │  { refreshToken }     │                       │
   │  + Bearer {accessToken}                       │
   │──────────────────────>│                       │
   │                       │  Extract sessionId from accessToken claims
   │                       │  findSession(sessionId)                 │
   │                       │──────────────────────────────────────>│
   │                       │  if revoked → 401     │                │
   │                       │  if expired → 401     │                │
   │                       │  bcrypt.compare(refreshToken, hash)    │
   │                       │  findUserById(session.userId)          │
   │                       │  signAccessToken() → new 15m token     │
   │  { token, user }      │                       │                │
   │<──────────────────────│                       │                │
```

---

## Request Authentication (Every Protected Request)

```
Request arrives at authMiddleware:
  1. Check if path is in PUBLIC_PATHS set → skip if yes
  2. Check if method=GET and path starts with PUBLIC_PREFIXES → skip if yes
  3. Extract "Authorization: Bearer {token}" header
  4. jwt.verify(token, JWT_PUBLIC_KEY, { algorithms, issuer, audience })
  5. If token has sessionId: redis.get("blocklist:{sessionId}") → reject if found
  6. Attach req.user = { id, role, sessionId }
  7. setSentryUser(req.user) → Sentry error context
```

---

## Logout Flow

```
POST /auth/logout
  1. repo.revokeSession(sessionId) → MongoDB session.revoked = true
  2. redis.set("blocklist:{sessionId}", "1", EX {max of 60s or token remaining TTL})
  3. Frontend clears localStorage: token, user, userType, isNewUser, guestToken, guestData
```

---

## Guest Access Flow

```
POST /auth/guest-access
  → jwt.sign({ sub: "guest_{nanoid16}", role: "guest" }, 7d)
  → No MongoDB record created
  → Stored in localStorage as "guestToken"

Guest can:
  - Browse services (public routes)
  - View pricing (/jobs/pricing)
  - Start a booking (slot selection, cart)
  - At checkout step 4 (DetailsStep): prompted to login
  - After login: guestData merged into authenticated session

Frontend reads whichever token exists:
  readToken() = localStorage.token || localStorage.guestToken
```

---

## Role & Permission System

### 10 Roles

| Role | Type | Description |
|---|---|---|
| `super_admin` | Staff | Full access including RBAC edits |
| `admin` | Staff | Legacy alias — ops + finance combined |
| `ops` | Staff | Bookings, PM/resource pool, reassign, tickets |
| `finance` | Staff | Payouts, reconciliation, refund approval |
| `support` | Staff | Tickets, chat takeover, customer profiles (read) |
| `growth` | Staff | CMS, promo codes, campaigns, feature flags |
| `viewer` | Staff | Read-only dashboards |
| `pm` | Field | Project Manager panel |
| `resource` | Field | Field resource/professional panel |
| `customer` / `user` | End user | Standard booking customer |

### Admin Roles Set
`super_admin, admin, ops, finance, support, growth, viewer` — any of these passes `adminGuard`

### Permission Matrix

| Permission | super_admin | admin | ops | finance | support | growth | viewer |
|---|---|---|---|---|---|---|---|
| BOOKING_READ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ |
| BOOKING_WRITE | ✓ | ✓ | ✓ | | | | |
| REFUND_APPROVE | ✓ | ✓ | | ✓ | | | |
| POOL_READ | ✓ | ✓ | ✓ | | | | ✓ |
| POOL_WRITE | ✓ | ✓ | ✓ | | | | |
| USER_READ | ✓ | ✓ | ✓ | | ✓ | | ✓ |
| USER_WRITE | ✓ | ✓ | ✓ | | | | |
| SERVICE_READ | ✓ | ✓ | ✓ | | | | ✓ |
| SERVICE_WRITE | ✓ | ✓ | ✓ | | | | |
| PAYMENT_READ | ✓ | ✓ | | ✓ | | | ✓ |
| PAYOUT_WRITE | ✓ | ✓ | | ✓ | | | |
| TICKET_READ | ✓ | ✓ | ✓ | | ✓ | | ✓ |
| TICKET_WRITE | ✓ | ✓ | ✓ | | ✓ | | |
| CMS_READ | ✓ | ✓ | | | | ✓ | ✓ |
| CMS_WRITE | ✓ | ✓ | | | | ✓ | |
| PROMO_READ | ✓ | ✓ | | ✓ | | ✓ | ✓ |
| PROMO_WRITE | ✓ | ✓ | | | | ✓ | |
| FLAG_READ | ✓ | ✓ | | | | ✓ | ✓ |
| FLAG_WRITE | ✓ | ✓ | | | | ✓ | |
| AUDIT_READ | ✓ | ✓ | | | | | ✓ |
| KYC_READ | ✓ | ✓ | ✓ | | ✓ | | |
| KYC_WRITE | ✓ | ✓ | ✓ | | | | |
| RBAC_WRITE | ✓ | | | | | | |
| DASHBOARD_READ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| FRAUD_READ | ✓ | ✓ | ✓ | ✓ | | | |
| SCHEDULE_WRITE | ✓ | ✓ | ✓ | | | | |

### Guard Functions

```js
// Check specific role array:
roleGuard(['user', 'pm'])

// Check PERMS group (semantically identical to roleGuard):
permGuard(PERMS.BOOKING_WRITE)

// Check any admin namespace role:
adminGuard

// Block viewers on write routes:
notViewer
```

---

## Frontend Auth Storage

All auth state lives in `localStorage` (no HttpOnly cookies):
```
token       → JWT access token (15m)
refreshToken → Plain refresh token (sent to /auth/refresh)
user        → JSON stringified user object
userType    → "customer" | "staff" | "pm" | "resource"
isNewUser   → "true" | "false" (drives profile completion prompt)
guestToken  → JWT guest token (7d)
guestData   → JSON stringified pre-login booking intent
```

### Axios Interceptors
- **Request:** reads `token` (falls back to `guestToken`) → injects `Authorization: Bearer`
- **Response:** on 401 for protected pages → `clearAuthStorage()` + redirect to `/login?next={currentPath}`
- **Response (all):** calls `flattenI18nDeep(data, activeLocale)` to normalize i18n object fields to strings

### Frontend Auth Slice (Redux)
State keys: `isAuthenticated`, `user`, `token`, `loading`, `error`, `isNewUser`

---

## Security Notes

1. **OTP in logs** — `logger.info({ mobile, otp }, '[DEV OTP]')` is present in `auth.service.js`. This logs the plaintext OTP in every environment where logs are accessible. In production, this leaks OTPs to log aggregators.

2. **Guest tokens have no revocation mechanism** — once issued, a 7d guest token cannot be blocked (no sessionId → blocklist doesn't apply).

3. **HS256 fallback** — if `JWT_PRIVATE_KEY` is not a PEM key in dev, the system silently downgrades to HS256. If the same non-PEM value is used in production accidentally, HS256 with a weak secret could be exploited.

4. **`DEV_MASTER_OTP`** — documented as "allowed in all environments for demo/staging." If accidentally set in production, any user can authenticate as any mobile with a known master code.

5. **Token stored in localStorage** — vulnerable to XSS (though Helmet CSP partially mitigates). Consider HttpOnly cookie with SameSite=Strict for production hardening.
