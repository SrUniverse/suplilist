# SupliList API Consolidation - Implementation Examples

This document provides code examples for implementing the API consolidation across the SupliList application.

---

## 1. Response Formatting in Routes

### Example: Update a Route to Use Standardized Format

**Before (Inconsistent):**
```typescript
router.post(
  '/price-alerts',
  validateRequest(createPriceAlertSchema),
  async (req: Request, res: Response) => {
    try {
      const { productId, targetPrice } = req.body;
      const userId = (req as any).user.id;

      const alert = result.rows[0];

      res.status(201).json({
        success: true,
        data: {
          id: alert.id,
          productId: alert.product_id,
          targetPrice: parseFloat(alert.target_price),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);
```

**After (Standardized):**
```typescript
import { sendSuccess, sendError, createValidationError } from '../shared/utils/api-formatter.js';

router.post(
  '/',
  validateRequest(createPriceAlertSchema),
  async (req: Request, res: Response) => {
    try {
      const { productId, targetPrice } = req.body;
      const userId = (req as any).user.id;

      // Business logic...
      const alert = result.rows[0];

      // Use standardized response
      return sendSuccess(res, {
        id: alert.id,
        productId: alert.product_id,
        targetPrice: parseFloat(alert.target_price),
        active: alert.active,
        createdAt: alert.created_at,
      }, 201);

    } catch (error) {
      logger.error('Error creating price alert', { error });
      return sendError(
        res,
        error instanceof Error ? error.message : 'Failed to create price alert'
      );
    }
  }
);
```

---

## 2. Pagination Implementation

### Example: List Endpoint with Pagination

```typescript
import { sendSuccess } from '../shared/utils/api-formatter.js';
import { createPaginationMeta } from '../shared/utils/api-formatter.js';

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 10);
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM user_price_alerts WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data
    const result = await db.query(
      `SELECT id, product_id, target_price, current_price, active, created_at
       FROM user_price_alerts
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const alerts = result.rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      targetPrice: parseFloat(row.target_price),
      currentPrice: row.current_price ? parseFloat(row.current_price) : null,
      active: row.active,
      createdAt: row.created_at,
    }));

    // Send with pagination metadata
    return sendSuccess(res, alerts, 200, {
      pagination: createPaginationMeta(total, page, limit),
    });
  } catch (error) {
    logger.error('Error fetching price alerts', { error });
    return sendError(res, 'Failed to fetch price alerts');
  }
});
```

---

## 3. Error Handling with Details

### Example: Validation Error with Field-Level Details

```typescript
import {
  sendError,
  createValidationError,
  getHttpStatus,
} from '../shared/utils/api-formatter.js';

router.patch(
  '/:alertId',
  validateRequest(updatePriceAlertSchema),
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { alertId } = req.params;
      const { targetPrice, active } = req.body;

      // Validate inputs
      const errors: Record<string, string> = {};
      if (targetPrice !== undefined && targetPrice < 0) {
        errors.targetPrice = 'Price must be greater than or equal to 0';
      }
      if (active !== undefined && typeof active !== 'boolean') {
        errors.active = 'Must be a boolean value';
      }

      if (Object.keys(errors).length > 0) {
        return sendError(res, createValidationError(errors), 422);
      }

      // Update logic...
      const alert = result.rows[0];

      return sendSuccess(res, {
        id: alert.id,
        productId: alert.product_id,
        targetPrice: parseFloat(alert.target_price),
        active: alert.active,
        createdAt: alert.created_at,
      });
    } catch (error) {
      logger.error('Error updating price alert', { error });
      return sendError(res, 'Failed to update price alert');
    }
  }
);
```

---

## 4. Not Found Errors

### Example: Resource Not Found

```typescript
import { sendError, createNotFoundError, getHttpStatus } from '../shared/utils/api-formatter.js';

