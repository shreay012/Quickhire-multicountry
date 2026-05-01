# QuickHire — Backend Deployment Guide

End-to-end setup for deploying the QuickHire backend on **Render** with **MongoDB Atlas** (database) and **Upstash Redis** (cache), then wiring the **Vercel** frontend to the new API.

> Estimated time: ~25 minutes (most of it waiting on Render's first build)

---

## Part 1 — MongoDB Atlas (Free)

MongoDB Atlas is the easiest managed MongoDB — free tier, no credit card.

1. Go to <https://cloud.mongodb.com> and sign up / log in (Google works).
2. **Create a free cluster:**
   - Click **Build a Database**
   - Choose **M0 Free**
   - Cloud Provider → **AWS**
   - Region → **Singapore (ap-southeast-1)** (matches the Render region)
   - Cluster name → `quickhire`
   - Click **Create**
3. **Create a database user:**
   - Sidebar → **Database Access** → **Add New Database User**
   - Method: **Password**
   - Username: `quickhire`
   - Password: click **Autogenerate Secure Password** → **copy it now** (only shown once)
   - Role: **Atlas admin**
   - **Add User**
4. **Allow all IP access** (Render uses dynamic IPs):
   - Sidebar → **Network Access** → **Add IP Address**
   - **Allow Access from Anywhere** → `0.0.0.0/0` → **Confirm**
5. **Get your connection string:**
   - Sidebar → **Database** → **Connect** on your cluster
   - **Drivers** → Driver: **Node.js**, Version: **5.5 or later**
   - Copy the connection string. It looks like:
     ```
     mongodb+srv://quickhire:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<password>` with the password from step 3.
   - Append a database name before the `?` so the driver picks the right DB: `.../quickhire?retryWrites=...`

> **Save this** — it becomes `MONGO_URI`.

---

## Part 2 — Redis (Free via Upstash)

1. Go to <https://upstash.com> and sign up free (GitHub login works).
2. **Create a Redis database:**
   - **Create Database**
   - Name: `quickhire-redis`
   - Type: **Regional**
   - Region: **ap-southeast-1 (Singapore)**
   - **Create**
3. **Get the connection URL:**
   - Click your new database → scroll to **Connect to your database**
   - Click the **ioredis** tab (not REST — the backend uses ioredis)
   - Copy the URL. It looks like:
     ```
     rediss://default:<password>@<host>.upstash.io:6379
     ```

> **Save this** — it becomes `REDIS_URL`.

---

## Part 3 — Generate JWT RSA Keys

The backend signs tokens with RS256, so it needs an RSA keypair. Run once locally:

```bash
# Generate private key
openssl genrsa -out private.pem 2048

# Extract public key from it
openssl rsa -in private.pem -pubout -out public.pem

# Print private key as a single line (env-var safe — \n instead of real newlines)
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' private.pem

# Print public key as a single line
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' public.pem
```

The single-line output looks like:

```
-----BEGIN PRIVATE KEY-----\nMIIEvgIBADAN...\n-----END PRIVATE KEY-----\n
```

> **Save both outputs** — they become `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY`.

> Already done for you in this session — see `jwt-private.pem`, `jwt-public.pem`, and `jwt-keys.env` in this folder.

---

## Part 4 — Deploy on Render

1. Go to <https://dashboard.render.com> and sign up / log in (GitHub recommended).
2. **Connect GitHub:**
   - Avatar → **Account Settings** → **Git Providers** → **Connect GitHub** → authorize.
3. **Create via Blueprint** (uses the repo's `render.yaml`):
   - Top nav → **New +** → **Blueprint**
   - Find the **QHFixed** repo → **Connect**
   - Render reads `render.yaml` and previews the service: `quickhire-backend` (web, Node, Singapore)
   - Click **Apply**
4. **Set the secret env vars** (Render pauses to ask for `sync: false` variables):

   | Variable | Value |
   |---|---|
   | `MONGO_URI` | Atlas URI from Part 1 |
   | `REDIS_URL` | Upstash URL from Part 2 |
   | `JWT_PRIVATE_KEY` | Single-line key from Part 3 |
   | `JWT_PUBLIC_KEY` | Single-line public key from Part 3 |
   | `RAZORPAY_KEY_ID` | Razorpay key (or leave blank) |
   | `RAZORPAY_KEY_SECRET` | Razorpay secret (or leave blank) |
   | `STRIPE_SECRET_KEY` | Stripe secret (or leave blank) |

   Then click **Apply** — first build starts.

---

## Part 5 — Monitor the Build

Open the `quickhire-backend` service → **Logs** tab. Healthy startup looks like:

```
==> Build successful 🎉
==> Starting server with 'node src/server.js'
MongoDB connected
Redis connected
Server listening on port 4000
```

**Common build failures:**

| Error | Fix |
|---|---|
| `Invalid environment: MONGO_URI` | Check Atlas URI — must include password and DB name |
| `JWT_PUBLIC_KEY is required for RS256` | Add `JWT_PUBLIC_KEY` env var |
| `Redis connection refused` | Upstash URL must start with `rediss://` |
| `Cannot find module ...` | `npm install` failed — check the build log |

---

## Part 6 — Wire Vercel to the New Backend

1. **Get the Render URL** — shown at the top of the service page, e.g. `https://quickhire-backend.onrender.com`. Open it; you should get `{"ok":true}` from `/healthz`.
2. **Set `NEXT_PUBLIC_API_URL` on Vercel:**

   ```bash
   VERCEL_TOKEN="vca_..."
   TEAM_ID="team_N41ReRnuJ0obBnpvIxcKYjFp"
   PROJECT_ID="prj_jUBwhKQH9ROo7DTDH3t8b9pD26E6"

   curl -s -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
     -H "Authorization: Bearer $VERCEL_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "key": "NEXT_PUBLIC_API_URL",
       "value": "https://quickhire-backend.onrender.com",
       "type": "plain",
       "target": ["production", "preview"]
     }'
   ```

3. **Redeploy Vercel:** <https://vercel.com/shreay/qhfixed> → **Deployments** → **Redeploy** on latest.

---

## Part 7 — Final Verification Checklist

Open <https://qhfixed.vercel.app> and check:

- [ ] Homepage loads → redirects to `/in/` (geo routing working)
- [ ] Visit `/?_country=AE` → redirects to `/ae/` → prices show in AED
- [ ] Service detail page loads with correct data
- [ ] Admin panel at `/in/admin/services` opens (login with your credentials)
- [ ] Render logs show no errors after page load

---

## Notes

- **Render free tier sleeps after 15 min idle.** First request after sleep takes ~30s. Upgrade to **Starter ($7/mo)** to avoid this — the `render.yaml` already specifies `plan: starter`.
- **Rotate any tokens** that have been pasted into chat or shared (Vercel personal token, etc.) once deployment is verified.
- **Mongo URI gotcha:** if you don't append a DB name (`/quickhire`) before the `?`, the driver writes to the default `test` DB — easy to miss, hard to debug later.
