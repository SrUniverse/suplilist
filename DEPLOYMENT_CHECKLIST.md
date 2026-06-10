# SupliList Deployment Checklist

Pre-deployment validation for all PHASE 1-4 stack components before going to production.

**Last Updated:** 2025-06-09  
**Version:** 1.0.0

---

## PHASE 1: Foundation Validation

### PostgreSQL Database

- [ ] PostgreSQL container is running (`docker compose ps postgresql`)
- [ ] Database version is 15+ (check: `psql --version`)
- [ ] All 11+ core tables are created:
  - [ ] `users`
  - [ ] `profiles`
  - [ ] `affiliate_links`
  - [ ] `products`
  - [ ] `categories`
  - [ ] `suppliers`
  - [ ] `checkins`
  - [ ] `favorites`
  - [ ] `audit_logs`
  - [ ] `sessions`
  - [ ] `settings`
- [ ] Connection pooling is configured (min 5, max 20 connections)
- [ ] Backup jobs are scheduled and tested
- [ ] Foreign key constraints are enabled
- [ ] Indexes are created on all lookup fields
- [ ] Database health check passes: `curl http://localhost:5000/health/db`
- [ ] Migrations have been executed: `npm run migrate`
- [ ] Initial seed data is loaded: `npm run seed:stage1 && npm run seed:stage2`

**Command to verify:**
```bash
npm run test:e2e -- phase1-validation.test.ts
```

---

### Redis Cache

- [ ] Redis container is running (`docker compose ps redis`)
- [ ] Redis version is 7+ (check: `redis-cli INFO server`)
- [ ] Memory allocation is at least 512MB: `redis-cli CONFIG GET maxmemory`
- [ ] Eviction policy is `allkeys-lru`: `redis-cli CONFIG GET maxmemory-policy`
- [ ] Persistence is configured (RDB + AOF)
- [ ] Connection pooling is configured for application
- [ ] Redis health check passes: `curl http://localhost:5000/health/redis`
- [ ] TTL is working: `redis-cli PEXPIRE test-key 5000`
- [ ] No stale keys are accumulating
- [ ] Memory usage is below 80% of max

**Command to verify:**
```bash
redis-cli PING  # Should return PONG
redis-cli INFO stats
```

---

### Docker Orchestration

- [ ] Docker version is 20.10+: `docker --version`
- [ ] Docker Compose version is 2.0+: `docker-compose --version`
- [ ] All containers are healthy: `docker compose ps`
  - [ ] `suplilist-postgres` - healthy
  - [ ] `suplilist-redis` - healthy
  - [ ] `suplilist-api` - healthy
  - [ ] `suplilist-prometheus` - healthy
  - [ ] `suplilist-grafana` - healthy
- [ ] Health checks are passing:
  ```bash
  docker compose exec postgresql pg_isready -U suplilist
  docker compose exec redis redis-cli ping
  ```
- [ ] Network connectivity: `docker compose exec api curl http://redis:6379/`
- [ ] Volume mounts are correct and writable
- [ ] No zombie or orphaned containers

**Command to verify:**
```bash
docker compose ps --all
```

---

## PHASE 2: JIT Endpoints

### Affiliate Endpoint

- [ ] Endpoint is accessible: `curl -X POST http://localhost:5000/api/affiliate/out -H "Content-Type: application/json" -d '{"url":"https://example.com","source":"amazon"}'`
- [ ] Accepts valid Amazon URLs
- [ ] Accepts valid Shopee URLs
- [ ] Accepts valid Mercado Livre URLs
- [ ] Rejects invalid sources (400 error)
- [ ] Rejects malformed URLs (400 error)
- [ ] Request validation is working

**Test Coverage:**
```bash
npm run test:e2e -- phase2-jit.test.ts --grep "Affiliate Endpoint"
```

---

### Rate Limiting (100 req/min)

- [ ] Rate limit headers are present: `X-RateLimit-Limit`
- [ ] Rate limit is set to 100: `X-RateLimit-Limit: 100`
- [ ] Rate limit counter decreases per request
- [ ] 429 Too Many Requests is returned when exceeded
- [ ] `Retry-After` header is present on 429 responses
- [ ] Rate limit window is 60 seconds
- [ ] Per-IP rate limiting is enforced
- [ ] Rate limit is applied to `/api/affiliate/out` endpoint

**Test Coverage:**
```bash
npm run test:e2e -- phase2-jit.test.ts --grep "Rate Limiting"
```

---

### Crawler Blocking

- [ ] Googlebot User-Agent is blocked (403)
- [ ] Bingbot User-Agent is blocked (403)
- [ ] Other common crawlers are blocked:
  - [ ] Amazonbot
  - [ ] MJ12bot
  - [ ] SEMrushBot
  - [ ] Ahrefs
- [ ] Normal browser User-Agents are allowed
- [ ] Crawler blocking doesn't break normal users

**Test Coverage:**
```bash
npm run test:e2e -- phase2-jit.test.ts --grep "Crawler Blocking"
```

---

### JIT Timeout (1s) & Fallback

