# SupliList Error Handling & Monitoring System

## Overview

SupliList implements a comprehensive, standardized error handling and monitoring system with:

1. **Standardized Error Classes** - Consistent error responses across the API
2. **Global Error Handler** - Centralized error processing and logging
3. **Error Metrics** - Prometheus metrics for error tracking and analysis
4. **Alerting System** - Automatic alerts for critical errors
5. **Monitoring Service** - Rule-based evaluation of metrics with configurable thresholds
6. **Structured Logging** - Complete error context and stack traces

## Error Handling Architecture

### 1. Error Classification

All errors inherit from `AppError` and include:

- **Error Code** - Standardized error identifier (e.g., `validation_error`)
- **HTTP Status** - Appropriate HTTP status code
- **Error Message** - User-friendly error description
- **Metadata** - Additional context (field names, IDs, etc.)
- **Timestamp** - When error occurred
- **Request ID** - Correlation ID for tracing

#### Error Types

**Client Errors (4xx)**
- `VALIDATION_ERROR` (400) - Input validation failed
- `BAD_REQUEST` (400) - Malformed request
- `UNAUTHORIZED` (401) - Missing authentication
- `AUTHENTICATION_FAILED` (401) - Invalid credentials
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource doesn't exist
- `CONFLICT` (409) - Resource already exists
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests

**Server Errors (5xx)**
- `INTERNAL_SERVER_ERROR` (500) - Unexpected error
- `DATABASE_ERROR` (500) - Database operation failed
- `EXTERNAL_SERVICE_ERROR` (502) - External API failed
- `SERVICE_UNAVAILABLE` (503) - Service temporarily down
- `GATEWAY_TIMEOUT` (504) - Request timeout

### 2. Standard Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": "error_code",
  "message": "Human-readable error message",
  "requestId": "req_1234567890_abc123",
  "metadata": {
    "field": "email",
    "additionalContext": "..."
  }
}
```

In production, stack traces and metadata are hidden. In development:

```json
{
  "success": false,
  "error": "validation_error",
  "message": "Invalid email format",
  "requestId": "req_1234567890_abc123",
  "metadata": {
    "field": "email",
    "validationType": "email"
  },
  "stack": "Error: Invalid email format\n  at validateEmail (validation.ts:45)"
}
```

### 3. Using Error Classes

#### Validation Error

```typescript
import { ValidationError } from './shared/errors/app-error.js';

throw new ValidationError('Email format is invalid', {
  field: 'email',
  value: userInput.email
}, requestId);
```

#### Not Found Error

```typescript
import { NotFoundError } from './shared/errors/app-error.js';

const user = await userRepository.findById(userId);
if (!user) {
  throw new NotFoundError('User not found', { userId }, requestId);
}
```

#### Authentication Error

```typescript
import { AuthenticationError } from './shared/errors/app-error.js';

if (!token || !isValidToken(token)) {
  throw new AuthenticationError('Invalid or expired token', {
    reason: 'expired'
  }, requestId);
}
```

#### External Service Error

```typescript
import { ExternalServiceError } from './shared/errors/app-error.js';

try {
  await stripeAPI.createPayment(amount);
} catch (error) {
  throw new ExternalServiceError(
    'Payment processing failed',
    'stripe',
    { originalError: error.message },
    requestId
  );
}
```

#### Rate Limit Error

```typescript
import { RateLimitError } from './shared/errors/app-error.js';

