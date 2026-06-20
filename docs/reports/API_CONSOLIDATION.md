# SupliList API Consolidation Report

## Executive Summary

This document details the consolidation of SupliList API endpoints to improve consistency, reduce redundancy, and enhance maintainability. The API currently has 50+ endpoints spread across multiple route files with inconsistent patterns.

---

## 1. Current API Organization

### Server Routes (`server/src/`)
- **Health Checks**: `/health/live`, `/health/ready`, `/health` (deprecated)
- **Metrics**: `/metrics` (Prometheus)
- **Affiliate**: `/api/affiliate/out`, `/api/affiliate/health`
- **Price Alerts**: `/api/price-alerts/*` (ISSUES: route conflicts, duplicated device-tokens)
- **Cache Admin**: `/api/admin/cache/*` (inconsistent endpoint paths)
- **Modular Routes**: 
  - Identity: `/api/auth/*`
  - Profile: `/api/profile/*`
  - Stack: `/api/stack/*`
  - Notifications: `/api/notifications/*`
  - Reports: `/api/reports/*`
  - Supplements: `/api/supplements/*`
  - And more...

### Legacy Backend Routes (`backend/routes/`)
- **Notifications**: `/api/notifications/*` (DUPLICATES server routes)
- **Profile**: `/api/profile/*` (DUPLICATES server routes)
- **Reports**: `/api/reports/*` (DUPLICATES server routes)

---

## 2. Issues Identified

### A. Endpoint Conflicts

#### Price Alerts Routes (CRITICAL)
```
❌ GET /api/price-alerts - Get all alerts
❌ GET /api/price-alerts/:alertId - Get specific alert
❌ GET /api/price-alerts/history/:productId - Get price history
   ^ CONFLICT: History endpoint should be GET /api/price-alerts/:alertId/history
   ^ Or: GET /api/products/:productId/price-history

❌ POST /api/price-alerts/device-tokens - Register device token
   ^ Should be: POST /api/notifications/device-tokens or /api/devices/tokens
❌ DELETE /api/price-alerts/device-tokens/:tokenId - Remove device token
   ^ Should be: DELETE /api/notifications/device-tokens/:tokenId
```

#### Cache Admin Routes (INCONSISTENT)
```
⚠️ GET /api/admin/cache/stats - Stats endpoint OK
⚠️ POST /api/admin/cache/flush - Flush endpoint OK
⚠️ POST /api/admin/cache/invalidate - Generic invalidate OK
❌ POST /api/admin/cache/invalidate/products - Specific redundant endpoint
❌ POST /api/admin/cache/invalidate/lists - Specific redundant endpoint
❌ POST /api/admin/cache/invalidate/search - Specific redundant endpoint
   ^ Should consolidate: Use generic endpoint with entityType param

❌ POST /api/admin/cache/flush-pending - Should be: PATCH /api/admin/cache/pending
```

### B. Duplicate Routes Between Servers

**Backend Legacy Routes (DEPRECATED)**
- `backend/routes/notifications.js` - Duplicates server functionality
- `backend/routes/profile.js` - Duplicates server functionality
- `backend/routes/reports.js` - Duplicates server functionality

These should be **removed** and all clients should use server routes.

### C. Response Format Inconsistency

**Inconsistent Error Responses:**
```javascript
// ❌ Some routes return:
{ success: false, error: "message" }

// ❌ Others return:
{ success: false, error: { message: "error" } }

// ✅ Should standardize to:
{ success: false, error: "error_code", message: "User-friendly message" }
```

**Inconsistent Success Responses:**
```javascript
// ❌ Some routes:
{ success: true, data: {...} }

// ❌ Others:
{ success: true, preferences: {...}, optimalTime: {...} }

// ✅ Should standardize to:
{ success: true, data: {...}, meta?: {...} }
```

### D. Missing API Versioning

Currently all endpoints are unversioned. Need to implement:
- `/api/v1/*` for current endpoints
- `/api/v2/*` for improved endpoints
- Deprecation headers
- Migration guide for clients

### E. Authentication Inconsistencies

- Some routes use `authenticateToken` middleware
- Some routes use `authMiddleware`
- Some public routes lack proper auth checks
- Device token registration lacks auth (potential security issue)

---

## 3. Consolidation Strategy

### Phase 1: Fix Critical Issues (IMMEDIATE)

#### 1.1 Consolidate Price Alerts Routes
```typescript
// BEFORE (problematic):
GET  /api/price-alerts
GET  /api/price-alerts/:alertId
GET  /api/price-alerts/history/:productId  // ❌ Route conflict
POST /api/price-alerts/device-tokens      // ❌ Wrong module
DELETE /api/price-alerts/device-tokens/:tokenId  // ❌ Wrong module

// AFTER (consolidated):
GET    /api/price-alerts
GET    /api/price-alerts/:alertId
GET    /api/price-alerts/:alertId/history // Child resource
POST   /api/price-alerts
PATCH  /api/price-alerts/:alertId
DELETE /api/price-alerts/:alertId

// Device tokens moved to notifications:
POST   /api/notifications/device-tokens
DELETE /api/notifications/device-tokens/:tokenId
```

