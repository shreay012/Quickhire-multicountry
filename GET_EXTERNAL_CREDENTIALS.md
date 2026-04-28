# 🔑 GET YOUR EXTERNAL CREDENTIALS - QUICK GUIDE

**You need 6 external values before completing the Render form. Here's where to get them:**

---

## 1️⃣ MONGODB_URI (From MongoDB Atlas)

### Steps:
1. Go to: https://cloud.mongodb.com
2. Login to your account
3. Click your cluster (should be "Cluster0")
4. Click the blue **"Connect"** button
5. Select **"Drivers"** (not Shell)
6. Choose **"Python"** or **"Node.js"**
7. Copy the connection string
8. Replace `<password>` with your MongoDB password
9. The URL should look like:
   ```
   mongodb+srv://quickhire_user:PASSWORD@cluster0.xxxxx.mongodb.net/quickhire?retryWrites=true&w=majority
   ```

### Add to Render form as:
```
MONGO_URI = mongodb+srv://quickhire_user:PASSWORD@cluster0.xxxxx.mongodb.net/quickhire?retryWrites=true&w=majority
```

---

## 2️⃣ REDIS_URL (From Upstash)

### Steps:
1. Go to: https://console.upstash.com
2. Login to your account
3. Click your Redis database (or create one if needed)
4. You'll see connection details
5. Look for the **"Redis CLI"** tab or connection string
6. Copy the full URL, should look like:
   ```
   redis://default:PASSWORD@host-123.upstash.io:PORT
   ```

### Add to Render form as:
```
REDIS_URL = redis://default:PASSWORD@host-123.upstash.io:PORT
```

---

## 3️⃣ RAZORPAY_KEY_ID (From Razorpay)

### Steps:
1. Go to: https://dashboard.razorpay.com
2. Login to your account
3. Go to **Settings** → **API Keys**
4. You'll see two keys:
   - **Key ID** (starts with `rzp_live_` or `rzp_test_`)
   - **Key Secret** (long random string)
5. Copy the **Key ID**

### Add to Render form as:
```
RAZORPAY_KEY_ID = rzp_live_xxxxxxxxxxxxx
```

---

## 4️⃣ RAZORPAY_KEY_SECRET (From Razorpay)

### Same location as above:
1. In API Keys section
2. Copy the **Key Secret** (the longer one)

### Add to Render form as:
```
RAZORPAY_KEY_SECRET = xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 5️⃣ RAZORPAY_WEBHOOK_SECRET (From Razorpay)

### Steps:
1. Go to: https://dashboard.razorpay.com
2. Go to **Settings** → **Webhooks**
3. If you don't have a webhook, create one:
   - URL: `https://quickhire-backend.onrender.com/webhooks/razorpay`
   - Events: Select all payment events
   - Click Create
4. After creation, copy the **Signing Secret**

### Add to Render form as:
```
RAZORPAY_WEBHOOK_SECRET = xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 6️⃣ MAILGUN_DOMAIN (From Mailgun)

### Steps:
1. Go to: https://app.mailgun.com
2. Login to your account
3. Go to **Sending** → **Domains**
4. Copy your domain (usually `mg.yourdomain.com` or similar)

### Add to Render form as:
```
MAILGUN_DOMAIN = mg.yourdomain.com
```

---

## 📝 JWT KEYS (From Your Backend)

These are in your local files:

### JWT_PRIVATE_KEY:
1. Open: `/Users/orange/Documents/QHAIMODE/quickhire AI mode /backend/private.pem`
2. Copy entire content
3. Replace newlines with `\n`
4. Add as environment variable

### JWT_PUBLIC_KEY:
1. Open: `/Users/orange/Documents/QHAIMODE/quickhire AI mode /backend/public.pem`
2. Copy entire content
3. Replace newlines with `\n`
4. Add as environment variable

---

## ✅ CHECKLIST - What You Need Before Starting Render Form

```
MongoDB:
☐ MONGO_URI = [Your connection string]

Redis:
☐ REDIS_URL = [Your connection string]

Razorpay:
☐ RAZORPAY_KEY_ID = [Your key ID]
☐ RAZORPAY_KEY_SECRET = [Your key secret]
☐ RAZORPAY_WEBHOOK_SECRET = [Your webhook secret]

Mailgun:
☐ MAILGUN_DOMAIN = [Your domain]

JWT Keys (local files):
☐ JWT_PRIVATE_KEY = [From private.pem]
☐ JWT_PUBLIC_KEY = [From public.pem]
```

---

## 🎯 NEXT STEPS

1. Gather all 6 external values using this guide
2. Open: RENDER_FORM_COMPLETE_GUIDE.md
3. Follow the field-by-field instructions
4. Add all environment variables
5. Click "Create Web Service"
6. Wait 5 minutes for deployment
7. Copy RENDER_SERVICE_ID from URL
8. Share with agent to complete deployment

---

**Getting stuck?** Which value do you need help finding?
