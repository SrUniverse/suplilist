# Load Testing Procedures

## Pre-Test Checklist

Before running load tests, ensure:

- [ ] Application server is running
- [ ] MongoDB is running and accessible
- [ ] Redis is running and accessible
- [ ] Network connectivity is stable
- [ ] No other load tests are running
- [ ] Database is in known clean state
- [ ] Backups are current
- [ ] Monitoring dashboards are accessible
- [ ] On-call team is aware of testing
- [ ] Test duration is communicated to stakeholders

## Test Execution Procedures

### 1. Normal Load Test (100 Users)

**Duration:** ~12 minutes  
**Risk Level:** Low  
**Can run during business hours:** Yes

#### Step 1: Preparation (5 minutes)

```bash
# Open terminal 1 - Monitor server
cd /path/to/suplilist
npm run dev:server
tail -f logs/server.log

# Open terminal 2 - Monitor database
mongosh
db.stats()

# Open terminal 3 - Monitor Redis
redis-cli
MONITOR

# Open terminal 4 - Run tests
cd /path/to/suplilist/load-tests
```

#### Step 2: Execute Test (12 minutes)

```bash
# Run normal load test
chmod +x scripts/run-load-tests.sh
TEST_SCENARIO=normal ./scripts/run-load-tests.sh

# Or use K6 directly
k6 run k6-tests/normal-load.js --vus 100 --duration 12m
```

#### Step 3: Monitor (During Test)

While test is running:

1. **Check server metrics:**
   - CPU usage (should stay < 80%)
   - Memory usage (should stay < 80%)
   - Response times (monitor in K6 output)

2. **Check database:**
   - Connection count (should be stable)
   - Query performance
   - No deadlocks

3. **Check Redis:**
   - Hit rate (track in MONITOR output)
   - Eviction rate
   - Memory usage

#### Step 4: Analyze Results (5 minutes)

```bash
# Wait for test to complete
# Results are in load-tests/results/

# Run performance validation
./scripts/performance-validation.sh results/k6-normal-*.json normal

# Check for issues
grep -i "error\|fail\|timeout" results/k6-normal-*.log
```

#### Step 5: Reporting (2 minutes)

```bash
# Review metrics
tail -20 results/validation-report-*.txt

# Check against SLA
cat results/metrics.env
```

### 2. Peak Load Test (1000 Users)

**Duration:** ~13 minutes  
**Risk Level:** Medium  
**Can run during business hours:** No - schedule off-hours
**Requires:** Monitoring team on call

#### Pre-Test Steps

```bash
# 1. Clear any running tests
pkill -f "k6 run"

# 2. Warm up server
curl -s http://localhost:3000/health

# 3. Check resource availability
free -h  # Check available memory
df -h    # Check disk space
```

#### Execute Test

```bash
TEST_SCENARIO=peak ./scripts/run-load-tests.sh

# Or explicit K6 command
k6 run k6-tests/peak-load.js --vus 1000 --duration 13m
```

#### During Test Monitoring

**Critical Metrics to Watch:**

| Metric | Warning | Critical |
|--------|---------|----------|
| p99 Response Time | > 1500ms | > 2000ms |
| Error Rate | > 5% | > 10% |
| CPU | > 80% | > 95% |
| Memory | > 80% | > 95% |
| DB Connections | > 800 | > 900 |

**Action if Critical Threshold Hit:**

```bash
# Step 1: Assess situation
# - Check application logs
# - Check database logs
# - Check memory/CPU

# Step 2: If recoverable
# - Wait for systems to stabilize
# - Do NOT stop test immediately

# Step 3: If unrecoverable
# Stop test:
pkill -f "k6 run"

# Investigate:
# - Review error logs
# - Check resource exhaustion
# - Document findings
```

#### Post-Test Analysis

```bash
# Validation
./scripts/performance-validation.sh results/k6-peak-*.json peak

# Deep analysis
# - Check error types
# - Review slow endpoints
# - Identify bottlenecks

# Baseline comparison
COMPARE_BASELINE=true ./scripts/performance-validation.sh results/k6-peak-*.json peak
```

### 3. Stress Test (5000+ Users)

**Duration:** ~8 minutes  
**Risk Level:** High  
**Can run during business hours:** No
**Requires:** Full ops team on call + engineering lead approval

