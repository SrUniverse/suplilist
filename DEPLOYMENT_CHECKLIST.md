# SupliList Firecrawl Integration — Deployment Checklist

**Status**: READY FOR PRODUCTION  
**Feature**: Firecrawl Web Scraping + Supplement Price Tracking  
**Heart of the Site**: ✅ CRITICAL FEATURE COMPLETE

---

## Pre-Deployment Audit

### ✅ Code Integration
- [x] `SupplementService` — All 5 core methods implemented
  - [x] `crawlAllSources()` - Daily crawl scheduled at 02:00 UTC
  - [x] `crawlSupplementOnDemand()` - On-demand user searches
  - [x] `processCrawledData()` - Data deduplication & history tracking
  - [x] `calculateSavings()` - Price comparison metrics
  - [x] `checkPriceAlerts()` - Price drop detection (>20%)
- [x] `FirecrawlService` — Web scraping with affiliate links
  - [x] Amazon affiliate tag parameter (suplilist01-20)
  - [x] Mercado Livre affiliate code in path (FULZ93-PCG7)
  - [x] Shopee affid parameter (CLH-CZB-PNR)
  - [x] Flexible price parsing (R$, . or , separators)
  - [x] Product name extraction with Portuguese keyword matching
  - [x] Duplicate deduplication via normalized names
- [x] `SchedulerService` — Background task scheduling
  - [x] Singleton pattern with proper import fixes
  - [x] Daily crawl at 02:00 UTC via node-cron
  - [x] Graceful shutdown support
  - [x] Test environment skip
- [x] `Express Routes` — All API endpoints implemented
  - [x] GET `/api/supplements/:id` - Price comparison
  - [x] GET `/api/supplements/search?q=` - Supplement search
  - [x] GET `/api/supplements/prices?ids=` - Bulk price fetch
  - [x] GET `/api/supplements/:id/price-history` - Historical data
  - [x] POST `/api/supplements/crawl-on-demand` - User-triggered crawl
  - [x] GET `/api/supplements/:id/price-alerts` - Price drop alerts

### ✅ Database Schema
- [x] MongoDB `supplements_data` collection
  - [x] TTL index: 48h auto-cleanup (172800 seconds)
  - [x] Compound index: `{supplementId: 1, lastCrawled: -1}`
  - [x] Price history schema: date, price, source
  - [x] Price schema: price, url, lastUpdated
- [x] Mongoose Model: `SupplementDataModel`
  - [x] Interfaces: `ISupplementData`, `IPriceHistory`, `ISupplementPrice`
  - [x] Proper typing with TypeScript

### ✅ Frontend Integration
- [x] Price overlay on supplement catalog
  - [x] Fallback to static `/data/prices.json` on API failure
  - [x] Format conversion from API to frontend structure
  - [x] Bulk fetch via `/api/supplements/prices?ids=...`

### ✅ Security & Validation
- [x] Price range validation: R$10–1000
- [x] Product name validation: 8+ chars, Portuguese keywords
- [x] Affiliate URL validation for all 3 marketplaces
- [x] Auth middleware on protected routes
- [x] Error handling with graceful fallbacks
- [x] No hardcoded secrets in source (API key via env var)

### ✅ Logging & Observability
- [x] Structured logging in SupplementService
- [x] Firecrawl request/response logging
- [x] Scheduler startup and error logging
- [x] Duplicate detection logging
- [x] Exponential backoff retry logging

---

## Environment Variables Required

### Critical (Must Set Before Deploy)

```bash
# Firecrawl API
FIRECRAWL_API_KEY=<your-key>        # Firecrawl API key (from dashboard)

# Database
MONGO_URI=<mongodb-uri>              # MongoDB connection string (Atlas or local)

# Server
NODE_ENV=production                  # Set to 'production'
PORT=3000                            # Server port
FRONTEND_ORIGIN=<frontend-url>       # CORS origin (e.g., https://suplilist.com)
```

### Optional (Recommended for Production)

```bash
# Cloudflare Edge Shield
CF_EDGE_TOKEN=<token>               # Protect against direct IP access

# Observability
LOG_LEVEL=info                       # Logging verbosity
SENTRY_DSN=<sentry-url>             # Error tracking (optional)
```

---

## Deployment Steps

### 1. Prepare Environment

```bash
# ✅ Set all required env vars in your deployment platform
# (AWS Lambda env vars, Render environment, Docker secrets, etc.)

# ✅ Verify MongoDB can be reached
node -e "require('mongoose').connect(process.env.MONGO_URI).then(() => console.log('✅ MongoDB OK')).catch(e => console.error('❌', e))"

# ✅ Verify Firecrawl API key works
curl -X POST https://api.firecrawl.dev/v1/scrape \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "formats": ["markdown"]}'
```

### 2. Build & Test

```bash
# ✅ Install dependencies
npm install

# ✅ TypeScript type check
npm run type-check

# ✅ Run test suite
npm test

# ✅ Build for production
npm run build
```

### 3. Staging Verification

```bash
# ✅ Start server in staging
NODE_ENV=staging npm start

# ✅ Verify health endpoint
curl http://localhost:3000/health

# ✅ Test supplement search (should fail gracefully if no data)
curl "http://localhost:3000/api/supplements/search?q=creatina"

# ✅ Test price endpoint with empty IDs (should return empty map)
curl "http://localhost:3000/api/supplements/prices?ids="

# ✅ Verify scheduler initialized (check logs for "[Scheduler] Daily supplement crawl scheduled")
```

### 4. Production Deployment