router.get('/:alertId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { alertId } = req.params;

    const result = await db.query(
      'SELECT * FROM user_price_alerts WHERE id = $1 AND user_id = $2',
      [alertId, userId]
    );

    if (result.rows.length === 0) {
      return sendError(
        res,
        createNotFoundError('Price alert'),
        404
      );
    }

    const alert = result.rows[0];
    return sendSuccess(res, { /* alert data */ });
  } catch (error) {
    return sendError(res, 'Failed to fetch price alert');
  }
});
```

---

## 5. Conflict Errors

### Example: Resource Already Exists

```typescript
import { sendError, createConflictError } from '../shared/utils/api-formatter.js';

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { productId, targetPrice } = req.body;
    const userId = (req as any).user.id;

    // Check if alert already exists
    const existingResult = await db.query(
      'SELECT id FROM user_price_alerts WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );

    if (existingResult.rows.length > 0) {
      return sendError(
        res,
        createConflictError(
          'Price alert already exists for this product',
          { productId: 'An alert for this product is already active' }
        ),
        409
      );
    }

    // Create alert...
    return sendSuccess(res, { /* alert data */ }, 201);
  } catch (error) {
    return sendError(res, 'Failed to create price alert');
  }
});
```

---

## 6. Deprecation Headers & Responses

### Example: Deprecated Endpoint (v1)

```typescript
import { sendSuccess, createDeprecationInfo } from '../shared/utils/api-formatter.js';

/**
 * @deprecated Use POST /api/v2/notifications/device-tokens
 */
router.post('/device-tokens', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { deviceToken, deviceName, deviceType } = req.body;

    // Business logic...
    const tokenId = result.rows[0].id;

    // Add deprecation headers
    res.set('Deprecation', 'true');
    res.set('Sunset', '2024-12-01T00:00:00Z');
    res.set('Link', '</api/v2/notifications/device-tokens>; rel="successor-version"');

    return sendSuccess(res, { tokenId }, 201, {
      deprecation: createDeprecationInfo(
        '2024-12-01T00:00:00Z',
        '/api/v2/notifications/device-tokens',
        'This endpoint has been moved to the notifications module. Please migrate your requests.'
      ),
    });
  } catch (error) {
    return sendError(res, 'Failed to register device token');
  }
});
```

---

## 7. Middleware for Standardized Responses

### Example: Response Formatting Middleware

Create a middleware that wraps all responses:

```typescript
// server/src/middleware/standardized-response.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { sendError } from '../shared/utils/api-formatter.js';

/**
 * Middleware to ensure all error responses follow the standard format
 * Wraps the res.json() method to standardize error responses
 */
export function standardizedResponseMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method
  res.json = function(data: any) {
    // If response doesn't have success property, assume it's an error
    if (data && typeof data === 'object' && !('success' in data)) {
      // This is likely a raw error response from old code
      // Convert to standardized format
      const standardized = {
        success: false,
        error: {
          code: 'internal_server_error',
          message: data.error || data.message || 'An error occurred',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };
      return originalJson.call(this, standardized);
    }

    // Already in standard format or success response
    if (!('meta' in data) && data.success === true) {
      // Add meta if missing on success response
      data.meta = {
        timestamp: new Date().toISOString(),
      };
    }

    return originalJson.call(this, data);
  };

  next();
}
```

### Integration in app.ts:

```typescript
import { standardizedResponseMiddleware } from './middleware/standardized-response.middleware.js';

export function createApp() {
  const app = express();

  // ... other middleware ...

  // Add standardized response middleware early in the stack
  app.use(standardizedResponseMiddleware);

  // ... rest of app setup ...
}
```

---

## 8. Testing with Standardized Format

### Example: Jest Test for Price Alerts

```typescript
// server/src/routes/__tests__/price-alerts.test.ts

import request from 'supertest';
import { createApp } from '../../app';

describe('Price Alerts Routes - v2', () => {
  let app: any;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /api/v2/price-alerts', () => {
    it('should return standardized list response', async () => {
      const response = await request(app)
        .get('/api/v2/price-alerts')
        .set('Authorization', `Bearer ${validToken}`);

      // Verify response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('pagination');

      // Verify pagination structure
      expect(response.body.meta.pagination).toHaveProperty('total');
      expect(response.body.meta.pagination).toHaveProperty('page');
      expect(response.body.meta.pagination).toHaveProperty('limit');
      expect(response.body.meta.pagination).toHaveProperty('hasMore');
    });

    it('should return validation error with field details', async () => {
      const response = await request(app)
        .patch('/api/v2/price-alerts/invalid-id')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ targetPrice: -10 });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('validation_error');
      expect(response.body.error.details).toHaveProperty('targetPrice');
    });

    it('should return 404 for missing alert', async () => {
      const response = await request(app)
        .get('/api/v2/price-alerts/non-existent-id')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('not_found');
    });

    it('should return deprecation headers on v1 endpoint', async () => {
      const response = await request(app)
        .post('/api/price-alerts/device-tokens')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ deviceToken: 'test', deviceType: 'ios' });

      expect(response.headers).toHaveProperty('deprecation', 'true');
      expect(response.headers).toHaveProperty('sunset');
      expect(response.headers).toHaveProperty('link');
    });
  });
});
```

---

## 9. Client SDK Implementation

### Example: TypeScript Client

```typescript
// clients/javascript/src/api-client.ts

