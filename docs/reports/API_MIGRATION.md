# SupliList API Migration Guide

## Overview

This guide helps clients migrate from SupliList API v1 to v2. While v1 endpoints remain functional during the 6-month deprecation window, migrating to v2 provides:

- Consistent response format across all endpoints
- Standardized error handling
- Better support for pagination and metadata
- Improved API documentation
- Future-proof deprecation path

**Sunset Date**: December 1, 2024 (6 months from deprecation notice)

---

## Quick Start

### Base URL Changes

```diff
- https://api.suplilist.com/api/...     (v1 - deprecated)
+ https://api.suplilist.com/api/v2/...  (v2 - current)
```

### Example: Migrating a simple request

```javascript
// v1 (deprecated)
const response = await fetch('https://api.suplilist.com/api/price-alerts', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();

// v2 (current)
const response = await fetch('https://api.suplilist.com/api/v2/price-alerts', {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
// Now data has standardized format: { success, data, meta }
```

---

## Response Format Changes

### Success Response

**v1 (Variable format)**
```javascript
// Different format for each endpoint
{
  success: true,
  data: { ... },
  message: "optional"
}

// OR
{
  success: true,
  preferences: { ... },
  optimalTime: { ... }
}
```

**v2 (Standardized)**
```javascript
{
  success: true,
  data: {
    // Entire response data in 'data' property
    preferences: { ... },
    optimalTime: { ... }
  },
  meta: {
    timestamp: "2024-01-01T12:00:00Z",
    requestId: "req_123abc",
    pagination: {  // Only for list endpoints
      total: 100,
      page: 1,
      limit: 10,
      hasMore: true
    }
  }
}
```

### Error Response

**v1 (Variable format)**
```javascript
// Different error shapes
{
  success: false,
  error: "message"
}

// OR
{
  success: false,
  error: {
    message: "error"
  }
}
```

**v2 (Standardized)**
```javascript
{
  success: false,
  error: {
    code: "not_found",           // Machine-readable code
    message: "Item not found",   // User-friendly message
    details: {                   // Optional field-level errors
      field1: "Error message"
    }
  },
  meta: {
    timestamp: "2024-01-01T12:00:00Z",
    requestId: "req_123abc"
  }
}
```

---

## Endpoint Migration

### Price Alerts

#### List alerts (no change needed)
```diff
- GET /api/price-alerts
+ GET /api/v2/price-alerts
```

#### Get specific alert
```diff
- GET /api/price-alerts/:alertId
+ GET /api/v2/price-alerts/:alertId
```

#### Create alert
```diff
- POST /api/price-alerts
+ POST /api/v2/price-alerts
```

#### Update alert
```diff
- PATCH /api/price-alerts/:alertId
+ PATCH /api/v2/price-alerts/:alertId
```

#### Delete alert
```diff
- DELETE /api/price-alerts/:alertId
+ DELETE /api/v2/price-alerts/:alertId
```

#### Get price history (CRITICAL CHANGE - route consolidated)

**BEFORE:**
```javascript
GET /api/price-alerts/history/:productId
```

**AFTER:**
The endpoint has been moved from price-alerts module to under specific alert:
```javascript
GET /api/v2/price-alerts/:alertId/history
```

**Example:**
```javascript
// Get history for a specific alert
const response = await fetch(
  'https://api.suplilist.com/api/v2/price-alerts/alert123/history',
  { headers: { Authorization: `Bearer ${token}` } }
);
```

**Reason:** This is a child resource of the alert, so it belongs under the alert ID, not as a top-level endpoint.

---

### Device Tokens (CRITICAL CHANGE - endpoint moved)

Device tokens have been moved from `/api/price-alerts/device-tokens` to `/api/notifications/device-tokens` because they are notification-related, not price-alert-specific.

#### Register device token

**BEFORE:**
```javascript
POST /api/price-alerts/device-tokens
{
  "deviceToken": "...",
  "deviceName": "My iPhone",
  "deviceType": "ios"
}
```

