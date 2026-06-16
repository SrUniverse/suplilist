/**
 * Cache Administration Routes
 * Version: 1.0.0
 *
 * Administrative endpoints for cache management:
 * - GET /api/admin/cache/stats — Cache statistics
 * - POST /api/admin/cache/flush — Clear all cache (dev only)
 * - POST /api/admin/cache/invalidate — Invalidate specific pattern
 *
 * Requires admin authentication
 */

import { Router, Request, Response } from 'express';
import { queryCacheService } from '../shared/services/query-cache.service.js';
import { queryCacheInvalidatorService } from '../shared/services/query-cache-invalidator.service.js';
import { INVALIDATION_PATTERNS } from '../shared/utils/query-cache.util.js';

const router = Router();

/**
 * GET /api/admin/cache/stats
 * Get cache statistics
 */
router.get('/api/admin/cache/stats', async (req: Request, res: Response) => {
  try {
    const stats = await queryCacheService.getStats();
    const healthy = await queryCacheService.healthCheck();

    res.json({
      success: true,
      data: {
        ...stats,
        healthy,
        pendingInvalidations: queryCacheInvalidatorService.getPendingCount(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get cache stats',
    });
  }
});

/**
 * POST /api/admin/cache/flush
 * Clear all cache (development only)
 */
router.post('/api/admin/cache/flush', async (req: Request, res: Response) => {
  try {
    const env = process.env.NODE_ENV || 'development';

    if (env !== 'development') {
      return res.status(403).json({
        success: false,
        error: 'Cache flush not allowed in production',
      });
    }

    await queryCacheService.flush(env);

    res.json({
      success: true,
      message: 'Cache flushed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to flush cache',
    });
  }
});

/**
 * POST /api/admin/cache/invalidate
 * Invalidate cache by pattern or entity type
 *
 * Body:
 *   - pattern?: string — Redis key pattern (e.g., "cache:products:*")
 *   - entityType?: string — Entity type to invalidate (products, lists, users, etc.)
 *   - entityId?: string | number — Specific entity ID to invalidate
 */
router.post(
  '/api/admin/cache/invalidate',
  async (req: Request, res: Response) => {
    try {
      const { pattern, entityType, entityId } = req.body;

      if (!pattern && !entityType) {
        return res.status(400).json({
          success: false,
          error: 'Either "pattern" or "entityType" must be provided',
        });
      }

      let deleted = 0;

      if (pattern) {
        // Invalidate by pattern
        deleted = await queryCacheService.invalidatePattern(pattern);
      } else if (entityType && entityId) {
        // Invalidate specific entity
        await queryCacheInvalidatorService.invalidateEntity(entityType, entityId);
        deleted = 1;
      } else if (entityType) {
        // Invalidate all of entity type
        const patternEntry = INVALIDATION_PATTERNS[
          (entityType.toUpperCase() + '_COLLECTION') as keyof typeof INVALIDATION_PATTERNS
        ];
        const typePattern = typeof patternEntry === 'string' ? patternEntry : `cache:${entityType}:*`;

        deleted = await queryCacheService.invalidatePattern(typePattern);
      }

      res.json({
        success: true,
        data: {
          invalidated: deleted,
          pattern: pattern || `cache:${entityType}:*`,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to invalidate cache',
      });
    }
  },
);

/**
 * DEPRECATED: Specific cache invalidation endpoints
 *
 * The following endpoints are deprecated in favor of the generic invalidation endpoint:
 * - POST /api/admin/cache/invalidate/products
 * - POST /api/admin/cache/invalidate/lists
 * - POST /api/admin/cache/invalidate/search
 *
 * Use instead:
 * POST /api/admin/cache/invalidate?entityType=products
 * POST /api/admin/cache/invalidate?entityType=lists
 * POST /api/admin/cache/invalidate?entityType=search
 *
 * Or with request body:
 * POST /api/admin/cache/invalidate
 * { "entityType": "products" | "lists" | "search" }
 *
 * These endpoints remain for backward compatibility but will be removed in v3.
 */

/**
 * POST /api/admin/cache/invalidate/products
 * @deprecated Use POST /api/admin/cache/invalidate?entityType=products
 * Invalidate all product cache
 */
router.post(
  '/api/admin/cache/invalidate/products',
  async (req: Request, res: Response) => {
    try {
      const deleted = await queryCacheService.invalidatePattern(
        INVALIDATION_PATTERNS.ALL_PRODUCTS,
      );

      // Add deprecation header
      res.set('Deprecation', 'true');
      res.set('Sunset', '2024-12-01T00:00:00Z');

      res.json({
        success: true,
        data: { invalidated: deleted, pattern: INVALIDATION_PATTERNS.ALL_PRODUCTS },
        deprecation: {
          message: 'This endpoint is deprecated. Use POST /api/admin/cache/invalidate?entityType=products',
          sunset: '2024-12-01T00:00:00Z',
          alternative: '/api/admin/cache/invalidate',
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to invalidate',
      });
    }
  },
);

/**
 * POST /api/admin/cache/invalidate/lists
 * @deprecated Use POST /api/admin/cache/invalidate?entityType=lists
 * Invalidate all list cache
 */
router.post(
  '/api/admin/cache/invalidate/lists',
  async (req: Request, res: Response) => {
    try {
      const deleted = await queryCacheService.invalidatePattern(
        INVALIDATION_PATTERNS.ALL_LISTS,
      );

      // Add deprecation header
      res.set('Deprecation', 'true');
      res.set('Sunset', '2024-12-01T00:00:00Z');

      res.json({
        success: true,
        data: { invalidated: deleted, pattern: INVALIDATION_PATTERNS.ALL_LISTS },
        deprecation: {
          message: 'This endpoint is deprecated. Use POST /api/admin/cache/invalidate?entityType=lists',
          sunset: '2024-12-01T00:00:00Z',
          alternative: '/api/admin/cache/invalidate',
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to invalidate',
      });
    }
  },
);

/**
 * POST /api/admin/cache/invalidate/search
 * @deprecated Use POST /api/admin/cache/invalidate?entityType=search
 * Invalidate all search cache
 */
router.post(
  '/api/admin/cache/invalidate/search',
  async (req: Request, res: Response) => {
    try {
      const deleted = await queryCacheService.invalidatePattern(
        INVALIDATION_PATTERNS.SEARCH_RESULTS,
      );

      // Add deprecation header
      res.set('Deprecation', 'true');
      res.set('Sunset', '2024-12-01T00:00:00Z');

      res.json({
        success: true,
        data: { invalidated: deleted, pattern: INVALIDATION_PATTERNS.SEARCH_RESULTS },
        deprecation: {
          message: 'This endpoint is deprecated. Use POST /api/admin/cache/invalidate?entityType=search',
          sunset: '2024-12-01T00:00:00Z',
          alternative: '/api/admin/cache/invalidate',
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to invalidate',
      });
    }
  },
);

/**
 * POST /api/admin/cache/flush-pending
 * Flush all pending cache invalidations
 */
router.post(
  '/api/admin/cache/flush-pending',
  async (req: Request, res: Response) => {
    try {
      const pending = queryCacheInvalidatorService.getPendingCount();
      await queryCacheInvalidatorService.forceFlush();

      res.json({
        success: true,
        data: { flushed: pending },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to flush pending',
      });
    }
  },
);

export default router;
