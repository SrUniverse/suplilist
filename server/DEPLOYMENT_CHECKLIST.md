# Circuit Breaker Deployment Checklist

## Pre-Deployment Testing

### Unit Tests
- [ ] Run circuit breaker unit tests
  ```bash
  npm run test -- circuit-breaker.service.test.ts
  ```
  Expected: All 20+ tests passing

- [ ] Verify state transitions
  ```bash
  npm run test -- circuit-breaker.service.test.ts -t "transition"
  ```

### Integration Tests
- [ ] Run integration tests
  ```bash
  npm run test -- firecrawl-circuit-breaker.integration.test.ts
  ```
  Expected: All 15+ tests passing

- [ ] Verify fallback behavior
  ```bash
  npm run test -- firecrawl-circuit-breaker.integration.test.ts -t "fallback"
  ```

### Build Verification
- [ ] Compile TypeScript without errors
  ```bash
  npm run build
  ```
  Expected: No compilation errors

- [ ] No type errors
  ```bash
  npx tsc --noEmit
  ```

## Configuration Review

### Firecrawl Circuit Breaker Settings
- [ ] Review failure threshold: 5 (acceptable for most cases)
- [ ] Review time window: 60s (standard)
- [ ] Review recovery timeout: 30s (reasonable)
- [ ] Review half-open requests: 1 (correct)

### Fallback Data
- [ ] Verify mock supplement data is realistic
  - [ ] Contains valid Brazilian Portuguese names
  - [ ] Prices are in reasonable range (R$20-150)
  - [ ] All required fields present (name, price, source, url)

### Metrics Configuration
- [ ] METRICS_ENABLED environment variable set correctly
- [ ] Prometheus endpoint configured: `/metrics`
- [ ] All circuit breaker metrics exported

## Staging Deployment

### Deploy to Staging
- [ ] Code review completed
- [ ] All tests passing in CI/CD
- [ ] PR merged to main/develop

### Smoke Tests on Staging
```bash
# Test 1: Normal operation
curl https://staging-api.suplilist.com/api/supplements/search?q=protein

# Test 2: Verify metrics endpoint
curl https://staging-api.suplilist.com/metrics | grep circuit_breaker

# Expected output:
# circuit_breaker_state{name="firecrawl"} 0
# circuit_breaker_fallback_total 0
```

### Manual Testing on Staging
- [ ] Search supplements: returns real results
- [ ] Verify logs: no circuit breaker state changes
- [ ] Check metrics: CLOSED state confirmed

### Load Testing (Optional)
- [ ] Simulate 100+ requests with healthy service
  - Expected: All succeed, circuit stays CLOSED
- [ ] Simulate service degradation (mock Firecrawl failures)
  - Expected: Circuit opens after 5 failures, fallback returns mock data

## Production Deployment

### Pre-Deployment Verification
- [ ] All tests passing in CI/CD
- [ ] Code review approved
- [ ] No breaking changes to API
- [ ] Rollback plan documented
- [ ] On-call engineer briefed

### Deployment Strategy
- [ ] Use blue-green or canary deployment if available
- [ ] Start with 10-20% traffic
- [ ] Monitor metrics for 15 minutes
- [ ] Gradually increase to 100%
- [ ] Monitor metrics for 1 hour after full deployment

### Post-Deployment Verification

#### Immediate Checks (First 5 Minutes)
- [ ] Application starts without errors
  ```bash
  docker logs suplilist-server | tail -20
  ```

- [ ] Circuit breaker initialized
  ```bash
  docker logs suplilist-server | grep -i "Circuit breaker initialized"
  ```

- [ ] API endpoints responding
  ```bash
  curl https://api.suplilist.com/api/supplements/search?q=protein
  ```

- [ ] Metrics endpoint available
  ```bash
  curl https://api.suplilist.com/metrics | grep circuit_breaker | head -5
  ```

#### Short-term Monitoring (30 Minutes)
- [ ] No excessive error rates in logs
- [ ] Circuit breaker state: CLOSED
  ```
  circuit_breaker_state{name="firecrawl"} 0
  ```

- [ ] Normal request latency
- [ ] No fallback usage (unless testing)

#### Medium-term Monitoring (2 Hours)
- [ ] Sustained normal operation
- [ ] No unexpected state changes
- [ ] Metrics being collected correctly
- [ ] Logs are structured and readable

## Monitoring & Alerts

### Setup Prometheus Scraping
- [ ] Configure Prometheus to scrape `/metrics` endpoint
- [ ] Interval: 15s (default)
- [ ] Timeout: 10s

### Setup Grafana Dashboard
- [ ] Create dashboard: "Circuit Breaker Health"
- [ ] Panels:
  - [ ] Circuit state (gauge)
  - [ ] State transitions (graph)
  - [ ] Fallback usage (graph)
  - [ ] Failure rate (graph)
  - [ ] API response times (heatmap)

### Setup Alerts (Prometheus)

