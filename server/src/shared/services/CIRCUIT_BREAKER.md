# Circuit Breaker Pattern - SupliList Implementation

## Overview

The Circuit Breaker pattern prevents cascading failures by stopping requests to a failing service and allowing it time to recover. This implementation wraps the Firecrawl service to maintain system resilience when web scraping fails.

## States

```
CLOSED (normal operation)
    ↓ (5 failures in 60s)
OPEN (fast fail, use fallback)
    ↓ (30s timeout)
HALF_OPEN (test 1 request)
    ↓ (success) or (failure)
CLOSED (recovered) ← or → OPEN (still failing)
```

### CLOSED
- **Default state** - circuit is functioning normally
- Requests pass through to the real service
- Failures are counted and tracked within a 60-second window
- If failures reach threshold (5), circuit trips to OPEN

### OPEN
- **Service unavailable** - circuit has tripped
- Requests fail immediately (fail-fast) without calling the service
- Fallback handler is used instead (mock data returned)
- After 30 seconds, transitions to HALF_OPEN to test recovery

### HALF_OPEN
- **Recovery testing** - attempts to verify if service is back
- Allows exactly 1 request to test the service
- If request succeeds: transitions to CLOSED, resumes normal operation
- If request fails: transitions back to OPEN, continues using fallback

## Configuration

```typescript
const config = {
  name: 'firecrawl',                    // Unique circuit breaker identifier
  failureThreshold: 5,                  // Failures to trip circuit
  windowMs: 60000,                      // 60 second failure window
  timeoutMs: 30000,                     // 30 second wait before HALF_OPEN
  halfOpenRequests: 1,                  // 1 test request allowed in HALF_OPEN
  onStateChange: (prev, next) => {      // Optional: called on state transitions
    console.log(`State: ${prev} → ${next}`);
  }
};
```

## Usage

### Basic Usage with Fallback

```typescript
import { circuitBreakerRegistry } from './circuit-breaker.service.js';

const breaker = circuitBreakerRegistry.getOrCreate('firecrawl', {
  failureThreshold: 5,
  windowMs: 60000,
  timeoutMs: 30000,
});

// Execute with automatic fallback
const result = await breaker.execute(
  () => riskyOperation(),                    // Main operation
  () => getFallbackData()                    // Fallback if circuit is OPEN
);
```

### Synchronous Operations

```typescript
const result = breaker.executeSync(
  () => riskySync(),
  () => fallbackSync()
);
```

### Monitoring State

```typescript
const status = breaker.getStatus();
console.log(status);
// {
//   state: 'CLOSED' | 'OPEN' | 'HALF_OPEN',
//   failureCount: 3,
//   lastStateChange: Date,
//   successCountInHalfOpen: 0
// }

// Get all registered breakers status
const allStatus = circuitBreakerRegistry.getAllStatus();
```

### Manual Reset

```typescript
// Reset specific breaker
circuitBreakerRegistry.reset('firecrawl');

// Reset all breakers
circuitBreakerRegistry.resetAll();
```

## Integration with Firecrawl Service

The Firecrawl service automatically:

1. **Wraps scraping requests** with circuit breaker protection
2. **Falls back to mock data** when circuit is OPEN
3. **Records metrics** on state transitions and failures
4. **Logs state changes** for observability

### Example Flow

```
User requests: "search for creatina"
  ↓
FirecrawlService.searchSupplementOnDemand('creatina')
  ↓
circuitBreaker.execute(
  performScrape,        // Try real Firecrawl API
  getMockFallbackData   // Use cached mock if circuit is OPEN
)
  ↓
Returns parsed supplements (either real or fallback)
```

## Metrics

Circuit breaker tracks the following metrics:

| Metric | Type | Description |
|--------|------|-------------|
| `circuit_breaker_state` | Gauge | Current state (0=CLOSED, 1=OPEN, 2=HALF_OPEN) |
| `circuit_breaker_state_changes_total` | Counter | Total state transitions |
| `circuit_breaker_failures_total` | Counter | Failed requests that triggered state changes |
| `circuit_breaker_fallback_total` | Counter | Times fallback was used |
| `circuit_breaker_recoveries_total` | Counter | Successful recoveries (HALF_OPEN → CLOSED) |
| `firecrawl_requests_success_total` | Counter | Successful Firecrawl API calls |