**AFTER:**
```javascript
POST /api/v2/notifications/device-tokens
{
  "deviceToken": "...",
  "deviceName": "My iPhone",
  "deviceType": "ios"
}
```

#### Unregister device token

**BEFORE:**
```javascript
DELETE /api/price-alerts/device-tokens/:tokenId
```

**AFTER:**
```javascript
DELETE /api/v2/notifications/device-tokens/:tokenId
```

**Backward Compatibility:** The old endpoints are still functional in v1 but will return deprecation headers:
```
Deprecation: true
Sunset: 2024-12-01T00:00:00Z
Link: </api/v2/notifications/device-tokens>; rel="successor-version"
```

---

### Cache Admin Endpoints (Consolidation)

#### Generic invalidation endpoint

Cache invalidation endpoints have been consolidated. Instead of separate endpoints for each entity type:

**BEFORE:**
```javascript
POST /api/admin/cache/invalidate/products
POST /api/admin/cache/invalidate/lists
POST /api/admin/cache/invalidate/search
```

**AFTER:**
Use the generic endpoint with query parameter or body:
```javascript
// Option 1: Query parameter
POST /api/v2/admin/cache/invalidate?entityType=products
POST /api/v2/admin/cache/invalidate?entityType=lists
POST /api/v2/admin/cache/invalidate?entityType=search

// Option 2: Request body
POST /api/v2/admin/cache/invalidate
{
  "entityType": "products"
}
```

**Custom pattern still supported:**
```javascript
POST /api/v2/admin/cache/invalidate
{
  "pattern": "cache:products:*"
}
```

**Backward Compatibility:** Old endpoints return deprecation headers but still work.

---

## Client Migration Checklist

### Step 1: Update Base URLs
- [ ] Replace `https://api.suplilist.com/api/...` with `https://api.suplilist.com/api/v2/...`
- [ ] Test all endpoints in staging environment

### Step 2: Update Response Handling
- [ ] Update code to access response data via `response.data` instead of `response.preferences`, etc.
- [ ] Update pagination handling to use `response.meta.pagination`
- [ ] Update error handling to check `response.error.code` instead of `response.error.message`

```javascript
// v1 style
if (!response.success) {
  console.error(response.error);  // Just a string
}

// v2 style
if (!response.success) {
  console.error(response.error.code, response.error.message);
  if (response.error.details) {
    Object.entries(response.error.details).forEach(([field, error]) => {
      console.error(`${field}: ${error}`);
    });
  }
}
```

### Step 3: Update Request Code Specific Endpoints

#### Price Alerts
```javascript
// Get price history - update endpoint
const response = await fetch(
  `/api/v2/price-alerts/${alertId}/history`,
  { headers: { Authorization: `Bearer ${token}` } }
);
```

#### Device Tokens
```javascript
// Move to notifications module
const response = await fetch(
  '/api/v2/notifications/device-tokens',
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      deviceToken,
      deviceName,
      deviceType
    })
  }
);
```

### Step 4: Test Error Handling
- [ ] Test validation errors and verify they come from `response.error.details`
- [ ] Test 404 errors and verify error code is `not_found`
- [ ] Test 401 errors and verify error code is `unauthorized`

### Step 5: Deploy to Production
- [ ] Increment API client version
- [ ] Monitor API error logs for v1 vs v2 usage
- [ ] Keep v1 endpoints running until sunset date
- [ ] Plan removal of v1 code after sunset date

---

## Common Patterns

### Pagination

**v1 (implicit):**
```javascript
const response = await fetch('/api/price-alerts');
const alerts = response.data;  // Worked but no pagination metadata
```

**v2 (explicit):**
```javascript
const response = await fetch('/api/v2/price-alerts?page=1&limit=10');
const { data: alerts, meta: { pagination } } = response;

// Now you know:
pagination.total       // Total items
pagination.page       // Current page
pagination.limit      // Items per page
pagination.hasMore    // More pages available
pagination.totalPages // Total pages
```

### Error Handling

**v1:**
```javascript
try {
  const res = await fetch('/api/price-alerts', options);
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error);
  }
} catch (err) {
  console.error(err.message);
}
```

