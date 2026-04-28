# 📌 RENDER ENVIRONMENT VARIABLES - QUICK COPY-PASTE

**Use this when adding environment variables to Render**

---

## Server Config
```
NODE_ENV=production
PORT=4000
ALLOWED_ORIGINS=https://quickhire-frontend.vercel.app
LOG_LEVEL=info
RATE_LIMIT_PER_MIN=120
```

## Database & Cache
```
MONGO_URI=[MongoDB Atlas connection string]
MONGO_DB=quickhire
REDIS_URL=[Upstash Redis connection string]
```

## JWT Configuration
```
JWT_ISSUER=quickhire.services
JWT_AUDIENCE=quickhire-api
JWT_ACCESS_TTL=7d
JWT_REFRESH_TTL=30d
JWT_PRIVATE_KEY=[Copy from backend/private.pem with \n for newlines]
JWT_PUBLIC_KEY=[Copy from backend/public.pem with \n for newlines]
```

## Payment (Razorpay)
```
RAZORPAY_KEY_ID=[Your key ID]
RAZORPAY_KEY_SECRET=[Your key secret]
RAZORPAY_WEBHOOK_SECRET=[Your webhook secret]
```

## Email (Mailgun)
```
MAILGUN_API_KEY=[Your API key]
MAILGUN_DOMAIN=[Your domain]
SES_FROM=no-reply@quickhire.services
```

## AWS Storage
```
AWS_REGION=ap-south-1
S3_BUCKET_CHAT=quickhire-chat-attachments
S3_BUCKET_INVOICES=quickhire-invoices
```

## Optional Features
```
SENTRY_DSN=[If using Sentry]
ANTHROPIC_API_KEY=[For AI chatbot]
MEILISEARCH_URL=[For search]
MEILISEARCH_KEY=[For search]
```

---

## 📝 HOW TO ADD IN RENDER

1. Go to Service Settings
2. Find "Environment" section
3. Click "Add Variable"
4. Paste key=value
5. Click "Add"
6. Repeat for all above

Or use "Sync from repository" if you have `.env` file committed.

---

**Still need values?** Check:
- MongoDB Atlas → Connection String
- Upstash → Redis URL
- Razorpay → API Keys
- Mailgun → API Key & Domain