#### Pre-Test Requirements

```bash
# Approval
# [ ] Engineering lead approval obtained
# [ ] Ops team notified
# [ ] Backup created
# [ ] Rollback plan documented
# [ ] Escalation path established

# Verification
# [ ] Database is fully functional
# [ ] All replicas are healthy
# [ ] No active production issues
# [ ] Network is stable
```

#### Execute Test

```bash
# Set safety limits
export STRESS_TEST_MODE=true

# Start monitoring dashboard
# (separate terminal)
./scripts/monitor-dashboard.sh

# Run test
TEST_SCENARIO=stress ./scripts/run-load-tests.sh
```

#### EMERGENCY STOP PROCEDURE

If system becomes unstable:

```bash
# Stop K6
pkill -SIGTERM -f "k6 run"
pkill -SIGKILL -f "k6 run"  # Force kill if needed

# Check server status
curl http://localhost:3000/health

# If server is stuck
# Kill application processes
pkill -f "node dist/server.js"

# Restart from backup if needed
./scripts/restore-from-backup.sh

# Notify team
# [ ] Slack notification sent
# [ ] PagerDuty incident created
# [ ] Post-mortem scheduled
```

#### Post-Test Analysis

```bash
# Validation
./scripts/performance-validation.sh results/k6-stress-*.json stress

# Detailed report
./scripts/performance-validation.sh \
  results/k6-stress-*.json stress > stress-analysis.txt

# Capacity planning
# Extract:
# - Max RPS achieved
# - Error breakdown
# - Resource exhaustion point
# - Scaling recommendations
```

## Continuous Load Testing

### Scheduled Tests

Set up cron jobs for automated testing:

```bash
# Daily normal load test (2 AM)
0 2 * * * cd /path/to/suplilist && \
  TEST_SCENARIO=normal ./load-tests/scripts/run-load-tests.sh >> /var/log/load-tests.log 2>&1

# Weekly peak load test (Sunday 2 AM)
0 2 * * 0 cd /path/to/suplilist && \
  TEST_SCENARIO=peak ./load-tests/scripts/run-load-tests.sh >> /var/log/load-tests.log 2>&1

# Monthly stress test (1st of month, 3 AM)
0 3 1 * * cd /path/to/suplilist && \
  TEST_SCENARIO=stress ./load-tests/scripts/run-load-tests.sh >> /var/log/load-tests.log 2>&1
```

### Baseline Updates

Update baselines quarterly:

```bash
# After successful stress test
SAVE_BASELINE=true TEST_SCENARIO=stress ./load-tests/scripts/run-load-tests.sh

# Archive old baseline
mv baselines/stress-baseline.json baselines/stress-baseline-Q4-2024.json

# Review new baseline
cat baselines/stress-baseline.json | jq '.metrics'
```

## Troubleshooting During Tests

### High Error Rate (> 10%)

1. **Check application logs:**
   ```bash
   tail -100 logs/server.log | grep -i "error"
   ```

2. **Common causes:**
   - Database connection pool exhausted
   - Rate limiting activated
   - Memory pressure causing GC pauses
   - Unhandled exceptions

3. **Resolution:**
   - Increase database connection pool
   - Adjust rate limit thresholds
   - Increase heap size
   - Check for memory leaks

### High Response Times (p99 > 2000ms)

1. **Check database query performance:**
   ```bash
   mongosh
   db.setProfilingLevel(1, { slowms: 100 })
   db.system.profile.find().sort({ ts: -1 }).limit(10)
   ```

2. **Check Redis:**
   ```bash
   redis-cli
   INFO stats
   SLOWLOG GET 10
   ```

3. **Optimization strategies:**
   - Add missing indexes
   - Implement query result caching
   - Batch similar queries
   - Use aggregation pipeline

### Memory Leaks

1. **Identify memory growth:**
   ```bash
   # Monitor process memory over time
   watch -n 5 'ps aux | grep node | grep -v grep'
   ```

2. **Collect heap dumps:**
   ```bash
   node --inspect dist/server.js
   # Connect Chrome DevTools to chrome://inspect
   ```

3. **Analyze dumps:**
   - Look for retained objects
   - Check event listener counts
   - Verify cache sizes

### Database Deadlocks

