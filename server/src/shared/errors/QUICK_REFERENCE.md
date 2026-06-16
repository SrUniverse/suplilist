# Error Handling Quick Reference

## One-Liner Error Usage

```typescript
import { ValidationError, NotFoundError, AuthenticationError, 
         ConflictError, ExternalServiceError, RateLimitError } from './app-error.js';
import { asyncHandler } from '../../middleware/error-handler.middleware.js';

// Validation error
throw new ValidationError('Email is required', { field: 'email' });

// Not found
throw new NotFoundError('User not found', { userId: '123' });

// Duplicate/Conflict
throw new ConflictError('Email already exists', { email });

// Authentication failure
throw new AuthenticationError('Invalid credentials', { reason: 'password_mismatch' });

// Forbidden (permission denied)
throw new ForbiddenError('Cannot access this resource', { resourceId: '123' });

// External service failure
throw new ExternalServiceError('Payment failed', 'stripe', { amount: 100 });

// Rate limit
throw new RateLimitError('Too many requests', 60, { limit: 100 });

// Server error
throw new InternalServerError('Something went wrong', { context: 'data' });
```

## Route Handler Pattern

```typescript
import { asyncHandler } from '../../middleware/error-handler.middleware.js';

router.post('/users', asyncHandler(async (req, res) => {
  // Throw errors - they're automatically caught and formatted
  throw new ValidationError('Name is required', { field: 'name' });
  
  // No try-catch needed!
}));
```

## Service Layer Pattern

```typescript
export class UserService {
  async findById(id: string) {
    try {
      const user = await User.findById(id);
      if (!user) throw new NotFoundError('User not found', { userId: id });
      return user;
    } catch (error) {
      if (error instanceof AppError) throw error; // Re-throw app errors
      throw new DatabaseError('Failed to fetch user', { userId: id });
    }
  }
}
```

## Error Classes by HTTP Status

| Status | Error Class | Use Case |
|--------|-------------|----------|
| 400 | `ValidationError` | Input validation failed |
| 400 | `BadRequestError` | Malformed request |
| 401 | `UnauthorizedError` | Missing credentials |
| 401 | `AuthenticationError` | Invalid credentials |
| 403 | `ForbiddenError` | Permission denied |
| 404 | `NotFoundError` | Resource not found |
| 409 | `ConflictError` | Duplicate resource |
| 429 | `RateLimitError` | Too many requests |
| 500 | `InternalServerError` | Unexpected error |
| 500 | `DatabaseError` | Database operation failed |
| 502 | `ExternalServiceError` | External API failed |
| 503 | `ServiceUnavailableError` | Service temporarily down |
| 504 | `GatewayTimeoutError` | Request timeout |

## Resilience Patterns

```typescript
import { retry, CircuitBreaker, Bulkhead, fallback, timeout } from '../utils/resilience.js';

// Retry with exponential backoff
const result = await retry(
  () => fetchFromAPI(),
  { maxAttempts: 3, initialDelayMs: 100, backoffMultiplier: 2 }
);

// Circuit breaker
const breaker = new CircuitBreaker(
  () => callExternalAPI(),
  { failureThreshold: 5, successThreshold: 2, timeout: 60000, name: 'api' }
);
const result = await breaker.execute();

// Bulkhead (limit concurrency)
const bulkhead = new Bulkhead(5);
const result = await bulkhead.execute(() => someAsyncOp());

// Fallback strategy
const data = await fallback(
  () => fetchFromPrimary(),
  () => fetchFromCache(),
  () => ({ default: true })
);

// Timeout
const result = await timeout(somePromise(), 5000); // 5 seconds
```

## Monitoring & Alerts

```typescript
import { monitoringService } from '../services/monitoring.service.js';
import { alertingService } from '../services/alerting.service.js';

// Check monitoring status
const status = monitoringService.getMonitoringStatus();
console.log(status.rulesEvaluated); // Number of rules evaluated

// Check SLO status
const sloStatus = monitoringService.getSLOStatus();
if (sloStatus['API Availability'].status === 'breached') {
  // Take action
}

// Get alert history
const recentAlerts = alertingService.getHistory(100);

// Get recent alerts (in dedup window)
const active = alertingService.getRecentAlerts();
```

## Error Response Format

Every error returns:
```json
{
  "success": false,
  "error": "error_code",
  "message": "User-friendly message",
  "requestId": "req_...",
  "metadata": { "field": "value" }
}
```

Status code is automatically determined by error class.

## Best Practices Checklist

- [ ] Use `asyncHandler` for all async route handlers
- [ ] Always pass metadata to errors (field names, IDs, etc.)
- [ ] Re-throw AppErrors in catch blocks
- [ ] Wrap unexpected errors in appropriate error class
- [ ] Include request ID when available
- [ ] Use specific error class matching HTTP status
- [ ] Add descriptive error messages for debugging
- [ ] Test all error paths in unit tests
- [ ] Monitor error rates in production

## Common Mistake → Fix

**Before (❌ Wrong)**
```typescript
router.post('/users', (req, res) => {
  if (!req.body.email) {
    return res.status(400).json({ error: 'Email required' });
  }
  // ... more manual error handling
});
```

**After (✅ Correct)**
```typescript
router.post('/users', asyncHandler(async (req, res) => {
  if (!req.body.email) {
    throw new ValidationError('Email required', { field: 'email' });
  }
  // ... no manual error handling needed
}));
```

## Prometheus Queries

```promql
# Error rate by endpoint (last 5 minutes)
rate(errors_by_endpoint_total[5m])

# Total errors in last hour
increase(errors_total[1h])

# Critical errors
critical_errors_count

# Server error ratio
server_error_ratio

# Error rate by status code
errors_total / requests_total * 100
```

## Environment Configuration

```bash
# Required for alerting
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Optional
PAGERDUTY_INTEGRATION_KEY=your-key
ALERT_WEBHOOK_URL=https://your-api.com/alerts
ALERT_MIN_LEVEL=medium  # critical|high|medium|low
```

## Debugging Tips

1. **Missing error context?**
   - Pass metadata to error constructor
   - Check log masking isn't hiding data

2. **Alerts not sending?**
   - Verify webhook URL is correct
   - Check minimum severity level
   - Look for deduplication (5-minute window)

3. **Seeing too many alerts?**
   - Increase thresholds in alert-rules.config.ts
   - Increase evaluation duration
   - Raise minimum severity level

4. **Stack traces in production?**
   - Check NODE_ENV is set to 'production'
   - Verify middleware is catching errors

## Support Resources

- **Complete Guide**: `ERROR_HANDLING.md`
- **Migration Steps**: `../../../MIGRATION_GUIDE.md`
- **Examples**: `examples/error-handling.example.ts`
- **Alert Rules**: `../config/alert-rules.config.ts`
- **Metrics Service**: `../services/error-metrics.service.ts`
