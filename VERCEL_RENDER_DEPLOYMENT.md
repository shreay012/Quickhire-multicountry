# QuickHire - Vercel + Render Deployment Guide

Complete step-by-step guide to deploy frontend on Vercel and backend on Render (completely free).

---

## 📊 Architecture

```
┌─────────────────────┐                ┌──────────────────┐
│  Vercel (Frontend)  │                │  Render (Backend)│
│  Next.js 16         │                │  Express.js      │
│  port 3000          │◄──────JSON────►│  port 4000       │
│  Static + SSR       │   /api/*       │                  │
└─────────────────────┘                │  ┌────────────┐  │
                                       │  │ MongoDB    │  │
                                       │  │ Atlas      │  │
                                       │  │ (Free)     │  │
                                       │  └────────────┘  │
                                       │  ┌────────────┐  │
                                       │  │ Upstash    │  │
                                       │  │ Redis      │  │
                                       │  │ (Free)     │  │
                                       │  └────────────┘  │
                                       └──────────────────┘
```

---

## ✅ STEP 1: Set Up External Services (5 minutes)

### 1.1 MongoDB Atlas (Database)

```
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up (free account)
3. Create Organization & Project
4. Click "Create Deployment" → Select "Shared" (free)
5. Choose region close to you
6. Wait for cluster to deploy (2-3 mins)
7. Click "Connect" button
8. Choose "Connect your application"
9. Copy CONNECTION STRING:
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
10. Replace <username> and <password> with your credentials
11. SAVE THIS STRING - you'll need it for Render
```

**Example MongoDB URI:**
```
mongodb+srv://quickhire:MyPassword123@cluster0.abcde.mongodb.net/quickhire?retryWrites=true&w=majority
```

---

### 1.2 Upstash Redis (Cache) - FREE

```
1. Go to https://upstash.com
2. Sign up (GitHub or email)
3. Click "Create database"
4. Name: quickhire-cache
5. Region: Select closest to you
6. Type: Redis (default)
7. Click "Create"
8. Go to Details tab
9. Copy REDIS_URL (looks like):
   redis://default:xxxxxxxxxxxxx@us1-upbeat-shark-12345.upstash.io:6379
10. SAVE THIS - you'll need it for Render
```

---

## 🚀 STEP 2: Deploy Backend on Render (15 minutes)

### 2.1 Create Render Account

```
1. Go to https://render.com
2. Click "Sign up"
3. Sign up with GitHub account (authorize)
```

### 2.2 Prepare Backend Files

Before deploying, check your backend .env:

```bash
cd "/Users/orange/Documents/QHAIMODE/quickhire AI mode /backend"
cat .env | head -20
```

