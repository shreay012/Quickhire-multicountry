# QuickHire - Free Server Deployment Guide

Complete step-by-step guide to deploy the entire application on free platforms.

---

## 🎯 Deployment Strategy

| Component | Platform | Free Tier | Cost |
|-----------|----------|-----------|------|
| **Frontend (Next.js)** | Vercel OR Railway | Yes | $0 |
| **Backend (Express.js)** | Railway | $5/month credits | ~$0-5 |
| **Database (MongoDB)** | MongoDB Atlas | 512MB | Free |
| **Cache (Redis)** | Railway OR Upstash | Yes | Free-$5 |
| **File Storage (S3)** | Cloudinary OR Railway | Free tier | Free |
| **Email (AWS SES)** | Mailgun OR SendGrid | Free tier | Free |

---

## OPTION A: Railway.app (Recommended - All-in-One)

Railway gives **$5/month free credits** and is perfect for full-stack apps.

### Step 1: Set Up Railway Account
1. Go to https://railway.app
2. Sign up with GitHub
3. Create a new project
4. Connect your GitHub repo

### Step 2: Deploy MongoDB on Railway
```bash
1. In Railway dashboard → New Service
2. Search "MongoDB"
3. Deploy
4. Get CONNECTION_STRING from "MongoDB" service variables
```

### Step 3: Deploy Redis on Railway
```bash
1. New Service → Search "Redis"
2. Deploy
3. Get REDIS_URL from service variables
```

### Step 4: Deploy Backend on Railway
```bash
1. New Service → GitHub Repo → Select your repo
2. Select "quickhire AI mode /backend" as the root directory
   - Go to Settings → Build & Deploy
   - Set Root Directory: "quickhire AI mode /backend"
3. Set Environment Variables:
   - PORT=4000
   - NODE_ENV=production
   - MONGODB_URI={from MongoDB service}
   - REDIS_URL={from Redis service}
   - JWT_PRIVATE_KEY={copy from your .env}
   - JWT_PUBLIC_KEY={copy from your .env}
   - NEXT_PUBLIC_API_URL=https://{backend-railway-domain}.railway.app/api
   - All other vars from your .env file
4. Deploy
5. Get backend URL from Railway dashboard (e.g., https://quickhire-api.railway.app)
```

### Step 5: Deploy Frontend on Railway (or Vercel)

#### Option A5a: Use Railway
```bash
1. New Service → GitHub Repo
2. Select "quickhire AI mode" as root directory
3. Set Environment Variables:
   - NEXT_PUBLIC_API_URL=https://{backend-railway-domain}.railway.app/api
   - Port will be auto-detected (3000)
4. Deploy
5. Access via Railway domain
```

#### Option A5b: Use Vercel (Better for Next.js)
```bash
1. Go to https://vercel.com
2. Sign up with GitHub
3. Import Project → Select "quickhire AI mode" repo
4. Set Environment Variables:
   - NEXT_PUBLIC_API_URL=https://{backend-railway-domain}.railway.app/api
5. Deploy
6. Access via vercel.app domain
```

### Step 6: Set Up Free Services

#### MongoDB Atlas (Database) - Separate Step if Not on Railway
```bash
1. Go to https://www.mongodb.com/cloud/atlas
2. Create account
3. Create cluster (free tier)
4. Get CONNECTION_STRING
5. Add to Railway MongoDB service or backend ENV
```

#### Cloudinary (File Upload)
```bash
1. https://cloudinary.com
2. Sign up (free tier: 25GB/month)
3. Get CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET
4. Add to backend .env
```

#### Mailgun (Email) - FREE
```bash
1. https://www.mailgun.com
2. Sign up
3. Get API key (free: 30/day)
4. Add MAILGUN_API_KEY to backend .env
```

#### Razorpay (Payment) - Already configured
```bash
1. Already set up (add keys to .env)
```

---

## OPTION B: Render.com (Alternative)

### Step 1: Create Render Account
1. https://render.com
2. Sign up with GitHub

### Step 2: Deploy MongoDB (Use MongoDB Atlas)
```bash
1. External: MongoDB Atlas (free tier)
2. Get CONNECTION_STRING
```

### Step 3: Deploy Redis (Upstash - Free)
```bash
1. https://upstash.com
2. Create Redis database (free: 10K commands/day)
3. Get REDIS_URL
```

### Step 4: Deploy Backend on Render
```bash
1. New Web Service
2. Connect GitHub repo
3. Build Command: cd "quickhire AI mode /backend" && npm install
4. Start Command: npm start
5. Set Environment Variables (same as Railway)
6. Deploy (free tier will sleep after 15 min inactivity)
```

### Step 5: Deploy Frontend on Render or Vercel
```bash
1. Same as Railway but for Render
2. Build Command: npm install && npm run build
3. Start Command: npm start
4. Set NEXT_PUBLIC_API_URL
```

---

## OPTION C: Fly.io (Best Performance)

Fly.io has **3 free shared VMs** with 256MB RAM.

### Quick Setup
```bash
1. https://fly.io
2. Sign up
3. Install flyctl: brew install flyctl
4. Deploy:
   - flyctl launch (creates fly.toml for backend)
   - Set secrets: flyctl secrets set MONGODB_URI=...
   - flyctl deploy
5. Repeat for frontend in separate directory
```

---

## 📋 Pre-Deployment Checklist

### Backend (.env)
```
PORT=4000
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...
JWT_PRIVATE_KEY=...
JWT_PUBLIC_KEY=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
MAILGUN_API_KEY=...
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api
NEXT_PUBLIC_RAZORPAY_KEY_ID=...
```

---

## 🚀 Quick Deploy Commands

### Using Railway CLI (Fastest)
```bash
# Login
railway login

# Link to Railway project
cd "quickhire AI mode /backend"
railway link

# Set env variables
railway variables set MONGODB_URI=...
railway variables set REDIS_URL=...
# ... set others

# Deploy
railway up
```

---

## ⚠️ Important Considerations

### Free Tier Limitations
- **Railway**: $5/month (then charges), limited DB storage
- **Render**: Services sleep after 15 min inactivity
- **Fly.io**: Limited to 3 VMs, limited bandwidth
- **Vercel**: 100GB/month bandwidth limit

### What to Watch
1. **Database Size**: MongoDB Atlas free = 512MB (check usage)
2. **File Storage**: Use Cloudinary/S3 instead of local `/uploads`
3. **Redis Memory**: Monitor cache usage
4. **API Rate Limits**: Razorpay, Mailgun, Cloudinary have limits
5. **Cold Starts**: Render/Fly might have delays on first request

### Production Recommendations
- Monitor Sentry errors: Already configured
- Set up log aggregation: Pino logs
- Use environment-specific configs
- Back up MongoDB regularly

---

## 🔗 Connection Check

After deployment, test:
```bash
# Backend health
curl https://your-backend.railway.app/api/health

# Frontend loads
https://your-frontend.vercel.app

# WebSocket connection
Check browser console for socket.io connection status
```

---

## 📚 Useful Links

- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Upstash Redis](https://upstash.com)
- [Render Docs](https://render.com/docs)

---

## 💡 Next Steps

1. Choose a platform (Railway recommended)
2. Prepare environment variables
3. Follow the step-by-step guide above
4. Test all features:
   - Authentication
   - Payments
   - Chat/Socket.IO
   - File uploads
   - Email notifications