import {
  ApiResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
  isSuccessResponse,
} from '@suplilist/api-types';

class SupliListClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = 'https://api.suplilist.com/api/v2') {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    return response.json();
  }

  // Price Alerts
  async getPriceAlerts(page = 1, limit = 10): Promise<ApiResponse<any[]>> {
    return this.request('GET', `/price-alerts?page=${page}&limit=${limit}`);
  }

  async createPriceAlert(productId: string, targetPrice: number): Promise<ApiResponse<any>> {
    return this.request('POST', '/price-alerts', { productId, targetPrice });
  }

  async updatePriceAlert(alertId: string, data: any): Promise<ApiResponse<any>> {
    return this.request('PATCH', `/price-alerts/${alertId}`, data);
  }

  async deletePriceAlert(alertId: string): Promise<ApiResponse<void>> {
    return this.request('DELETE', `/price-alerts/${alertId}`);
  }

  async getPriceHistory(alertId: string, limit = 100, offset = 0): Promise<ApiResponse<any>> {
    return this.request(
      'GET',
      `/price-alerts/${alertId}/history?limit=${limit}&offset=${offset}`
    );
  }

  // Device Tokens (moved to notifications)
  async registerDeviceToken(token: string, name?: string, type?: string): Promise<ApiResponse<any>> {
    return this.request('POST', '/notifications/device-tokens', {
      deviceToken: token,
      deviceName: name,
      deviceType: type,
    });
  }

  async unregisterDeviceToken(tokenId: string): Promise<ApiResponse<void>> {
    return this.request('DELETE', `/notifications/device-tokens/${tokenId}`);
  }
}

// Usage example
const client = new SupliListClient();
client.setToken('jwt-token-here');

// Get alerts with proper type checking
const response = await client.getPriceAlerts();
if (isSuccessResponse(response)) {
  const alerts = response.data;
  const { total, page, limit } = response.meta.pagination || {};
  console.log(`Got ${total} alerts (page ${page} of ${Math.ceil(total / limit)})`);
} else {
  const { error } = response;
  console.error(`Error (${error.code}): ${error.message}`);
  if (error.details) {
    Object.entries(error.details).forEach(([field, message]) => {
      console.error(`  ${field}: ${message}`);
    });
  }
}
```

---

## 10. Documentation Endpoint

### Example: OpenAPI Docs Endpoint

```typescript
// server/src/routes/docs.route.ts

import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const createDocsRouter = () => {
  const router = Router();

  // Load OpenAPI spec
  const specPath = path.join(__dirname, '../../API_SPEC_V2.yaml');
  const spec = yaml.load(fs.readFileSync(specPath, 'utf8')) as any;

  // Swagger UI
  router.use('/api-docs', swaggerUi.serve);
  router.get('/api-docs', swaggerUi.setup(spec));

  // Raw OpenAPI spec
  router.get('/openapi.yaml', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/yaml');
    res.send(fs.readFileSync(specPath, 'utf8'));
  });

  router.get('/openapi.json', (_req: Request, res: Response) => {
    res.json(spec);
  });

  return router;
};

export default createDocsRouter;
```

### Integration in app.ts:

```typescript
import { createDocsRouter } from './routes/docs.route.js';

export function createApp() {
  const app = express();

  // ... other middleware and routes ...

  // Documentation endpoints
  app.use('/', createDocsRouter());

  // ...
}
```

**Access documentation at:**
- Swagger UI: `https://api.suplilist.com/api-docs`
- OpenAPI YAML: `https://api.suplilist.com/openapi.yaml`
- OpenAPI JSON: `https://api.suplilist.com/openapi.json`

---

## Summary

These examples demonstrate:
1. ✅ Standardized response formatting
2. ✅ Proper pagination implementation
3. ✅ Detailed error handling
4. ✅ Deprecation management
5. ✅ Middleware integration
6. ✅ Testing patterns
7. ✅ Client SDK usage
8. ✅ Documentation serving

Use these as templates when updating the remaining routes and modules.
