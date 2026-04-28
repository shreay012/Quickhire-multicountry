# Get RENDER_SERVICE_ID - Quick Action Guide

## 🚀 Get Your RENDER_SERVICE_ID in 30 Seconds

### Method 1: From Render Dashboard URL (Easiest)

```
1. Open: https://dashboard.render.com/services
   (Make sure you're logged in to Render)

2. Click on your backend service
   (It should be named: quickhire-backend)

3. Look at your browser's address bar
   You'll see something like:
   https://dashboard.render.com/services/srv_abc123def456ghi789jkl0

4. Copy the part that starts with "srv_"
   Example: srv_abc123def456ghi789jkl0
   (It's usually 24-28 characters long)

5. SEND THIS TO AGENT
```

### Visual Example:

```
BEFORE:
https://dashboard.render.com/services/srv_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
                                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                      This is your SERVICE ID

AFTER:
RENDER_SERVICE_ID = srv_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

## ✅ Complete Key List Ready to Add

Once you get the RENDER_SERVICE_ID above, you'll have all 5:

| # | Name | Value |
|---|------|-------|
| 1 | VERCEL_TOKEN | [Already collected] |
| 2 | VERCEL_ORG_ID | team_6YFtS1qijJAZjnuJjYRDwf35 |
| 3 | VERCEL_PROJECT_ID | prj_kUUBdsgS74g3YMYGqSVT0AIS19i5 |
| 4 | RENDER_API_KEY | rnd_uDah72TXjnNegwiPeV4A8sOYjpgv |
| 5 | RENDER_SERVICE_ID | [WAITING FOR YOU] ← Get from URL above |

---

## 🎯 Then What?

Once you send RENDER_SERVICE_ID:

```bash
1. I confirm all 5 keys ✓
2. You go to GitHub Settings → Secrets
3. Add all 5 secrets (copy/paste)
4. Push to main: git push origin main
5. Watch deployment happen! 🚀
6. Verify at:
   - https://quickhire-frontend.vercel.app
   - https://quickhire-backend.onrender.com
```

**Total time remaining: ~10 minutes**

---

## 💡 Pro Tip

If you already have your Render service, the SERVICE_ID is always visible in the URL. 
If you just deployed it today, you should have it open in another tab!

---

## ⏰ Ready? Send the RENDER_SERVICE_ID now!

Format when sending:
```
RENDER_SERVICE_ID: srv_xxxxxxxxxxxxxxxxxxxxx
```

Then we immediately complete the deployment setup! 🎉
