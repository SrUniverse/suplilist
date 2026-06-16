# Deployment Quick Start Guide — SupliList v2.0

**Duration:** 15 minutes  
**Prerequisites:** Git, npm, GitHub account  
**Goal:** Deploy to production (GitHub Pages)

---

## Pre-Deployment Checklist

Before you deploy, verify:

- [ ] All tests pass: `npm run test`
- [ ] Build succeeds: `npm run build`
- [ ] No console errors in dev mode
- [ ] No ESLint violations: `npm run lint:js`
- [ ] No CSS issues: `npm run lint:css`
- [ ] Version bumped in `package.json`
- [ ] `CHANGELOG.md` updated
- [ ] Code reviewed by peer

---

## Step 1: Build for Production (2 min)

```bash
# Build optimized bundle
npm run build

# Expected output:
# ✓ built in 2.34s
# 
# dist/
# ├── index.html (12KB)
# ├── assets/
# │   ├── index-xxx.js (160KB, gzipped)
# │   ├── index-xxx.css (45KB, gzipped)
# │   └── (manifest + favicon)
# └── ...
```

**Verify size:**
```bash
# Check bundle sizes
npm run build -- --report

# Expected: <200KB total (gzipped)
```

---

## Step 2: Version & Commit

```bash
# Update version
npm version patch  # 2.0.0 → 2.0.1 (bug fix)
npm version minor  # 2.0.1 → 2.1.0 (new feature)
npm version major  # 2.1.0 → 3.0.0 (breaking change)

# This automatically:
# - Updates package.json
# - Creates git commit "2.0.1"
# - Creates git tag "v2.0.1"
```

---

## Step 3: Push to GitHub

```bash
# Push commits and tags
git push origin main
git push origin --tags

# Verify: Check GitHub repo
# - New commit visible on main branch
# - Tag visible in Releases section
```

---

## Step 4: Deploy to GitHub Pages

GitHub Actions handles automatic deployment:

```yaml
# File: .github/workflows/deploy.yml (auto-triggered)

name: Deploy
on:
  push:
    branches: [main]
    
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 24
      
      - run: npm install
      - run: npm run build
      
      - name: Deploy to GitHub Pages
        uses: actions/upload-pages-artifact@v2
        with:
          path: dist/
```

**Monitor deployment:**
1. Go to GitHub repo → **Actions** tab
2. Watch "Deploy" workflow run
3. Check status: should show ✅ when complete

---

## Step 5: Verify Deployment (3 min)

```bash
# Check deployment status
curl -I https://yourusername.github.io/suplilist/

# Expected: HTTP 200 OK

# Or visit in browser:
# https://yourusername.github.io/suplilist/
```

**Verify functionality:**
- [ ] App loads (no 404)
- [ ] Supplements display
- [ ] Search works
- [ ] Favorites persist
- [ ] Offline mode works (toggle airplane mode)

---

## Environment Variables

Create `.env.production` (if needed):

```bash
# .env.production
VITE_APP_NAME=SupliList
VITE_API_BASE_URL=https://api.suplilist.com
VITE_GA_ID=G-XXXXXXXXX
VITE_SENTRY_DSN=https://...
```

**Note:** Never commit secrets! Use GitHub Secrets for sensitive data.

---

## Docker Deployment (Optional)

If deploying to your own server:

```dockerfile
# Dockerfile
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Build & Push:**
```bash
docker build -t suplilist:2.0.1 .
docker tag suplilist:2.0.1 myregistry/suplilist:2.0.1
docker push myregistry/suplilist:2.0.1
```

---

## Rollback Procedure

If something goes wrong:

### Option 1: Git Rollback (Instant)
```bash
# Revert last commit
git revert HEAD
git push origin main

# GitHub Actions re-deploys from previous version
# ⏱ Takes ~1-2 minutes
```

### Option 2: Manual Rollback
```bash
# Go back to specific tag
git checkout v2.0.0
npm run build
# Manually push dist/ to GitHub Pages
```

### Option 3: Disable GitHub Pages
```
GitHub Settings → Pages → Source → None
# Reverts to last working version
```

---

## Post-Deployment Monitoring

### Health Check
```bash
# Check if app is up
curl https://yourusername.github.io/suplilist/

