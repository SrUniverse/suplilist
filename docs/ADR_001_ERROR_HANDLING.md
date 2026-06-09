# ADR 001: Error Handling Strategy

**Status**: Accepted  
**Date**: June 2024  
**Author**: Engineering Team  
**Related**: INCIDENT_RESPONSE.md, MONITORING.md

---

## Context

SupliList processes user requests across multiple layers (HTTP, validation, database, external APIs). Errors can occur at any layer, and we needed a consistent strategy for:

1. Detecting and categorizing errors
2. Logging errors with sufficient context for debugging
3. Responding to clients with appropriate HTTP status codes
4. Monitoring error rates to detect incidents
5. Not exposing sensitive system details to clients

### Constraints

- Frontend can only understand standard HTTP status codes
- Errors must include unique trace IDs for debugging
- Performance impact must be minimal (no excessive logging)
- Must comply with GDPR (no sensitive data in logs)

---

## Decision

Implement a **structured error handling strategy** with:

1. **Error Categories** - Group errors by type and severity
2. **Standardized Responses** - Consistent error response format
3. **Trace ID Correlation** - Every error includes request trace ID
4. **Appropriate HTTP Status Codes** - Standard codes for different error types
5. **Contextual Logging** - Log sufficient detail without exposing secrets

### Error Categories

```typescript
// Domain errors (client caused)
class ValidationError extends Error {
  constructor(message: string, public details?: Record<string, string[]>) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Authentication errors (client auth failed)
class AuthenticationError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

// Authorization errors (valid user, no permission)
class AuthorizationError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

// Not found errors
class NotFoundError extends Error {
  constructor(public resource: string) {
    super(`${resource} not found`)
    this.name = 'NotFoundError'
  }
}

// Rate limit errors
class RateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    super('Too many requests')
    this.name = 'RateLimitError'
  }
}

// Dependency/integration errors
class ExternalServiceError extends Error {
  constructor(public service: string, message?: string) {
    super(`External service error: ${service}`)
    this.name = 'ExternalServiceError'
  }
}

// Internal server errors
class InternalError extends Error {
  constructor(public code: string, message: string = 'Internal server error') {
    super(message)
    this.name = 'InternalError'
  }
}
```

### Error Mapping to HTTP Status Codes

```typescript
// Global error handler middleware
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const traceId = req.traceId || generateTraceId()
  
  // Log error with trace ID
  logError(err, { traceId, path: req.path, userId: req.user?.id })

  // Map error to HTTP status
  let statusCode = 500
  let message = 'Internal server error'
  let code = 'INTERNAL_ERROR'

  if (err instanceof ValidationError) {
    statusCode = 400
    code = 'VALIDATION_ERROR'
    message = err.message
  } else if (err instanceof AuthenticationError) {
    statusCode = 401
    code = 'UNAUTHORIZED'
    message = err.message
  } else if (err instanceof AuthorizationError) {
    statusCode = 403
    code = 'FORBIDDEN'
    message = err.message
  } else if (err instanceof NotFoundError) {
    statusCode = 404
    code = 'NOT_FOUND'
    message = err.message
  } else if (err instanceof RateLimitError) {
    statusCode = 429
    code = 'RATE_LIMIT_EXCEEDED'
    message = err.message
    res.setHeader('Retry-After', err.retryAfterSeconds.toString())
  } else if (err instanceof ExternalServiceError) {
    statusCode = 503  // Service unavailable
    code = 'SERVICE_UNAVAILABLE'
    message = `Service temporarily unavailable. Try again later.`
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    traceId  // Client can use this to reference error in logs
  })
}

// Apply to Express
app.use(errorHandler)
```