- [ ] JIT timeout is set to 1 second
- [ ] 408 Request Timeout is returned when timeout occurs
- [ ] Fallback data is returned on timeout
- [ ] No requests hang indefinitely
- [ ] Timeout behavior is consistent

**Test Coverage:**
```bash
npm run test:e2e -- phase2-jit.test.ts --grep "JIT Timeout"
```

---

### Caching (24h TTL)

- [ ] Cache-Control header is present
- [ ] Cache max-age is set correctly (86400s = 24h)
- [ ] Cache hits are indicated in response headers
- [ ] Stale content is not served
- [ ] Cache is invalidated on data updates
- [ ] Conditional requests (If-Match, If-None-Match) work

**Test Coverage:**
```bash
npm run test:e2e -- phase2-jit.test.ts --grep "Caching"
```

---

## PHASE 3: Async Motor (BullMQ)

### Queue Management

- [ ] BullMQ is initialized
- [ ] Affiliate sync queue is created
- [ ] Queue accepts new jobs
- [ ] Queue status endpoint works: `GET /api/admin/queues`
- [ ] Queue retry logic is configured (minimum 3 retries)
- [ ] Max stale count is configured
- [ ] Dead letter queue exists for failed jobs

**Command to verify:**
```bash
curl http://localhost:5000/api/admin/queues
```

---

### Worker Job Processing

- [ ] Workers are running: `GET /api/admin/workers`
- [ ] Workers process jobs successfully
- [ ] Jobs move from pending -> processing -> completed
- [ ] Failed jobs are retried
- [ ] Worker logs are structured
- [ ] Job progress is trackable
- [ ] Worker respects timeout limits

**Commands:**
```bash
# Check worker status
curl http://localhost:5000/api/admin/workers

# Check job status
curl http://localhost:5000/api/jobs/{jobId}
```

---

### Deduplication

- [ ] Duplicate URLs are detected
- [ ] Deduplication window is 24h (configurable)
- [ ] Deduplication can be bypassed with `force: true`
- [ ] Duplicate detection doesn't cause false positives

**Test Coverage:**
```bash
npm run test:e2e -- phase3-async.test.ts --grep "Deduplication"
```

---

### IQR Filtering & Outlier Detection

- [ ] IQR is calculated correctly (Q1, Q3)
- [ ] Price outliers are detected
- [ ] Outliers are flagged in product data
- [ ] Lower/upper bounds are configurable
- [ ] Filtering is applied during worker processing
- [ ] Outlier thresholds are reasonable

**Command to verify:**
```bash
curl http://localhost:5000/api/products/analytics/iqr
```

---

### Seed Script Completion

- [ ] Seed stage 1 is complete: `curl http://localhost:5000/api/admin/seed-status/stage1`
- [ ] Seed stage 2 is complete: `curl http://localhost:5000/api/admin/seed-status/stage2`
- [ ] Seed data integrity verified: `curl http://localhost:5000/api/admin/seed-integrity`
- [ ] Total records are > 0
- [ ] No duplicate data in seed
- [ ] All required fields are populated

**Commands:**
```bash
npm run seed:stage1
npm run seed:stage2
npm run test:e2e -- phase3-async.test.ts --grep "Seed Script"
```

---

## PHASE 4: Telemetry & Monitoring

### Prometheus Metrics

