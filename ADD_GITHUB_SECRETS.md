# Add GitHub Secrets - Step-by-Step Guide

Follow this guide to add all 5 secrets to GitHub.

---

## 📋 Your 5 Secrets Checklist

Before starting, you need to have these 5 values ready. Get them from:

| # | Secret Name | Get From | Status |
|---|------------|----------|--------|
| 1 | VERCEL_TOKEN | https://vercel.com/account/tokens | ☐ Ready |
| 2 | VERCEL_ORG_ID | Vercel Project → Settings → Team Settings | ☐ Ready |
| 3 | VERCEL_PROJECT_ID | Vercel Project → Settings → General | ☐ Ready |
| 4 | RENDER_API_KEY | https://dashboard.render.com → Account → API Keys | ☐ Ready |
| 5 | RENDER_SERVICE_ID | render.com/services/{service} (from URL) | ☐ Ready |

---

## 🔑 STEP 1: Get VERCEL_TOKEN

```
1. Open: https://vercel.com/account/tokens
2. Log in if needed
3. Click "Create Token"
4. Fill in:
   - Token name: github-deploy
   - Scope: Full Account
   - Expiration: No expiration (or 90 days)
5. Click "Create"
6. COPY the entire token (starts with "vercel_" or "token_")
7. SAVE IT SOMEWHERE SAFE - you can only see it once!

Example: vercel_abc123def456ghi789jkl0mnopqrstu

✅ VERCEL_TOKEN = [paste your token here]
```

---

## 🏢 STEP 2: Get VERCEL_ORG_ID

```
1. Go to: https://vercel.com/dashboard
2. Click on your project (quickhire-frontend)
3. Click "Settings" (top menu)
4. Click "Team Settings" (left sidebar)
5. Look for "Team ID" or "Organization ID"
6. COPY the ID (looks like "team_xxxxx" or similar)

Example: team_1a2b3c4d5e6f7g8h9i0j

✅ VERCEL_ORG_ID = [paste your ID here]
```

---

## 📁 STEP 3: Get VERCEL_PROJECT_ID

```
1. Go to: https://vercel.com/dashboard
2. Click on your project (quickhire-frontend)
3. Click "Settings" (top menu)
4. Look for "Project ID" in the General section
5. COPY the ID (looks like "prj_xxxxx")

Example: prj_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

✅ VERCEL_PROJECT_ID = [paste your ID here]
```

---

## 🎨 STEP 4: Get RENDER_API_KEY

```
1. Open: https://dashboard.render.com
2. Log in if needed
3. Click your profile → "Account" (bottom left)
4. Scroll to "API Keys"
5. Click "Create API Key"
6. Name it: github-deploy
7. COPY the entire key
8. SAVE IT - you can only see it once!

Example: rnd_abc123def456ghi789jkl0mnopqrstuv

✅ RENDER_API_KEY = [paste your key here]
```

---

## 🔧 STEP 5: Get RENDER_SERVICE_ID

```
1. Open: https://dashboard.render.com
2. Click on your backend service (quickhire-backend)
3. Look at the URL in your browser
4. It will be something like:
   https://dashboard.render.com/services/srv_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
5. The "srv_xxxxx" part is your SERVICE ID
6. COPY just that part

Example: srv_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

✅ RENDER_SERVICE_ID = [paste your ID here]
```

---

## ✅ ALL 5 READY? Great! Now Add to GitHub:

```
Your Secret Values:
1. VERCEL_TOKEN = ____________________________
2. VERCEL_ORG_ID = ____________________________
3. VERCEL_PROJECT_ID = ____________________________
4. RENDER_API_KEY = ____________________________
5. RENDER_SERVICE_ID = ____________________________
```

---

## 🔐 ADD TO GITHUB - Follow Exactly:

### Step 1: Go to GitHub Settings

```
1. Open your GitHub repo:
   https://github.com/YOUR_USERNAME/YOUR_REPO
   
2. Click "Settings" tab (top right)

3. Click "Secrets and variables" (left sidebar)
   → Then click "Actions"

4. You should see "Repository secrets" section
```

### Step 2: Add First Secret (VERCEL_TOKEN)

```
1. Click "New repository secret" button

2. Fill in:
   Name: VERCEL_TOKEN
   Value: [paste your VERCEL_TOKEN from Step 1 above]

3. Click "Add secret"

4. You should see it appear with a green checkmark ✓
```

### Step 3: Add Second Secret (VERCEL_ORG_ID)

