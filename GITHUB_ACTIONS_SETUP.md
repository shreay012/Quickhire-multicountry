# GitHub Actions Auto-Deployment Setup

Complete guide to set up automatic deployment when you push to GitHub.

---

## 🎯 What This Does

Every time you:
- **Push to `main` branch** → Automatically deploys to Vercel (frontend) + Render (backend)
- **Create a PR** → Creates a preview deployment on Vercel
- **Push to `develop`** → Deploys to staging

---

## ✅ STEP 1: Generate Required Tokens

### 1.1 Vercel Token

```bash
1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: github-deploy
4. Scope: Full Account
5. Copy the token
6. SAVE: This is VERCEL_TOKEN
```

### 1.2 Vercel Organization ID & Project ID

```bash
1. Go to https://vercel.com/dashboard
2. Select your project (quickhire-frontend)
3. Settings → General
4. Copy "Project ID" → Save as VERCEL_PROJECT_ID
5. Go to Settings → Team Settings
6. Copy "Team ID" or "Organization ID" → Save as VERCEL_ORG_ID
```

### 1.3 Render API Key

```bash
1. Go to https://dashboard.render.com
2. Account → API Keys
3. Create "New API Key"
4. Copy it → Save as RENDER_API_KEY
```

### 1.4 Render Service ID

```bash
1. Go to https://dashboard.render.com
2. Select your backend service (quickhire-backend)
3. Settings → Copy the Service ID from URL
   https://dashboard.render.com/services/srv_xxxxxxxxxxxxxx
4. The srv_xxxxx part is your RENDER_SERVICE_ID
5. SAVE: RENDER_SERVICE_ID
```

---

## 🔐 STEP 2: Add GitHub Secrets

### 2.1 Add Secrets to Frontend Repo

```bash
1. Go to GitHub: https://github.com/your-username/your-repo
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret:

   Name: VERCEL_TOKEN
   Value: (paste from 1.1)
   
   Name: VERCEL_ORG_ID
   Value: (paste from 1.2 - Team/Org ID)
   
   Name: VERCEL_PROJECT_ID
   Value: (paste from 1.2 - Project ID)

5. Each should have a green checkmark when saved
```

**Visual Guide:**
```
Settings → Secrets and variables → Actions
↓
Click "New repository secret"
↓
Add 3 secrets:
  ✓ VERCEL_TOKEN
  ✓ VERCEL_ORG_ID
  ✓ VERCEL_PROJECT_ID
```

### 2.2 Add Secrets for Backend

```bash
1. Same location: Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add:

   Name: RENDER_API_KEY
   Value: (paste from 1.3)
   
   Name: RENDER_SERVICE_ID
   Value: (paste from 1.4)

4. Optional - for Slack notifications:
   Name: SLACK_WEBHOOK
   Value: (your Slack webhook URL - see Step 3)
```

---

## 💬 STEP 3: (Optional) Slack Notifications

Get deployment notifications in Slack:

```bash
1. Go to https://api.slack.com/apps
2. Create New App → From scratch
3. Name: GitHub Deployments
4. Choose your workspace
5. Go to Incoming Webhooks → Activate
6. Click "Add New Webhook to Workspace"
7. Select channel (e.g., #deployments)
8. Copy Webhook URL
9. Add to GitHub secrets:
   Name: SLACK_WEBHOOK
   Value: (paste webhook URL)
```

---

## 📁 STEP 4: Verify Files Are in Place

Check that workflow files exist:

```bash
✓ .github/workflows/deploy-frontend.yml
  (in "quickhire AI mode" folder)

✓ .github/workflows/deploy-backend.yml
  (in "quickhire AI mode /backend" folder)

OR create a single .github at root:
✓ .github/workflows/deploy-frontend.yml (at root)
✓ .github/workflows/deploy-backend.yml (at root)
```

---

## 🚀 STEP 5: Test Deployment

### 5.1 Create a Test PR

```bash
# On your local machine:
git checkout -b test/auto-deploy
echo "# Test Deployment" >> README.md
git add .
git commit -m "test: trigger auto-deployment"
git push origin test/auto-deploy

# Go to GitHub and create PR
# Check Actions tab - workflow should trigger
```

### 5.2 Merge to Main and Deploy

```bash
# Merge the PR on GitHub
# OR locally:
git checkout main
git merge test/auto-deploy
git push origin main

# Go to GitHub Actions tab
# Watch the deployment happen!
```

### 5.3 Check Deployment Status

```bash
1. GitHub Repo → Actions tab
2. Click on the latest workflow run
3. Watch the logs in real-time
4. When done, check Vercel and Render dashboards
5. Verify app is deployed
```

---

## 📋 Workflow Triggers

### Frontend Deploy Triggers
```yaml
Triggers on:
- Push to main branch
- Push to develop branch
- Pull requests to main or develop
- File changes in "quickhire AI mode/**"

Actions:
- PR → Preview deployment (staging)
- Push to main → Production deployment (--prod)
```

