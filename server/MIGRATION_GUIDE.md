# Error Handling Migration Guide

This guide helps migrate existing code to use the new standardized error handling system.

## Overview

The new system provides:
- **Standardized error classes** - Consistent error responses
- **Global error handler** - Centralized error processing
- **Error metrics** - Prometheus metrics for monitoring
- **Alert rules** - Automatic alerting on critical errors
- **Structured logging** - Complete error context

## Step-by-Step Migration

### 1. Replace Manual Error Responses

**Before:**
```typescript
router.post('/users', (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }
    
    // Create user
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});
```

**After:**
```typescript
import { ValidationError } from '../shared/errors/app-error.js';
import { asyncHandler } from '../middleware/error-handler.middleware.js';

router.post('/users', asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    throw new ValidationError('Email is required', { field: 'email' });
  }
  
  const user = await userService.createUser({ email });
  res.status(201).json({ success: true, data: user });
}));
```

### 2. Update Route Handlers to Use asyncHandler

Wrap async route handlers with `asyncHandler` to catch promise rejections:

```typescript
import { asyncHandler } from '../middleware/error-handler.middleware.js';

// Single handler
router.get('/users/:id', asyncHandler(async (req, res) => {
  // errors thrown here are automatically caught
}));

// Multiple handlers
router.post('/users', 
  validateAuth,
  asyncHandler(async (req, res) => {
    // errors thrown here are automatically caught
  })
);
```

### 3. Replace Custom Error Classes

**Before:**
```typescript
class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}

throw new UserNotFoundError('123');
```

**After:**
```typescript
import { NotFoundError } from '../shared/errors/app-error.js';

throw new NotFoundError('User not found', { userId: '123' });
```

### 4. Add Request IDs to Error Context

Include request IDs for better tracing:

```typescript
import { NotFoundError } from '../shared/errors/app-error.js';

throw new NotFoundError(
  'User not found',
  { userId: '123' },
  (req as any).requestId  // Pass request ID
);
```

### 5. Update Error Handling in Services

**Before:**
```typescript
export class UserService {
  async findById(id: string) {
    try {
      const user = await User.findById(id);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw error;
    }
  }
}
```

**After:**
```typescript
import { NotFoundError, DatabaseError } from '../shared/errors/app-error.js';

export class UserService {
  async findById(id: string) {
    try {
      const user = await User.findById(id);
      if (!user) {
        throw new NotFoundError('User not found', { userId: id });
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error; // Re-throw app errors as-is
      }
      
      throw new DatabaseError(
        'Failed to retrieve user',
        { userId: id, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }
}
```

### 6. Update Controller Error Handling

**Before:**
```typescript
export class UserController {
  async create(req: Request, res: Response) {
    try {
      const userData = req.body;
      
      // Validation
      if (!userData.email) {
        return res.status(400).json({ error: 'Email required' });
      }
      
      const user = await userService.create(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  }
}
```

**After:**
```typescript
import { ValidationError } from '../shared/errors/app-error.js';
import { asyncHandler } from '../middleware/error-handler.middleware.js';

export class UserController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const userData = req.body;
    
    if (!userData.email) {
      throw new ValidationError('Email is required', { field: 'email' });
    }
    
    const user = await userService.create(userData);
    res.status(201).json({ success: true, data: user });
  });
}
```

### 7. Handle Database Errors

**Before:**
```typescript
try {
  await User.create(userData);
} catch (error) {
  if (error.code === 11000) {
    return res.status(409).json({ error: 'User already exists' });
  }
  return res.status(500).json({ error: 'Database error' });
}
```

**After:**
```typescript
import { ConflictError, DatabaseError } from '../shared/errors/app-error.js';

try {
  await User.create(userData);
} catch (error) {
  // Error handler automatically converts Mongoose errors
  // MongoServerError with code 11000 → ConflictError (409)
  // ValidationError → ValidationError (400)
  // CastError → BadRequestError (400)
  throw error;
}
```

### 8. Handle External Service Errors

**Before:**
```typescript
async function processPayment(amount: number) {
  try {
    const result = await stripe.charges.create({
      amount,
      currency: 'usd'
    });
    return result;
  } catch (error) {
    console.error('Stripe error:', error);
    throw new Error('Payment processing failed');
  }
}
```

**After:**
```typescript
import { ExternalServiceError } from '../shared/errors/app-error.js';

async function processPayment(amount: number) {
  try {
    const result = await stripe.charges.create({
      amount,
      currency: 'usd'
    });
    return result;
  } catch (error) {
    throw new ExternalServiceError(
      'Payment processing failed',
      'stripe',
      {
        originalError: error instanceof Error ? error.message : String(error),
        amount
      }
    );
  }
}
```

### 9. Handle Rate Limiting

**Before:**
```typescript
const limiter = rateLimit({
  message: 'Too many requests'
});

app.use(limiter);
```

**After:**
```typescript
import { RateLimitError } from './shared/errors/app-error.js';

const limiter = rateLimit({
  skip: (req: Request) => {
    const limit = 100;
    const remaining = getRemainingRequests(req.ip);
    
    if (remaining <= 0) {
      throw new RateLimitError(
        'Too many requests from this IP',
        60, // retry after 60 seconds
        { limit, current: limit - remaining }
      );
    }
    
    return false;
  }
});

app.use(limiter);
```

