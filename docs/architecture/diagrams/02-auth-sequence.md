# Authentication Sequence Diagrams

---

## 1. Customer OTP Login

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant FE as Frontend<br/>(Next.js)
    participant API as Express API
    participant Redis as Redis
    participant SMS as MSG91 / SNS
    participant DB as MongoDB

    C->>FE: Enter mobile number
    FE->>API: POST /auth/send-otp<br/>{ mobile, role: "customer" }

    API->>Redis: GET rate:{role}:{mobile}
    Redis-->>API: count < 5 ✅

    API->>API: Generate 4-digit OTP<br/>bcrypt.hash(otp, 10)

    API->>Redis: SET otp:{role}:{mobile} = hash<br/>TTL: 300s (5 min)
    API->>SMS: Send OTP SMS to +91{mobile}

    Note over API: logger.info({ otp }) ← BUG: logs plaintext OTP

    API-->>FE: { success: true }
    FE-->>C: OTP sent — enter code

    C->>FE: Enter OTP
    FE->>API: POST /auth/verify-otp<br/>{ mobile, otp, role }

    API->>Redis: GET otp:{role}:{mobile} → hash
    API->>API: bcrypt.compare(otp, hash)

    alt DEV_MASTER_OTP set
        API->>API: Accept master OTP<br/>⚠️ works in ALL environments
    end

    alt OTP valid
        API->>Redis: DEL otp:{role}:{mobile}
        API->>DB: upsert users collection<br/>{ mobile, role, lastLoginAt }
        DB-->>API: user doc

        API->>DB: INSERT sessions<br/>{ userId, token: bcrypt(refreshToken), expiresAt: +30d }
        API->>API: signAccessToken(payload, RS256/HS256)<br/>TTL: 15min

        API-->>FE: { token, refreshToken,<br/>user, userType, isNewUser }

        FE->>FE: localStorage.setItem(token, refreshToken, user)
        FE->>FE: window.dispatchEvent('userLoggedIn')
        Note over FE: SocketProvider listens → connects socket

        FE-->>C: Redirect to<br/>/profile (new) or /booking-workspace
    else OTP invalid
        API-->>FE: 401 INVALID_OTP
        FE-->>C: "Invalid OTP" error
    end
```

---

## 2. Token Refresh Flow

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant FE as Frontend
    participant API as Express API
    participant Redis as Redis
    participant DB as MongoDB

    C->>FE: Any authenticated action
    FE->>API: Request with expired access token<br/>Authorization: Bearer {expired-token}

    API->>API: jwt.verify() → TokenExpiredError

    API-->>FE: 401 TOKEN_EXPIRED

    FE->>API: POST /auth/refresh<br/>{ refreshToken }

    API->>DB: Find session where<br/>{ token: bcrypt_match, expiresAt > now }
    DB-->>API: session doc

    API->>Redis: GET blocklist:{sessionId}
    Redis-->>API: not found ✅ (not revoked)

    API->>API: bcrypt.compare(refreshToken, session.token)

    alt valid
        API->>API: signAccessToken() → new JWT (15min)
        API-->>FE: { token: newAccessToken }
        FE->>FE: localStorage.setItem(token, newToken)
        FE->>API: Retry original request
    else invalid or expired
        API-->>FE: 401 INVALID_REFRESH
        FE->>FE: clearAuthStorage()<br/>redirect /login
    end
```

---

## 3. Request Authentication (Every Protected Request)

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant MW as Auth Middleware
    participant Redis as Redis
    participant DB as MongoDB

    FE->>MW: HTTP request<br/>Authorization: Bearer {token}

    MW->>MW: Check PUBLIC_PATHS / PUBLIC_PREFIXES
    alt public path
        MW->>MW: Skip auth → next()
    end

    MW->>MW: Extract Bearer token
    MW->>MW: jwt.verify(token, publicKey)

    alt verify fails
        MW-->>FE: 401 INVALID_TOKEN
    end

    MW->>Redis: GET blocklist:{sessionId}
    alt found in blocklist
        MW-->>FE: 401 TOKEN_REVOKED
    end

    MW->>MW: req.user = { id, role, sessionId, ... }
    MW->>MW: setSentryUser(req.user)
    MW->>MW: next() → route handler
```

---

## 4. Logout Flow

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant FE as Frontend
    participant API as Express API
    participant Redis as Redis
    participant DB as MongoDB

    C->>FE: Click Logout
    FE->>API: POST /auth/logout<br/>Authorization: Bearer {token}

    API->>DB: DELETE sessions<br/>WHERE { userId, sessionId }
    API->>Redis: SET blocklist:{sessionId} = 1<br/>TTL: remaining JWT TTL

    Note over Redis: Token is now revoked even<br/>if it hasn't expired yet

    API-->>FE: { success: true }

    FE->>FE: clearAuthStorage()<br/>token, user, userType, guestToken, guestData
    FE->>FE: chatSocketService.disconnect()
    FE->>FE: redirect /login
    FE-->>C: Logged out
```

---

## 5. Guest Access Flow

```mermaid
sequenceDiagram
    autonumber
    actor G as Guest User
    participant FE as Frontend
    participant API as Express API

    G->>FE: Browse site (unauthenticated)
    FE->>API: POST /auth/guest-token

    API->>API: Sign JWT with<br/>{ role: "guest", sub: "guest_{nanoid}" }<br/>TTL: 7 days
    Note over API: No DB record created<br/>Cannot be revoked via blocklist

    API-->>FE: { guestToken }
    FE->>FE: localStorage.guestToken = token

    G->>FE: Add to cart → Checkout
    FE->>FE: guestData = JSON.stringify(bookingDraft)<br/>localStorage.guestData = guestData

    G->>FE: Prompted to login at checkout step 4
    FE->>FE: Save current state

    Note over G,API: Customer completes OTP login...

    FE->>FE: Retrieve guestData from localStorage
    FE->>FE: Restore booking state to Redux
    FE-->>G: Continue checkout from where you left off
```

---

## Security Notes

| Mechanism | Implementation | Gap |
|---|---|---|
| OTP storage | `bcrypt.hash(otp, 10)` in Redis, TTL 5min | OTP also logged in plaintext (all envs) |
| OTP rate limit | 5 attempts / min via Redis counter | DEV_MASTER_OTP bypasses all checks in prod |
| Access tokens | RS256 JWT, 15min TTL | Stored in localStorage (XSS risk) |
| Refresh tokens | bcrypt hashed in MongoDB sessions | Not in Redis blocklist (slower revoke) |
| Logout revocation | Redis `blocklist:{sessionId}`, TTL = remaining JWT life | — |
| Guest revocation | **Not possible** — no sessionId, no blocklist entry | Stolen guest token valid for full 7 days |
| Algorithm | RS256 (PEM) default; auto-falls back to HS256 if key is short | Should force RS256 in production |