if (requests > LIMIT) {
  throw new RateLimitError(
    'Too many requests',
    60, // retry after 60 seconds
    { limit: LIMIT, current: requests },
    requestId
  );
}
```

## Global Error Handler

The error handler middleware processes all errors and:

1. **Parses errors** - Converts any error type to standardized AppError
2. **Records metrics** - Tracks error rates and types
3. **Triggers alerts** - For critical errors
4. **Logs errors** - With full context and correlation IDs
5. **Sends response** - Standard error response format

### Error Parsing

The error handler automatically converts:

- **Mongoose ValidationError** → 400 validation_error
- **Mongoose duplicate key error** → 409 conflict
- **Mongoose CastError** → 400 bad_request
- **Zod ValidationError** → 400 validation_error
- **Any Error instance** → 500 internal_server_error

### Alert Triggering

Errors trigger alerts based on severity:

- **5xx errors** → High severity alert
- **Authentication failures** → Medium severity alert
- **External service failures** → High severity alert
- **Database errors** → Critical severity alert

## Error Metrics & Monitoring

### Prometheus Metrics

All errors are tracked with Prometheus metrics:

```
errors_total{error_code="validation_error",status="400"} 123
errors_by_endpoint_total{method="POST",endpoint="/api/users",error_code="validation_error"} 45
error_rate_by_endpoint{method="POST",endpoint="/api/users"} 3.5
validation_errors_total{field="email",error_type="format"} 12
auth_errors_total{error_type="invalid_token"} 8
external_service_errors_total{service_name="stripe"} 2
critical_errors_count 3
server_error_ratio 2.5
```

### Alert Rules

Alert rules are evaluated every 30 seconds (configurable):

#### Error Rules
- **High Error Rate** - >5% errors on an endpoint for 5 minutes
- **Critical Error Spike** - >10 critical errors in 1 minute
- **High Server Error Ratio** - >10% of errors are 5xx for 5 minutes
- **Authentication Error Spike** - >20 auth errors in 5 minutes

#### Availability Rules
- **Service Down** - Health check failing for 30 seconds
- **MongoDB Down** - Database connection lost
- **Redis Down** - Cache connection lost
- **External Service Errors** - >5 failures in 5 minutes

#### Performance Rules
- **High Slow Request Rate** - >20% requests exceed 2s
- **High P95 Latency** - P95 response time >1s
- **Slow Database Queries** - >10% of queries exceed 500ms

#### Resource Rules
- **High Memory Usage** - >80% of heap
- **Critical Memory Usage** - >90% of heap
- **High Event Loop Lag** - >100ms lag

### Alert Configuration

Configure alerts via environment variables:

```bash
# Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# PagerDuty integration
PAGERDUTY_INTEGRATION_KEY=your-integration-key

# Custom webhook
ALERT_WEBHOOK_URL=https://your-api.com/alerts

# Minimum alert severity (critical|high|medium|low)
ALERT_MIN_LEVEL=medium
```

## Monitoring Service

The monitoring service:

1. **Evaluates alert rules** - Every 30 seconds
2. **Calculates SLO status** - Tracks service objectives
3. **Manages alert state** - Prevents duplicate alerts
4. **Logs violations** - Records when rules trigger

### Service Level Objectives (SLOs)

SupliList tracks these SLOs:

- **API Availability** - 99.9% successful requests (30-day window)
- **Response Time P99** - <500ms (24-hour window)
- **Error Rate** - <0.1% (7-day window)

### Check Monitoring Status

```typescript
import { monitoringService } from './shared/services/monitoring.service.js';

const status = monitoringService.getMonitoringStatus();
// {
//   active: true,
//   rulesEvaluated: 25,
//   enabledRules: 24,
//   slos: [...]
// }

const sloStatus = monitoringService.getSLOStatus();
// {
//   "API Availability": { target: 99.9, current: 99.95, status: 'met' },
//   "Response Time P99": { target: 99.0, current: 98.5, status: 'breached' },
//   ...
// }
```

## Alerting Service

The alerting service sends notifications to multiple channels:

### Alert Flow

1. Error handler triggers alert
2. Alert deduplication check (5 minute window)
3. Severity threshold validation
4. Alert sent to configured channels

### Notification Channels

#### Slack
```json
{
  "attachments": [
    {
      "color": "#FF0000",
      "title": "Critical Error: Database Error",
      "text": "Request: POST /api/users",
      "fields": [
        { "title": "Severity", "value": "CRITICAL" },
        { "title": "Time", "value": "2026-06-15T10:30:00Z" }
      ]
    }
  ]
}
```

#### PagerDuty
```json
{
  "routing_key": "...",
  "event_action": "trigger",
  "dedup_key": "error_hash",
  "payload": {
    "summary": "Critical Error: Database Error",
    "severity": "critical",
    "source": "suplilist-api",
    "custom_details": { "description": "..." }
  }
}
```

#### Custom Webhook
```json
{
  "id": "alert_...",
  "severity": "critical",
  "title": "Critical Error: Database Error",
  "description": "Request: POST /api/users",
  "timestamp": "2026-06-15T10:30:00Z",
  "metadata": { ... }
}
```

### Alert Deduplication

Same alerts are not sent repeatedly within a 5-minute window. This prevents:

- **Alert fatigue** - Too many duplicate notifications
- **Rate limiting** - Hitting API limits on external services
- **Notification spam** - Overwhelming on-call staff

## Structured Logging

All errors are logged with complete context:

```json
{
  "timestamp": "2026-06-15T10:30:00.000Z",
  "level": "ERROR",
  "message": "Server error",
  "service": "suplilist-api",
  "requestId": "req_1234567890_abc123",
  "method": "POST",
  "path": "/api/users",
  "statusCode": 500,
  "error": {
    "message": "Connection timeout",
    "stack": "Error: Connection timeout\n  at ...",
    "type": "DatabaseError"
  },
  "metadata": {
    "userId": "user_123",
    "duration_ms": 5000
  }
}
```

Sensitive data (emails, tokens, IPs) is automatically masked in production.

## Best Practices

### 1. Always Provide Context

```typescript
// Good
throw new NotFoundError('User not found', { userId: user.id }, requestId);