**v2:**
```javascript
try {
  const res = await fetch('/api/v2/price-alerts', options);
  const data = await res.json();
  
  if (!data.success) {
    const { error } = data;
    if (error.code === 'validation_error') {
      // Handle field-level errors
      Object.entries(error.details || {}).forEach(([field, message]) => {
        showFieldError(field, message);
      });
    } else if (error.code === 'not_found') {
      showNotification('Item not found');
    } else {
      showErrorDialog(error.message);
    }
  }
} catch (err) {
  console.error('Network error:', err);
}
```

### Deprecation Handling

When v1 endpoints are called, they return deprecation headers:

```javascript
const res = await fetch('/api/price-alerts/device-tokens', options);

if (res.headers.get('Deprecation') === 'true') {
  const sunset = res.headers.get('Sunset');
  const alternative = res.headers.get('Link');
  
  console.warn(`This endpoint is deprecated and will be removed on ${sunset}`);
  console.warn(`Please migrate to: ${alternative}`);
}
```

---

## TypeScript Support

### v1 Types
```typescript
interface PriceAlert {
  id: string;
  productId: string;
  targetPrice: number;
  active: boolean;
  createdAt: Date;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### v2 Types
```typescript
interface PriceAlert {
  id: string;
  productId: string;
  targetPrice: number;
  currentPrice: number | null;
  active: boolean;
  createdAt: string;
  notificationSentAt?: string;
}

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string | string[]>;
}

interface ResponseMeta {
  timestamp: string;
  requestId?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    totalPages: number;
  };
  deprecation?: {
    deprecated: true;
    sunset: string;
    alternative?: string;
    message?: string;
  };
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

interface ApiErrorResponse {
  success: false;
  error: ApiError;
  meta: ResponseMeta;
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Type guards
function isSuccess<T>(resp: ApiResponse<T>): resp is ApiSuccessResponse<T> {
  return resp.success === true;
}

function isError(resp: ApiResponse): resp is ApiErrorResponse {
  return resp.success === false;
}
```

---

## API Reference

For complete v2 API documentation, see:
- **OpenAPI Spec**: `API_SPEC_V2.yaml`
- **Interactive Docs**: https://api.suplilist.com/docs
- **Postman Collection**: https://api.suplilist.com/postman.json

---

## Support

If you encounter issues during migration:

1. **Check the OpenAPI spec** at `API_SPEC_V2.yaml`
2. **Review response examples** in the interactive docs
3. **Check request ID** in error responses for debugging
4. **Contact support**: dev@suplilist.com

---

## FAQ

**Q: Can I use v1 and v2 at the same time?**

A: Yes, both versions work simultaneously for 6 months. However, we recommend migrating as soon as possible.

**Q: What happens to my v1 requests after December 1, 2024?**

A: v1 endpoints will return HTTP 410 Gone with a message to migrate to v2.

**Q: Will my data be lost?**

A: No, only the endpoints change. All data remains the same.

**Q: Why did the price history endpoint move?**

A: It's a child resource of a price alert, so it logically belongs under `/price-alerts/:alertId/history` following RESTful conventions.

**Q: Why move device tokens to notifications?**

A: Device tokens are for notifications, not specifically for price alerts. Moving them to the notifications module makes the API structure more logical and reusable.

**Q: Do I need to update my authentication?**

A: No, authentication remains the same. Bearer tokens work with both v1 and v2.

---

## Deprecation Timeline

| Date | Action |
|------|--------|
| Now | v1 marked as deprecated, v2 available |
| Jun 1, 2024 | Announcement to users about deprecation |
| Sep 1, 2024 | v1 endpoints return deprecation headers |
| Dec 1, 2024 | v1 endpoints return 410 Gone |

---

## Success Metrics

We've successfully migrated when:
- ✓ 100% of API calls use v2 endpoints
- ✓ 0 v1 endpoint requests in logs
- ✓ All internal clients updated
- ✓ All customer integrations migrated

---

**Last Updated**: 2024-01-01  
**Version**: 1.0  
**Next Review**: 2024-06-01