- [ ] `/metrics` endpoint is accessible: `curl http://localhost:5000/metrics`
- [ ] Metrics are in Prometheus format (text/plain, # HELP, # TYPE)
- [ ] HTTP request counter (`http_requests_total`) is tracked
- [ ] HTTP request duration histogram is tracked
- [ ] Error rate metrics are tracked
- [ ] Memory usage metrics are collected
- [ ] Process uptime is tracked
- [ ] Custom business metrics are exported
- [ ] Queue statistics are exported

**Command to verify:**
```bash
curl http://localhost:5000/metrics | head -30
```

---

### Prometheus Server

- [ ] Prometheus container is running
- [ ] Prometheus can scrape targets: `http://localhost:9090/api/v1/targets`
- [ ] API endpoint is in active targets
- [ ] Metrics are being collected: `http://localhost:9090/api/v1/query?query=up`
- [ ] Retention period is configured (15d minimum)
- [ ] Service discovery is working

**Commands:**
```bash
curl http://localhost:9090/api/v1/targets
curl http://localhost:9090/api/v1/query?query=http_requests_total
```

---

### Grafana Dashboards

- [ ] Grafana container is running
- [ ] Grafana is accessible: `http://localhost:3000`
- [ ] Default admin password is changed
- [ ] Prometheus datasource is configured
- [ ] SupliList dashboard is provisioned
- [ ] Dashboard displays real-time metrics
- [ ] Alerts are visible in dashboard

**Commands:**
```bash
curl http://localhost:3000/api/health
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/datasources
```

---

### Alerting Rules

- [ ] High error rate alert is configured (> 5% errors)
- [ ] High latency alert is configured (p95 > 1s)
- [ ] Resource exhaustion alerts exist:
  - [ ] Memory > 80%
  - [ ] CPU > 80%
  - [ ] Disk > 85%
- [ ] Queue health alerts exist:
  - [ ] Queue stalled for > 5 min
  - [ ] Failed job count > 100
- [ ] Alert severity levels are set:
  - [ ] Critical (page immediately)
  - [ ] Warning (notify)
  - [ ] Info (log only)

**Command to verify:**
```bash
curl http://localhost:9090/api/v1/rules
```

---

### Structured Logging

- [ ] Application logs are JSON formatted
- [ ] Logs include trace IDs
- [ ] Logs include request/response context:
  - [ ] HTTP method
  - [ ] Path
  - [ ] Status code
  - [ ] Response time
- [ ] Sensitive data is redacted:
  - [ ] No passwords in logs
  - [ ] No API keys in logs
  - [ ] No auth tokens in logs
- [ ] Error stack traces are included
- [ ] Log level is set to INFO (production)

**Command to verify:**
```bash
docker compose logs api | head -20
```

---

### Monitoring Dashboard Health

- [ ] Key metrics are visible
- [ ] Health metrics are accurate
- [ ] Error metrics reflect actual errors
- [ ] All critical paths are instrumented

---

## Pre-Deployment Verification

### Code Quality

- [ ] No console.log statements in production code
- [ ] TypeScript compilation succeeds: `npm run build`
- [ ] ESLint passes: `npm run lint:js`
- [ ] CSS linting passes: `npm run lint:css`
- [ ] All tests pass: `npm test`
- [ ] E2E tests pass: `npm run test:e2e`

### Security

- [ ] All dependencies are up-to-date: `npm audit`
- [ ] No critical vulnerabilities: `npm audit --audit-level=moderate`
- [ ] CORS is properly configured
- [ ] CSRF protection is enabled
- [ ] Security headers are present: Helmet.js
- [ ] Rate limiting is enforced
- [ ] Input validation is implemented
- [ ] SQL injection prevention is working (parameterized queries)
- [ ] XSS protection is enabled
- [ ] HTTPS is enforced (in production)

### Configuration

- [ ] Environment variables are set:
  - [ ] `NODE_ENV=production`
  - [ ] `DATABASE_URL` is correct
  - [ ] `REDIS_URL` is correct
  - [ ] `METRICS_ENABLED=true`
  - [ ] `FRONTEND_ORIGIN` is set
- [ ] Secrets are not in code:
  - [ ] No hardcoded API keys
  - [ ] No hardcoded credentials
  - [ ] Secrets are in .env or secret manager
- [ ] Log level is appropriate for environment
- [ ] Timezone is set correctly (UTC)

### Documentation

- [ ] README is up-to-date
- [ ] API documentation is complete
- [ ] Deployment guide is accurate
- [ ] Runbook for common issues exists
- [ ] Architecture documentation is current

---

## Deployment Steps

### 1. Pre-Deployment (24 hours before)

```bash
# Run full test suite
npm run test:e2e

# Check code quality
npm run build
npm run lint:js
npm run lint:css

# Verify no critical vulnerabilities
npm audit
```

### 2. Final Validation (before deploy)

```bash
# Run PHASE 1 tests
npm run test:e2e -- phase1-validation.test.ts

# Verify all containers are healthy
docker compose ps

# Check recent logs for errors
docker compose logs --tail=50 api
```

### 3. Deployment

```bash
# Build and push images to registry
docker compose build
docker compose push

# Deploy to production
# (Use your deployment tool: Render, Vercel, AWS, etc.)

# Verify deployment
curl https://api.suplilist.com/health
npm run test:e2e -- complete-integration.test.ts
```

### 4. Post-Deployment (first 24 hours)

```bash
# Monitor key metrics
# - Error rate < 1%
# - Response time p95 < 500ms
# - Queue processing latency < 2s

# Check logs for errors
docker compose logs api | grep -i error

# Verify all PHASE tests pass
npm run test:e2e

# Monitor with Grafana dashboard
# Open: http://grafana.suplilist.com
```

---

## Rollback Criteria

Deploy should be rolled back if:

- [ ] Error rate exceeds 5% for > 5 minutes
- [ ] Response time p95 exceeds 5 seconds
- [ ] Database connectivity is lost
- [ ] Redis connectivity is lost
- [ ] Critical alerts are firing
- [ ] Queue is backed up (> 10,000 jobs)
- [ ] Memory usage exceeds 90%

### Rollback Command

```bash
# Switch to previous version
docker compose down
git checkout previous-version
docker compose up -d

# Verify rollback
npm run test:e2e -- complete-integration.test.ts
```

---

## Sign-Off

- [ ] QA Lead: ___________________ Date: ___________
- [ ] Backend Lead: ___________________ Date: ___________
- [ ] DevOps Lead: ___________________ Date: ___________
- [ ] Product Owner: ___________________ Date: ___________

---

## Notes & Observations

(Space for notes from deployment)

_____________________________________________________________________

_____________________________________________________________________

_____________________________________________________________________