### 10. Update Tests

**Before:**
```typescript
describe('UserController', () => {
  it('should return 404 when user not found', async () => {
    const res = await request(app).get('/users/999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('not_found');
  });
});
```

**After:**
```typescript
describe('UserController', () => {
  it('should throw NotFoundError when user not found', async () => {
    const res = await request(app).get('/users/999');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: 'not_found',
      message: 'User not found',
      // requestId is included
    });
  });
});
```

## Checklist for Migration

- [ ] Install error handler middleware in app.ts
- [ ] Import required error classes
- [ ] Wrap async route handlers with `asyncHandler`
- [ ] Replace manual error responses with error class throws
- [ ] Update all services to throw appropriate errors
- [ ] Add request IDs to error context
- [ ] Handle database errors (Mongoose converts automatically)
- [ ] Handle external service errors
- [ ] Update tests to expect new error format
- [ ] Update API documentation with new error responses
- [ ] Configure alerting (environment variables)
- [ ] Test alert triggering in staging

## Error Class Reference

Quick reference for which error class to use:

| Scenario | Error Class | Status |
|----------|-------------|--------|
| Input validation failed | `ValidationError` | 400 |
| Malformed request | `BadRequestError` | 400 |
| Missing authentication | `UnauthorizedError` | 401 |
| Invalid credentials | `AuthenticationError` | 401 |
| Insufficient permissions | `ForbiddenError` | 403 |
| Resource not found | `NotFoundError` | 404 |
| Resource already exists | `ConflictError` | 409 |
| Payment required | `PaymentRequiredError` | 402 |
| Too many requests | `RateLimitError` | 429 |
| Cannot process entity | `UnprocessableEntityError` | 422 |
| Database operation failed | `DatabaseError` | 500 |
| External service failed | `ExternalServiceError` | 502 |
| Service temporarily down | `ServiceUnavailableError` | 503 |
| Request timeout | `GatewayTimeoutError` | 504 |
| Unexpected server error | `InternalServerError` | 500 |

## Configuration

### Environment Variables

```bash
# Alerting configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
PAGERDUTY_INTEGRATION_KEY=your-key
ALERT_WEBHOOK_URL=https://your-api.com/alerts
ALERT_MIN_LEVEL=medium

# Monitoring configuration
MONITORING_ENABLED=true
MONITORING_INTERVAL=30000  # milliseconds
```

### Alert Rules

Alert rules are defined in `src/shared/config/alert-rules.config.ts`. Customize thresholds as needed:

```typescript
{
  id: 'error_rate_high',
  name: 'High Error Rate',
  threshold: 5, // Adjust percentage
  duration: 5 * 60 * 1000, // Adjust window
  evaluationInterval: 1 * 60 * 1000, // Adjust frequency
}
```

## Common Patterns

### Pattern 1: Service Layer Error Handling

```typescript
export class SupplementService {
  async getById(id: string) {
    try {
      const supplement = await Supplement.findById(id);
      if (!supplement) {
        throw new NotFoundError('Supplement not found', { supplementId: id });
      }
      return supplement;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new DatabaseError('Failed to fetch supplement', { supplementId: id });
    }
  }
}
```

### Pattern 2: Validation Error in Controller

```typescript
import { ValidationError } from '../shared/errors/app-error.js';

router.post('/supplements', asyncHandler(async (req, res) => {
  const { name, dosage } = req.body;
  
  if (!name) {
    throw new ValidationError('Name is required', { field: 'name' });
  }
  
  if (!dosage || dosage <= 0) {
    throw new ValidationError('Dosage must be greater than 0', { field: 'dosage' });
  }
  
  const supplement = await supplementService.create({ name, dosage });
  res.status(201).json({ success: true, data: supplement });
}));
```

### Pattern 3: External API Error

```typescript
async function fetchFromExternalAPI(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    throw new ExternalServiceError(
      'Failed to fetch from external API',
      'external-api',
      { url, originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}
```

## Monitoring & Alerts

After migration, you'll have:

1. **Error metrics** - Track error rates per endpoint
2. **Automatic alerts** - Critical errors trigger notifications
3. **Structured logs** - Complete error context for debugging
4. **SLO tracking** - Monitor service objectives

Access monitoring status:

```typescript
import { monitoringService } from './shared/services/monitoring.service.js';

const status = monitoringService.getMonitoringStatus();
console.log(status.rulesEvaluated); // Number of rules evaluated
console.log(status.enabledRules);   // Number of enabled rules

const sloStatus = monitoringService.getSLOStatus();
console.log(sloStatus['API Availability']); // { target: 99.9, current: 99.95, status: 'met' }
```

## Need Help?

1. **Error not showing correct status** - Check error class matches HTTP status
2. **Alerts not triggering** - Check environment variables and alert rules
3. **Missing error context** - Ensure metadata is passed to error constructor
4. **Stack traces in production** - They're intentionally hidden; check logs instead
5. **Duplicate alerts** - Expected within 5-minute dedup window

## Next Steps

1. Run tests to ensure all error handling works
2. Monitor alert frequency in staging
3. Adjust alert thresholds based on baseline
4. Update documentation with new error responses
5. Train team on new error handling patterns