**Your .env should have these keys (we'll set them in Render):**
- PORT
- NODE_ENV
- MONGODB_URI
- REDIS_URL
- JWT_PRIVATE_KEY
- JWT_PUBLIC_KEY
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- MAILGUN_API_KEY
- MAILGUN_DOMAIN

### 2.3 Deploy Backend Service

```
1. Go to Render Dashboard
2. Click "New +" → "Web Service"
3. Select "Build and deploy from a Git repository"
4. Click "Connect" next to your GitHub repo
5. In the repo dialog:
   - Name: quickhire-backend
   - Repository: select your QuickHire repo
   - Branch: main
   - Click "Connect"
```

### 2.4 Configure Build Settings

```
In the Render deployment form:

Name:                    quickhire-backend
Environment:             Node
Build Command:           cd "quickhire AI mode /backend" && npm install
Start Command:           npm start
Instance Type:           FREE (0.5 CPU, 512 MB RAM)
Auto-Deploy:             Yes

⚠️ IMPORTANT: Set Root Directory
- Under "Build Command" section
- Root Directory: ./quickhire AI mode /backend
  (or just leave blank and edit Build/Start commands as shown)
```

### 2.5 Set Environment Variables

```
In the "Environment" section, add these:

PORT=4000
NODE_ENV=production
MONGODB_URI=mongodb+srv://quickhire:YourPassword@cluster0.xxxxx.mongodb.net/quickhire?retryWrites=true&w=majority
REDIS_URL=redis://default:xxxxxxxxxxxxx@us1-upbeat-shark-12345.upstash.io:6379

JWT_PRIVATE_KEY=(copy from your backend/.env)
JWT_PUBLIC_KEY=(copy from your backend/.env)

RAZORPAY_KEY_ID=(from your Razorpay account)
RAZORPAY_KEY_SECRET=(from your Razorpay account)

CLOUDINARY_NAME=(from your Cloudinary)
CLOUDINARY_API_KEY=(from your Cloudinary)
CLOUDINARY_API_SECRET=(from your Cloudinary)

MAILGUN_API_KEY=(from Mailgun - see setup below)
MAILGUN_DOMAIN=(from Mailgun)

CORS_ORIGIN=https://your-frontend.vercel.app

LOG_LEVEL=info
```

### 2.6 Deploy

```
1. Click "Create Web Service"
2. Wait for deploy (5-10 minutes)
3. Once deployed, you'll see a URL like:
   https://quickhire-backend.onrender.com
4. SAVE THIS URL - you need it for Vercel frontend
```

⚠️ **Note**: Render free tier services sleep after 15 minutes of inactivity. First request will take 30 seconds to wake up.

---

## 📧 STEP 3: Set Up Mailgun (Email) - FREE

```
1. Go to https://www.mailgun.com
2. Sign up (free account, no credit card)
3. Verify your email
4. Create a domain (e.g., notification.sandbox.mailgun.org - they create this)
5. Go to "Sending" → "Domain Settings"
6. Find these credentials:
   - API Key
   - Domain name
7. Add to Render environment variables:
   MAILGUN_API_KEY=key-xxxxxxxxxxxxx
   MAILGUN_DOMAIN=notification.sandbox.mailgun.org
```

**Free tier**: 30 emails/day

---

## 🖼️ STEP 4: Set Up Cloudinary (File Upload) - FREE

```
1. Go to https://cloudinary.com
2. Sign up (free: 25GB/month, 25k transformations)
3. Go to Dashboard
4. Copy these credentials:
   - Cloud Name
   - API Key
   - API Secret
5. Add to Render environment variables:
   CLOUDINARY_NAME=your_cloud_name
   CLOUDINARY_API_KEY=xxxxxxxxxxxxx
   CLOUDINARY_API_SECRET=xxxxxxxxxxxxx
```

---

## 💳 STEP 5: Razorpay Setup

Razorpay is already configured in your code. Add keys:

```
1. Go to https://razorpay.com (or login)
2. Dashboard → Settings → API Keys
3. Copy "Key ID" and "Key Secret"
4. Add to Render:
   RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxx
```

---

## 🎨 STEP 6: Deploy Frontend on Vercel (10 minutes)

### 6.1 Create Vercel Account

```
1. Go to https://vercel.com
2. Sign up with GitHub
3. Authorize GitHub access
```

### 6.2 Import Project

```
1. Click "Add New..." → "Project"
2. Click "Import Git Repository"
3. Paste your GitHub repo URL or select from list
4. Click "Import"
```

### 6.3 Configure Project

```
Project Name:           quickhire-frontend
Framework Preset:       Next.js
Root Directory:         ./quickhire AI mode
```

### 6.4 Set Environment Variables

```
In the "Environment Variables" section, add:

NEXT_PUBLIC_API_URL=https://quickhire-backend.onrender.com/api
NEXT_PUBLIC_RAZORPAY_KEY_ID=(from Razorpay Key ID)
```

**IMPORTANT**: Use your actual Render backend URL from Step 2.6

### 6.5 Deploy

```
1. Click "Deploy"
2. Wait 3-5 minutes for build
3. You'll get a URL like:
   https://quickhire-frontend.vercel.app
4. SAVE THIS URL
```

---

## ✨ STEP 7: Connect Frontend to Backend

### Update Vercel Environment

Go back to Vercel Dashboard:
```
1. Select your project
2. Settings → Environment Variables
3. Add/Update:
   NEXT_PUBLIC_API_URL=https://quickhire-backend.onrender.com/api
4. Redeploy:
   Deployments → Click latest → "Redeploy"
```

---

## 🔗 STEP 8: Test Deployment

### Test Backend
```bash
# From your terminal:
curl https://quickhire-backend.onrender.com/api/health

# Should return:
# {"success":true,"data":{"status":"ok"},"message":"Server is running"}
```

### Test Frontend
```
1. Go to https://quickhire-frontend.vercel.app
2. Check browser console (F12) for any errors
3. Network tab - verify API calls go to Render backend
```

### Test Main Features
- [ ] Login page loads
- [ ] Guest browsing works
- [ ] Search functionality
- [ ] Chat socket connects (check console)
- [ ] Payment page loads
- [ ] File upload works

---

## 🐛 Troubleshooting

### "Cannot reach backend"
```
1. Check Render deployment is running
   - Go to render.com dashboard
   - Check service status (should be green)
   
2. Check CORS in backend
   - Add CORS_ORIGIN=https://your-vercel-app.vercel.app
   - Redeploy Render
   
3. Check network tab in browser
   - API calls should go to render.com domain
   - Check for CORS errors
```

### "Socket.IO connection failed"
```
1. Check backend is deployed and running
2. Check console for WebSocket errors
3. Verify NEXT_PUBLIC_API_URL is correct
4. Check browser allows WebSocket (some networks block it)
```

### "Build fails on Vercel"
```
1. Check build logs:
   - Vercel Dashboard → Deployments → Failed build
   - Look for error message
   
2. Common issues:
   - Missing env variables
   - Import errors in components
   - TypeScript errors
```

### "Database connection fails"
```
1. Check MongoDB URI is correct:
   - No extra spaces
   - Password is URL encoded
   
2. Check IP whitelist in MongoDB Atlas:
   - Network Access → Add IP Address
   - Add 0.0.0.0/0 (allow all - not ideal for production)
```

---

## 📱 Update DNS (Optional - Custom Domain)

To use your own domain:

### For Vercel
```
1. Vercel Dashboard → Project Settings → Domains
2. Add your domain
3. Follow DNS instructions
4. Update NEXT_PUBLIC_API_URL in env vars
```

### For Render Backend
```
1. Render Dashboard → Service → Settings
2. Custom Domains
3. Add your domain
4. Follow DNS instructions
```

---

## 💰 Cost Summary (Monthly)

| Service | Free Tier | Cost |
|---------|-----------|------|
| Vercel (Frontend) | ✅ Yes | $0 |
| Render (Backend) | ✅ Yes (sleeps) | $0 |
| MongoDB Atlas | ✅ 512MB | $0 |
| Upstash Redis | ✅ Free tier | $0 |
| Mailgun | ✅ 30/day | $0 |
| Cloudinary | ✅ 25GB | $0 |
| Razorpay | ✅ Transactions only | ~$10-50/month* |
| **TOTAL** | | **~$10-50/month** |

*Razorpay only charges on successful payments (2% + ₹2 per transaction)

---

## 🚨 Production Considerations

### Before Going Live

```
1. Enable MongoDB IP Whitelist
   - Only allow your server IPs
   
2. Enable Razorpay production mode
   - Use production keys, not sandbox
   
3. Set up error monitoring
   - Sentry is already in your code
   - Sign up and add SENTRY_DSN
   
4. Enable rate limiting
   - Prevent abuse
   
5. Monitor logs
   - Use Render's log viewer
   - Set up alerts
   
6. Regular backups
   - MongoDB has automatic backups
   - Consider manual exports
```

### Performance Tips

```
1. Enable CDN caching on Vercel
   - Already done by default
   
2. Optimize images
   - Next.js Image component (already used)
   
3. Monitor cold starts
   - Render free tier sleeps
   - Consider paid tier for production
   
4. Cache API responses
   - Redis is already set up
```

---

## 📚 Useful Commands

### View Render Logs
```bash
# After SSH into Render
tail -f /var/log/app.log
```

### View Vercel Logs
```
1. Vercel Dashboard
2. Select project
3. Deployments → Click latest
4. Scroll down to "Function Logs"
```

### Rebuild on Vercel
```
1. Vercel Dashboard
2. Deployments
3. Click deployment → "Redeploy"
```

### Restart Render Service
```
1. Render Dashboard
2. Select service
3. Manual Deploys → "Deploy latest commit"
```

---

## 🎉 You're Done!

Your QuickHire app is now live on:
- **Frontend**: https://quickhire-frontend.vercel.app
- **Backend**: https://quickhire-backend.onrender.com

Share these links with your team and users!

---

## 📞 Support Resources

- [Vercel Docs](https://vercel.com/docs)
- [Render Docs](https://docs.render.com)
- [MongoDB Atlas Help](https://docs.atlas.mongodb.com)
- [Upstash Docs](https://upstash.com/docs)
