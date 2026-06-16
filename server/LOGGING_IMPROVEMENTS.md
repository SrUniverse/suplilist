# Logging Improvements Documentation

## Overview

Enhanced logging system provides comprehensive request/response tracking, performance monitoring, and error context capture.

---

## Log Levels & Format

### Log Level Hierarchy

```
ERROR (0)   - Critical errors, 5xx responses, system failures
WARN  (1)   - Performance issues, degraded state, 4xx responses
INFO  (2)   - Request completion, successful operations
DEBUG (3)   - Detailed operation info, cache operations
TRACE (4)   - Very detailed diagnostic info (verbose)
```

### Structured JSON Format

All logs are in JSON format for easy parsing and aggregation:

```json
{
  "timestamp": "2026-01-15T10:23:45.123Z",
  "level": "INFO",
  "message": "Request completed",
  "service": "suplilist-api",
  "requestId": "req_1705314225123_abc123def456",
  "method": "GET",
  "path": "/api/supplements/search",
  "statusCode": 200,
  "duration_ms": 125,
  "request_size_bytes": 45,
  "response_size_kb": "8.23",
  "compression_ratio_percent": "62",
  "cache_hits": 1,
  "cache_misses": 0,
  "db_time_ms": 45,
  "userId": "user-123"
}
```

---

## Request/Response Logging

### What's Logged

**For every request**:
1. Request received (DEBUG level)
   - Method, path, query params
   - Content-Type header
   - Request size (bytes)
   - User-Agent

2. Request completed (INFO/WARN level)
   - Status code
   - Total duration (ms)
   - Request and response sizes
   - Compression ratio
   - Cache hits/misses
   - Database time
   - User context (if authenticated)

### Example: Complete Request Lifecycle

```
[DEBUG] Request received
{
  "requestId": "req_1705314225123_abc123",
  "method": "GET",
  "path": "/api/supplements/search",
  "query": { "q": "omega" },
  "contentType": "application/json",
  "requestSize_bytes": 45,
  "userAgent": "Mozilla/5.0..."
}

[DEBUG] Cache miss
{
  "requestId": "req_1705314225123_abc123",
  "cacheMisses": 1
}

[DEBUG] Database Operation
{
  "operation": "find",
  "collection": "supplements",
  "duration_ms": 45
}

[INFO] Request completed
{
  "requestId": "req_1705314225123_abc123",
  "method": "GET",
  "path": "/api/supplements/search",
  "statusCode": 200,
  "duration_ms": 125,
  "request_size_bytes": 45,
  "response_size_kb": "8.23",
  "compression_ratio_percent": "62",
  "cache_hits": 0,
  "cache_misses": 1,
  "db_time_ms": 45,
  "userId": "user-123"
}
```

---

## Performance Metrics Logged

### Request Size Tracking

```json
{
  "request_size_bytes": 245,
  "response_size_bytes": 1024,
  "response_size_kb": "1.00"
}
```

**Use case**: Identify large requests/responses consuming bandwidth

### Response Time Tracking

```json
{
  "duration_ms": 125
}
```

**Use case**: Identify slow endpoints, track performance regressions

### Compression Ratio

```json
{
  "compression_ratio_percent": "62"
}
```

**Interpretation**: 62% size reduction from gzip compression

### Cache Performance

```json
{
  "cache_hits": 3,
  "cache_misses": 1
}
```

**Use case**: Calculate cache hit rate, identify cache inefficiencies

### Database Timing

```json
{
  "db_time_ms": 45,
  "dbTimings": [
    { "operation": "find", "duration": 30 },
    { "operation": "aggregate", "duration": 15 }
  ]
}
```

**Use case**: Identify slow database queries, query optimization opportunities

---

## Performance Alerts

### Thresholds

Requests exceeding thresholds are flagged with alert:

```json
{
  "performance_alert": "SLOW_REQUEST"
}
```

| Alert Type | Threshold | Severity |
|---|---|---|
| `SLOW_REQUEST` | > 2000 ms | HIGH |
| `LARGE_RESPONSE` | > 100 KB | MEDIUM |
| `SLOW_QUERY` | > 500 ms | HIGH |

### Finding Performance Issues

```bash
# Find slow requests
grep "SLOW_REQUEST" logs/combined.log | jq '.duration_ms' | sort -n | tail -20

# Find large responses
grep "LARGE_RESPONSE" logs/combined.log | jq '.response_size_kb' | sort -n | tail -10

# Find slow queries
grep "SLOW_QUERY" logs/combined.log | jq '.db_time_ms' | sort -n | tail -10
```

---

## Error Logging

### Error Response Format

```json
{
  "timestamp": "2026-01-15T10:23:45.123Z",
  "level": "WARN",
  "message": "Request completed",
  "requestId": "req_1705314225123_abc123",
  "method": "GET",
  "path": "/api/auth/login",
  "statusCode": 401,
  "duration_ms": 45,
  "error": "unauthorized",
  "message": "Invalid credentials",
  "errors": [
    {
      "message": "Invalid email or password",
      "context": { "email": "user@example.com" }
    }
  ],
  "userId": "unknown",
  "timestamp": "2026-01-15T10:23:45.123Z"
}
```

