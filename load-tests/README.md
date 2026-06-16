# SupliList Load Testing Guide

## Overview

This directory contains comprehensive load testing automation and performance validation tools for SupliList. It includes test scenarios using K6, Locust, and JMeter, along with automated performance validation and baseline comparison.

## Directory Structure

```
load-tests/
├── k6-tests/              # K6 load test scripts
│   ├── normal-load.js     # 100 concurrent users
│   ├── peak-load.js       # 1000 concurrent users
│   └── stress-test.js     # 5000+ concurrent users
├── locust/                # Locust load test suite
│   └── locustfile.py      # Locust test configuration
├── jmeter/                # JMeter test plans
│   └── suplilist-load-test.jmx
├── scripts/               # Automation and validation scripts
│   ├── run-load-tests.sh  # Main test execution script
│   ├── performance-validation.sh  # Validation and SLA checking
│   └── ci-integration.sh  # CI/CD integration
├── config/                # Configuration files
│   └── sla-targets.yaml   # SLA definitions
├── baselines/             # Performance baselines
├── results/               # Test results and reports
└── README.md              # This file
```

## Quick Start

### Prerequisites

- **K6**: `brew install k6` (macOS) or [download](https://k6.io/docs/getting-started/installation/)
- **Locust**: `pip install locust`
- **JMeter**: `brew install jmeter` or [download](https://jmeter.apache.org/)
- **Node.js**: v24+ (for running SupliList server)
- **MongoDB**: Running locally or via Docker
- **Redis**: Running locally or via Docker

### Setup

1. **Start the application stack:**
   ```bash
   cd /path/to/suplilist
   docker compose up -d mongodb redis
   npm run dev:server
   ```

2. **Make scripts executable:**
   ```bash
   chmod +x load-tests/scripts/*.sh
   ```

3. **Configure environment:**
   ```bash
   export BASE_URL=http://localhost:3000
   export TEST_TOOL=k6  # or locust, jmeter
   export TEST_SCENARIO=normal  # normal, peak, stress
   ```

### Running Tests

#### K6 Load Tests

**Normal Load (100 users):**
```bash
./load-tests/scripts/run-load-tests.sh
# or explicitly:
k6 run load-tests/k6-tests/normal-load.js --vus 100 --duration 10m
```

**Peak Load (1000 users):**
```bash
TEST_SCENARIO=peak ./load-tests/scripts/run-load-tests.sh
# or:
k6 run load-tests/k6-tests/peak-load.js --vus 1000 --duration 10m
```

**Stress Test (5000+ users):**
```bash
TEST_SCENARIO=stress ./load-tests/scripts/run-load-tests.sh
# or:
k6 run load-tests/k6-tests/stress-test.js --vus 5000 --duration 10m
```

#### Locust Load Tests

**Start Locust Web UI:**
```bash
cd load-tests/locust
locust -f locustfile.py --host http://localhost:3000
# Then visit http://localhost:8089
```

**Headless Mode (Normal Load):**
```bash
TEST_TOOL=locust ./load-tests/scripts/run-load-tests.sh
```

**Custom Configuration:**
```bash
cd load-tests/locust
locust -f locustfile.py \
  --host http://localhost:3000 \
  --users 500 \
  --spawn-rate 50 \
  --run-time 5m \
  --headless
```

#### JMeter Load Tests

**GUI Mode:**
```bash
jmeter -t load-tests/jmeter/suplilist-load-test.jmx
```

**Headless Mode:**
```bash
jmeter -n -t load-tests/jmeter/suplilist-load-test.jmx \
  -l results/jmeter-results.jtl \
  -e -o results/jmeter-report/
```

## Test Scenarios

### 1. Normal Load (100 Concurrent Users)

**Duration:** 12 minutes total
- Warm up: 2 minutes (ramp from 0-20 users)
- Ramp up: 5 minutes (ramp from 20-100 users)
- Sustained: 5 minutes (hold at 100 users)

**Operations:**
- 40% Supplement search
- 25% Supplement detail view
- 20% User authentication
- 10% Stack management
- 5% Profile operations

**Success Criteria:**
- p95 response time < 500ms
- p99 response time < 1000ms
- Error rate < 5%
- No timeouts

### 2. Peak Load (1000 Concurrent Users)

**Duration:** 13 minutes total
- Warm up: 2 minutes (0-100 users)
- Ramp 1: 2 minutes (100-500 users)
- Ramp 2: 3 minutes (500-1000 users)
- Sustained: 5 minutes (hold at 1000)
- Cool down: 3 minutes

**Operations:**
- Heavier read operations
- Reduced write operations
- Response caching validation

**Success Criteria:**
- p99 response time < 2000ms
- Error rate < 10%
- Graceful degradation

### 3. Stress Test (5000+ Concurrent Users)

**Duration:** 8 minutes total
- Quick ramp: 1 minute (0-500 users)
- Fast ramp: 1 minute (500-2000 users)
- Stress push: 2 minutes (2000-5000 users)
- Sustained stress: 3 minutes (hold at 5000)
- Cool down: 2 minutes

**Operations:**
- Extreme read/write mix
- Circuit breaker testing
- Resource exhaustion testing

**Success Criteria:**
- System remains responsive
- Graceful error handling
- No cascading failures

## Performance Targets (SLA)

| Metric | Target | Critical |
|--------|--------|----------|
| p50 Response Time | 100ms | - |
| p95 Response Time | 500ms | 1000ms |
| p99 Response Time | 1000ms | 2000ms |
| Max Response Time | 2000ms | 5000ms |
| Error Rate | < 5% | > 10% |
| Throughput | > 1000 RPS | - |
| Availability | > 99.9% | - |

## Performance Validation

### Automated Validation

Run performance validation after tests:

```bash
./load-tests/scripts/performance-validation.sh load-tests/results/k6-normal-*.json normal
```

This will:
- Validate against SLA targets
- Compare with baseline
- Generate recommendations
- Estimate capacity requirements

### Manual Validation

1. **Check metrics:**
   ```bash
   # K6 summary
   grep -o '"p(95)":[0-9.]*' load-tests/results/*.json

   # Locust CSV
   tail -20 load-tests/results/locust_stats.csv
   ```

2. **Review reports:**
   - K6: Check `.json.summary` files
   - Locust: Generated CSV statistics
   - JMeter: HTML reports in `results/`

## Baseline Management

### Saving Baselines

Save current performance as baseline after successful tests:

```bash
SAVE_BASELINE=true ./load-tests/scripts/run-load-tests.sh
```

Baselines are stored in `load-tests/baselines/`

### Comparing with Baseline

Automatically compare with baseline:

```bash
COMPARE_BASELINE=true ./load-tests/scripts/run-load-tests.sh
```

Alert if performance degrades > 10%

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/load-test.yml`:

```yaml
name: Load Testing

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '24'
      
      - name: Install K6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6-stable.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Start services
        run: docker compose up -d mongodb redis
      
      - name: Build and run server
        run: npm run build && npm run dev:server &
      
      - name: Wait for server
        run: npx wait-on http://localhost:3000/health
      
      - name: Run load tests
        run: |
          TEST_SCENARIO=normal ./load-tests/scripts/run-load-tests.sh
      
      - name: Validate performance
        run: |
          ./load-tests/scripts/performance-validation.sh load-tests/results/*.json normal
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: load-test-results
          path: load-tests/results/
```

### GitLab CI

Create `.gitlab-ci.yml` section:

```yaml
load-test:
  stage: performance
  image: grafana/k6:latest
  script:
    - chmod +x load-tests/scripts/*.sh
    - ./load-tests/scripts/run-load-tests.sh
  artifacts:
    paths:
      - load-tests/results/
    reports:
      performance: load-tests/results/*.json
  only:
    - schedules
    - manual
```

## Monitoring and Alerts

### Alert Configuration

Edit `load-tests/config/sla-targets.yaml`:

```yaml
sla:
  p95_response_time:
    warning: 500  # ms
    critical: 1000
    
  error_rate:
    warning: 5    # %
    critical: 10
    
  throughput:
    warning: 800  # RPS
    critical: 500

alerting:
  enabled: true
  slack_webhook: ${SLACK_WEBHOOK_URL}
  email: alerts@example.com
```

### Integrations

- **Slack**: Send alerts to Slack channel
- **PagerDuty**: Create incidents on critical issues
- **Datadog**: Send custom metrics
- **CloudWatch**: Log metrics to AWS

## Results Analysis

### K6 Results

K6 produces JSON with detailed metrics:

```bash
# View summary
cat load-tests/results/k6-*.json.summary | jq .

# Extract specific metrics
jq '.metrics.http_req_duration.values' load-tests/results/k6-*.json
```

### Locust Results

Locust generates CSV files:

```bash
# View statistics
cat load-tests/results/locust_stats.csv

# Calculate percentiles
awk -F',' '{print $3}' load-tests/results/locust_stats.csv | sort -n | \
  awk '{a[NR]=$1} END {print "p95:", a[int(NR*0.95)]}'
```

### JMeter Results

JMeter produces HTML reports:

```bash
# Open report
open load-tests/results/jmeter-*.html
```

## Troubleshooting

### Common Issues

**Problem:** Connection timeout
```
Error: dial: i/o timeout
```
**Solution:** 
- Check server is running: `curl http://localhost:3000/health`
- Increase timeout: Set `httpClient.timeout=30s` in K6
- Check network connectivity

**Problem:** High error rate during test
```
errors: 500
error rate: 25%
```
**Solution:**
- Check server logs for errors
- Reduce concurrent users
- Verify database is responding
- Check rate limit settings

**Problem:** Out of memory
```
fatal error: out of memory
```
**Solution:**
- Reduce number of concurrent users
- Use `--discard-response-bodies` flag in K6
- Enable streaming responses
- Check server memory limits

### Debug Mode

Enable verbose logging:

```bash
# K6 verbose output
k6 run --log-output=csv load-tests/k6-tests/normal-load.js

# Locust debug
locust -f load-tests/locust/locustfile.py --loglevel DEBUG

# JMeter with logging
jmeter -Jlog_level.jmeter=DEBUG -t test.jmx
```

## Performance Tuning

### Application Level

1. **Database Optimization:**
   - Add indexes for frequently queried fields
   - Optimize query performance (avoid N+1)
   - Use connection pooling
   - Enable query caching

2. **API Optimization:**
   - Implement response caching (Redis)
   - Use field selection to reduce payload
   - Enable gzip compression
   - Implement rate limiting

3. **Server Configuration:**
   - Tune Node.js process memory
   - Adjust MongoDB connection pool
   - Configure Redis memory limits
   - Set appropriate timeouts

### Infrastructure Level

1. **Horizontal Scaling:**
   - Add load balancer (nginx)
   - Deploy multiple server instances
   - Use auto-scaling groups

2. **Caching:**
   - Cache API responses (Redis)
   - Implement browser caching
   - Use CDN for static assets

3. **Database Optimization:**
   - Enable replication
   - Use read replicas
   - Implement sharding if needed

## Capacity Planning

Based on load test results:

```bash
Current Throughput: 1000 RPS
Target Throughput: 10,000 RPS
Degradation: -20% per 10x users

Estimated capacity:
- Current: ~1,000 RPS per server
- Need: 10 servers to handle 10,000 RPS
- Safety margin: Add 2 more (total 12)
```

## Reporting

### Weekly Report Template

```markdown
# Performance Report - Week of Jan 15-21

## Executive Summary
- All tests passed SLA
- No critical issues
- 2% improvement in p95 response time

## Test Results
| Scenario | p95 | Error Rate | Status |
|----------|-----|-----------|--------|
| Normal   | 450ms | 2.1% | PASS |
| Peak     | 890ms | 3.2% | PASS |
| Stress   | 1800ms | 8.9% | PASS |

## Recommendations
1. Cache supplement search results
2. Add database index on category field
3. Monitor error logs for pattern

## Next Steps
- Implement caching optimization
- Schedule capacity review
```

## References

- [K6 Documentation](https://k6.io/docs/)
- [Locust Documentation](https://docs.locust.io/)
- [JMeter Documentation](https://jmeter.apache.org/usermanual/)
- [SupliList Architecture Docs](../docs/)

## Support

For issues or questions:
1. Check troubleshooting section
2. Review application logs
3. Consult performance tuning guide
4. Contact the DevOps team
