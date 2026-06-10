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
        const typePattern = INVALIDATION_PATTERNS[
          entityType.toUpperCase() + '_COLLECTION' as keyof typeof INVALIDATION_PATTERNS
        ] || `cache:${entityType}:*`;

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
 * POST /api/admin/cache/invalidate/products
 * Invalidate all product cache
 */
router.post(
  '/api/admin/cache/invalidate/products',
  async (req: Request, res: Response) => {
    try {
      const deleted = await queryCacheService.invalidatePattern(
        INVALIDATION_PATTERNS.ALL_PRODUCTS,
      );

      res.json({
        success: true,
        data: { invalidated: deleted, pattern: INVALIDATION_PATTERNS.ALL_PRODUCTS },
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
 * Invalidate all list cache
 */
router.post(
  '/api/admin/cache/invalidate/lists',
  async (req: Request, res: Response) => {
    try {
      const deleted = await queryCacheService.invalidatePattern(
        INVALIDATION_PATTERNS.ALL_LISTS,
      );

      res.json({
        success: true,
        data: { invalidated: deleted, pattern: INVALIDATION_PATTERNS.ALL_LISTS },
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
 * Invalidate all search cache
 */
router.post(
  '/api/admin/cache/invalidate/search',
  async (req: Request, res: Response) => {
    try {
      const deleted = await queryCacheService.invalidatePattern(
        INVALIDATION_PATTERNS.SEARCH_RESULTS,
      );

      res.json({
        success: true,
        data: { invalidated: deleted, pattern: INVALIDATION_PATTERNS.SEARCH_RESULTS },
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
