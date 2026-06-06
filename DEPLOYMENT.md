# Deployment Guide — SupliList

**Target Version**: 2.0 (Post-Security Audit)  
**Release Date**: 2026-06-07  
**Timeline**: 2-4 weeks to production

---

## Pre-Deployment Checklist

### Critical Security Fixes (REQUIRED)

- [x] C1: HTML sanitization implemented (sanitize-html library)
- [x] C2: Missing imports fixed (4 new imports added to email.js)
- [x] C3: JWT validation added to unsubscribe endpoints
- [x] C4: Base64 removal from database
- [x] C5: API key moved to secure getter function
- [x] C6: CORS configuration verified
- [x] C7: Magic bytes validation added to file uploads

### Dependencies to Install

```bash
cd backend
npm install sanitize-html@2.13.0
npm audit
```

### Environment Variables (Backend)

Create `.env` in backend root:

```env
# Email Service
RESEND_API_KEY=re_xxxxx_your_api_key_xxx
RESEND_FROM_EMAIL=noreply@suplilist.app
ADMIN_EMAIL=admin@suplilist.app

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/suplilist
DATABASE_NAME=suplilist

# JWT
JWT_SECRET=your_jwt_secret_key_here_change_in_prod
JWT_EXPIRATION=7d

# Photo Storage
PHOTO_STORAGE_TYPE=local  # or 's3' or 'cloudinary'
PHOTO_STORAGE_URL=/uploads/photos  # local storage path

# CORS
ALLOWED_ORIGINS=https://suplilist.app,https://app.suplilist.app

# Analytics
FIRECRAWL_API_KEY=fc_xxxxx_your_key_xxx

# Environment
NODE_ENV=production
PORT=3001
```

### Environment Variables (Frontend)

Create `.env.production` in frontend root:

```env
VITE_API_URL=https://api.suplilist.app
VITE_API_TIMEOUT=30000
REACT_APP_SHARE_URL=https://suplilist.app
REACT_APP_EMAIL_API_URL=/api/email

# Analytics (optional)
VITE_ANALYTICS_ENABLED=true
```

---

## Deployment Steps

### Step 1: Backend Setup (24h before)

```bash
# Install dependencies
cd backend
npm install

# Verify security fixes
npm audit
npm run build

# Run tests (must pass 100%)
npm test

# Check code quality
npm run lint
```

### Step 2: Database Migration (Staging)

```bash
# No breaking schema changes
# Photo model: only stores URLs (existing Base64 data ignored)
# Email log: unchanged schema

# Backup current database
mongodump --uri="$MONGODB_URI" --out=./backup-2026-06-06
```

### Step 3: Staging Deployment

```bash
# Deploy to staging environment
git push origin main
# Trigger staging CI/CD pipeline

# Verify endpoints
curl https://staging-api.suplilist.app/api/email/status
curl https://staging-api.suplilist.app/api/profile
```

### Step 4: Frontend Setup (24h before)

```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Verify no console.log statements
npm run lint
```

### Step 5: E2E Testing (Staging)

```bash
# Run E2E tests
npm run e2e:staging

# Manual testing checklist:
# - [ ] User login/signup works
# - [ ] Photo upload works (max 5MB)
# - [ ] Email sending works
# - [ ] Offline functionality works
# - [ ] Mobile responsive
# - [ ] All links work
```

### Step 6: Production Deployment (Friday AM)

```bash
# Only deploy after staging 100% pass
# Use blue-green deployment for zero downtime

# Backend
git tag v2.0
git push origin v2.0
# Trigger production CI/CD pipeline

# Frontend (after backend stable for 1 hour)
npm run build:prod
# Deploy to CDN/static hosting
```

### Step 7: Post-Deployment Validation

```bash
# Smoke tests on production
curl https://api.suplilist.app/api/email/status
curl https://api.suplilist.app/api/profile
curl https://suplilist.app

# Monitor error rates
# Check analytics dashboard
# Monitor API response times
```

---

## Rollback Procedure (Emergency)

If production issues occur:

```bash
# Immediately revert to previous version
git revert v2.0
git push origin main

# Redeploy v1.9
git checkout v1.9
npm run build:prod

# Notify team
# File incident postmortem

# Root cause: Check logs
# - API logs: /var/log/suplilist/api.log
# - Application logs: /var/log/suplilist/app.log
# - Database logs: MongoDB admin logs
```

---

## Post-Deployment Support (30 days)

### Week 1
- Monitor error rates 24/7
- Fix critical bugs same-day
- Check user feedback

### Week 2-3
- Monitor performance metrics
- Optimize slow queries
- Fix high-priority issues

### Week 4
- Full system health check
- Performance baseline established
- Ready for next sprint

---

## Known Issues & Workarounds

### None Currently

All 7 critical vulnerabilities fixed. All high-priority issues resolved.

---

## Performance Impact

- **Bundle Size**: No change (sanitize-html adds ~10KB minified)
- **Database**: Reduced (removing Base64 from photos)
- **API Response Time**: <100ms (no change)
- **Memory**: No change

---

## Breaking Changes

**None**. This deployment is 100% backward compatible.

- Old photos with Base64 data: Ignored (not used)
- Old JWT tokens: Still valid until expiration
- Old API calls: Still supported
- Database schema: No changes

---

## Success Criteria

Deployment is successful if:

- [ ] All 7 security fixes verified in production
- [ ] Error rate < 1%
- [ ] All E2E tests pass
- [ ] API response time < 200ms
- [ ] No user-facing errors
- [ ] Monitoring alerts configured
- [ ] Incident response team on-call

---

## Support

For deployment issues:
- **On-Call Engineer**: [oncall@suplilist.app](mailto:oncall@suplilist.app)
- **Slack**: #deployments
- **Incident**: #incidents

---

## Approval Sign-Off

- [ ] CTO: _______________  Date: _____
- [ ] Security Lead: _______________  Date: _____
- [ ] DevOps Lead: _______________  Date: _____