**Alert 1: Circuit Open**
```promql
alert: CircuitBreakerOpen
expr: circuit_breaker_state{name="firecrawl"} > 0
for: 1m
severity: warning
action: Check Firecrawl service health
```

**Alert 2: Frequent State Changes**
```promql
alert: CircuitBreakerFlaky
expr: rate(circuit_breaker_state_changes_total[5m]) > 0.5
for: 5m
severity: warning
action: Review Firecrawl reliability
```

**Alert 3: High Fallback Usage**
```promql
alert: HighFallbackUsage
expr: rate(circuit_breaker_fallback_total[5m]) > 10
for: 5m
severity: info
action: Firecrawl may be degraded
```

### Setup Log Aggregation
- [ ] Ship logs to ELK/CloudWatch/Datadog
- [ ] Search for: `[FirecrawlService]` and `[CircuitBreaker]`
- [ ] Create alert on state change patterns
- [ ] Create dashboard for logs

## Rollback Plan

If issues arise post-deployment:

### Option 1: Revert Code
```bash
git revert <commit-hash>
npm run build
docker build -t suplilist:rollback .
docker push suplilist:rollback
# Deploy rollback version
```

### Option 2: Manual Circuit Reset (Temporary)
```bash
# If circuit gets stuck in OPEN state
# Accessible via admin API endpoint:
POST /admin/circuit-breaker/reset
```

### Verification After Rollback
- [ ] All tests passing on previous version
- [ ] API endpoints responding
- [ ] No circuit breaker errors in logs
- [ ] Metrics endpoint available

## Post-Deployment (24 Hours)

### Review Metrics
- [ ] Circuit remained CLOSED 99%+ of time
- [ ] Fallback usage: 0 (unless testing)
- [ ] State transitions: < 5 total
- [ ] API latency: within normal range

### Review Logs
- [ ] No unexpected state changes
- [ ] No cascade of circuit breaker errors
- [ ] Normal Firecrawl request patterns

### Review Feedback
- [ ] User reports: none
- [ ] On-call reports: none
- [ ] Monitoring alerts: none (unless expected)

### Documentation
- [ ] Update runbook with new circuit breaker behavior
- [ ] Document any configuration changes
- [ ] Add circuit breaker status to status page (if applicable)

## Success Criteria

✅ **All tests passing**
- Unit tests: 20+ passing
- Integration tests: 15+ passing
- E2E tests: all passing

✅ **Metrics collected**
- Circuit state exported
- State transitions tracked
- Fallback usage monitored
- Success/failure rates tracked

✅ **No user impact**
- Search results always returned (real or fallback)
- No 503 Service Unavailable errors
- API latency unchanged

✅ **Observability confirmed**
- Logs show state changes
- Metrics endpoint functional
- Dashboard displays correctly
- Alerts configured and working

## Emergency Procedures

### If Circuit Stuck in OPEN
**Symptom:** All requests returning fallback data

**Diagnosis:**
```bash
curl https://api.suplilist.com/metrics | grep circuit_breaker_state
# Output: circuit_breaker_state{name="firecrawl"} 1
```

**Remediation:**
1. Check Firecrawl API status (external status page)
2. Wait 30+ seconds for HALF_OPEN attempt
3. If still OPEN, manually reset:
   ```
   Admin endpoint: POST /admin/circuit-breaker/reset
   ```

### If Metrics Not Showing
**Symptom:** Metrics endpoint returns no circuit breaker metrics

**Diagnosis:**
```bash
# Check if metrics are enabled
env | grep METRICS_ENABLED
# Should NOT be 'false'
```

**Remediation:**
1. Verify METRICS_ENABLED != 'false'
2. Restart application
3. Check logs for metric recording errors

### If Performance Degrades
**Symptom:** API response times spike

**Diagnosis:**
```bash
# Check if circuit is frequently transitioning
curl https://api.suplilist.com/metrics | grep state_changes
# Should be < 1 per minute
```

**Remediation:**
1. Increase `halfOpenRequests` from 1 to 2
2. Increase `timeoutMs` from 30s to 60s
3. Retest and monitor

## Sign-Off

- [ ] QA Lead: _________________ Date: _______
- [ ] DevOps Lead: _____________ Date: _______
- [ ] Backend Tech Lead: ________ Date: _______
- [ ] Product Manager: _________ Date: _______

## Deployment Notes

**Deployment Date:** _______________
**Deployed By:** ___________________
**Version:** _______________________
**Notable Changes:** 
_________________________________
_________________________________

## Post-Deployment Follow-up

**Schedule review meeting:**
- Date: 24 hours after deployment
- Attendees: QA, DevOps, Backend, Product
- Agenda: Metrics review, incident review, lessons learned

**Update documentation:**
- [ ] Runbook updated
- [ ] Architecture diagram updated (if applicable)
- [ ] Team wiki updated with circuit breaker info
- [ ] On-call playbook updated
