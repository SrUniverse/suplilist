# Load Testing - Quick Reference Card

## One-Liners

### Run Tests
```bash
# Normal load (100 users, 12min)
TEST_SCENARIO=normal ./load-tests/scripts/run-load-tests.sh

# Peak load (1000 users, 13min)
TEST_SCENARIO=peak ./load-tests/scripts/run-load-tests.sh

# Stress test (5000+ users, 8min)
TEST_SCENARIO=stress ./load-tests/scripts/run-load-tests.sh

# Using K6 directly
k6 run load-tests/k6-tests/normal-load.js --vus 100 --duration 12m

# Using Locust
cd load-tests/locust && locust -f locustfile.py --headless --users 100 --run-time 10m

# Using JMeter
jmeter -n -t load-tests/jmeter/suplilist-load-test.jmx -l results.jtl
```

### Validate Performance
```bash
# Validate latest results
./load-tests/scripts/performance-validation.sh results/k6-*.json normal

# Compare with baseline
COMPARE_BASELINE=true ./load-tests/scripts/performance-validation.sh results/k6-*.json normal

# Save new baseline
SAVE_BASELINE=true TEST_SCENARIO=normal ./load-tests/scripts/run-load-tests.sh
```

### Monitor Execution
```bash
# Watch K6 output
k6 run -v load-tests/k6-tests/normal-load.js

# Start Locust UI
cd load-tests/locust && locust -f locustfile.py --host http://localhost:3000

# Monitor database during test
mongosh
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(5)

# Monitor Redis
redis-cli MONITOR

# Watch system resources
watch -n 1 'ps aux | grep node'
```

## Preset Configurations

### Normal Load (Daily)
```bash
# Automatically configured for 100 users
TEST_SCENARIO=normal ./load-tests/scripts/run-load-tests.sh

# Success = p95 < 500ms AND error_rate < 5%
```

### Peak Load (Weekly)
```bash
# Schedule: Sunday 2 AM
TEST_SCENARIO=peak ./load-tests/scripts/run-load-tests.sh

# Success = p99 < 1500ms AND error_rate < 8%
```

### Stress Test (Monthly)
```bash
# Schedule: 1st of month 3 AM
# ⚠️ Requires ops approval
TEST_SCENARIO=stress ./load-tests/scripts/run-load-tests.sh

# Success = System stable AND graceful degradation
```

## Common Checks

### Is the server running?
```bash
curl http://localhost:3000/health
# Should return: {"status": "ok"}
```

### Check database connection
```bash
mongosh --eval "db.adminCommand('ping')"
# Should return: { ok: 1 }
```

### Check Redis
```bash
redis-cli ping
# Should return: PONG
```

### View latest test results
```bash
ls -lt load-tests/results/ | head -5

# View summary
cat load-tests/results/k6-*.json.summary | jq .
```

### Check SLA targets
```bash
grep -A 5 "response_time:" load-tests/config/sla-targets.yaml
```

## Troubleshooting

### Test won't start
```bash
# Check server
curl -v http://localhost:3000/health

# Check K6
k6 version

# Check ports
netstat -an | grep 3000
```

### High error rate during test
```bash
# Check app logs
tail -50 logs/server.log | grep -i error

# Check database
mongosh
db.serverStatus()

# Check rate limiting
grep -i "rate.*limit" logs/server.log
```

### Out of memory
```bash
# Increase Node heap
node --max-old-space-size=4096 dist/server.js

# Check process memory
ps aux | grep node

# Clear Redis cache
redis-cli FLUSHDB
```

### Connection timeout
```bash
# Increase timeout in K6
k6 run --timeout 30s load-tests/k6-tests/normal-load.js

# Check network
ping -c 1 localhost
netstat -an | grep ESTABLISHED | wc -l
```

## Performance Targets

```
p50: 100ms  ✓
p95: 500ms  ← Most users
p99: 1000ms ← Worst users
p100: 2000ms ← Max observed

Error Rate: < 5% (target)
Error Rate: < 10% (critical)

Throughput: >= 1000 RPS
```

## Git/GitHub Commands

### Clone with load tests
```bash
git clone https://github.com/suplilist/suplilist.git
cd suplilist
```

### View CI workflow
```bash
cat .github/workflows/load-testing.yml
```

### Check past test results
```bash
# GitHub Actions tab → Load Testing workflow → View artifacts
```

### Trigger manual test
```bash
# GitHub Actions tab → Load Testing → Run workflow
# Select scenario: normal/peak/stress
```

## Environment Variables

```bash
# Server configuration
export BASE_URL=http://localhost:3000

# Test selection
export TEST_SCENARIO=normal  # normal, peak, stress
export TEST_TOOL=k6         # k6, locust, jmeter

# Features
export SAVE_BASELINE=false
export COMPARE_BASELINE=true
export ENABLE_ALERTS=true

# Notifications (optional)
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
export PAGERDUTY_KEY=xxxxx
```

## Performance SLA Quick Check

```bash
# Extract p95 from latest K6 results
grep -o '"p(95)":[0-9.]*' load-tests/results/k6-*.json | grep -o '[0-9.]*'

# Extract error rate
grep -o '"rate":[0-9.]*' load-tests/results/k6-*.json | tail -1

# Extract throughput
grep -o '"http_reqs":{[^}]*}' load-tests/results/k6-*.json | grep -o '"rate":[0-9.]*'

# Compare with baseline
diff <(jq .metrics.http_req_duration.values load-tests/baselines/normal-baseline.json) \
     <(jq .metrics.http_req_duration.values load-tests/results/k6-*.json)
```

## Report Generation

```bash
# View K6 summary
cat load-tests/results/k6-*.json.summary | jq '.metrics | keys'

# Generate HTML report
k6 run --out=cloud load-tests/k6-tests/normal-load.js

# Export CSV
k6 run --out=csv=results.csv load-tests/k6-tests/normal-load.js

# Save detailed report
./load-tests/scripts/performance-validation.sh results/k6-*.json normal > report.txt
```

## Documentation Links

| Document | Purpose |
|----------|---------|
| [README.md](./README.md) | Main guide & reference |
| [INSTALLATION.md](./INSTALLATION.md) | Setup instructions |
| [TEST_PROCEDURES.md](./TEST_PROCEDURES.md) | Step-by-step procedures |
| [OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md) | Performance tips |
| [INDEX.md](./INDEX.md) | Complete navigation |

## Support Contacts

- **DevOps Team:** load-testing issues, infrastructure
- **Engineering Lead:** Performance architecture, scaling decisions
- **On-Call:** Critical production issues (PagerDuty)

## Useful Links

- [K6 Docs](https://k6.io/docs/)
- [Locust Docs](https://docs.locust.io/)
- [JMeter Wiki](https://jmeter.apache.org/usermanual/)
- [MongoDB Perf](https://docs.mongodb.com/manual/administration/analyzing-mongodb-performance/)

---

**Tip:** Save this as a browser bookmark for quick reference!

Last updated: 2024-01-15
