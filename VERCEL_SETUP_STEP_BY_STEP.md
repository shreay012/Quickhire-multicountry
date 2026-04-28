# 🟢 VERCEL SETUP - COMPLETE STEP-BY-STEP GUIDE

**Goal**: Collect 3 tokens from Vercel and connect your GitHub to auto-deploy  
**Time**: 10 minutes  
**Difficulty**: Easy ✅

---

## 📋 WHAT YOU'LL COLLECT

By the end of this guide, you'll have 3 values:

```
1. VERCEL_TOKEN         (Long random string)
2. VERCEL_ORG_ID        (Numbers)
3. VERCEL_PROJECT_ID    (Long string)
```

---

## ✅ STEP 1: GET VERCEL_TOKEN

### Open the Token Page
1. Go to: **https://vercel.com/account/tokens**
2. You'll see a page like this:
   ```
   Tokens
   _______________
   No tokens yet.
   [Create Token] button
   ```

### Create a New Token
3. Click the **"Create Token"** button
4. A form will appear:
   ```
   Token Name: _______________
   Scope: [Dropdown - Full Account ▼]
   Expiration: [Optional]
   ```

### Fill in the Form
5. **Token Name**: Type `github-deploy`
6. **Scope**: Click dropdown → Select **"Full Account"**
7. **Expiration**: Leave as default (or set to 90 days)
8. Click **"Create"** button

### Copy Your Token
9. **IMPORTANT**: Your token will appear only ONCE
   ```
   ✅ Token created!
   
   Your token: prj_1234567890abcdefghijklmnopqrst
   
   [Copy button] [This is your VERCEL_TOKEN]
   ```
10. **Click "Copy"** or select and copy the entire token
11. **Paste it somewhere safe** (like Notepad for now)

```
✅ VERCEL_TOKEN = prj_1234567890abcdefghijklmnopqrst (example)
```

**✓ Step 1 Complete!**

---

## ✅ STEP 2: GET VERCEL_ORG_ID

### Go to Team Settings
1. Go to: **https://vercel.com/dashboard**
2. Click on your **project name** (QuickHire or whatever you named it)
3. Once inside the project, look for **"Settings"** button (top right or left sidebar)
4. Click **"Settings"**

### Find Team Settings
5. In the Settings menu, look for **"Team Settings"** or **"Organization"** tab
6. Click it

### Find the ID
7. Look for one of these (they might call it different things):
   - **"Team ID"**
   - **"Organization ID"**
   - **"Account ID"**
8. You'll see something like:
   ```
   Team ID: abc123def456
   ```
9. **Copy this value**

```
✅ VERCEL_ORG_ID = abc123def456 (example)
```

**✓ Step 2 Complete!**

---

## ✅ STEP 3: GET VERCEL_PROJECT_ID

### Go to Project Settings
1. Back in **https://vercel.com/dashboard**
2. Click your **project**
3. Click **"Settings"** (top right)
4. Click the **"General"** tab (if not already there)

### Find Project ID
5. Look for **"Project ID"** field
6. You'll see:
   ```
   Project ID: prj_abc123def456ghi789jkl012mno345
   ```
7. **Copy this value**

```
✅ VERCEL_PROJECT_ID = prj_abc123def456ghi789jkl012mno345 (example)
```

**✓ Step 3 Complete!**

---

## 📝 SUMMARY - YOUR VERCEL VALUES

You should now have 3 values. **Write them down:**

```
VERCEL_TOKEN          = ________________________________
VERCEL_ORG_ID         = ________________________________
VERCEL_PROJECT_ID     = ________________________________
```

---

## 🎯 WHAT'S NEXT?

✅ **You're done with Vercel!**

Now go to: **RENDER_SETUP_STEP_BY_STEP.md** to collect 2 more values from Render.

After you have all 5 values, you'll add them to GitHub and your app will auto-deploy! 🚀

---

## 🆘 TROUBLESHOOTING

### Q: I can't find the Create Token button
**A**: Make sure you're logged in at https://vercel.com/account/tokens

### Q: Where is Settings button?
**A**: 
- On Vercel Dashboard, click your project
- Top right should have "Settings"
- If not visible, look in the hamburger menu (3 lines)

### Q: Can't find Team ID
**A**:
- Go to https://vercel.com/dashboard
- Click your project
- Settings → scroll down
- Look for "Team ID" or "Organization ID"

### Q: Token only showed once and I missed it
**A**: No problem! Go back to https://vercel.com/account/tokens and create another one

---

**Next: Continue to RENDER_SETUP_STEP_BY_STEP.md** ➡️