```
1. Click "New repository secret" button again

2. Fill in:
   Name: VERCEL_ORG_ID
   Value: [paste your VERCEL_ORG_ID from Step 2 above]

3. Click "Add secret"

4. Should appear with green checkmark ✓
```

### Step 4: Add Third Secret (VERCEL_PROJECT_ID)

```
1. Click "New repository secret" button

2. Fill in:
   Name: VERCEL_PROJECT_ID
   Value: [paste your VERCEL_PROJECT_ID from Step 3 above]

3. Click "Add secret"

4. Should appear with green checkmark ✓
```

### Step 5: Add Fourth Secret (RENDER_API_KEY)

```
1. Click "New repository secret" button

2. Fill in:
   Name: RENDER_API_KEY
   Value: [paste your RENDER_API_KEY from Step 4 above]

3. Click "Add secret"

4. Should appear with green checkmark ✓
```

### Step 6: Add Fifth Secret (RENDER_SERVICE_ID)

```
1. Click "New repository secret" button

2. Fill in:
   Name: RENDER_SERVICE_ID
   Value: [paste your RENDER_SERVICE_ID from Step 5 above]

3. Click "Add secret"

4. Should appear with green checkmark ✓
```

---

## ✨ VERIFY ALL SECRETS ADDED

Go back to Settings → Secrets and variables → Actions

You should see all 5 with green checkmarks:

```
✓ VERCEL_TOKEN
✓ VERCEL_ORG_ID
✓ VERCEL_PROJECT_ID
✓ RENDER_API_KEY
✓ RENDER_SERVICE_ID
```

If any are missing or red, add them again.

---

## 🎉 DONE! Now Test Deployment

```bash
# On your local machine:
git add .
git commit -m "setup: add auto-deployment"
git push origin main

# Go to GitHub
# Click "Actions" tab
# Watch the workflows run!

# After ~15 minutes:
- Frontend: https://quickhire-frontend.vercel.app
- Backend: https://quickhire-backend.onrender.com
```

---

## 📸 Visual Guide Screenshots

### Location of Secrets Settings:
```
GitHub → Settings → Secrets and variables → Actions
                                            ↓
                                    "New repository secret" button
                                            ↓
                                    Add each of 5 secrets
```

### What You'll See:
```
Repository secrets (5 total)

✓ RENDER_API_KEY
  Updated 2 minutes ago

✓ RENDER_SERVICE_ID
  Updated 1 minute ago

✓ VERCEL_ORG_ID
  Updated 4 minutes ago

✓ VERCEL_PROJECT_ID
  Updated 3 minutes ago

✓ VERCEL_TOKEN
  Updated 5 minutes ago
```

---

## ⚠️ Important Notes

1. **Secrets are hidden** - GitHub won't show you the values again
2. **Can't be seen in logs** - Workflows hide secrets in output
3. **Can be revoked** - Delete secret anytime to disable deployment
4. **Keep safe** - If you leak a secret, regenerate immediately

---

## 🆘 Troubleshooting

### "I can't find Secrets and variables"
```
1. Make sure you're in Settings (top tab)
2. Look for "Secrets and variables" in left sidebar
3. Click it → Then click "Actions"
```

### "I don't see my values"
```
GitHub security - you can only see the value once!
If you missed it:
1. Go to the service (Vercel/Render)
2. Regenerate/create new token
3. Add to GitHub again
```

### "Workflow still says deployment failed"
```
1. Check all 5 secrets are added (green checkmarks)
2. Check spelling - names MUST be exact:
   - VERCEL_TOKEN (not token or VERCEL)
   - RENDER_API_KEY (not key or RENDER)
3. Check values are correct (no extra spaces)
4. Go to GitHub Actions tab → Click failed run → See error
```

---

## 📚 Next Steps After Adding Secrets

1. ✅ Secrets added to GitHub
2. Push code to trigger deployment:
   ```bash
   git push origin main
   ```
3. Watch GitHub Actions tab
4. Check Vercel & Render dashboards
5. Visit your live URLs:
   - Frontend: https://quickhire-frontend.vercel.app
   - Backend: https://quickhire-backend.onrender.com

---

## 💾 Final Checklist

Before you're done:

- [ ] All 5 secrets obtained
- [ ] All 5 secrets added to GitHub (green checkmarks)
- [ ] Can see them in Settings → Secrets and variables → Actions
- [ ] Ready to push code and deploy

**You're all set! 🚀**
