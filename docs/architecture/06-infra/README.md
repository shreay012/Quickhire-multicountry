# Deployment & Infrastructure

---

## Deployment Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET                                      │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
              ┌────────────┴─────────────┐
              │                           │
    ┌─────────▼──────────┐    ┌──────────▼──────────┐
    │       VERCEL        │    │        RENDER        │
    │   (Frontend CDN)    │    │  (Backend API)       │
    │                     │    │                      │
    │  Next.js 16         │    │  Node.js 20          │
    │  Static + SSR       │    │  Express 4.21        │
    │  Edge middleware     │    │  Docker container    │
    │  Port: 3000 (default)│   │  Port: 4000          │
    └─────────────────────┘    └──────────┬───────────┘
                                          │
                          ┌───────────────┼───────────────┐
                          │               │               │
               ┌──────────▼──┐  ┌────────▼────┐  ┌──────▼──────┐
               │   MongoDB   │  │    Redis    │  │ Meilisearch │
               │  Atlas /    │  │  (Render    │  │ (self-hosted│
               │  self-hosted│  │   Redis /   │  │  or cloud)  │
               │             │  │  Upstash)   │  │             │
               └─────────────┘  └─────────────┘  └─────────────┘
                          │
          ┌───────────────┼─────────────────┐
          │               │                 │
     ┌────▼────┐   ┌──────▼──────┐  ┌──────▼──────┐
     │  AWS S3  │   │   AWS SES   │  │   AWS SNS   │
     │ (files)  │   │  (emails)   │  │  (push)     │
     └──────────┘   └─────────────┘  └─────────────┘
```

---

## Backend Docker Container

```dockerfile
# Two-stage build
FROM node:20-alpine AS deps
  COPY package.json
  RUN npm install --omit=dev=false --no-audit --no-fund

FROM node:20-alpine AS runtime
  ENV NODE_ENV=production
  RUN addgroup -S app && adduser -S app -G app    ← non-root user
  COPY --from=deps node_modules
  COPY --chown=app:app .
  USER app
  EXPOSE 4000
  HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
    CMD wget -qO- http://localhost:4000/healthz || exit 1
  CMD ["node", "src/server.js"]
```

**docker-compose.yml** available for local development (likely MongoDB + Redis + backend together).

---

## Environment Variables Reference

All variables validated at startup via Zod schema in `src/config/env.js`. Server exits on missing required vars.

### Required Variables

| Variable | Example | Description |
|---|---|---|
| `MONGO_URI` | `mongodb+srv://...` | MongoDB connection string |
| `JWT_PRIVATE_KEY` | `-----BEGIN RSA PRIVATE KEY-----...` | RS256 private key (escape `\n` as `\\n` in .env) |

### Optional with Defaults

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `4000` | HTTP listen port |
| `ALLOWED_ORIGINS` | `*` | CORS whitelist (comma-separated) |
| `MONGO_DB` | `quickhire` | MongoDB database name |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `JWT_PUBLIC_KEY` | — | RS256 public key (required if JWT_ALGORITHM=RS256) |
| `JWT_ALGORITHM` | `RS256` | `RS256` or `HS256` |
| `JWT_ACCESS_TTL` | `15m` | Access token lifetime |
| `JWT_REFRESH_TTL` | `30d` | Refresh token lifetime |
| `JWT_ISSUER` | `quickhire.services` | JWT issuer claim |
| `JWT_AUDIENCE` | `quickhire-api` | JWT audience claim |
| `AWS_REGION` | `ap-south-1` | AWS region |
| `SES_FROM` | `no-reply@quickhire.services` | SES sender email |
| `OTP_LENGTH` | `4` | OTP digit count |
| `OTP_TTL_SECONDS` | `300` | OTP expiry (5 minutes) |
| `SMS_PROVIDER` | `mock` | `mock` | `msg91` | `sns` |
| `LOG_LEVEL` | `info` | Pino log level |
| `RATE_LIMIT_PER_MIN` | `120` | Requests per minute per IP |
| `APP_VERSION` | `0.0.0` | Reported in Sentry |
| `MEILISEARCH_URL` | `http://localhost:7700` | Meilisearch host |

### Fully Optional (features disabled if absent)