1. **Check MongoDB logs:**
   ```bash
   tail -100 /var/log/mongodb/mongod.log | grep -i "deadlock"
   ```

2. **Analyze current operations:**
   ```bash
   mongosh
   db.currentOp()
   ```

3. **Kill long-running operations:**
   ```bash
   db.killOp(<opid>)
   ```

## Post-Test Procedures

### Immediate Cleanup (5 minutes after test ends)

```bash
# 1. Clear test data
./scripts/cleanup-test-data.sh

# 2. Reset caches
redis-cli FLUSHDB

# 3. Clear logs
rm logs/*.log
```

### Results Analysis (30 minutes)

```bash
# 1. Extract key metrics
./scripts/extract-metrics.sh results/k6-*.json

# 2. Generate report
./scripts/generate-report.sh results/

# 3. Compare with baseline
./scripts/compare-baseline.sh results/ <scenario>

# 4. Document findings
cat > findings-$(date +%Y%m%d).md << EOF
# Load Test Findings - $(date)

## Test Configuration
- Scenario: 
- Duration: 
- Users:

## Key Metrics
- p95:
- p99:
- Error Rate:

## Issues Found
-

## Recommendations
-
EOF
```

### Reporting (1 hour)

```bash
# Generate and send report
./scripts/send-report.sh \
  --format html \
  --recipients devops@suplilist.com,engineering@suplilist.com \
  --title "Load Test Results - $(date +%Y-%m-%d)"

# Update dashboard
./scripts/update-performance-dashboard.sh results/
```

## Validation Checklist

After each test, verify:

- [ ] Test completed without major errors
- [ ] Results saved to results directory
- [ ] Performance within SLA targets
- [ ] No data corruption detected
- [ ] No hanging processes
- [ ] Database integrity verified
- [ ] Caches cleared
- [ ] Logs archived
- [ ] Report generated
- [ ] Team notified

## Emergency Procedures

### System Unresponsive

```bash
# 1. Stop load test
pkill -SIGKILL -f "k6 run"

# 2. Check system status
curl http://localhost:3000/health || echo "Server down"

# 3. Kill hung processes
pkill -f "node dist/server.js"

# 4. Force restart
systemctl restart suplilist-server

# 5. Verify recovery
sleep 10
curl http://localhost:3000/health
```

### Database Corrupted

```bash
# 1. Stop application
pkill -f "node dist/server.js"

# 2. Verify backup exists
ls -la backups/

# 3. Restore from backup
./scripts/restore-from-backup.sh

# 4. Verify data integrity
mongosh
db.adminCommand("dbCheckCollection:")

# 5. Restart application
npm run dev:server
```

### Data Loss

```bash
# CRITICAL: If data loss detected

# 1. Stop all writes immediately
# - Restart with read-only flag
node dist/server.js --read-only

# 2. Contact engineering lead

# 3. Initiate incident response
# - Create PagerDuty incident
# - Notify on-call team
# - Begin investigation

# 4. Prepare recovery
# - Locate backup
# - Prepare restore scripts
# - Estimate recovery time

# 5. Execute recovery
./scripts/restore-from-backup.sh

# 6. Conduct post-mortem
# - Document what happened
# - Identify root cause
# - Plan prevention
```

## Documentation

### Test Report Template

```markdown
# Load Test Report

## Executive Summary
- Test Date: [DATE]
- Scenario: [NORMAL/PEAK/STRESS]
- Status: [PASS/FAIL/PARTIAL]

## Test Configuration
- Duration: [TIME]
- Concurrent Users: [NUMBER]
- Test Tool: [K6/LOCUST/JMETER]

## Results Summary
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| p95 Response Time | XXms | 500ms | PASS |
| Error Rate | X% | 5% | PASS |
| Throughput | X RPS | X | PASS |

## Issues Identified
- [List any issues found]

## Recommendations
- [List recommendations for improvement]

## Next Steps
- [List follow-up actions]
```

## References

- Load Testing Guide: [README.md](./README.md)
- Performance Validation: [Performance Validation Script](./scripts/performance-validation.sh)
- SLA Configuration: [SLA Targets](./config/sla-targets.yaml)
- Troubleshooting Guide: [README.md - Troubleshooting](./README.md#troubleshooting)