### Standardized Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": "Supplement not found",
  "code": "NOT_FOUND",
  "traceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Validation errors include details:

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "details": {
    "email": ["Invalid email format"],
    "password": ["Password must be 8+ characters"]
  }
}
```

### Error Logging Strategy

```typescript
function logError(error: Error, context: any = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: error.message,
    name: error.name,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    traceId: context.traceId,
    userId: context.userId,
    path: context.path,
    // Sensitive data NEVER logged
  }

  // Send to log aggregation (CloudWatch, Loki, etc.)
  logger.error(logEntry)

  // For critical errors, also alert
  if (error instanceof ExternalServiceError || 
      error instanceof InternalError) {
    alerting.notify(logEntry)
  }
}
```

### Usage Examples

**Example 1: Validation Error**
```typescript
async function loginHandler(req: Request, res: Response) {
  try {
    const { email, password } = LoginSchema.parse(req.body)
    // Valid data, proceed
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError('Invalid input', formatZodErrors(error))
    }
  }
}

// Response: 400 Bad Request
// {
//   "error": "Invalid input",
//   "code": "VALIDATION_ERROR",
//   "details": { "email": ["Invalid email format"] }
// }
```

**Example 2: Unauthorized Access**
```typescript
async function getSupplementHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new AuthenticationError('Login required')
  }
  // Proceed with authenticated user
}

// Response: 401 Unauthorized
```

**Example 3: Not Found**
```typescript
async function getSupplementHandler(req: Request, res: Response) {
  const supplement = await Supplement.findById(req.params.id)
  
  if (!supplement) {
    throw new NotFoundError('Supplement')
  }
  
  res.json(supplement)
}

// Response: 404 Not Found
// { "error": "Supplement not found", "code": "NOT_FOUND" }
```

**Example 4: External Service Failure**
```typescript
async function sendEmailHandler(req: Request, res: Response) {
  try {
    await emailService.send(req.body)
  } catch (error) {
    throw new ExternalServiceError('Resend Email Service', error.message)
  }
}

// Response: 503 Service Unavailable
// { "error": "Service temporarily unavailable. Try again later." }
```

---

## Consequences

### Positive

1. **Consistency** - All errors follow the same format across endpoints
2. **Debuggability** - Trace IDs allow correlating errors across logs
3. **Security** - Sensitive data never exposed to clients
4. **Monitoring** - Easy to track error rates and patterns
5. **Client Experience** - Clients know exactly what went wrong
6. **Performance** - Minimal overhead, structured logging only

### Negative

1. **Boilerplate** - Every handler needs try/catch wrapping
2. **Learning Curve** - Team must understand error hierarchy
3. **External APIs** - Must handle and translate errors from external services

### Mitigations

1. Use wrapper functions to reduce boilerplate:
   ```typescript
   function asyncHandler(fn: Function) {
     return (req: Request, res: Response, next: NextFunction) => {
       Promise.resolve(fn(req, res, next)).catch(next)
     }
   }
   
   router.get('/supplements/:id', asyncHandler(getSupplementHandler))
   ```

2. Document error types in API docs

3. Validate all external API calls:
   ```typescript
   try {
     const result = await externalAPI.call()
   } catch (error) {
     throw new ExternalServiceError('External API', error.message)
   }
   ```

---

## Alternatives Considered

### 1. Simple HTTP Status Codes Only

**Status**: Rejected

Send only HTTP status code, no error details.

**Problem**: Clients can't distinguish between different error types (all 400s look the same)

### 2. Verbose Error Messages in Production

**Status**: Rejected

Expose full stack traces and system details to clients.

**Problem**: Security risk, leaks implementation details

### 3. Silent Failures

**Status**: Rejected

Don't log errors or return details.

**Problem**: Impossible to debug, no incident visibility

---

## See Also

- [Security Hardening](./SECURITY_HARDENING.md#error-message-disclosure)
- [Monitoring Guide](./MONITORING.md#log-aggregation)
- [Incident Response](./INCIDENT_RESPONSE.md#triage-procedure)

---

**Last Updated**: June 2024  
**Next Review**: December 2024