### Error Tracking Context

Errors include context from the request:

```json
{
  "error": "validation_error",
  "message": "Invalid email format",
  "details": [
    {
      "field": "email",
      "code": "invalid_email",
      "message": "Must be a valid email address"
    }
  ]
}
```

### Finding Errors

```bash
# Find all errors
grep '"level": "ERROR"' logs/error.log | head -20

# Find errors by status code
grep '"statusCode": 500' logs/combined.log | head -10

# Find errors by user
grep '"userId": "user-123"' logs/combined.log | grep '"statusCode": 4'
```

---

## Distributed Tracing

### Trace ID

Every request has a unique trace ID for debugging:

```
X-Trace-ID: 1705314225123-a1b2c3d4e5f6g7h8
```

**Format**: `<timestamp>-<random>`
- Timestamp: Request start time (milliseconds)
- Random: 8-byte random hex string

### Trace ID in Responses

```json
{
  "success": true,
  "data": { ... },
  "traceId": "1705314225123-a1b2c3d4e5f6g7h8"
}
```

### Correlating Logs with Trace ID

Find all logs for a request:

```bash
# Find all logs for a trace
grep "1705314225123-a1b2c3d4e5f6g7h8" logs/combined.log

# Count events in a trace
grep "1705314225123-a1b2c3d4e5f6g7h8" logs/combined.log | wc -l

# Timeline of a trace
grep "1705314225123-a1b2c3d4e5f6g7h8" logs/combined.log | \
  jq '.timestamp, .message' | paste - -
```

### Trace Metadata Storage

Trace metadata is stored in Redis for 24 hours:

```bash
# Retrieve trace metadata
redis-cli GET "trace:1705314225123-a1b2c3d4e5f6g7h8"

{
  "method": "GET",
  "path": "/api/supplements",
  "status": 200,
  "duration": 125,
  "dbDuration": 45,
  "ip": "203.0.113.45",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2026-01-15T10:23:45.123Z"
}
```

---

## Performance Analytics

### Percentile Calculation

Requests are analyzed to calculate percentiles:

```json
{
  "level": "DEBUG",
  "message": "Performance percentiles",
  "endpoint": "/api/supplements",
  "samples": 100,
  "p50_ms": 120,
  "p95_ms": 280,
  "p99_ms": 450,
  "min_ms": 85,
  "max_ms": 520
}
```

**Interpretation**:
- p50: Median request time (50% of requests faster)
- p95: 95% of requests complete within this time
- p99: 99% of requests complete within this time

### Using Percentiles for SLOs

Define Service Level Objectives:

```
SLO: 95% of requests complete within p95 latency
If p95 = 280ms, then 95% of requests should be < 280ms
```

### Trending Analysis

Track percentiles over time:

```bash
# Get p95 latency trend over time
grep "Performance percentiles" logs/combined.log | \
  jq '.timestamp, .endpoint, .p95_ms' | \
  paste - - - | \
  sort
```

---

## Cache Operation Logging

### Cache Hits and Misses

```json
{
  "level": "DEBUG",
  "message": "Cache Operation",
  "requestId": "req_1705314225123_abc123",
  "operation": "get",
  "key": "supplements:search:omega",
  "hit": true
}
```

### Cache Hit Rate Calculation

```bash
# Calculate cache hit rate per endpoint
HITS=$(grep '"hit": true' logs/combined.log | grep "supplements" | wc -l)
MISSES=$(grep '"hit": false' logs/combined.log | grep "supplements" | wc -l)
RATE=$((HITS * 100 / (HITS + MISSES)))
echo "Supplements cache hit rate: $RATE%"
```

### Cache Key Patterns

Monitor cache by key pattern:

```bash
# Find all cache operations for a specific key pattern
grep '"key": "supplements:*"' logs/combined.log

# Count hits vs misses by key pattern
grep '"key": "supplements:*"' logs/combined.log | \
  grep '"hit": true' | wc -l  # Hits

grep '"key": "supplements:*"' logs/combined.log | \
  grep '"hit": false' | wc -l  # Misses
```

---

## Database Operation Logging

### Database Timing

```json
{
  "level": "DEBUG",
  "message": "Database Operation",
  "operation": "find",
  "collection": "supplements",
  "duration_ms": 45
}
```

### Slow Query Detection

```bash
# Find slow database queries
grep "duration_ms" logs/combined.log | \
  awk -F'"duration_ms": ' '{print $2}' | \
  awk -F',' '{print $1}' | \
  awk '$1 > 500 {print}' | sort -n | tail -20
```

### Query Optimization Opportunities

Identify expensive operations:

```bash
# Find most expensive collections
grep '"message": "Database Operation"' logs/combined.log | \
  jq '.collection, .duration_ms' | \
  paste - - | \
  sort -t':' -k2 -rn | head -10
```

---

## Log Masking & Privacy

### What Gets Masked

Sensitive data is automatically masked from logs:

