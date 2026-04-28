# GitHub Actions Auto-Deployment - Visual Flow

## 🎯 Complete Deployment Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  YOU PUSH CODE TO GITHUB                                        │
│  ↓                                                              │
│  git push origin main                                           │
│  ↓                                                              │
│  GITHUB DETECTS PUSH ✨                                         │
│  ↓                                                              │
│  ┌───────────────────────────────────┐                          │
│  │  TWO WORKFLOWS TRIGGER:           │                          │
│  │  ✓ deploy-frontend.yml            │                          │
│  │  ✓ deploy-backend.yml             │                          │
│  └───────────────────────────────────┘                          │
│  ↓                                                              │
│  ┌─────────────────────────┐ ┌─────────────────────────┐       │
│  │ FRONTEND DEPLOYMENT     │ │ BACKEND DEPLOYMENT      │       │
│  ├─────────────────────────┤ ├─────────────────────────┤       │
│  │ 1. Checkout code        │ │ 1. Checkout code        │       │
│  │ 2. Send to Vercel       │ │ 2. Trigger Render API   │       │
│  │ 3. Build Next.js        │ │ 3. Render builds & runs │       │
│  │ 4. Deploy to CDN        │ │ 4. Service redeployed   │       │
│  │ 5. URL ready (30s)      │ │ 5. URL ready (5-10min)  │       │
│  └─────────────────────────┘ └─────────────────────────┘       │
│  ↓                                                              │
│  DEPLOYMENT COMPLETE ✅                                        │
│  ↓                                                              │
│  App Live At:                                                  │
│  • Frontend: https://quickhire-frontend.vercel.app            │
│  • Backend: https://quickhire-backend.onrender.com            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 PR Preview Deployment (Optional)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  YOU CREATE PR                                                  │
│  ↓                                                              │
│  git push origin feature/my-feature                             │
│  Create PR on GitHub                                            │
│  ↓                                                              │
│  WORKFLOW TRIGGERS (PR event)                                   │
│  ↓                                                              │
│  Vercel Creates Preview Deploy ✨                              │
│  ↓                                                              │
│  Preview URL: https://quickhire-frontend-pr123.vercel.app     │
│  ↓                                                              │
│  GitHub Comments PR with URL                                   │
│  ↓                                                              │
│  You Test Changes on Preview                                   │
│  ↓                                                              │
│  Approve & Merge PR                                             │
│  ↓                                                              │
│  Main Deployment Triggered (see above)                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Secrets Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│  1. YOU CREATE TOKENS & KEYS                                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Vercel Account                                             │
│  ├─ VERCEL_TOKEN                                            │
│  ├─ VERCEL_ORG_ID                                           │
│  └─ VERCEL_PROJECT_ID                                       │
│                                                             │
│  Render Account                                             │
│  ├─ RENDER_API_KEY                                          │
│  └─ RENDER_SERVICE_ID                                       │
│                                                             │
└──────────────────────────────────────────────────────────────┘
                           ↓
                    (Copy & Save)
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  2. ADD TO GITHUB SECRETS                                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  GitHub Repo Settings                                       │
│  └─ Secrets and variables                                   │
│     ├─ VERCEL_TOKEN ✓                                       │
│     ├─ VERCEL_ORG_ID ✓                                      │
│     ├─ VERCEL_PROJECT_ID ✓                                  │
│     ├─ RENDER_API_KEY ✓                                     │
│     └─ RENDER_SERVICE_ID ✓                                  │
│                                                             │
└──────────────────────────────────────────────────────────────┘
                           ↓
                    (Encrypted storage)
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  3. WORKFLOWS USE SECRETS                                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  During Deployment:                                         │
│  ├─ Vercel Action reads VERCEL_TOKEN                        │
│  ├─ Vercel Action reads VERCEL_ORG_ID                       │
│  ├─ Vercel Action reads VERCEL_PROJECT_ID                   │
│  ├─ Curl reads RENDER_API_KEY                               │
│  └─ Curl reads RENDER_SERVICE_ID                            │
│                                                             │
└──────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

```
your-repo/
├── .github/
│   └── workflows/
│       ├── deploy-frontend.yml        ← Triggers on main push
│       └── deploy-backend.yml         ← Triggers on main push
│
├── quickhire AI mode/                  ← Frontend (Next.js)
│   ├── app/
│   ├── components/
│   ├── pages/
│   └── package.json
│
├── quickhire AI mode /backend/         ← Backend (Express)
│   ├── src/
│   ├── server.js
│   └── package.json
│
└── README.md
```

