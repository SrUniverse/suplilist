/**
 * Affiliate Routes - FASE 2 - JIT Endpoints
 * Version: 1.0.0
 *
 * Implements Just-In-Time (JIT) routing for affiliate conversions.
 * - /out endpoint: Converts product links to affiliate URLs
 * - JIT timeout: 1 second max, falls back to telemetry
 * - Rate limiting + Crawler defense
 * - Support: Amazon, Shopee, Mercado Livre
 */

import { Router, Request, Response, NextFunction } from 'express';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware.js';
import { crawlerBlockMiddleware } from '../middleware/crawler-block.middleware.js';
import { validateAffiliateInput } from '../validators/affiliate.validator.js';
import {
  convertAmazonLink,
  convertShopeeLink,
  convertMercadoLivreLink,
} from '../services/affiliate.service.js';
import { logTelemetry } from '../services/telemetry.service.js';
import { logger } from '../utils/logger.js';

export const affiliateRouter = Router();

/**
 * POST /api/affiliate/out
 *
 * Convert product URL to affiliate link with JIT timeout.
 *
 * Request:
 * {
 *   "url": "https://www.amazon.com.br/dp/B123456789",
 *   "source": "amazon|shopee|mercadolivre",
 *   "productId": "optional-internal-id"
 * }
 *
 * Response (Success):
 * {
 *   "success": true,
 *   "affiliateUrl": "https://amzn.to/3x...",
 *   "source": "amazon",
 *   "redirectDelay": 15,
 *   "cached": false
 * }
 *
 * Response (JIT Timeout - Fallback):
 * {
 *   "success": true,
 *   "affiliateUrl": "https://original-url.com",
 *   "source": "amazon",
 *   "cached": false,
 *   "timedOut": true,
 *   "fallback": "original_url"
 * }
 */
affiliateRouter.post(
  '/out',
  rateLimitMiddleware({ windowMs: 60000, maxRequests: 100 }),
  crawlerBlockMiddleware,
  validateAffiliateInput,
  async (req: Request, res: Response, next: NextFunction) => {
    const { url, source, productId } = req.body;
    const requestId = req.get('X-Trace-ID') || `jit_${Date.now()}_${Math.random()}`;
    const startTime = Date.now();

    try {
      // JIT timeout: 1 second max
      const jitPromise = convertAffiliateLink(url, source, productId);
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(
          () => resolve({ timedOut: true, originalUrl: url }),
          1000
        )
      );

      const result = await Promise.race([jitPromise, timeoutPromise]);
      const duration = Date.now() - startTime;

      if ('timedOut' in result && result.timedOut) {
        // Timeout occurred - return original URL and log telemetry
        await logTelemetry('jit_timeout_fallback_count', {
          source,
          duration,
          requestId,
          userAgent: req.get('User-Agent'),
        });

        return res.json({
          success: true,
          affiliateUrl: result.originalUrl,
          source,
          redirectDelay: 0,
          cached: false,
          timedOut: true,
          fallback: 'original_url',
          duration,
        });
      }

      // JIT conversion succeeded
      return res.json({
        success: true,
        affiliateUrl: result.affiliateUrl,
        source: result.source,
        redirectDelay: result.redirectDelay || 15,
        cached: result.cached || false,
        duration,
      });
    } catch (error) {
      logger.error('[Affiliate] JIT conversion error:', {
        url,
        source,
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fallback on error
      await logTelemetry('jit_error_fallback_count', {
        source,
        error: error instanceof Error ? error.message : 'unknown',
        requestId,
      });

      return res.json({
        success: true,
        affiliateUrl: url, // Return original URL
        source,
        redirectDelay: 0,
        cached: false,
        timedOut: false,
        fallback: 'error',
        duration: Date.now() - startTime,
      });
    }
  }
);

/**
 * Helper function to convert affiliate link based on source
 */
async function convertAffiliateLink(
  url: string,
  source: string,
  productId?: string
): Promise<{
  affiliateUrl: string;
  source: string;
  redirectDelay: number;
  cached: boolean;
}> {
  switch (source) {
    case 'amazon':
      return convertAmazonLink(url, productId);
    case 'shopee':
      return convertShopeeLink(url, productId);
    case 'mercadolivre':
      return convertMercadoLivreLink(url, productId);
    default:
      throw new Error(`Unsupported affiliate source: ${source}`);
  }
}

/**
 * GET /api/affiliate/health
 * Health check for affiliate service
 */
affiliateRouter.get('/health', async (req: Request, res: Response) => {
  try {
    const isHealthy = await checkAffiliateServiceHealth();

    return res.json({
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'affiliate-jit',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(503).json({
      status: 'unhealthy',
      service: 'affiliate-jit',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Check health of affiliate service
 */
async function checkAffiliateServiceHealth(): Promise<boolean> {
  try {
    // Check if affiliate conversion service is responding
    // This would typically test connectivity to Amazon, Shopee APIs
    // For now, just return true as a placeholder
    return true;
  } catch {
    return false;
  }
}

export default affiliateRouter;