| Pattern | Replacement | Reason |
|---|---|---|
| IP addresses | `xxx.xxx.xxx.xxx` | Privacy |
| Tokens | `***` | Security |
| Emails | `u***@example.com` | GDPR |
| Phone numbers | `+55 ***-****` | Privacy |
| URLs with IDs | `/api/users/***` | Privacy |

### Example: Masked Logs

```json
{
  "message": "User login from xxx.xxx.xxx.***",
  "email": "u***@example.com",
  "token": "***",
  "url": "/api/users/***"
}
```

### Verifying Masking

Check logs contain no sensitive data:

```bash
# Look for exposed patterns
grep -i "email" logs/combined.log | grep -v "u\*\*\*"  # Should be empty
grep "Bearer " logs/combined.log  # Should be empty
grep "XXX.XXX" logs/combined.log  # Should not have real IPs
```

---

## Log Queries & Analysis

### Common Log Analysis Commands

```bash
# 1. Find errors in last hour
find logs -mmin -60 -name "*.log" -exec grep "ERROR" {} \;

# 2. Slowest endpoints (p99 latency)
jq 'select(.p99_ms > 200)' logs/combined.log

# 3. Cache hit rate by endpoint
grep "cache" logs/combined.log | \
  jq '.endpoint, .cache_hits, .cache_misses' | \
  sort | uniq -c

# 4. Requests with large responses
jq 'select(.response_size_kb > 50)' logs/combined.log

# 5. Failed authentication attempts
grep '401\|403' logs/combined.log | jq '.path'

# 6. Database slow query log
grep "SLOW_QUERY\|db_time_ms.*>" logs/combined.log | \
  jq '.db_time_ms' | sort -rn | head -20

# 7. Memory usage over time
grep "memory" logs/combined.log | \
  jq '.timestamp, .usage' | \
  paste - -
```

### Using jq for JSON Parsing

```bash
# Pretty print a log
cat logs/combined.log | jq '.'

# Filter by status code
cat logs/combined.log | jq 'select(.statusCode == 200)'

# Extract specific fields
cat logs/combined.log | jq '.requestId, .duration_ms, .response_size_kb'

# Calculate statistics
cat logs/combined.log | jq '.duration_ms' | \
  awk '{sum+=$1; sumsq+=$1*$1; count++} END {
    mean=sum/count;
    variance=sumsq/count - mean*mean;
    stddev=sqrt(variance);
    print "Mean:", mean, "StdDev:", stddev
  }'
```

---

## Alerting Rules

### Recommended Alert Thresholds

```
# Error rate alert
error_rate > 5% for 5 minutes
Action: Page on-call engineer

# Slow request alert
p95_latency > 500ms for 10 minutes
Action: Alert ops team

# Cache hit rate drop
cache_hit_rate < 30% for 15 minutes
Action: Investigate cache issues

# Memory usage alert
memory_usage > 80% for 10 minutes
Action: Alert ops team, consider scaling

# Database latency alert
db_time_ms > 1000 for 5 minutes
Action: Alert database team
```

---

## Best Practices

### 1. Regularly Review Logs

```bash
# Weekly log review
grep "performance_alert" logs/combined.log | wc -l
# If > 100, investigate performance

grep "ERROR" logs/error.log | wc -l
# If > 10, investigate errors
```

### 2. Archive Old Logs

```bash
# Archive logs older than 7 days
find logs -mtime +7 -name "*.log" -exec gzip {} \;
find logs -mtime +30 -name "*.log.gz" -delete
```

### 3. Monitor Log Growth

```bash
# Check log file sizes
ls -lh logs/

# If > 1GB, rotate more frequently
```

### 4. Set Up Centralized Logging

Recommended: Use CloudWatch, Datadog, or ELK stack for:
- Searchable log history (more than local disk)
- Real-time alerts
- Log correlation across services
- Long-term retention

---

## Troubleshooting

### Issue: No logs appearing

1. Check if logging is enabled:
   ```bash
   ls -la logs/
   ```

2. Check NODE_ENV:
   ```bash
   echo $NODE_ENV
   # Should be "production" or "development"
   ```

3. Check permissions:
   ```bash
   chmod 755 logs/
   chmod 644 logs/*.log
   ```

### Issue: Logs too large

1. Enable log rotation (recommended):
   ```bash
   npm install winston-daily-rotate-file
   ```

2. Or, manually rotate:
   ```bash
   mv logs/combined.log logs/combined.$(date +%Y%m%d).log
   gzip logs/combined.*.log
   ```

### Issue: Performance impact from logging

Logging is optimized for minimal impact:
- Async file writes
- JSON buffering
- Sampling on high-traffic endpoints (optional)

If still an issue, reduce log level:
```typescript
// In logger.ts
logger.level = 'warn'; // Only warnings and errors
```

---

## Document History

| Date | Changes | Author |
|---|---|---|
| 2026-01-15 | Initial logging improvements documentation | Claude |
| | Request/response logging | |
| | Performance metrics tracking | |
| | Distributed tracing | |
| | Performance alerts | |
| | Cache operation logging | |

