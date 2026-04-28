# 🔴 RENDER SETUP - COMPLETE STEP-BY-STEP GUIDE

**Goal**: Collect 2 tokens from Render and connect your backend to auto-deploy  
**Time**: 10 minutes  
**Difficulty**: Easy ✅

---

## 📋 WHAT YOU'LL COLLECT

By the end of this guide, you'll have 2 values:

```
1. RENDER_API_KEY           (Long random string)
2. RENDER_SERVICE_ID        (srv_xxxxx format)
```

---

## ✅ STEP 1: GET RENDER_API_KEY

### Open Render Dashboard
1. Go to: **https://dashboard.render.com**
2. Login with your Render account
3. You'll see the main dashboard

### Go to Account Settings
4. Look for your **profile icon** (usually top-right corner)
5. Click it → Select **"Account"** or **"Settings"**
6. (Alternative: Look for a gear icon ⚙️)

### Find API Keys Section
7. In the settings menu, look for:
   - **"API Keys"**
   - **"Tokens"**
   - **"Developer Settings"**
8. Click on it

### Create New API Key
9. You'll see a section like:
   ```
   API Keys
   [Create API Key] button
   ```
10. Click **"Create API Key"** (or similar button)

### Name Your Key
11. A form appears:
    ```
    Key Name: ________________
    ```
12. Type: `github-deployment`
13. Click **"Create"**

### Copy Your API Key
14. Your new key will appear:
    ```
    ✅ API Key Created!
    
    Key: rnd_abc123def456ghi789jkl012mno345pqr
    
    [Copy button]
    ```
15. **Click "Copy"** or select and copy the entire key
16. **Save it somewhere safe** (like Notepad)

```
✅ RENDER_API_KEY = rnd_abc123def456ghi789jkl012mno345pqr (example)
```

**✓ Step 1 Complete!**

---

## ✅ STEP 2: GET RENDER_SERVICE_ID

### Go to Services
1. On Render Dashboard (https://dashboard.render.com)
2. Look for **"Services"** in the left sidebar
3. Click **"Services"**

### Find Your Backend Service
4. You'll see a list of services
5. Look for your backend service (should be named something like):
   - "QuickHire Backend"
   - "Quickhire-backend"
   - Your backend service name
6. Click on it

### Get Service ID from URL
7. Once you click into the service, look at your browser's **URL bar**
8. You should see something like:
   ```
   https://dashboard.render.com/services/srv_abc123def456ghi789jkl
   ```
9. The **Service ID is the part after `/services/`**:
   ```
   srv_abc123def456ghi789jkl  ← This is your RENDER_SERVICE_ID
   ```
10. **Copy this value**

### Alternative: Find in Service Details
If you can't find it in the URL:
1. In your service page, look for **"Settings"** or **"Service ID"**
2. It might be displayed in a field
3. Copy it

```
✅ RENDER_SERVICE_ID = srv_abc123def456ghi789jkl (example)
```

**✓ Step 2 Complete!**

---

## 📝 SUMMARY - YOUR RENDER VALUES

You should now have 2 values. **Write them down:**

```
RENDER_API_KEY          = ________________________________
RENDER_SERVICE_ID       = ________________________________
```

---

## 🎯 WHAT'S NEXT?

✅ **You're done with Render!**

Now you have all 5 values:

```
From Vercel:
✅ VERCEL_TOKEN
✅ VERCEL_ORG_ID
✅ VERCEL_PROJECT_ID

From Render:
✅ RENDER_API_KEY
✅ RENDER_SERVICE_ID
```

**Next Step**: Go to **ADD_GITHUB_SECRETS_FINAL.md** to add all 5 values to GitHub

---

## 🆘 TROUBLESHOOTING

### Q: I can't find API Keys section
**A**: 
- Make sure you're logged in at https://dashboard.render.com
- Click your profile icon (top-right)
- Select "Account" or "Settings"

### Q: Where is my backend service?
**A**:
- On Render Dashboard, look left sidebar for "Services"
- Click "Services"
- You should see your backend listed
- If not listed, you may need to create it first

### Q: Can't find Service ID
**A**:
- Open your backend service
- Look at the browser URL bar
- Service ID is after `/services/`
- Looks like: `srv_xxxxxxxxxxxxx`

### Q: How do I find the Service Name if I forgot it?
**A**:
- Go to https://dashboard.render.com
- Services → Look for any service
- It should be your backend/Express service

---

## ✅ ALL TOKENS COLLECTED?

If you have all 5 values:

```
☑ VERCEL_TOKEN
☑ VERCEL_ORG_ID
☑ VERCEL_PROJECT_ID
☑ RENDER_API_KEY
☑ RENDER_SERVICE_ID
```

**Continue to: ADD_GITHUB_SECRETS_FINAL.md** ➡️

This will show you how to add all 5 to GitHub in 5 minutes!
