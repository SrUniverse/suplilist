# Load Testing Suite - Complete Index

Comprehensive load testing automation and performance validation for SupliList.

## Quick Navigation

### Getting Started
1. **[INSTALLATION.md](./INSTALLATION.md)** - Install all required tools and dependencies
2. **[README.md](./README.md)** - Main load testing guide and reference
3. **[TEST_PROCEDURES.md](./TEST_PROCEDURES.md)** - Step-by-step test execution procedures

### Load Testing Scenarios
- **[k6-tests/normal-load.js](./k6-tests/normal-load.js)** - 100 concurrent users
- **[k6-tests/peak-load.js](./k6-tests/peak-load.js)** - 1000 concurrent users
- **[k6-tests/stress-test.js](./k6-tests/stress-test.js)** - 5000+ concurrent users

### Tools & Configuration
- **[locust/locustfile.py](./locust/locustfile.py)** - Locust load test suite
- **[jmeter/suplilist-load-test.jmx](./jmeter/suplilist-load-test.jmx)** - JMeter test plan
- **[config/sla-targets.yaml](./config/sla-targets.yaml)** - SLA targets and thresholds

### Automation Scripts
- **[scripts/run-load-tests.sh](./scripts/run-load-tests.sh)** - Main test execution
- **[scripts/performance-validation.sh](./scripts/performance-validation.sh)** - Validation and SLA checking
- **[scripts/ci-integration.sh](./scripts/ci-integration.sh)** - CI/CD integration

### Documentation
- **[README.md](./README.md)** - Complete reference guide
- **[INSTALLATION.md](./INSTALLATION.md)** - Setup instructions
- **[TEST_PROCEDURES.md](./TEST_PROCEDURES.md)** - Test execution procedures
- **[OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md)** - Performance optimization tips
- **[INDEX.md](./INDEX.md)** - This file

### CI/CD Integration
- **[../.github/workflows/load-testing.yml](../.github/workflows/load-testing.yml)** - GitHub Actions workflow

## Test Scenarios Overview

### Normal Load Test (100 Users)
- **Duration:** 12 minutes
- **Ramp-up:** 5 minutes
- **Sustained:** 5 minutes
- **Cool-down:** 2 minutes
- **Success Criteria:**
  - p95 < 500ms
  - p99 < 1000ms
  - Error rate < 5%
- **When to run:** Daily (automated)
- **Risk level:** Low

### Peak Load Test (1000 Users)
- **Duration:** 13 minutes
- **Ramp-up:** 5 minutes
- **Sustained:** 5 minutes
- **Cool-down:** 3 minutes
- **Success Criteria:**
  - p95 < 800ms
  - p99 < 1500ms
  - Error rate < 8%
- **When to run:** Weekly (Sunday 2 AM)
- **Risk level:** Medium

### Stress Test (5000+ Users)
- **Duration:** 8 minutes
- **Ramp-up:** 3 minutes
- **Sustained:** 3 minutes
- **Cool-down:** 2 minutes
- **Success Criteria:**
  - System remains responsive
  - Graceful error handling
  - No cascading failures
- **When to run:** Monthly (1st of month)
- **Risk level:** High

## Performance Targets (SLA)

| Metric | Target | Critical | Unit |
|--------|--------|----------|------|
| p50 Response Time | 100 | - | ms |
| p95 Response Time | 500 | 1000 | ms |
| p99 Response Time | 1000 | 2000 | ms |
| Max Response Time | 2000 | 5000 | ms |
| Error Rate | 5 | 10 | % |
| Throughput | 1000 | - | RPS |
| Availability | 99.9 | 99.0 | % |

## File Structure

```
load-tests/
├── k6-tests/
│   ├── normal-load.js           # K6 normal load scenario
│   ├── peak-load.js             # K6 peak load scenario
│   └── stress-test.js           # K6 stress test scenario
│
├── locust/
│   ├── locustfile.py            # Locust test suite
│   └── requirements.txt          # Python dependencies
│
├── jmeter/
│   └── suplilist-load-test.jmx  # JMeter test plan
│
├── scripts/
│   ├── run-load-tests.sh        # Main test runner
│   ├── performance-validation.sh # Validation script
│   ├── ci-integration.sh        # CI/CD integration
│   └── extract-metrics.sh       # Metric extraction
│
├── config/
│   └── sla-targets.yaml         # SLA configuration
│
├── baselines/                    # Performance baselines
│   ├── normal-baseline.json
│   ├── peak-baseline.json
│   └── stress-baseline.json
│
├── results/                      # Test results (generated)
│   ├── k6-*.json
│   ├── k6-*.json.summary
│   ├── locust_stats.csv
│   └── validation-report-*.txt
│
├── README.md                     # Main guide
├── INSTALLATION.md              # Installation guide
├── TEST_PROCEDURES.md           # Test procedures
├── OPTIMIZATION_GUIDE.md        # Optimization guide
└── INDEX.md                     # This file
```

## Quick Start Commands

### Run Normal Load Test
```bash
cd /path/to/suplilist
TEST_SCENARIO=normal ./load-tests/scripts/run-load-tests.sh
```

### Run Peak Load Test
```bash
TEST_SCENARIO=peak ./load-tests/scripts/run-load-tests.sh
```

### Run Stress Test
```bash
TEST_SCENARIO=stress ./load-tests/scripts/run-load-tests.sh
```

### Validate Performance
```bash
./load-tests/scripts/performance-validation.sh load-tests/results/k6-*.json normal
```