#### 1.2 Consolidate Cache Admin Routes
```typescript
// BEFORE (redundant):
POST /api/admin/cache/invalidate/products
POST /api/admin/cache/invalidate/lists
POST /api/admin/cache/invalidate/search

// AFTER (consolidated):
POST /api/admin/cache/invalidate?entityType=products
POST /api/admin/cache/invalidate?entityType=lists
POST /api/admin/cache/invalidate?entityType=search
// Or use request body:
{
  "entityType": "products" | "lists" | "search" | null,
  "entityId": "optional-id",
  "pattern": "optional-pattern"
}
```

#### 1.3 Standardize Response Format
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;           // 'validation_error', 'not_found', etc.
    message: string;        // User-friendly message
    details?: Record<string, string>;  // Field-level errors for validation
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    timestamp: string;
  };
}
```

### Phase 2: Implement API Versioning (WEEK 1)

```
Current: /api/resource
V1:      /api/v1/resource     (copy of current)
V2:      /api/v2/resource     (improved with consolidations)

Deprecation:
- Add header: Deprecation: true
- Add header: Sunset: <date>
- Return in response: deprecationInfo?: { ...}
```

### Phase 3: Remove Legacy Backend Routes (WEEK 2)

- Delete `backend/routes/notifications.js`
- Delete `backend/routes/profile.js`
- Delete `backend/routes/reports.js`
- Migrate any remaining clients to server routes
- Document migration in MIGRATION.md

### Phase 4: Implement Proper Authentication (WEEK 3)

- Audit all routes for auth requirements
- Unify auth middleware naming
- Add proper validation for sensitive endpoints
- Document authentication requirements in OpenAPI spec

---

## 4. OpenAPI/Swagger Specification

Create `API_SPEC.yaml` with:

```yaml
openapi: 3.0.0
info:
  title: SupliList API
  version: 2.0.0
  description: Supplement tracking and management API

servers:
  - url: https://api.suplilist.com/api/v2
    description: Production (v2)
  - url: https://api.suplilist.com/api/v1
    description: Production (v1 - deprecated)

paths:
  /price-alerts:
    get:
      summary: List user's price alerts
      tags: [Price Alerts]
      security:
        - BearerAuth: []
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PriceAlertListResponse'
    post:
      summary: Create price alert
      tags: [Price Alerts]
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreatePriceAlertRequest'
      responses:
        201:
          description: Alert created
  
  /price-alerts/{alertId}:
    get:
      summary: Get specific alert
      parameters:
        - in: path
          name: alertId
          required: true
          schema:
            type: string
      responses:
        200:
          description: Success
    patch:
      summary: Update alert
      parameters:
        - in: path
          name: alertId
          required: true
          schema:
            type: string
      responses:
        200:
          description: Updated
    delete:
      summary: Delete alert
      parameters:
        - in: path
          name: alertId
          required: true
          schema:
            type: string
      responses:
        204:
          description: Deleted

  /notifications/device-tokens:
    post:
      summary: Register device token for notifications
      tags: [Notifications]
      security:
        - BearerAuth: []
      responses:
        201:
          description: Token registered

# More paths...

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  
  schemas:
    ApiResponse:
      type: object
      required: [success]
      properties:
        success:
          type: boolean
        data:
          type: object
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string
            details:
              type: object
        meta:
          type: object
