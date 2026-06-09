# SupliList Supplement Pricing — Operations Guide

**Quick Reference for DevOps, SRE, and On-Call Engineers**

---

## System Health Checks (5 minutes)

```bash
# 1. API is responding
curl -s http://localhost:3000/health | jq .

# Expected:
# {
#   "status": "healthy",
#   "timestamp": "2026-06-08T...",
#   "uptime": 86400
# }

# 2. MongoDB is connected
curl -s http://localhost:3000/api/supplements/search?q=creatina | jq .success

# Expected: true

# 3. Supplements are in database
curl -s http://localhost:3000/api/supplements/search?q=proteina | jq '.data | length'

# Expected: > 0 (if crawled before) or 0 (if first run)

# 4. Prices have affiliate codes
curl -s http://localhost:3000/api/supplements/prices?ids=creatina | jq '.' | grep -E 'amazon|mercadolivre|shopee'

# Expected: All affiliate codes present in URLs
```

---

## Daily Operations

### Morning (After 02:00 UTC Crawl)

```bash
# Check if yesterday's crawl succeeded
tail -100 /var/log/suplilist.log | grep -E 'Daily supplement crawl|✓'

# Expected output:
# [Scheduler] Starting daily supplement crawl...
# [FirecrawlService] Scraping (attempt 1): https://www.amazon.com.br/s?k=suplementos
# [FirecrawlService] Found: Creatina @ R$59.99 (amazon)
# [SupplementService] ✓ amazon crawled (120 items)
# [SupplementService] ✓ mercadolivre crawled (89 items)
# [SupplementService] ✓ shopee crawled (156 items)
# [Scheduler] Daily supplement crawl completed

# If missing or errors, check:
tail -50 /var/log/suplilist.log | grep -E 'Error|ERROR|Failed'
```

### When Users Report "No Prices Shown"

```bash
# Step 1: Check if any supplements exist
mongo --eval "db.supplements_data.count()" $MONGO_URI

# Expected: > 100 (after first crawl)

# Step 2: Check if recent data
mongo --eval "
  db.supplements_data.findOne(
    {},
    {lastCrawled: 1}
  )
" $MONGO_URI

# Expected: lastCrawled within last 24 hours

# Step 3: If empty, trigger manual crawl
curl -X POST http://localhost:3000/api/supplements/crawl-on-demand \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"supplementName": "creatina"}'

# Then wait 2 minutes for crawl to complete
sleep 120

# Step 4: Verify
curl -s http://localhost:3000/api/supplements/search?q=creatina | jq '.data | length'
```

### Affiliate Link Verification (Monthly)

```bash
# Ensure affiliate codes are still in URLs
for market in amazon mercadolivre shopee; do
  echo "Checking $market..."
  curl -s "http://localhost:3000/api/supplements/search?q=creatina" \
    | grep -o "https://[^\"]*" \
    | grep $market \
    | head -1
done

# Expected:
# https://www.amazon.com.br/s?k=creatina&tag=suplilist01-20
# https://lista.mercadolivre.com.br/FULZ93-PCG7/creatina
# https://shopee.com.br/search?keyword=creatina&affid=CLH-CZB-PNR
```

---

## Troubleshooting Decision Tree

### "API returns 500 error"

```bash
# 1. Check if MongoDB is accessible
mongo --eval "db.adminCommand('ping')" $MONGO_URI

# If error: MongoDB connection issue
#   → Check MONGO_URI in env vars
#   → Check IP whitelist in MongoDB Atlas
#   → Check network connectivity (firewalls, VPN)

# 2. Check recent logs
tail -50 /var/log/suplilist.log | grep ERROR

# 3. Check if service is crashing
pm2 logs suplilist | tail -50

# If shows "ECONNREFUSED": MongoDB not running
#   → Restart MongoDB: systemctl restart mongod
```

### "Prices are not updating (stale data)"