// Bad
throw new NotFoundError('Not found');
```

### 2. Use Appropriate Error Types

```typescript
// Good
throw new ValidationError('Invalid email', { field: 'email' });

// Bad
throw new Error('Invalid email');
```

### 3. Handle Async Errors

```typescript
import { asyncHandler } from './middleware/error-handler.middleware.js';

// Use asyncHandler to catch promise rejections
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  res.json(user);
}));
```

### 4. Set Request ID

The system automatically generates request IDs, but you can provide one:

```typescript
// In middleware
(req as any).requestId = req.headers['x-request-id'] || generateId();

// In error handling
throw new ValidationError('Error', metadata, (req as any).requestId);
```

### 5. Monitor SLOs

Check SLO status in dashboards:

```typescript
const sloStatus = monitoringService.getSLOStatus();
if (sloStatus['Error Rate'].status === 'breached') {
  // Take action
}
```

## Troubleshooting

### No alerts being sent

1. Check environment variables for webhook URLs
2. Verify alert severity is above minimum threshold
3. Check alert deduplication window (5 minutes)
4. Look at monitoring service logs

### High false alarm rate

1. Lower alert thresholds in `alert-rules.config.ts`
2. Increase evaluation duration for rules
3. Adjust minimum severity level
4. Review recent deployments that may have affected metrics

### Missing error context

1. Ensure request ID is passed to error constructors
2. Check log masking isn't hiding important data
3. Verify middleware is catching all errors
4. Use asyncHandler for async route handlers

## Integration Examples

### Stripe Webhook Error

```typescript
import { ExternalServiceError } from './shared/errors/app-error.js';

async function handleStripeWebhook(req: Request, res: Response) {
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    // Process event
  } catch (error) {
    throw new ExternalServiceError(
      'Failed to verify Stripe webhook signature',
      'stripe',
      { originalError: error.message }
    );
  }
}
```

### Database Query Error

```typescript
import { DatabaseError } from './shared/errors/app-error.js';

async function createUser(userData: any) {
  try {
    return await User.create(userData);
  } catch (error) {
    throw new DatabaseError(
      'Failed to create user',
      {
        originalError: error.message,
        userData: sanitize(userData)
      }
    );
  }
}
```

### Rate Limiting

```typescript
import { RateLimitError } from './shared/errors/app-error.js';

export function checkRateLimit(req: Request): void {
  const remaining = getRemainingRequests(req.ip);
  if (remaining <= 0) {
    throw new RateLimitError(
      'Rate limit exceeded',
      getRetryAfter(),
      { limit: LIMIT, reset: getResetTime() }
    );
  }
}
```

## Monitoring Dashboard

### Key Metrics to Track

1. **Error Rate by Endpoint** - Identify problematic endpoints
2. **Error Distribution** - Understand error types
3. **Critical Errors** - Monitor 5xx errors
4. **Alert Frequency** - Track alert trends
5. **SLO Status** - Monitor service objectives

### Dashboard Queries (Prometheus)

```promql
# Error rate by endpoint (last 5 minutes)
rate(errors_by_endpoint_total[5m])

# 99th percentile latency
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Error rate percentage
errors_total / requests_total * 100

# Critical errors in last minute
increase(critical_errors_count[1m])

# Server error ratio
server_error_ratio
```