Access metrics via:

```typescript
const prometheusMetrics = metricsService.getMetrics();
console.log(prometheusMetrics);
```

## Fallback Strategy

When the circuit is OPEN, the service returns cached mock supplement data:

```typescript
{
  name: 'Whey Protein Concentrado 900g',
  price: 89.00,
  source: 'amazon',
  url: 'https://amazon.com.br/s?k=whey+protein',
  // ... other fields
}
```

**Advantages:**
- App remains functional during outages
- Users see cached content instead of errors
- No disruption to user experience
- Gradually recovers as service becomes available

## Error Handling

### When Circuit is CLOSED
- Errors propagate immediately
- Retries with exponential backoff (up to 3 attempts)
- Failures counted toward threshold

### When Circuit is OPEN
- Fast fail - no network request attempted
- Fallback handler is invoked
- User gets mock data instead of error

### When Circuit is HALF_OPEN
- One test request is allowed
- If it succeeds: circuit closes, normal operation resumes
- If it fails: circuit reopens, continue using fallback

## Monitoring and Alerts

### Key Indicators

1. **State is OPEN for extended period** → Service is still unhealthy
2. **Frequent state changes** → Service is flaky
3. **High fallback usage** → Serving stale/cached data
4. **State never transitions to HALF_OPEN** → Timeout too short

### Observability

Monitor via logs:
```
[FirecrawlService] Circuit Breaker State Change: CLOSED → OPEN
[FirecrawlService] Circuit breaker OPEN - using mock fallback
```

Monitor via metrics:
```prometheus
circuit_breaker_state{name="firecrawl"} 1
circuit_breaker_fallback_total 42
```

## Testing

### Unit Tests
Run: `npm run test -- circuit-breaker.service.test.ts`

Tests cover:
- State transitions
- Threshold counting
- Timeout behavior
- Fallback invocation
- Recovery flow
- Edge cases

### Integration Tests
Run: `npm run test -- firecrawl-circuit-breaker.integration.test.ts`

Tests cover:
- Firecrawl integration
- Graceful degradation
- Real vs mock data
- Metrics recording
- End-to-end scenarios

## Best Practices

1. **Set appropriate thresholds**
   - `failureThreshold`: Must be > 1 (typically 5)
   - `windowMs`: How long to count failures (60s is standard)

2. **Choose meaningful timeout**
   - `timeoutMs`: 30s is reasonable for web services
   - Too short: flaps between OPEN/HALF_OPEN
   - Too long: slow recovery from transient issues

3. **Implement effective fallbacks**
   - Return cached data (as SupliList does)
   - Return sensible defaults
   - Never return null/undefined without context

4. **Monitor metrics**
   - Track state changes
   - Alert on prolonged OPEN state
   - Watch fallback usage

5. **Log state transitions**
   - Always log when state changes
   - Include context (service name, failure count)
   - Use structured logging for parsing

## Production Deployment

### Pre-deployment Checklist

- [ ] Circuit breaker thresholds tuned to service SLAs
- [ ] Fallback data is fresh and meaningful
- [ ] Metrics are being collected
- [ ] Logging is configured
- [ ] Monitoring/alerts are set up
- [ ] Tests pass locally and in CI

### Metrics to Export

```typescript
// In your metrics endpoint
const metricsEndpoint = '/metrics';

app.get(metricsEndpoint, (req, res) => {
  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(metricsService.getMetrics());
});
```

### Monitoring Queries

Prometheus/Grafana:
```promql
# Current circuit state
circuit_breaker_state{name="firecrawl"}

# Error rate
rate(circuit_breaker_failures_total[5m])

# Fallback usage
rate(circuit_breaker_fallback_total[5m])

# State change frequency
rate(circuit_breaker_state_changes_total[5m])
```

## Advanced: Custom Circuit Breakers

Create circuit breakers for other services:

```typescript
const dbBreaker = circuitBreakerRegistry.getOrCreate('mongodb', {
  failureThreshold: 3,
  windowMs: 30000,
  timeoutMs: 20000,
});

const result = await dbBreaker.execute(
  () => db.query(),
  () => getCachedResult()
);
```

## References

- Martin Fowler - Circuit Breaker Pattern
- Release It! Design and Deploy Production-Ready Software
- SRE: Reliable, Scalable, and Maintainable Software