```bash
# 1. Check scheduler is running
tail -20 /var/log/suplilist.log | grep -E 'Scheduler|Daily supplement'

# If not present: Scheduler crashed
#   → Check NODE_ENV is NOT 'test'
#   → Restart service: pm2 restart suplilist

# 2. Check Firecrawl API quota
curl -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  https://api.firecrawl.dev/v1/status

# If quota exceeded:
#   → Wait until quota resets (usually 24h)
#   → Or upgrade to paid plan

# 3. Force manual crawl to verify system works
curl -X POST http://localhost:3000/api/supplements/crawl-on-demand \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"supplementName": "creatina"}'

# Wait 2 minutes, then check:
curl -s http://localhost:3000/api/supplements/search?q=creatina | jq '.data[0].lastCrawled'
```

### "Database getting too large"

```bash
# Check current size
mongo --eval "db.supplements_data.stats()" $MONGO_URI | grep size

# Check if TTL index is working
mongo --eval "
  db.supplements_data.aggregate([
    { \$group: { _id: null, count: { \$sum: 1 } } }
  ])
" $MONGO_URI

# If still growing despite TTL:
#   → Recreate TTL index
mongo --eval "
  db.supplements_data.dropIndex('createdAt_1');
  db.supplements_data.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 172800 }
  );
" $MONGO_URI
```

---

## Performance Tuning

### Slow Search Queries

```bash
# Identify slow queries
mongo --eval "
  db.setProfilingLevel(1, { slowms: 100 });
  db.system.profile.find({ millis: { \$gt: 100 } }).pretty()
" $MONGO_URI

# Add index if missing
mongo --eval "
  db.supplements_data.createIndex(
    { name: 'text' },
    { default_language: 'portuguese' }
  );
" $MONGO_URI
```

### High API Latency

```bash
# Check MongoDB response times
time mongo --eval "
  db.supplements_data.findOne({ name: /creatina/i });
" $MONGO_URI

# Expected: < 50ms for indexed queries

# If slow:
#   → Add Redis cache layer
#   → Or create read-only replica
```

---

## Backup & Restore

### Backup Supplement Data

```bash
# Backup supplements_data collection
mongodump \
  --uri="$MONGO_URI" \
  --collection=supplements_data \
  --out=/backups/suplilist-$(date +%Y%m%d)

# Tar for storage
tar -czf /backups/suplilist-supplements-$(date +%Y%m%d).tar.gz \
  /backups/suplilist-$(date +%Y%m%d)
```

### Restore from Backup

```bash
# Extract backup
tar -xzf /backups/suplilist-supplements-20260605.tar.gz

# Restore to database
mongorestore \
  --uri="$MONGO_URI" \
  /backups/suplilist-20260605
```

---

## Common Environment Issues

### Issue: "Firecrawl API key invalid"

```bash
# Test API key
curl -X POST https://api.firecrawl.dev/v1/scrape \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "formats": ["markdown"]}'

# If 401: Key is invalid or expired
#   → Generate new key from https://firecrawl.dev/dashboard
#   → Update FIRECRAWL_API_KEY env var
#   → Restart service

# If 429: Quota exceeded
#   → Wait 24h for quota reset
#   → Or upgrade Firecrawl plan
```

### Issue: "MongoDB connection timeout"

```bash
# Check connection string
echo $MONGO_URI

# Should be: mongodb+srv://user:pass@cluster.mongodb.net/suplilist

# Test connectivity
nc -zv $(echo $MONGO_URI | cut -d/ -f3 | cut -d: -f1) 27017

# If connection refused:
#   → IP not whitelisted: Add server IP to MongoDB Atlas
#   → Firewall blocking: Check security group rules
#   → Network issue: Try from different network
```

### Issue: "Process keeps restarting"

```bash
# Check PM2 logs
pm2 logs suplilist --err | head -50

# If "out of memory":
#   → Increase Node.js heap: export NODE_OPTIONS="--max-old-space-size=1024"
#   → Or restart to clear memory leaks

# If "SIGTERM received":
#   → Normal graceful shutdown, should be brief
#   → Check if taking > 30 seconds: May have hanging connections

# To monitor memory usage
pm2 monit suplilist
```

---