| Variable | Feature disabled if absent |
|---|---|
| `JWT_PUBLIC_KEY` | RS256 auth (auto-falls back to HS256 in dev) |
| `S3_BUCKET_CHAT` | Chat file uploads |
| `S3_BUCKET_INVOICES` | Invoice S3 upload |
| `SQS_NOTIFICATION_URL` | SQS notification path |
| `SQS_INVOICE_URL` | SQS invoice enqueue after payment |
| `SQS_EMAIL_URL` | SQS email path |
| `RAZORPAY_KEY_ID` | Real Razorpay (uses mock mode) |
| `RAZORPAY_KEY_SECRET` | Real Razorpay |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature verification |
| `MSG91_AUTH_KEY` | MSG91 SMS (falls back to log) |
| `SENTRY_DSN` | Error tracking |
| `ANTHROPIC_API_KEY` | AI chatbot |
| `MEILISEARCH_KEY` | Authenticated Meilisearch access |
| `DEV_MASTER_OTP` | **DANGER** — bypass OTP in all envs |

### Frontend Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL (e.g. `https://api.quickhire.services`) |

**Note:** `SocketProvider.jsx` has `baseUrl: "http://localhost:5000"` hardcoded — does not use `NEXT_PUBLIC_API_URL`. This is a bug.

---

## CI/CD — GitHub Actions

`.github/workflows/` in both root and backend directories.

**Deployment flow:**
1. Push to `main` → GitHub Actions triggers
2. Builds Docker image (backend) → pushes to registry
3. Triggers Render deploy hook
4. Vercel auto-deploys frontend on push to main (via Vercel GitHub integration)

**Secrets required (GitHub repository secrets):**
- `RENDER_DEPLOY_HOOK_URL`
- `RENDER_API_KEY`
- `RENDER_SERVICE_ID`
- All backend env vars as GitHub secrets → passed to Render

*(50+ deployment guide .md files at project root document the exact steps for setting these up on Render/Vercel.)*

---

## Render (Backend Hosting)

- Service type: Web service
- Runtime: Docker (uses `Dockerfile` in `quickhire-AI-mode /backend/`)
- Port: 4000
- Health check: `/healthz`
- Auto-deploy: On Render push via GitHub Actions

**Render add-ons typically used:**
- Render Redis (or external Redis URL)
- External MongoDB Atlas

---

## Vercel (Frontend Hosting)

- Framework: Next.js
- Root directory: `frontend/`
- Environment variables: `NEXT_PUBLIC_API_URL`
- Edge middleware runs on Vercel's edge network (geo detection via `cf-ipcountry` or `x-vercel-ip-country` header)

---

## Local Development

```bash
# Backend
cd "quickhire-AI-mode /backend"
npm run dev               # node --watch src/server.js (hot reload)

# Requires locally running:
# - MongoDB (MongoDB Compass or Atlas local)
# - Redis (redis-server or Docker)
# - Optional: Meilisearch

# Frontend
cd frontend
npm run dev               # next dev (port 3000)

# Start both together (from root)
./start.sh                # Custom script that starts both services
```

**`.env` file in backend:** Already present at `quickhire-AI-mode /backend/.env` with development values.

---

## Monitoring & Observability

| Layer | Tool | Where |
|---|---|---|
| Application errors | Sentry | `SENTRY_DSN` → sentry.io dashboard |
| Metrics | Prometheus | `GET /metrics` (prom format) |
| Queue monitoring | Bull-Board | `/admin/queues` (admin auth) |
| Logging | Pino | stdout (JSON) — forwarded to Render logs |
| Load testing | k6 | `k6/api-smoke.js`, `k6/booking-burst.js`, `k6/socket-connections.js` |

**Monitoring config:** `monitoring/` directory in backend — likely contains Prometheus scrape config and/or Grafana dashboard JSON.

**Runbooks:** `runbooks/` directory — operational procedures for common incidents.

---

## Scaling Considerations

| Component | Current | Horizontal Scale Path |
|---|---|---|
| Backend API | Single Render instance | Multi-pod: Redis adapter for Socket.io already in place |
| MongoDB | Atlas shared/dedicated | Atlas horizontal scaling or sharding |
| Redis | Single instance | Redis Cluster or Upstash (already URL-based) |
| Meilisearch | Single instance | Meilisearch Cloud or replicated cluster |
| BullMQ workers | In-process (same pod) | Extract to separate worker processes/containers |
| File storage | S3 | Already globally scalable |

**Critical for horizontal scale:** Socket.io Redis adapter is already configured — pod-to-pod socket events work via pub/sub.

**Lifecycle tick locking:** BullMQ repeating job with Redis-based locking ensures only one pod processes the lifecycle tick even in multi-pod deployments.