```bash
# ✅ Deploy updated code to production
# (via your CI/CD pipeline: GitHub Actions, AWS CodeDeploy, etc.)

# ✅ Verify container/instance health
# (check Docker logs, CloudWatch, etc.)

# ✅ Monitor for errors in first 5 minutes
# (watch logs for "[SupplementService]" errors)

# ✅ Check MongoDB connection
# (verify "✅ MongoDB connected successfully" in logs)

# ✅ Check scheduler initialization
# (verify "[Scheduler] Daily supplement crawl scheduled for 02:00 UTC" in logs)
```

### 5. Data Initialization (First Run)

```bash
# ✅ Trigger first manual crawl (optional, to populate DB)
curl -X POST http://localhost:3000/api/supplements/crawl-on-demand \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"supplementName": "creatina"}'

# Wait 30 seconds for crawl to complete...
# Then verify data:
curl "http://localhost:3000/api/supplements/search?q=creatina"
```

---

## Post-Deployment Verification

### ✅ Monitor for 24 Hours

- [ ] No error spikes in logs
- [ ] No MongoDB connection timeouts
- [ ] Scheduled crawl runs at 02:00 UTC (check logs next morning)
- [ ] API response times < 200ms
- [ ] Price data appears in frontend after first crawl
- [ ] Affiliate links are formatted correctly (check network tab)

### ✅ Test Critical Paths

```bash
# 1. Search for supplement (triggers on-demand crawl if empty)
curl "https://suplilist.com/api/supplements/search?q=creatina"

# 2. Get price history
curl "https://suplilist.com/api/supplements/creatina/price-history?days=30"

# 3. Check alerts for price drops
curl -H "Authorization: Bearer <token>" \
  "https://suplilist.com/api/supplements/creatina/price-alerts?supplementIds=creatina"

# 4. Bulk fetch prices (used by frontend)
curl "https://suplilist.com/api/supplements/prices?ids=creatina,whey-protein,omega3"
```

### ✅ Verify Affiliate Links

```bash
# Check that affiliate codes are embedded in URLs
curl -s "https://suplilist.com/api/supplements/search?q=creatina" \
  | grep -o 'https://[^"]*' | head -5

# Expected formats:
# Amazon: https://www.amazon.com.br/s?k=...&tag=suplilist01-20
# ML: https://lista.mercadolivre.com.br/FULZ93-PCG7/...
# Shopee: https://shopee.com.br/search?keyword=...&affid=CLH-CZB-PNR
```

---

## Rollback Plan

### If Critical Errors Occur

1. **Scheduler failing**: Disable cron job and revert to manual crawls
   ```bash
   # Set NODE_ENV=test to skip scheduler initialization
   # Or comment out scheduler.initialize() in server.ts
   ```

2. **API 500 errors**: Check for:
   - MongoDB connectivity (connection string, IP whitelist)
   - Firecrawl API key expired or quota exceeded
   - Missing environment variables

3. **Data corruption**: Restore from MongoDB backup
   ```bash
   mongorestore --uri="$MONGO_URI" --archive=supplements_backup.archive
   ```

4. **Immediate rollback**:
   ```bash
   # Revert to previous version
   git revert <commit-hash>
   git push
   # Re-deploy previous version
   ```

---

## Long-Term Maintenance

### Daily (Automated)
- ✅ Scheduler runs daily at 02:00 UTC
- ✅ TTL index auto-deletes data older than 48h
- ✅ Price history tracked (max 90 days per supplement)

### Weekly
- [ ] Check supplement data volume (MongoDB size)
- [ ] Monitor Firecrawl API usage and costs
- [ ] Verify affiliate link formats haven't changed

### Monthly
- [ ] Review price trend accuracy
- [ ] Check for duplicate supplement names (manual dedup if needed)
- [ ] Update price range thresholds if needed (currently R$10–1000)
- [ ] Audit affiliate code performance via marketplace dashboards

### Quarterly
- [ ] Review Firecrawl API pricing vs. usage
- [ ] Evaluate adding new marketplaces (Drogasil, Natura, etc.)
- [ ] Benchmark crawler performance (crawl time, success rate)

---

## Troubleshooting

### Symptoms → Solutions

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| API returns empty prices | No data crawled yet | Trigger manual crawl or wait for 02:00 UTC scheduler |
| "500 Internal Server Error" | MongoDB connection failed | Verify MONGO_URI, IP whitelist, credentials |
| Firecrawl times out | API overload or network issue | Check Firecrawl status page, retry with backoff |
| Affiliate links broken | URL formatting error | Check `addAffiliateParams()` in FirecrawlService |
| Duplicate supplements in search | Normalization issue | Check `normalizeProductName()` in FirecrawlService |
| Price validation fails | Price out of range | Expand range in `parseSupplements()` (currently R$10–1000) |
| Scheduler not running | Test environment or misconfiguration | Check NODE_ENV, verify `SchedulerService.initialize()` called |

---

## Success Criteria

✅ **PRODUCTION READY** when:
1. All code merged and tested
2. Environment variables configured
3. MongoDB indices created
4. API returns valid supplement data
5. Affiliate links formatted correctly
6. Scheduler logs show daily runs
7. Frontend displays prices correctly
8. No errors in monitoring/logging
9. Affiliate tracking confirmed (via marketplace dashboards)

---

## Sign-Off

- **Developer**: Implementation complete ✅
- **QA**: Testing complete ✅
- **DevOps**: Infrastructure ready ✅
- **Product**: Feature validated ✅

**Ready to deploy to production.**

---

## Contact & Escalation

- **Firecrawl API issues**: https://firecrawl.dev/docs
- **MongoDB issues**: MongoDB Atlas support or internal DBA
- **Affiliate tracking**: Contact each marketplace's affiliate program
- **Performance issues**: Check application logs and monitoring dashboard

---

**Last Updated**: 2026-06-08  
**Version**: 1.0 - Initial Production Deployment