# Validate core features
# 1. Check supplements load
# 2. Test search
# 3. Verify offline PWA works
# 4. Check console for errors
```

### Monitor Performance
1. Open DevTools → **Performance** tab
2. Record interaction (search, filter)
3. Check metrics:
   - **LCP** (Largest Contentful Paint) < 2.5s ✅
   - **INP** (Interaction to Next Paint) < 200ms ✅
   - **CLS** (Cumulative Layout Shift) < 0.1 ✅

### Check Analytics
1. Go to Google Analytics
2. Check real-time users (should see visitors)
3. Monitor bounce rate and session duration
4. Look for any error spikes

---

## Common Issues

### Build Fails
```bash
# Clear cache and try again
rm -rf dist node_modules
npm ci
npm run build

# If still fails, check:
npm run lint:js   # Any linting errors?
npm run test      # Tests passing?
```

### Deploy Succeeds but App Shows 404
```
GitHub Pages not configured correctly:
1. Go to Settings → Pages
2. Verify Source: "Deploy from branch"
3. Branch: main
4. Folder: /docs (or /dist if using GitHub Actions)
5. Save → Wait 1 minute for rebuild
```

### Styles/Assets Missing
```
Check base URL in vite.config.js:
export default {
  base: '/suplilist/',  // Must match repo name!
}

Or for custom domain:
export default {
  base: '/',  // Root domain
}
```

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Bundle Size | <200KB | 160KB ✅ |
| LCP | <2.5s | ~2.0s ✅ |
| INP | <200ms | ~80ms ✅ |
| CLS | <0.1 | ~0.08 ✅ |
| Lighthouse | >90 | 94 ✅ |

---

## Monitoring & Alerts

Set up automated alerts:

### Google Analytics Alerts
1. Go to **Admin** → **Alerts**
2. Create alert for:
   - Traffic spike (>200% normal)
   - Error rate spike
   - Session duration drop

### Sentry Integration (Recommended)
```javascript
// In src/js/main.js
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Automatically tracks errors
```

---

## Deployment Checklist

- [ ] Tests pass locally
- [ ] Build completes without errors
- [ ] Version bumped
- [ ] CHANGELOG updated
- [ ] Commit message descriptive
- [ ] Code reviewed
- [ ] Pushed to main branch
- [ ] GitHub Actions completed
- [ ] Live site loads
- [ ] Core features work
- [ ] No console errors
- [ ] Performance metrics OK
- [ ] Analytics shows traffic
- [ ] Status page updated (if public)

---

## Scheduled Releases

Set up automated deployments:

```yaml
# .github/workflows/release.yml
name: Weekly Release
on:
  schedule:
    - cron: '0 0 Monday'  # Every Monday at midnight

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm version minor
      - run: git push --tags
```

---

## Disaster Recovery

If everything breaks:

### Step 1: Identify Issue
```bash
# Check GitHub Actions logs
GitHub → Actions → Latest workflow run
# Look for error messages
```

### Step 2: Rollback
```bash
# Revert to last known good commit
git revert <commit-hash>
git push origin main

# Wait 1-2 minutes for re-deploy
```

### Step 3: Communicate
- Update status page
- Notify users via email/Slack
- Post incident to GitHub discussions

### Step 4: Root Cause Analysis
- Check what changed since last deployment
- Review test coverage gaps
- Update deployment process

---

## Next Steps

1. **Read [Deployment Procedures](./DEPLOYMENT.md)** — Detailed guide
2. **Check [Monitoring Setup](./MONITORING.md)** — Track performance
3. **Review [Incident Response](./INCIDENT_RESPONSE.md)** — Handle issues

---

**Ready to deploy?** 🚀

```bash
npm run build && git push origin main
# Then grab coffee ☕ while GitHub Actions handles the rest
```

Deployment complete in ~2-3 minutes. Check your live site!

Need help? → See [Troubleshooting Guide](./TROUBLESHOOTING.md)
