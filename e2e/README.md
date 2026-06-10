# SupliList E2E Test Suite

Comprehensive end-to-end testing for the complete SupliList stack covering **PHASE 1-4** validation.

## Overview

This test suite validates the entire application stack across four critical phases:

- **PHASE 1**: Foundation (PostgreSQL, Redis, Docker)
- **PHASE 2**: JIT Endpoints (Rate limiting, Caching, Fallback)
- **PHASE 3**: Async Motor (BullMQ, Deduplication, IQR Filtering)
- **PHASE 4**: Telemetry (Prometheus, Grafana, Alerts, Logs)

## Quick Start

### Prerequisites

- Node.js 24+ installed
- Docker and Docker Compose running
- API server running on `http://localhost:5000` (or set `API_URL` env var)

### Installation

```bash
npm install
```

### Running Tests

```bash
# Run all tests
npm run test:e2e

# Run specific test suite
npm run test:e2e -- phase1-validation.test.ts
npm run test:e2e -- phase2-jit.test.ts
npm run test:e2e -- phase3-async.test.ts
npm run test:e2e -- phase4-telemetry.test.ts

# Run complete integration tests only
npm run test:e2e -- complete-integration.test.ts

# Run with specific grep pattern
npm run test:e2e -- --grep "Rate Limiting"

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run with specific number of workers
npm run test:e2e -- --workers=1
```

## Test Structure

### Files

- **`complete-integration.test.ts`** - Full stack integration tests covering all phases
- **`phase1-validation.test.ts`** - Foundation validation (DB, Redis, Docker health)
- **`phase2-jit.test.ts`** - JIT endpoint validation (Rate limiting, Caching, Timeouts)
- **`phase3-async.test.ts`** - Async motor validation (BullMQ, Workers, IQR)
- **`phase4-telemetry.test.ts`** - Telemetry validation (Prometheus, Grafana, Alerts)

### Test Timeout

Each test has a **30-second timeout**. Tests are configured with:
- Global timeout: 30s per test
- Assertion timeout: 5s per assertion
- HTTP request timeout: 30s

Adjust in `playwright.config.ts` if needed.

## Environment Variables

```bash
# API endpoint
API_URL=http://localhost:5000

# Monitoring endpoints
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:3000

# Optional credentials
GRAFANA_TOKEN=<your-grafana-api-token>
AFFILIATE_KEY=<your-affiliate-key>
```

## Test Coverage

### PHASE 1: Foundation (12 tests)

```
✓ Docker healthcheck: API is responsive
✓ PostgreSQL connectivity
  - Database health check
  - Database version check
  - Database tables existence
  - Connection pooling
✓ Redis cache
  - Redis health check
  - Redis configuration (512MB, allkeys-lru)
  - Key-value operations
  - TTL expiration
✓ Container orchestration
  - All services running
  - Network connectivity
  - Docker Compose version
```

**Run:**
```bash
npm run test:e2e -- phase1-validation.test.ts
```

### PHASE 2: JIT Endpoints (20+ tests)

```
✓ Affiliate endpoint
  - Amazon URL support
  - Shopee URL support
  - Mercado Livre URL support
  - Validation (invalid sources, malformed URLs)
✓ Rate limiting (100 req/min)
  - Rate limit headers (X-RateLimit-*)
  - Counter decrements
  - 429 Too Many Requests enforcement
  - Retry-After header
✓ Crawler blocking
  - Googlebot blocked
  - Bingbot blocked
  - Normal browsers allowed
✓ JIT timeout (1s) + fallback
  - Timeout enforcement
  - 408 Request Timeout handling
  - Fallback data
✓ Caching (24h TTL)
  - Cache-Control headers
  - Max-age: 86400s (24h)
  - Cache hits indicated
```

**Run:**
```bash
npm run test:e2e -- phase2-jit.test.ts
```

### PHASE 3: Async Motor (18+ tests)

```
✓ BullMQ queue management
  - Queue creation
  - Queue status endpoint
  - Job acceptance
  - Retry logic (min 3 retries)
✓ Worker job processing
  - Workers running
  - Job processing workflow
  - Failed job retries
  - Job progress tracking
  - Timeout limits
✓ Deduplication logic
  - Duplicate URL detection
  - Deduplication window (24h)
  - Force bypass
✓ IQR filtering & outlier detection
  - IQR calculation (Q1, Q3)
  - Outlier detection
  - Outlier flagging
  - Configurable thresholds
✓ Seed script completion
  - Stage 1 completion
  - Stage 2 completion
  - Data integrity
✓ Queue stability & performance
  - No stale job accumulation
  - Reasonable throughput
  - Acceptable error rate
  - Consistent latency
```

**Run:**
```bash
npm run test:e2e -- phase3-async.test.ts
```

### PHASE 4: Telemetry (25+ tests)

