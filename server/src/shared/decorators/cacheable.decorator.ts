/**
 * @Cacheable() Decorator
 * Version: 1.0.0
 *
 * Transparent caching decorator for class methods returning Promises.
 * Automatically caches results and validates TTL.
 *
 * Usage:
 *   @Cacheable({ ttl: 300, cacheType: 'products' })
 *   async getProduct(id: string): Promise<Product> {
 *     // Query logic
 *   }
 */

import { createHash } from 'crypto';
import { getRedisClient } from '../config/redis.config.js';
import {
  recordCacheMetrics,
  cacheHitsTotal,
  cacheMissesTotal,
} from '../utils/metrics.js';

export interface CacheableOptions {
  ttl?: number; // Time to live in seconds (default: 3600)
  keyPrefix?: string; // Custom cache key prefix
  cacheType?: string; // Cache type for metrics (products, lists, users, etc.)
}

/**
 * Cacheable decorator for transparent method result caching
 *
 * @param options Cache configuration
 */
export function Cacheable(options: CacheableOptions = {}): MethodDecorator {
  return function (target, propertyKey, descriptor) {
    if (!(descriptor?.value instanceof Function)) {
      throw new Error('@Cacheable can only be applied to methods');
    }

    const originalMethod = descriptor.value;
    const ttl = options.ttl ?? 3600;
    const keyPrefix = options.keyPrefix ?? 'cache:method';
    const cacheType = options.cacheType ?? 'unknown';

    descriptor.value = (async function (this: unknown, ...args: any[]): Promise<any> {
      const redis = getRedisClient();

      try {
        // Generate cache key from method name and arguments
        const methodName = String(propertyKey);
        const argHash = createHash('sha256')
          .update(JSON.stringify(args))
          .digest('hex')
          .slice(0, 16);
        const cacheKey = `${keyPrefix}:${methodName}:${argHash}`;

        // Try cache
        const startTime = Date.now();
        const cached = await redis.get(cacheKey);

        if (cached) {
          const duration = (Date.now() - startTime) / 1000;
          recordCacheMetrics('method', cacheType, true, duration);
          cacheHitsTotal.inc({
            operation: 'decorator_method',
            key_type: cacheType,
          });
          return JSON.parse(cached);
        }

        // Cache miss - call original method
        const result = await originalMethod.apply(this, args);

        // Cache result (fire-and-forget)
        redis.setex(cacheKey, ttl, JSON.stringify(result)).catch((error) => {
          console.warn(
            `[Cacheable] Failed to cache result for ${methodName}:`,
            error,
          );
        });

        const duration = (Date.now() - startTime) / 1000;
        recordCacheMetrics('method', cacheType, false, duration);
        cacheMissesTotal.inc({
          operation: 'decorator_method',
          key_type: cacheType,
        });

        return result;
      } catch (error) {
        console.warn('[Cacheable] Cache error, executing method:', error);
        // Fallback: execute original method
        return originalMethod.apply(this, args);
      }
    }) as typeof descriptor.value;

    return descriptor;
  };
}