```

---

## 5. Rate Limiting & Performance

### Current Issues
- Global rate limit: 100 req/15 min (reasonable)
- Per-endpoint limits vary widely (10-200 req/min)
- No explicit rate limit documentation

### Improvements
```typescript
// Standardize rate limits by endpoint type:
const rateLimits = {
  // Auth endpoints - restrictive
  '/api/auth/*': { windowMs: 15 * 60 * 1000, max: 5 },
  
  // Read endpoints - permissive
  '/api/*/GET': { windowMs: 60 * 1000, max: 100 },
  
  // Write endpoints - moderate
  '/api/*/POST|PATCH|DELETE': { windowMs: 60 * 1000, max: 30 },
  
  // File uploads - very restrictive
  '/api/*/photo|upload': { windowMs: 60 * 60 * 1000, max: 10 },
  
  // Admin endpoints - very restrictive
  '/api/admin/*': { windowMs: 60 * 1000, max: 10 },
};
```

### Monitoring
- Add rate limit info to OpenAPI spec
- Return `X-RateLimit-*` headers on all responses
- Implement rate limit tracking dashboard

---

## 6. Implementation Plan

### Week 1: Foundation
- [ ] Create `API_CONSOLIDATION_v2.yaml` OpenAPI spec
- [ ] Create shared response format utilities
- [ ] Create standardized error handling
- [ ] Update middleware for consistent response format

### Week 2: Consolidation
- [ ] Fix price-alerts route conflicts (move device-tokens)
- [ ] Consolidate cache-admin endpoints
- [ ] Implement API v1 and v2 route prefixes
- [ ] Add deprecation headers to v1

### Week 3: Migration
- [ ] Create MIGRATION.md for clients
- [ ] Remove legacy backend routes
- [ ] Update internal clients to use v2
- [ ] Update tests and documentation

### Week 4: Monitoring
- [ ] Set up OpenAPI docs endpoint
- [ ] Implement deprecation tracking
- [ ] Create API usage analytics
- [ ] Monitor v1 deprecation adoption

---

## 7. Endpoint Summary by Module

### Authentication (v2)
```
POST   /api/v2/auth/login
POST   /api/v2/auth/register
POST   /api/v2/auth/refresh
POST   /api/v2/auth/logout
POST   /api/v2/auth/forgot-password
PUT    /api/v2/auth/reset-password
```

### Profile (v2)
```
GET    /api/v2/profile
PUT    /api/v2/profile
POST   /api/v2/profile/photo
DELETE /api/v2/profile/photo
GET    /api/v2/profile/{userId}/photo  [PUBLIC]
```

### Price Alerts (v2) - CONSOLIDATED
```
GET    /api/v2/price-alerts
POST   /api/v2/price-alerts
GET    /api/v2/price-alerts/{alertId}
PATCH  /api/v2/price-alerts/{alertId}
DELETE /api/v2/price-alerts/{alertId}
GET    /api/v2/price-alerts/{alertId}/history
```

### Notifications (v2) - EXPANDED
```
GET    /api/v2/notifications/preferences
PUT    /api/v2/notifications/preferences
POST   /api/v2/notifications/schedule
POST   /api/v2/notifications/track
GET    /api/v2/notifications/pending
GET    /api/v2/notifications/analytics
POST   /api/v2/notifications/device-tokens
DELETE /api/v2/notifications/device-tokens/{tokenId}
```

### Reports (v2)
```
GET    /api/v2/reports/heatmap
GET    /api/v2/reports/trend
GET    /api/v2/reports/streak
GET    /api/v2/reports/achievements
GET    /api/v2/reports/dashboard
GET    /api/v2/reports/monthly
GET    /api/v2/reports/supplements/{supplementId}
```

### Cache Admin (v2) - CONSOLIDATED
```
GET    /api/v2/admin/cache/stats
POST   /api/v2/admin/cache/flush
POST   /api/v2/admin/cache/invalidate
PATCH  /api/v2/admin/cache/pending
```

### Health & Monitoring
```
GET    /health/live
GET    /health/ready
GET    /metrics
```

---

## 8. Breaking Changes & Deprecation

### V1 Endpoints (Deprecated)
All v1 endpoints will:
1. Return `Deprecation: true` header
2. Return `Sunset: <date>` header (6 months from now)
3. Log deprecation warnings
4. Track usage analytics

### V1 Sunset Schedule
- **Now**: Deprecation headers added
- **3 months**: Announcement to users
- **6 months**: Endpoints return 410 Gone
- **Clients must migrate** to v2 within this window

---

## 9. Success Criteria

- [ ] All endpoints follow REST conventions
- [ ] 100% endpoint consistency (response format, status codes, errors)
- [ ] 0 duplicate endpoints
- [ ] 100% endpoint documentation in OpenAPI spec
- [ ] Rate limits documented and enforced
- [ ] All integration tests passing
- [ ] V1 and V2 coexisting for 6-month deprecation window
- [ ] Zero breaking changes within V2

---

## 10. Files to Create/Modify

### New Files
- `API_SPEC_V2.yaml` - OpenAPI 3.0 specification
- `API_MIGRATION.md` - Client migration guide
- `server/src/shared/types/api-response.ts` - Shared response types
- `server/src/shared/utils/api-formatter.ts` - Response formatting utilities

### Files to Modify
- `server/src/routes/price-alerts.routes.ts` - Move device-tokens, fix conflicts
- `server/src/routes/cache-admin.routes.ts` - Consolidate endpoints
- `server/src/app.ts` - Add v1/v2 route prefixes
- `server/src/middleware/response-optimization.middleware.ts` - Enforce format

### Files to Delete
- `backend/routes/notifications.js` - Legacy duplicate
- `backend/routes/profile.js` - Legacy duplicate
- `backend/routes/reports.js` - Legacy duplicate

---

## 11. Next Steps

1. **Review this document** with team
2. **Approve scope** and timeline
3. **Create OpenAPI spec** for v2
4. **Implement response format** utilities
5. **Start Phase 1 consolidation** with price-alerts
6. **Establish deprecation policy** for v1
7. **Create migration guide** for clients

---

**Status**: Ready for implementation  
**Priority**: High (affects all API clients)  
**Estimated Effort**: 3-4 weeks