```
✓ Prometheus metrics format
  - /metrics endpoint accessibility
  - Prometheus text format (# HELP, # TYPE)
  - HTTP request counter
  - HTTP request duration histogram
  - Error rate tracking
  - Memory usage metrics
  - Process uptime
  - Custom business metrics
  - Queue statistics
✓ Prometheus server integration
  - Server accessibility
  - Target scraping
  - Metrics collection
  - Data querying
✓ Grafana datasource & dashboards
  - Grafana accessibility
  - Prometheus datasource configuration
  - Dashboard provisioning
  - Grafana alerting
✓ Alert rules configuration
  - High error rate alert
  - High latency alert
  - Resource exhaustion alerts
  - Queue health alerts
  - Alert severity levels
✓ Structured logging
  - JSON format
  - Trace ID inclusion
  - Request/response context
  - Error stack traces
  - Sensitive data redaction
✓ Performance metrics collection
  - Request latency measurement
  - Endpoint-specific metrics
  - HTTP method tracking
  - Status code distribution
  - Memory usage tracking
```

**Run:**
```bash
npm run test:e2e -- phase4-telemetry.test.ts
```

## Test Results

Test results are generated in multiple formats:

```
test-results/
├── html/                    # HTML report (open in browser)
├── results.json             # Machine-readable results
└── junit.xml                # JUnit format (CI/CD integration)
```

### View HTML Report

```bash
# After running tests
open test-results/html/index.html
```

## Debugging

### Run Single Test

```bash
npm run test:e2e -- -g "health check endpoint"
```

### Run with Trace

```bash
npm run test:e2e -- --trace on
```

### Verbose Output

```bash
npm run test:e2e -- --reporter list
```

### Check Test Configuration

```bash
# Validate playwright.config.ts
npx playwright test --list
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run E2E Tests
  run: npm run test:e2e
  env:
    API_URL: http://localhost:5000
    PROMETHEUS_URL: http://localhost:9090
    GRAFANA_URL: http://localhost:3000

- name: Upload Test Results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: e2e-results
    path: test-results/
```

### Vercel Example

Set environment variables in dashboard:
```
API_URL=https://api.suplilist.com
PROMETHEUS_URL=https://prometheus.suplilist.com
GRAFANA_URL=https://grafana.suplilist.com
```

## Troubleshooting

### Test Timeout (30s)

If tests consistently timeout:
1. Check API is running: `curl http://localhost:5000/health`
2. Check network latency: `time curl http://localhost:5000/health`
3. Increase timeout in `playwright.config.ts`
4. Run with fewer workers: `npm run test:e2e -- --workers=1`

### Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:5000
```

1. Verify API is running: `docker compose up -d api`
2. Check port: `lsof -i :5000`
3. Set correct API_URL: `export API_URL=http://localhost:5000`

### Rate Limit Errors (429)

Tests may be rate-limited during rapid execution:
1. Run with fewer workers: `npm run test:e2e -- --workers=1`
2. Add delays between tests (adjust in test files)
3. Verify rate limiting config in API (should be 100 req/min)

### Prometheus Not Available

Some tests gracefully skip Prometheus checks if it's not running:
1. Start Prometheus: `docker compose up -d prometheus`
2. Verify: `curl http://localhost:9090/api/v1/targets`

## Deployment Checklist

Before deploying to production, verify:

```bash
# 1. Run full test suite
npm run test:e2e

# 2. Check specific phase tests pass
npm run test:e2e -- phase1-validation.test.ts
npm run test:e2e -- phase2-jit.test.ts
npm run test:e2e -- phase3-async.test.ts
npm run test:e2e -- phase4-telemetry.test.ts

# 3. Verify no critical issues
# (Check test-results/junit.xml for failures)

# 4. Review deployment checklist
cat ../DEPLOYMENT_CHECKLIST.md
```

## Performance Benchmarks

Expected performance metrics from tests:

| Metric | Target | Typical |
|--------|--------|---------|
| Health endpoint | < 500ms | 50-100ms |
| API response (p95) | < 500ms | 100-300ms |
| Database query | < 1000ms | 50-200ms |
| Redis operation | < 500ms | 10-50ms |
| Full test suite | - | 2-5 minutes |

## Known Issues

- Prometheus may not be available in all test environments (tests gracefully skip)
- Grafana API token required for datasource checks (optional)
- Some affiliate endpoints may timeout during high load (tests handle gracefully)

## Contributing

To add new tests:

1. Create test file: `e2e/phase5-new-feature.test.ts`
2. Import test utilities: `import { test, expect } from '@playwright/test'`
3. Follow naming convention: `test.describe('PHASE X - Feature')`
4. Add timeout expectations: `expect(elapsed).toBeLessThan(30000)`
5. Update README.md with test coverage
6. Verify tests pass: `npm run test:e2e`

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Test Configuration](../playwright.config.ts)
- [Deployment Checklist](../DEPLOYMENT_CHECKLIST.md)
- [Test Results Template](../INTEGRATION_TEST_RESULTS.md)

## Support

For issues with E2E tests:

1. Check test logs: `npm run test:e2e -- --reporter list`
2. Review test output in `test-results/html/`
3. Check API logs: `docker compose logs api`
4. Verify environment variables
5. Run single test for debugging: `npm run test:e2e -- -g "test-name"`

---

**Last Updated:** 2025-06-09  
**Test Framework:** Playwright 1.60+  
**Node Version:** 24.0+