### Backend Deploy Triggers
```yaml
Triggers on:
- Push to main branch
- File changes in "quickhire AI mode /backend/**"

Actions:
- Push to main → Triggers render.com redeploy
- Sends Slack notification (if configured)
```

---

## 🔄 Workflow File Locations

You need workflow files in the repo root `.github/workflows/`:

```
your-repo/
├── .github/
│   └── workflows/
│       ├── deploy-frontend.yml     ← Deploy Next.js to Vercel
│       └── deploy-backend.yml      ← Deploy Express to Render
├── quickhire AI mode/               ← Frontend code
├── quickhire AI mode /backend/      ← Backend code
└── ...
```

**Both workflow files should be at the ROOT level, not inside frontend/backend folders.**

---

## 🐛 Troubleshooting

### Workflow Not Triggering
```
1. Check if secrets are added:
   Settings → Secrets and variables → Actions
   
2. Check if file paths match:
   Workflow watches "quickhire AI mode/**"
   Make sure code is in that folder
   
3. Check if on main/develop branch:
   Workflows only trigger on specified branches
   
4. Check Actions tab for errors:
   GitHub Repo → Actions → Click failed run
```

### Vercel Deploy Fails
```
1. Check if VERCEL_TOKEN is valid:
   Go to https://vercel.com/account/tokens
   Make sure token isn't expired
   
2. Check if VERCEL_ORG_ID is correct:
   Settings → Team Settings → Organization ID
   
3. Check if VERCEL_PROJECT_ID is correct:
   Project Settings → General → Project ID
   
4. Check build logs in GitHub Actions tab
   Copy full error message
```

### Render Deploy Fails
```
1. Check if RENDER_API_KEY is valid:
   https://dashboard.render.com → Account → API Keys
   
2. Check if RENDER_SERVICE_ID matches:
   Service URL: https://dashboard.render.com/services/srv_xxxxx
   srv_xxxxx is your service ID
   
3. Check Render dashboard for service status:
   Make sure service is active
```

### PR Preview Not Working
```
1. Vercel might need special setup for Monorepo:
   Settings → Build & Development Settings
   Set Root Directory: ./quickhire AI mode
   
2. Make sure secrets are available to PRs:
   Settings → Secrets and variables → Actions
   Each secret should be available to PRs
```

---

## 📊 Monitoring Deployments

### GitHub Actions Dashboard
```
GitHub Repo → Actions tab
- See all workflow runs
- Click to see logs
- Re-run failed workflows
- Set status badges
```

### Vercel Deployments
```
https://vercel.com/dashboard
- Click project
- Deployments tab
- See all versions
- Rollback to previous
```

### Render Deployments
```
https://dashboard.render.com
- Click service
- Deploys tab
- See deployment logs
- Manual trigger available
```

---

## 🎯 Deployment Flow

### When You Push to Main:
```
1. GitHub detects push
2. Triggers deploy-frontend.yml workflow
3. Sends code to Vercel
4. Vercel builds Next.js app
5. Deployed to production URL

6. Triggers deploy-backend.yml workflow
7. Calls Render API
8. Render redeploys backend service
9. Backend available at production URL

10. Slack notification sent (if configured)
```

### When You Create PR:
```
1. GitHub detects PR
2. Triggers deploy-frontend.yml workflow
3. Sends code to Vercel
4. Vercel creates PREVIEW deployment
5. Comment added to PR with preview URL

6. You can test changes on preview
7. Once ready, merge PR
8. Main branch deployment triggered
```

---

## ✨ Environment Variables Recap

### GitHub Secrets Needed

| Name | Where to Get | Example |
|------|-------------|---------|
| VERCEL_TOKEN | vercel.com/account/tokens | token_xxxxxxxxxxxxx |
| VERCEL_ORG_ID | Vercel Project → Team Settings | team_xxxxx |
| VERCEL_PROJECT_ID | Vercel Project → Settings | prj_xxxxxx |
| RENDER_API_KEY | render.com → Account → API Keys | rnd_xxxxx |
| RENDER_SERVICE_ID | render.com → Service URL | srv_xxxxx |
| SLACK_WEBHOOK | api.slack.com → Incoming Webhooks | https://hooks.slack... |

---

## 🎉 You're All Set!

Now:
```bash
# Just code and push!
git add .
git commit -m "new feature"
git push origin main

# Automatically deploys to:
# - Frontend: https://quickhire-frontend.vercel.app
# - Backend: https://quickhire-backend.onrender.com
```

No manual deployments needed! 🚀

---

## 📚 Quick Reference

### Push & Deploy
```bash
git add .
git commit -m "your message"
git push origin main
```

### Create PR (Preview)
```bash
git checkout -b feature/new-feature
# make changes
git push origin feature/new-feature
# Create PR on GitHub
```

### Rollback
```bash
# On Vercel
Deployments → Click previous version → "Rollback"

# On Render
Deploys → Click previous deployment → "Deploy"
```

### View Logs
```bash
GitHub: Actions → Click workflow → See logs
Vercel: Project → Deployments → Click build → See logs
Render: Service → Deploys → Click deployment → See logs
```
