# GitHub Actions Setup - Quick Checklist

## ✅ Phase 1: Generate Tokens (10 mins)

### Vercel Tokens
```
☐ Go to https://vercel.com/account/tokens
☐ Create token "github-deploy"
☐ SAVE: VERCEL_TOKEN = token_xxxxx

☐ Go to your project → Settings → General
☐ SAVE: VERCEL_PROJECT_ID = prj_xxxxx

☐ Go to Settings → Team Settings
☐ SAVE: VERCEL_ORG_ID = team_xxxxx
```

### Render Token
```
☐ Go to https://dashboard.render.com
☐ Account → API Keys
☐ Create new API key
☐ SAVE: RENDER_API_KEY = rnd_xxxxx

☐ Go to your backend service
☐ Check URL: https://dashboard.render.com/services/srv_xxxxx
☐ SAVE: RENDER_SERVICE_ID = srv_xxxxx
```

### Slack (Optional)
```
☐ Go to https://api.slack.com/apps
☐ Create app → Add incoming webhooks
☐ SAVE: SLACK_WEBHOOK = https://hooks.slack...
```

---

## 🔐 Phase 2: Add GitHub Secrets (5 mins)

### Go to Your Repo
```
1. GitHub → Your Repo
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
```

### Add Each Secret
```
☐ VERCEL_TOKEN = (from phase 1)
☐ VERCEL_ORG_ID = (from phase 1)
☐ VERCEL_PROJECT_ID = (from phase 1)
☐ RENDER_API_KEY = (from phase 1)
☐ RENDER_SERVICE_ID = (from phase 1)
☐ SLACK_WEBHOOK = (from phase 1 - optional)
```

**Verify**: All should show green checkmarks

---

## 📝 Phase 3: Verify Workflow Files (2 mins)

Check files exist in your repo:

```
☐ .github/workflows/deploy-frontend.yml
   Location: Root of repo

☐ .github/workflows/deploy-backend.yml
   Location: Root of repo
```

If files don't exist:
```
1. Copy from GITHUB_ACTIONS_SETUP.md
2. Or run:
   git pull origin main
```

---

## 🧪 Phase 4: Test Deployment (10 mins)

### Create Test Branch
```bash
☐ git checkout -b test/auto-deploy
☐ echo "# Auto Deploy Test" >> README.md
☐ git add .
☐ git commit -m "test: trigger deployment"
☐ git push origin test/auto-deploy
```

### Create PR on GitHub
```
☐ Go to GitHub
☐ Click "Compare & pull request"
☐ Create PR
☐ Check Actions tab - should see workflow running
```

### Watch Deployment
```
☐ GitHub Actions → Click running workflow
☐ Watch "Deploy Frontend" and "Deploy Backend" steps
☐ Wait for completion (5-10 mins)
```

### Check Results
```
☐ Vercel: https://vercel.com/dashboard → See preview URL
☐ Render: https://dashboard.render.com → Check service
☐ GitHub: Actions tab → Should show green checkmark
```

### Merge and Deploy to Production
```bash
☐ Merge PR on GitHub (or locally):
   git checkout main
   git merge test/auto-deploy
   git push origin main

☐ Wait 5-10 minutes
☐ Verify at:
   - https://quickhire-frontend.vercel.app
   - https://quickhire-backend.onrender.com
```

---

## ✨ Summary

| Step | Time | Status |
|------|------|--------|
| Generate tokens | 10 mins | ☐ Done |
| Add GitHub secrets | 5 mins | ☐ Done |
| Verify workflow files | 2 mins | ☐ Done |
| Test deployment | 10 mins | ☐ Done |
| **Total** | **27 mins** | ☐ All Done! |

---

## 🎯 After Setup

### Everytime You Push:
```bash
git add .
git commit -m "your message"
git push origin main

# Sits back and watches it deploy! 🚀
```

### For Staging/Preview:
```bash
git checkout -b feature/my-feature
# Make changes
git push origin feature/my-feature
# Create PR on GitHub
# Vercel creates preview URL automatically
```

---

## 🆘 Quick Fixes

### Workflow Not Running?
```
1. Check secrets are added (green checkmarks)
2. Check branch is main or develop
3. Check file paths are correct
4. GitHub Repo → Actions → See error
```

### Deploy Failed?
```
1. Click failed workflow → See logs
2. Check if tokens are expired
3. Verify service IDs are correct
4. Check Vercel/Render dashboards
```

### Test Working But Production Fails?
```
1. PR (test) → Works on preview
2. Merge to main → Fails on production
3. Likely issue: Missing environment variables
4. Add to Vercel project settings (not just GitHub secrets)
```

---

## 💾 Save Your Tokens

Write down (in a secure place):
```
VERCEL_TOKEN: ___________________________
VERCEL_ORG_ID: ___________________________
VERCEL_PROJECT_ID: ___________________________
RENDER_API_KEY: ___________________________
RENDER_SERVICE_ID: ___________________________
```

---

## 📚 Useful Links

- [GitHub Secrets Docs](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vercel GitHub Integration](https://vercel.com/docs/git-integrations)
- [Render Deploy API](https://api-docs.render.com/#/reference/services/create-deploy)