---

## ✨ Step-by-Step Setup

```
STEP 1: Generate Tokens
┌────────────────────────────────────────┐
│ Visit these 4 websites                 │
│ 1. vercel.com/account/tokens           │
│ 2. vercel.com/dashboard (settings)     │
│ 3. render.com dashboard (settings)     │
│ 4. render.com/services (service page)  │
│                                        │
│ Copy 5 tokens/IDs                      │
└────────────────────────────────────────┘
              ↓
        (10 minutes)
              ↓
STEP 2: Add to GitHub Secrets
┌────────────────────────────────────────┐
│ GitHub → Settings → Secrets            │
│ Add 5 secrets:                         │
│ ✓ VERCEL_TOKEN                         │
│ ✓ VERCEL_ORG_ID                        │
│ ✓ VERCEL_PROJECT_ID                    │
│ ✓ RENDER_API_KEY                       │
│ ✓ RENDER_SERVICE_ID                    │
└────────────────────────────────────────┘
              ↓
         (5 minutes)
              ↓
STEP 3: Verify Workflow Files
┌────────────────────────────────────────┐
│ Check these files exist:               │
│ ✓ .github/workflows/deploy-frontend.yml│
│ ✓ .github/workflows/deploy-backend.yml │
│                                        │
│ (Already created for you!)             │
└────────────────────────────────────────┘
              ↓
         (2 minutes)
              ↓
STEP 4: Test & Deploy
┌────────────────────────────────────────┐
│ git push origin main                   │
│                                        │
│ Watch GitHub Actions tab               │
│ See workflows run                      │
│ Check deployment status                │
│                                        │
│ Visit deployed URLs ✅                 │
└────────────────────────────────────────┘

TOTAL TIME: ~27 minutes ⏱️
```

---

## 🎨 Deployment Status Dashboard

```
After Setup, You'll Have:

GITHUB ACTIONS TAB
├─ Deploy Frontend (workflow)
│  ├─ Status: ✅ Passed / ❌ Failed / ⏳ Running
│  ├─ Logs: See what's happening
│  └─ Trigger: push to main
│
└─ Deploy Backend (workflow)
   ├─ Status: ✅ Passed / ❌ Failed / ⏳ Running
   ├─ Logs: See what's happening
   └─ Trigger: push to main

VERCEL DASHBOARD
├─ Deployments tab
│  ├─ Production: Latest from main
│  ├─ Preview: Latest from PR
│  └─ Rollback available
└─ Analytics

RENDER DASHBOARD
├─ Deploys tab
│  ├─ Last deployed: Timestamp
│  ├─ Status: Live / Failed / Building
│  └─ Logs available
└─ Service Health
```

---

## 🔐 Security Checklist

```
✓ Secrets are encrypted by GitHub
✓ Not visible in logs (GitHub redacts them)
✓ Only used during workflow execution
✓ Not stored in repository
✓ Revocable at any time

If compromised:
1. Regenerate token on Vercel/Render
2. Update GitHub secret
3. Old token becomes useless
```

---

## 🚀 Deployment Commands Reference

```
PUSH TO MAIN (Automatic Deploy)
┌────────────────────────────────────────┐
│ git add .                              │
│ git commit -m "new feature"            │
│ git push origin main                   │
│                                        │
│ → Automatically deploys both frontend  │
│   and backend in parallel              │
└────────────────────────────────────────┘

CREATE PR (Preview Deploy)
┌────────────────────────────────────────┐
│ git checkout -b feature/my-feature     │
│ # make changes                         │
│ git push origin feature/my-feature     │
│ Create PR on GitHub                    │
│                                        │
│ → Creates preview URL on Vercel        │
│ → See test link in PR                  │
└────────────────────────────────────────┘

ROLLBACK (Go Back)
┌────────────────────────────────────────┐
│ On Vercel: Deployments → Click Previous│
│ On Render: Deploys → Click Previous    │
│                                        │
│ → Restores previous version instantly  │
└────────────────────────────────────────┘
```

---

## ✅ You're Ready When:

- [ ] All 5 GitHub secrets are added (green checkmarks)
- [ ] Both workflow files exist in `.github/workflows/`
- [ ] You've tested by pushing to main
- [ ] Vercel and Render show successful deployments
- [ ] Your app is live and working

---

## 📞 Need Help?

```
Check:
1. GitHub Actions tab → See error logs
2. Vercel Deployments tab → See build logs
3. Render Service Logs → See runtime errors
4. GITHUB_ACTIONS_SETUP.md → Full troubleshooting guide
```
