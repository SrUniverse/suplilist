# Monitoring & Observability Guide

**Table of Contents**
1. [Health Check Endpoints](#health-check-endpoints)
2. [Key Metrics](#key-metrics)
3. [Alert Configuration](#alert-configuration)
4. [Log Aggregation](#log-aggregation)
5. [Distributed Tracing](#distributed-tracing)
6. [Dashboard Setup](#dashboard-setup)
7. [SLA Monitoring](#sla-monitoring)
8. [Incident Detection](#incident-detection)

---

## Health Check Endpoints

### Liveness Probe: /health/live

Verifies the server is running (no database check).

```bash
curl https://api.suplilist.com/health/live
```

**Response (200 OK)**:
```json
{
  "status": "ok",
  "timestamp": "2024-06-08T10:00:00Z",
  "uptime": 3600
}
```

**Interpretation**:
- `status: ok` = Server process alive
- If HTTP 503 = Server crash or hung process
- If timeout (no response) = Network or firewall issue

**Use Case**: Docker/Kubernetes container restart decisions

**Frequency**: Check every 10 seconds

### Readiness Probe: /health/ready

Checks if server can handle requests (database + cache).

```bash
curl https://api.suplilist.com/health/ready
```

**Response (200 OK)**:
```json
{
  "status": "ok",
  "database": "connected",
  "cache": "connected",
  "timestamp": "2024-06-08T10:00:00Z"
}
```

**Response (503 Service Unavailable - Degraded)**:
```json
{
  "status": "degraded",
  "database": "disconnected",
  "cache": "connected",
  "timestamp": "2024-06-08T10:00:00Z"
}
```

**Interpretation**:
- `database: connected` = MongoDB accessible
- `cache: connected` = Redis accessible
- If either is `disconnected`, server cannot process requests
- HTTP 503 means: remove from load balancer

**Use Case**: Load balancer health check

**Frequency**: Check every 5 seconds

### Monitoring Script

```bash
#!/bin/bash
# health-check.sh

LIVENESS_URL="https://api.suplilist.com/health/live"
READINESS_URL="https://api.suplilist.com/health/ready"
TIMEOUT=5

# Check liveness
LIVENESS=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT $LIVENESS_URL)
if [ "$LIVENESS" != "200" ]; then
  echo "CRITICAL: Liveness check failed (HTTP $LIVENESS)"
  exit 2
fi

# Check readiness
READINESS=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT $READINESS_URL)
if [ "$READINESS" != "200" ]; then
  echo "WARNING: Readiness check failed (HTTP $READINESS)"
  exit 1
fi

echo "OK: Both health checks passed"
exit 0
```

---

## Key Metrics

### Performance Metrics

#### Response Time

```
Metric:       HTTP request duration (milliseconds)
Target:       < 500ms (95th percentile)
Formula:      Time from request received to response sent
Excludes:     Network latency

// Monitoring query (Prometheus)
histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))
```

**Normal Range**: 50-300ms  
**Degraded**: 300-500ms  
**Critical**: > 500ms

#### Throughput

```
Metric:       Requests per second
Target:       10-50 RPS (depends on size)
Formula:      Total requests / time window

// Monitoring query
rate(http_requests_total[1m])
```

**Healthy**: Stable throughput  
**Warning**: 20% increase over baseline  
**Critical**: 50%+ increase or sudden drop

### Reliability Metrics

#### Error Rate

```
Metric:       Percentage of failed requests
Target:       < 1% (99% success rate)
Formula:      HTTP 5xx / Total requests × 100%
              5xx errors should not occur in normal operation

// Monitoring query
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
```

**Healthy**: < 0.1%  
**Warning**: 0.1% - 1%  
**Critical**: > 1%

#### Availability/Uptime

```
Metric:       System is accessible
Target:       99.9% (Nines: 99.9% = 3 nines)
Formula:      (Total time - Downtime) / Total time × 100%

SLA Targets:
99.9%  → 43 minutes downtime/month
99.95% → 22 minutes downtime/month
99.99% → 4 minutes downtime/month
```

**Monitoring**: Health check pass rate

### Cache Metrics

#### Cache Hit Rate

```
Metric:       Percentage of requests served from cache
Target:       > 80%
Formula:      Cache hits / (Hits + Misses) × 100%

Common cache keys:
- supplement:prices:{id}       (TTL: 1 hour)
- search:results:{query}       (TTL: 2 hours)
- user:profile:{id}            (TTL: 30 minutes)
```

**Healthy**: > 80%  
**Warning**: 60-80%  
**Critical**: < 60%

#### Cache Miss Rate

```
Metric:       Percentage of requests missed in cache
Target:       < 20%
Formula:      Cache misses / (Hits + Misses) × 100%

High miss rate causes:
- Server restart (cache cleared)
- Cache eviction (Redis full)
- New queries not in cache
```

### Database Metrics

#### Query Response Time

```
Metric:       Database query duration
Target:       < 100ms (95th percentile)
Formula:      Time from query start to result returned

Example slow query:
db.supplements.find().count()  // 1234ms (needs index)
db.supplements.find({id: "x"}) // 5ms (with index)
```

**Healthy**: < 50ms  
**Warning**: 50-100ms  
**Critical**: > 100ms

**Optimization**: Add missing indexes

#### Connection Pool Status

```
Metric:       Active database connections
Target:       Maintain 10-20 connections
Formula:      Current connections / Max connections

If pool exhausted:
- New requests queue up
- Response times increase
- Eventually timeout (HTTP 504)
```

**Healthy**: < 50% pool usage  
**Warning**: 50-80% usage  
**Critical**: > 80% usage

### Infrastructure Metrics

#### Memory Usage

```
Metric:       RAM consumed by process
Target:       Stable (not growing)
Formula:      Resident Set Size (RSS)

Healthy memory profile:
- Initial: 100MB
- After 1 hour: 120MB
- After 24 hours: 120MB (stable)

Rising memory = memory leak
```

**Action**: Restart instance if RSS > 500MB

#### CPU Usage

```
Metric:       Processor utilization
Target:       < 50% average
Formula:      CPU time / wall clock time × 100%

Healthy: Spiky during traffic, drops during idle
Unhealthy: Consistent high usage (> 70%)
```

**Action**: Scale horizontally or optimize hot code

---

## Alert Configuration

### Alert Rules

All alerts assume integrated alerting system (Prometheus, Grafana, PagerDuty, etc.)

#### CRITICAL: Error Rate > 1%

```
Severity:     Critical (page on-call)
Condition:    error_rate > 1% for 5 minutes
Action:       Immediate investigation
Impact:       Users experiencing failures

Alert message:
"Error rate critical: 2.5% over last 5m. 
 Check /health/ready status and logs for 5xx errors."

Escalation:   Immediate (0 min)
```

**Investigate**:
1. Check `/health/ready` status
2. Review last 50 error logs with high error rate
3. Check recent deployments
4. Check database connection health
5. If recoverable: restart instance
6. If persistent: trigger incident response

#### CRITICAL: Response Time > 500ms (p95)

```
Severity:     Critical (page on-call)
Condition:    p95_response_time > 500ms for 5 minutes
Action:       Investigate bottleneck
Impact:       User experience degraded

Alert message:
"Response time critical: p95 = 650ms. 
 Check database queries and API latency."

Escalation:   Immediate (0 min)
```

**Investigate**:
1. Check database slow query log
2. Check API external dependencies (Stripe, etc.)
3. Check network latency to database
4. Review recent code deployments
5. Consider rolling back deployment

#### WARNING: Cache Hit Rate < 60%

```
Severity:     Warning
Condition:    cache_hit_rate < 60% for 15 minutes
Action:       Investigate cache issues
Impact:       Database under higher load

Alert message:
"Cache hit rate low: 45% over last 15m.
 Check Redis connectivity and eviction."

Escalation:   After 15 minutes (notify team)
```

**Investigate**:
1. Check Redis memory usage
2. Check Redis connection count
3. Review Redis eviction policy (should be allkeys-lru)
4. Check if cache keys are being invalidated too often

#### WARNING: Memory Usage > 80%

```
Severity:     Warning
Condition:    memory_usage > 80% for 10 minutes
Action:       Plan restart during low-traffic window
Impact:       Risk of out-of-memory crash

Alert message:
"Memory usage high: 85% (1.7GB/2GB).
 Plan graceful restart."

Escalation:   After 20 minutes (notify ops)
```

**Action**:
1. Schedule restart during low-traffic window (off-peak)
2. Monitor for continued growth
3. If reaches 95%: trigger immediate restart

#### WARNING: Database Connectivity

```
Severity:     Warning  
Condition:    health_ready returns degraded for 2 minutes
Action:       Escalate to database team
Impact:       Requests will fail if database stays down

Alert message:
"Database connectivity issue: health/ready shows disconnected.
 Check MongoDB connection and network."

Escalation:   After 2 minutes (notify ops)
```

**Investigate**:
1. Check MongoDB cluster status
2. Check network connectivity
3. Check credentials in env variables
4. Check firewall rules
5. Check connection pool status

### Alert Routing

```yaml
# Example PagerDuty routing
Critical:   → Page on-call engineer immediately
Warning:    → Notify team Slack channel
Info:       → Log and track metrics dashboard
```

---

## Log Aggregation

### Log Format

All logs are structured JSON with consistent fields:

```json
{
  "timestamp": "2024-06-08T10:00:00.123Z",
  "level": "info",
  "logger": "SupplementController",
  "message": "Supplement fetched successfully",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user123",
  "supplementId": "creatina-monohidratada",
  "duration": 245,
  "statusCode": 200,
  "ip": "203.0.113.42",
  "userAgent": "Mozilla/5.0..."
}
```

### Log Levels

```
DEBUG   → Development only, very detailed
INFO    → Normal operation, important events
WARN    → Potential issues, recovery possible
ERROR   → Error occurred, may recover
FATAL   → Unrecoverable error, process exit
```

### Common Log Queries

#### Find errors for a specific user

```
level: ERROR AND userId: "user123"
```

**Output**: All errors for this user, timestamp ordered

#### Find slow requests

```
duration > 1000
```

**Output**: All requests > 1 second

#### Find API integration failures

```
level: ERROR AND message: "API call failed" AND source: "SupplementService"
```

#### Find all requests with trace ID

```
traceId: "550e8400-e29b-41d4-a716-446655440000"
```

**Output**: Complete request lifecycle (all service calls)

### Log Retention Policy

```
DEBUG logs    → 7 days
INFO logs     → 30 days
ERROR logs    → 90 days
AUDIT logs    → 365 days (compliance)
```

### Sensitive Data Masking

Never log:
- Passwords: `password: "***"`
- API keys: `apiKey: "sk_****...****"`
- PII: `email: "u***@example.com"`
- Credit cards: `card: "****-****-****-4242"`

---

## Distributed Tracing

### Trace ID Propagation

Each request gets a unique trace ID that flows through all services:

```
Client Request
    ↓
[X-Request-ID: 550e8400...] → API Gateway
    ↓
API Server (logs traceId: 550e8400...)
    ↓
Database Query (includes traceId in log)
    ↓
External API Call (X-Request-ID header)
```

### Trace Visualization

Example trace for "Get Supplement" request:

```
[550e8400...] GET /api/supplements/creatina-monohidratada
  ├─ [5ms] Middleware (cors, auth)
  ├─ [2ms] Get user from cache
  ├─ [15ms] Find supplement in database
  ├─ [12ms] Get prices from cache
  │   └─ [8ms] Cache miss → query provider API
  ├─ [3ms] Check user permissions
  └─ [5ms] Format response
Total: 42ms
```

### Trace Query Examples

```
# Find all requests for a specific user
trace.userId: "user123" span.duration > 500

# Find errors in specific service
trace.service: "SupplementService" span.status: "error"

# Find slow database queries
trace.component: "mongoose" span.duration > 100

# Find failed API integrations
trace.component: "http" span.httpStatus: 5xx
```

---

## Dashboard Setup

### Grafana Dashboard Example

**Panels to include**:

1. **Request Volume (top)**
   - Type: Graph
   - Query: `rate(http_requests_total[1m])`
   - Shows: Requests/second over time

2. **Error Rate (top right)**
   - Type: Gauge
   - Query: `http_error_rate`
   - Target: < 1%
   - Color: Red if > 1%, yellow if > 0.5%

3. **Response Time (middle)**
   - Type: Graph
   - Query: Percentiles (p50, p95, p99)
   - Shows: Distribution of response times

4. **Cache Hit Rate (bottom left)**
   - Type: Gauge
   - Query: `cache_hit_rate`
   - Target: > 80%

5. **Active Connections (bottom middle)**
   - Type: Graph
   - Query: `active_db_connections`
   - Alert: > 50 connections

6. **Memory Usage (bottom right)**
   - Type: Graph
   - Query: `process_memory_rss_bytes`
   - Alert: > 80% of max

### Prometheus Queries

```prometheus
# Request rate per endpoint
sum by (path) (rate(http_requests_total[5m]))

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) /
sum(rate(http_requests_total[5m]))

# Response time percentiles
histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))
histogram_quantile(0.99, rate(http_request_duration_ms_bucket[5m]))

# Database query duration
avg by (operation) (rate(db_query_duration_ms[5m]))

# Cache hit ratio
sum(rate(cache_hits_total[5m])) /
(sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))
```

---

## SLA Monitoring

### SLA Definition

```
99.9% Uptime SLA
Target: Service available 99.9% of the time
Allowed downtime: 43 minutes/month (30 days)

Uptime = (Total Monitoring Time - Downtime) / Total Monitoring Time
```

### SLA Calculation

```
Month:        June 2024
Total minutes: 30 days × 24 hours × 60 min = 43,200 minutes
Target:       99.9% × 43,200 = 43,156.8 minutes (allowed)
Allowed down: 43,200 - 43,156.8 = 43.2 minutes

Actual downtime: 15 minutes (deployment issue)
Uptime: (43,200 - 15) / 43,200 = 99.965% ✓ (exceeds target)
```

### SLA Status Page

Public page showing:
- Current uptime status
- Monthly uptime percentage
- Last 90 days history
- Incident timeline

```html
<div class="sla-status">
  <h2>Service Status</h2>
  <div class="indicator operational"></div>
  <p>All systems operational</p>
  
  <h3>Uptime</h3>
  <p>June 2024: 99.965% (15 min downtime)</p>
  
  <h3>Recent Incidents</h3>
  <ul>
    <li>Jun 5, 2024: Database migration (15 min)</li>
  </ul>
</div>
```

---

## Incident Detection

### Automatic Incident Detection

The monitoring system automatically detects incidents based on:

```
1. Error rate spike (> 1% for 5 min)
2. Response time spike (> 500ms p95 for 5 min)
3. Health check failure
4. Database disconnection
5. Out of memory
6. High CPU usage (> 90% for 10 min)
```

### Incident Severity Levels

```
CRITICAL:  Service unavailable or > 5% errors
HIGH:      Degraded performance or 1-5% errors
MEDIUM:    Warnings or < 1% errors with user impact
LOW:       Informational warnings only
```

### Manual Incident Trigger

```bash
# If automated detection fails, manually trigger
curl -X POST https://monitoring.example.com/incidents \
  -H "Authorization: Bearer $ALERT_TOKEN" \
  -d '{
    "title": "Database connection pool exhausted",
    "severity": "critical",
    "description": "Connection pool at 100%, new requests queuing"
  }'
```

---

**Last Updated**: June 2024  
**Maintainer**: DevOps Team  
**Related Docs**: [DEPLOYMENT_BACKEND.md](./DEPLOYMENT_BACKEND.md), [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md)
