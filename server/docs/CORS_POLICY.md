# SupliList CORS Policy Implementation

**Version**: 1.0.0  
**Date**: 2026-06-09  
**Status**: Production-Ready  
**Last Updated**: 2026-06-09

## Overview

This document describes the production-ready Cross-Origin Resource Sharing (CORS) policy implemented for SupliList's Express backend. The implementation uses an **explicit domain whitelist** approach with no wildcard origins, ensuring maximum security while maintaining compatibility with legitimate frontend clients.

## Table of Contents

1. [Principles](#principles)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [Deployment](#deployment)
5. [Security Considerations](#security-considerations)
6. [Troubleshooting](#troubleshooting)
7. [Testing](#testing)

## Principles

### Security First

- **No Wildcards**: Origins must be explicitly whitelisted; `*` is never allowed
- **Credentials Support**: `credentials: true` is enabled only with explicit origins (OWASP requirement)
- **Origin Validation**: Every cross-origin request is validated against the whitelist
- **Logging**: Rejected CORS requests are logged for security monitoring

### Type Safety

- All CORS configuration uses TypeScript with Zod validation
- Environment variables are validated at runtime before application start
- CORS options are type-checked against the `cors` library types

### Standards Compliance

- Implements W3C CORS Specification
- OWASP secure CORS practices
- Express.js best practices for middleware
- No vulnerable patterns (e.g., regex origin validation)

## Architecture

### File Structure

```
server/src/
├── middleware/
│   ├── cors.middleware.ts          # Main CORS implementation
│   ├── cors.middleware.test.ts     # Comprehensive test suite
│   └── ...other middleware files
├── shared/
│   └── config/
│       └── env.config.ts           # Environment validation (includes CORS vars)
├── app.ts                          # Main app factory (imports CORS)
└── ...
```

### Component Responsibilities

#### `cors.middleware.ts`

Provides three exports:

1. **`createCorsMiddleware()`** - Factory function that returns Express middleware
   - Configures CORS options
   - Handles origin whitelist validation
   - Logs rejected requests

2. **`logCorsConfiguration()`** - Utility for startup logging
   - Logs allowed origins
   - Logs enabled methods and headers
   - Useful for debugging configuration issues

3. **Configuration Constants** - Exported for testing/customization

#### `app.ts` Integration

```typescript
import { createCorsMiddleware, logCorsConfiguration } from './middleware/cors.middleware.js';

export function createApp() {
  const app = express();
  
  // Log CORS config at startup (before app starts)
  logCorsConfiguration();
  
  // Apply CORS middleware before all routes
  app.use(createCorsMiddleware());
  
  // ... other middleware and routes
}
```

**Critical**: CORS middleware MUST be applied:
1. **After** security headers (Helmet)
2. **Before** route handlers
3. **Only once** per app instance

## Configuration

### Environment Variables

All CORS configuration is controlled via environment variables:

#### Required Variables

None. CORS has sensible defaults.

#### Optional Variables

| Variable | Default | Example | Notes |
|----------|---------|---------|-------|
| `CORS_ORIGIN_DEV` | `http://localhost:5173` | `http://localhost:5173` | Development frontend URL |
| `CORS_ORIGIN_PROD` | `https://suplilist.app` | `https://suplilist.app` | Production frontend URL |
| `CORS_ORIGINS` | (none) | `https://extra.com,https://other.com` | Additional origins (comma-separated) |

### Environment File (.env)

```bash
# ══════════════════════════════════════════════════════════════════════════════
# CORS POLICY - Explicit Domain Whitelist
# ══════════════════════════════════════════════════════════════════════════════

# Development frontend URL
CORS_ORIGIN_DEV=http://localhost:5173

# Production frontend URL (only used in NODE_ENV=production)
CORS_ORIGIN_PROD=https://suplilist.app

# Additional custom origins (optional, comma-separated)
CORS_ORIGINS=
```

### Allowed Origins by Environment

#### Development (`NODE_ENV=development`)

- `http://localhost:5173` (default frontend)
- Any origins specified in `CORS_ORIGINS`

#### Production (`NODE_ENV=production`)

- `http://localhost:5173` (if `CORS_ORIGIN_DEV` differs from default)
- `https://suplilist.app` (default production frontend)
- Any origins specified in `CORS_ORIGINS`

#### Test (`NODE_ENV=test`)

- `http://localhost:5173` only (restricted for test isolation)

### Allowed Methods

```
GET, POST, PUT, PATCH, DELETE, OPTIONS
```

### Allowed Request Headers

```
Content-Type
Authorization
X-SupliList-Client
If-Match
```

### Exposed Response Headers

```
Content-Type
X-RateLimit-Limit
X-RateLimit-Remaining
X-RateLimit-Reset
Retry-After
X-SupliList-Version
X-SupliList-Request-Id
```

### Credentials

- Enabled: `true`
- Cookie-based sessions and HTTP authentication are supported
- **Important**: With credentials enabled, origin cannot be `*`

### Preflight Cache

- Max age: 86400 seconds (24 hours)
- Reduces preflight requests after first CORS handshake

## Deployment

### Local Development

```bash
# .env (or use defaults)
NODE_ENV=development
CORS_ORIGIN_DEV=http://localhost:5173
CORS_ORIGIN_PROD=https://suplilist.app

# Start server
npm run dev
```

No changes needed to code. Middleware auto-configures from environment.

### Staging

```bash
# .env
NODE_ENV=production
CORS_ORIGIN_DEV=http://localhost:5173
CORS_ORIGIN_PROD=https://staging-suplilist.app
CORS_ORIGINS=https://staging-admin.suplilist.app

# Start server
npm run build && npm start
```

### Production

```bash
# .env (on production server only)
NODE_ENV=production
CORS_ORIGIN_PROD=https://suplilist.app
CORS_ORIGINS=https://affiliate.suplilist.app

# Start server
npm run build && npm start
```

**Important**: Never commit production `.env` files. Use environment variables in your deployment platform (e.g., Render, Vercel, Heroku):

```bash
# On Render, Heroku, etc.
heroku config:set NODE_ENV=production
heroku config:set CORS_ORIGIN_PROD=https://suplilist.app
heroku config:set CORS_ORIGINS=https://affiliate.suplilist.app
```

### Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY . .
RUN npm ci && npm run build

# Environment variables set at runtime
ENV NODE_ENV=production

CMD ["npm", "start"]
```

```bash
docker run \
  -e NODE_ENV=production \
  -e CORS_ORIGIN_PROD=https://suplilist.app \
  -p 5000:5000 \
  suplilist-server:latest
```

## Security Considerations

### CORS Security Best Practices

1. **Never use `origin: '*'` with credentials**
   - ✅ `origin: true` (current implementation)
   - ❌ `origin: '*'` + `credentials: true` (forbidden)

2. **Always validate origin explicitly**
   - ✅ Check against whitelist
   - ❌ Use regex pattern matching

3. **Be restrictive with headers**
   - ✅ Only allow necessary request headers
   - ❌ Allow all headers with `*`

4. **Log rejected requests**
   - ✅ `logger.warn()` for rejected origins
   - ❌ Silently reject with no audit trail

5. **Protect sensitive endpoints**
   - OAuth tokens ✅ Protected by Authorization header
   - Session cookies ✅ Protected by credentials requirement
   - CSRF tokens ✅ Protected by custom header (X-SupliList-Client)

### IP Spoofing Prevention

The `app.set('trust proxy', 1)` setting in `app.ts` ensures:

- Only the immediate upstream proxy (AWS ELB) is trusted
- Client IP is extracted from headers in correct order: `cf-connecting-ip` → `x-forwarded-for` → socket IP
- Prevents attackers from spoofing their IP in headers

### Related Security Headers

- **Helmet**: Provides CSP, X-Frame-Options, etc. (applied before CORS)
- **CSRF Guard**: Custom header requirement (`X-SupliList-Client`)
- **Rate Limiting**: Per-endpoint limits prevent DDoS

### Monitoring CORS Violations

All CORS rejections are logged with:

```json
{
  "level": "warn",
  "message": "CORS request rejected",
  "origin": "https://evil.com",
  "allowedOrigins": ["http://localhost:5173", "https://suplilist.app"],
  "timestamp": "2026-06-09T10:30:45.123Z"
}
```

Monitor logs for patterns indicating:
- Enumeration attacks (many different origins)
- Specific target attacks (repeated single origin)
- Configuration errors (legitimate origins rejected)

## Troubleshooting

### Problem: "No 'Access-Control-Allow-Origin' header"

**Symptom**: Browser console error
```
Access to XMLHttpRequest at 'https://api.suplilist.com/api/auth/login' 
from origin 'https://myapp.com' has been blocked by CORS policy
```

**Solutions**:

1. Check that your origin is in the whitelist:
   ```bash
   echo $CORS_ORIGIN_DEV
   echo $CORS_ORIGIN_PROD
   echo $CORS_ORIGINS
   ```

2. Verify origin format (protocol + domain + port):
   ```
   ✅ https://suplilist.app
   ✅ http://localhost:5173
   ❌ suplilist.app (missing protocol)
   ❌ https://suplilist.app:443 (implicit port)
   ```

3. Check logs for rejection:
   ```bash
   # Look for "CORS request rejected" in server logs
   tail -f logs/server.log | grep "CORS request rejected"
   ```

4. Verify middleware is applied:
   ```typescript
   // In app.ts, should see immediately after helmet()
   app.use(createCorsMiddleware());
   ```

### Problem: "Credentials are not included in preflight request"

**Symptom**: Cookies not sent with cross-origin requests

**Solutions**:

1. Check that credentials are enabled (they are by default)

2. Verify frontend is also sending credentials:
   ```javascript
   // Frontend code MUST include credentials
   fetch('https://api.suplilist.com/api/data', {
     credentials: 'include'  // ← Essential!
   })
   ```

3. Check cookie attributes:
   - SameSite: `Lax` or `None` (not `Strict`)
   - Secure: `true` for HTTPS
   - Domain: not set (uses current domain)

### Problem: "Method not allowed"

**Symptom**: Preflight succeeds, but actual request fails with 405

**Solutions**:

1. Verify HTTP method is in allowed list:
   ```typescript
   // In cors.middleware.ts
   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
   ```

2. Check that route handler exists for the method:
   ```typescript
   // ✅ Works
   app.post('/api/data', handler)
   
   // ❌ Fails with 405
   app.get('/api/data', handler) // POST not defined
   ```

### Problem: "Custom header not allowed"

**Symptom**: Preflight rejects with custom header

**Solutions**:

1. Verify header is whitelisted:
   ```typescript
   // In cors.middleware.ts
   allowedHeaders: [
     'Content-Type',
     'Authorization',
     'X-SupliList-Client',
     'If-Match',
   ]
   ```

2. Add to list if needed (edit `cors.middleware.ts`)

3. Ensure header is sent in preflight:
   ```javascript
   // Frontend must include custom header in preflight
   fetch('https://api.suplilist.com/api/data', {
     headers: {
       'X-SupliList-Client': '1.0.0'
     }
   })
   ```

### Problem: Preflight timing out

**Symptom**: Preflight request hangs or takes >30 seconds

**Solutions**:

1. Check network connectivity between client and server

2. Verify firewall/CDN is not blocking OPTIONS:
   ```bash
   # Test OPTIONS request directly
   curl -X OPTIONS https://api.suplilist.com/api/data -v
   ```

3. Check CloudFlare settings:
   - Ensure OPTIONS method is not blocked
   - Check "Browser Cache TTL"

4. Increase preflight cache max age to reduce repeated requests:
   ```typescript
   // In cors.middleware.ts (currently 86400s = 24h)
   maxAge: 24 * 60 * 60
   ```

## Testing

### Unit Tests

Located in `cors.middleware.test.ts`:

```bash
# Run all CORS tests
npm test -- cors.middleware.test.ts

# Run specific test suite
npm test -- cors.middleware.test.ts -t "Explicit origin whitelist"

# Run with coverage
npm test -- cors.middleware.test.ts --coverage
```

### Manual Testing with cURL

```bash
# Test dev origin
curl -X OPTIONS https://api.suplilist.com/api/auth/login \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Test prod origin
curl -X OPTIONS https://api.suplilist.com/api/auth/login \
  -H "Origin: https://suplilist.app" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Test rejected origin
curl -X OPTIONS https://api.suplilist.com/api/auth/login \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

### Manual Testing with Browser

```javascript
// In browser DevTools console
fetch('https://api.suplilist.com/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ email: 'test@example.com', password: 'test' }),
  credentials: 'include'
})
  .then(r => r.json())
  .then(data => console.log('Success:', data))
  .catch(err => console.error('Error:', err))
```

### E2E Testing

The implementation is tested end-to-end in the Playwright suite:

```bash
npm run test:e2e
```

Tests verify:
- Authentication flows (CORS + credentials)
- Cross-origin requests work correctly
- Rejected origins produce appropriate errors

### Integration with CI/CD

CORS configuration is validated:

1. **On Commit**: TypeScript compilation checks types
2. **On Build**: Environment variables are validated
3. **On Deploy**: CORS origins are logged for verification
4. **On Runtime**: Rejected requests are monitored

## API Endpoints

### Public Endpoints (No Auth Required)

- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics
- `POST /api/metrics/performance` - Frontend performance metrics

### Protected Endpoints (Auth Required)

- `/api/auth/*` - Authentication routes
- `/api/profile/*` - User profile routes
- `/api/stack/*` - User stack/supplement data
- `/api/settings/*` - User settings and preferences

### Rate Limited Endpoints

All API endpoints have rate limiting:
- Global: 100 requests/15 minutes
- Per-endpoint: See `middleware/rate-limit.middleware.ts`

## Changelog

### Version 1.0.0 (2026-06-09)

- Initial production implementation
- Explicit domain whitelist (no wildcards)
- Support for dev/prod/custom origins
- Comprehensive test suite
- JSDoc documentation
- Security-first approach
- OWASP/W3C compliant

## Related Documentation

- [OWASP CORS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Origin_Resource_Sharing_Cheat_Sheet.html)
- [W3C CORS Specification](https://www.w3.org/TR/cors/)
- [Express.js CORS Middleware](https://github.com/expressjs/cors)
- [Helmet.js Security Headers](https://helmetjs.github.io/)

## Support

For CORS-related issues, questions, or feature requests:

1. Check this documentation first
2. Check the test file (`cors.middleware.test.ts`) for examples
3. Check server logs for "CORS request rejected" warnings
4. Contact the backend team for configuration changes

---

**Maintained by**: Backend Security Team  
**Last Review**: 2026-06-09  
**Next Review**: 2026-09-09