### Start Locust Web UI
```bash
cd load-tests/locust
locust -f locustfile.py --host http://localhost:3000
# Visit http://localhost:8089
```

## Key Metrics

### Response Time Percentiles
- **p50:** 50th percentile (median)
- **p95:** 95th percentile (most users)
- **p99:** 99th percentile (worst users)
- **p100:** Maximum observed

### Throughput
- **RPS:** Requests per second
- **Throughput:** Total requests / duration

### Error Metrics
- **Error Rate:** Failed requests / total requests
- **Error Types:** Categorized by HTTP status code

### Resource Metrics
- **CPU Usage:** Processor utilization
- **Memory Usage:** RAM consumption
- **Database Connections:** Active database connections
- **Network Bandwidth:** Bytes transferred

## Tool Comparison

| Aspect | K6 | Locust | JMeter |
|--------|----|----|--------|
| Language | JavaScript | Python | Java |
| Ease of Use | Easy | Easy | Moderate |
| GUI Support | Web UI | Web UI | Full GUI |
| Distributed | Yes | Yes | Yes |
| Scripting | Flexible | Flexible | Limited |
| Results Export | JSON, CSV | CSV | JTL, XML |
| Best For | Modern APIs | Large-scale | Enterprise |
| Learning Curve | Low | Low | Moderate |

**Recommendation:** Use K6 for primary testing (modern, fast, JavaScript-based)

## Integration with CI/CD

### GitHub Actions
- Scheduled daily (2 AM UTC)
- Scheduled weekly peak test (Sunday 2 AM)
- Scheduled monthly stress test (1st of month 3 AM)
- Manual trigger available
- Auto-notifications to Slack

### GitLab CI
```yaml
load-test:
  stage: performance
  image: grafana/k6:latest
  script:
    - chmod +x load-tests/scripts/*.sh
    - ./load-tests/scripts/run-load-tests.sh
  only:
    - schedules
```

### Jenkins
```groovy
stage('Load Test') {
  steps {
    sh './load-tests/scripts/run-load-tests.sh'
    publishHTML([
      reportDir: 'load-tests/results/',
      reportFiles: '*.html',
      reportName: 'Load Test Report'
    ])
  }
}
```

## Monitoring & Alerts

### Alert Conditions
- **Warning:** p95 > 500ms or error rate > 5%
- **Critical:** p99 > 2000ms or error rate > 10%

### Alert Channels
- Slack (configured via webhook)
- PagerDuty (for critical issues)
- Email notifications
- GitHub check runs

### Escalation Path
1. Slack notification to #performance channel
2. PagerDuty incident creation
3. Auto-page on-call engineer
4. Incident runbook triggered

## Performance Optimization

### Quick Wins
1. Add database indexes
2. Implement Redis caching
3. Enable response compression
4. Optimize API payloads
5. Increase connection pools

### Medium Effort
1. Horizontal scaling
2. Query optimization
3. Implement async processing
4. Add load balancing
5. Database replication

### Long-term
1. Microservices architecture
2. Advanced caching strategies
3. CDN integration
4. Database sharding
5. Advanced monitoring

See [OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md) for detailed recommendations.

## Troubleshooting

### Common Issues
- **Server not responding:** Check if application is running
- **High error rate:** Check application logs, database connectivity
- **Memory issues:** Increase heap size, check for leaks
- **Slow queries:** Add missing indexes, optimize queries
- **Rate limiting:** Adjust thresholds or increase capacity

See [README.md#troubleshooting](./README.md#troubleshooting) for detailed solutions.

## Best Practices

1. **Always run tests in consistent environment**
2. **Compare with baseline for degradation**
3. **Monitor system resources during tests**
4. **Keep detailed logs and reports**
5. **Involve ops team for stress tests**
6. **Update baselines quarterly**
7. **Automate with CI/CD**
8. **Archive results for trending**

## Maintenance Schedule

### Daily
- Automated normal load test (2 AM)
- Review overnight test results

### Weekly
- Manual peak load test (Sunday)
- Review performance trends

### Monthly
- Stress test (1st of month)
- Capacity planning review

### Quarterly
- Baseline update
- Performance optimization review
- Documentation update

### Annually
- Full performance audit
- Capacity planning for next year
- Tool and library updates

## References

- [K6 Documentation](https://k6.io/docs/)
- [Locust Documentation](https://docs.locust.io/)
- [JMeter Documentation](https://jmeter.apache.org/)
- [MongoDB Performance](https://docs.mongodb.com/manual/administration/analyzing-mongodb-performance/)
- [Node.js Performance](https://nodejs.org/en/docs/guides/nodejs-performance-hooks/)

## Support & Contact

For issues, questions, or contributions:

1. **Documentation:** Check README.md and INSTALLATION.md
2. **Troubleshooting:** See TEST_PROCEDURES.md
3. **Optimization:** Refer to OPTIMIZATION_GUIDE.md
4. **DevOps Team:** Contact for infrastructure issues
5. **Engineering Lead:** For architectural concerns

## Version History

- **v1.0.0** (2024-01) - Initial release
  - K6 load tests (normal, peak, stress)
  - Locust test suite
  - JMeter test plan
  - Performance validation automation
  - CI/CD integration (GitHub Actions)
  - Comprehensive documentation

## License

Load testing suite is part of SupliList project. See main project LICENSE for details.

---

**Last Updated:** 2024-01-15  
**Maintained By:** DevOps Team  
**Next Review:** 2024-04-15