## Monitoring Checklist (Weekly)

```bash
# ✅ 1. Crawl success rate
mongo --eval "
  db.supplements_data.aggregate([
    {
      \$group: {
        _id: null,
        lastHourCount: {
          \$sum: {
            \$cond: [
              { \$gt: ['\$lastCrawled', new Date(new Date().getTime() - 3600000)] },
              1, 0
            ]
          }
        }
      }
    }
  ])
" $MONGO_URI

# Expected: > 50 supplements updated in last hour

# ✅ 2. Price data freshness
mongo --eval "
  db.supplements_data.find(
    { lastCrawled: { \$lt: new Date(new Date().getTime() - 86400000) } }
  ).count()
" $MONGO_URI

# Expected: < 10 stale supplements

# ✅ 3. Affiliate links integrity
curl -s http://localhost:3000/api/supplements/prices?ids=creatina \
  | jq '.data.creatina.prices[] | select(.url | test("suplilist|FULZ93|CLH-CZB"))'

# Expected: All URLs contain affiliate codes

# ✅ 4. API error rate
grep -c ERROR /var/log/suplilist.log

# Expected: < 5 errors per day
```

---

## Incident Response

### If Scheduler Stops Working

```bash
# 1. Check if process is running
pm2 list | grep suplilist

# 2. If red/crashed, restart
pm2 restart suplilist

# 3. Check scheduler logs
pm2 logs suplilist | grep -i scheduler | tail -20

# 4. Manually trigger crawl as temporary fix
curl -X POST http://localhost:3000/api/supplements/crawl-on-demand \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"supplementName": "creatina"}'

# 5. Create PagerDuty incident for root cause analysis
```

### If Firecrawl API is Down

```bash
# 1. Check Firecrawl status
curl -s https://api.firecrawl.dev/v1/status

# 2. If down, temporarily disable crawls
# Edit server.ts to skip scheduler:
# // const scheduler = SchedulerService.getInstance();
# // await scheduler.initialize();

# 3. API will still return cached data from last successful crawl

# 4. Wait for Firecrawl to recover, then restart service
```

### If Database Fills Up

```bash
# 1. Check size
mongo --eval "db.supplements_data.stats()" $MONGO_URI

# 2. Manually trigger TTL cleanup
mongo --eval "
  db.supplements_data.deleteMany({
    createdAt: { \$lt: new Date(new Date().getTime() - 172800000) }
  });
" $MONGO_URI

# 3. If still full, increase MongoDB storage plan
# Or reduce TTL from 48h to 24h:
# supplementDataSchema.index(..., { expireAfterSeconds: 86400 })
```

---

## Escalation Contacts

| Issue | Contact | Response Time |
|-------|---------|----------------|
| Firecrawl API down | Firecrawl Support | 1 hour |
| MongoDB Atlas down | MongoDB Support | 15 min |
| Memory/CPU spike | DevOps Team | 30 min |
| Price data stale | Engineering Team | 4 hours |
| Affiliate links broken | Product Team | 24 hours |

---

## Quick Commands Cheat Sheet

```bash
# Service management
pm2 start suplilist          # Start service
pm2 stop suplilist           # Stop service
pm2 restart suplilist        # Restart service
pm2 logs suplilist -f        # Watch logs

# Database
mongo $MONGO_URI             # Connect to MongoDB
db.supplements_data.count()  # Count supplements
db.supplements_data.drop()   # ⚠️ DANGER: Delete all data

# API testing
curl http://localhost:3000/health                      # Health check
curl "http://localhost:3000/api/supplements/search?q=creatina"  # Search
curl "http://localhost:3000/api/supplements/prices?ids=creatina,whey"  # Bulk prices

# Environment
echo $MONGO_URI              # Show MongoDB URI
echo $FIRECRAWL_API_KEY      # Show Firecrawl key
env | grep -E 'MONGO|FIRE'   # Show all supplement env vars
```

---

**Last Updated**: June 8, 2026  
**For questions**: Contact Engineering Team  
**Runbook Location**: `/docs/operations/supplement-pricing.md`
