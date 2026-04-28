# Vercel + Render Deployment - Quick Checklist

## 📋 Pre-Deployment Prep (5 mins)

- [ ] Have your GitHub credentials ready
- [ ] Know your backend .env variables
- [ ] Have backend private/public keys ready (JWT)
- [ ] Have Razorpay credentials
- [ ] Create GitHub repo (if not already)
- [ ] Push code to GitHub

---

## 🗄️ PHASE 1: External Services (15 mins)

### MongoDB Atlas
```
Time: 5 mins
URL: https://www.mongodb.com/cloud/atlas

Steps:
☐ Sign up (free)
☐ Create cluster (shared/free)
☐ Wait for deployment
☐ Get connection string
☐ SAVE: mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/...
```

### Upstash Redis
```
Time: 3 mins
URL: https://upstash.com

Steps:
☐ Sign up (GitHub)
☐ Create database
☐ Copy Redis URL
☐ SAVE: redis://default:token@region.upstash.io:6379
```

### Mailgun (Email)
```
Time: 2 mins
URL: https://www.mailgun.com

Steps:
☐ Sign up (free)
☐ Verify email
☐ Get API Key
☐ SAVE: key-xxxxx and domain
```

### Cloudinary (File Upload)
```
Time: 2 mins
URL: https://cloudinary.com

Steps:
☐ Sign up (free)
☐ Get Cloud Name
☐ Get API Key & Secret
☐ SAVE: All three values
```

---

## 🔧 PHASE 2: Deploy Backend on Render (15 mins)

### 1. Create Render Account
```
URL: https://render.com
☐ Sign up with GitHub
☐ Authorize access
```

### 2. Create Web Service
```
☐ New Web Service
☐ Connect GitHub repo
☐ Select repo from list
☐ Click "Connect"
```

### 3. Configure Service
```
Name:                    quickhire-backend
Environment:             Node
Build Command:           npm install
Start Command:           npm start
Instance Type:           FREE

Root Directory:          ./quickhire AI mode /backend
Auto Deploy:             Yes
```

### 4. Add Environment Variables
```
Add all of these:

☐ PORT=4000
☐ NODE_ENV=production
☐ MONGODB_URI=(from MongoDB Atlas)
☐ REDIS_URL=(from Upstash)
☐ JWT_PRIVATE_KEY=(from .env)
☐ JWT_PUBLIC_KEY=(from .env)
☐ RAZORPAY_KEY_ID=(from Razorpay)
☐ RAZORPAY_KEY_SECRET=(from Razorpay)
☐ CLOUDINARY_NAME=(from Cloudinary)
☐ CLOUDINARY_API_KEY=(from Cloudinary)
☐ CLOUDINARY_API_SECRET=(from Cloudinary)
☐ MAILGUN_API_KEY=(from Mailgun)
☐ MAILGUN_DOMAIN=(from Mailgun)
```

### 5. Deploy
```
☐ Click "Create Web Service"
☐ Wait for build (5-10 mins)
☐ Check status is "Live" (green)
☐ SAVE: Backend URL (e.g., https://quickhire-backend.onrender.com)
```

---

## 🎨 PHASE 3: Deploy Frontend on Vercel (10 mins)

### 1. Create Vercel Account
```
URL: https://vercel.com
☐ Sign up with GitHub
☐ Authorize access
```

### 2. Import Project
```
☐ Add New → Project
☐ Import Git Repository
☐ Select your GitHub repo
☐ Click Import
```

### 3. Configure
```
Project Name:            quickhire-frontend
Framework:               Next.js (auto-detected)
Root Directory:          ./quickhire AI mode
```

### 4. Environment Variables
```
Add:

☐ NEXT_PUBLIC_API_URL=(your Render backend URL)/api
☐ NEXT_PUBLIC_RAZORPAY_KEY_ID=(from Razorpay)

Example:
NEXT_PUBLIC_API_URL=https://quickhire-backend.onrender.com/api
```

### 5. Deploy
```
☐ Click "Deploy"
☐ Wait for build (3-5 mins)
☐ Check deployment success
☐ SAVE: Frontend URL (e.g., https://quickhire-frontend.vercel.app)
```

---

## 🔗 PHASE 4: Connect & Test (5 mins)

### Test Backend
```bash
curl https://quickhire-backend.onrender.com/api/health
```
Expected: `{"success":true,"data":{"status":"ok"}}`

### Test Frontend
```
☐ Open: https://quickhire-frontend.vercel.app
☐ F12 → Console (check for errors)
☐ F12 → Network (verify API calls work)
```

### Test Features
```
☐ Login page loads
☐ Can browse (guest mode)
☐ Search works
☐ Socket.IO connects (console should show)
☐ Payment page works
☐ File upload works
```

---

## 📊 Summary

| Component | URL | Status |
|-----------|-----|--------|
| Frontend | https://quickhire-frontend.vercel.app | ☐ Live |
| Backend | https://quickhire-backend.onrender.com | ☐ Live |
| Database | MongoDB Atlas | ☐ Connected |
| Cache | Upstash Redis | ☐ Connected |
| Email | Mailgun | ☐ Ready |
| Files | Cloudinary | ☐ Ready |
| Payments | Razorpay | ☐ Ready |

---

## ⏱️ Total Time: ~45 minutes

1. External services: 15 mins
2. Backend deployment: 15 mins
3. Frontend deployment: 10 mins
4. Testing: 5 mins

---

## 🆘 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Frontend can't reach backend | Update NEXT_PUBLIC_API_URL in Vercel env vars, redeploy |
| MongoDB connection fails | Check URI syntax, enable IP 0.0.0.0/0 in MongoDB Atlas |
| Socket.IO not connecting | Verify backend URL in frontend, check CORS settings |
| Build fails on Vercel | Check build logs, look for missing env vars or import errors |
| Build fails on Render | Increase build time, check Node version compatibility |
| Email not sending | Verify Mailgun API key, check spam folder |

---

## 💾 Keep Safe

Save these URLs and credentials in a secure place:
- [ ] Render backend URL
- [ ] Vercel frontend URL
- [ ] MongoDB connection string
- [ ] Redis URL
- [ ] API Keys (Razorpay, Cloudinary, Mailgun)
