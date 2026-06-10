import { Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../shared/infrastructure/redis/redis.client.js';
import crypto from 'crypto';

/**
 * Rate Limit Middleware with X-RateLimit-* Headers
 *
 * Implements rate limiting with proper HTTP headers for client visibility:
 * - X-RateLimit-Limit: Total requests allowed in window
 * - X-RateLimit-Remaining: Requests remaining in current window
 * - X-RateLimit-Reset: Unix timestamp when limit resets
 * - Retry-After: Seconds to wait before retrying (on 429)
 *
 * Per-endpoint limits:
 * - /search: 10 requests/minute
 * - /crawl: 5 requests/minute
 * - /prices: 50 requests/minute
 */

function makeRedisStore(prefix: string) {
  return new RedisStore({
    prefix,
    // @ts-ignore
    sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)),
  });
}

function ipKey(req: Request): string {
  const raw =
    (req.headers['cf-connecting-ip'] as string) ||
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip;
  // ipKeyGenerator normalizes IPv6 to its /56 subnet so a single user cannot
  // rotate through their 2^72 addresses to bypass limits (ERR_ERL_KEY_GEN_IPV6).
  const normalized = raw ? ipKeyGenerator(raw) : 'unknown-ip';
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Enhances rate limit middleware with proper header management
 */
function enhanceRateLimitHeaders(middleware: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store original send method
    const originalSend = res.send;

    // Override send to ensure headers are properly set
    res.send = function(data: any) {
      // Rate limit info is already set by express-rate-limit
      // Just ensure proper formatting for 429 responses
      if (res.statusCode === 429) {
        const retryAfter = res.getHeader('Retry-After');
        if (!retryAfter) {
          res.setHeader('Retry-After', '60');
        }
      }
      return originalSend.call(this, data);
    };

    return middleware(req, res, next);
  };
}

/**
 * Supplement search rate limiter: 10 requests per minute
 */
export const supplementSearchLimiter = enhanceRateLimitHeaders(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    standardHeaders: true, // Return RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* (we use standard)
    passOnStoreError: true, // Redis down → allow request instead of 500
    store: makeRedisStore('rl:supplement:search:'),
    keyGenerator: ipKey,
    skip: (req: Request) => req.method === 'OPTIONS',
    message: {
      success: false,
      error: 'search_rate_limit_exceeded',
      message: 'Search limit exceeded (10/minute). Please try again later.',
    },
  })
);

/**
 * Supplement crawl rate limiter: 5 requests per minute
 */
export const supplementCrawlLimiter = enhanceRateLimitHeaders(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true, // Redis down → allow request instead of 500
    store: makeRedisStore('rl:supplement:crawl:'),
    keyGenerator: ipKey,
    skip: (req: Request) => req.method === 'OPTIONS',
    message: {
      success: false,
      error: 'crawl_rate_limit_exceeded',
      message: 'Crawl limit exceeded (5/minute). Please try again later.',
    },
  })
);

/**
 * Supplement prices rate limiter: 50 requests per minute
 */
export const supplementPricesLimiter = enhanceRateLimitHeaders(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true, // Redis down → allow request instead of 500
    store: makeRedisStore('rl:supplement:prices:'),
    keyGenerator: ipKey,
    skip: (req: Request) => req.method === 'OPTIONS',
    message: {
      success: false,
      error: 'prices_rate_limit_exceeded',
      message: 'Prices endpoint limit exceeded (50/minute). Please try again later.',
    },
  })
);

/**
 * General API rate limiter: 100 requests per 15 minutes
 */
export const apiRateLimiter = enhanceRateLimitHeaders(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true, // Redis down → allow request instead of 500
    store: makeRedisStore('rl:api:general:'),
    keyGenerator: ipKey,
    skip: (req: Request) => req.method === 'OPTIONS',
    message: {
      success: false,
      error: 'rate_limit_exceeded',
      message: 'Rate limit exceeded. Please try again later.',
    },
  })
);

/**
 * Middleware factory to set rate limit headers in responses
 * This ensures all responses include rate limit metadata
 */
export function rateLimitHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Intercept response to ensure rate limit headers are present
  const originalJson = res.json;

  res.json = function(data: any) {
    // Rate limit headers are automatically set by express-rate-limit with standardHeaders: true
    // Ensure Retry-After is set on 429 responses
    if (res.statusCode === 429) {
      const retryAfter = res.getHeader('Retry-After');
      if (!retryAfter) {
        res.setHeader('Retry-After', '60');
      }
    }
    return originalJson.call(this, data);
  };

  next();
}

/**
 * Affiliate JIT Endpoint Rate Limiter: 100 requests per minute
 * More relaxed than other endpoints since affiliate redirects are lightweight
 */
export const affiliateJitLimiter = enhanceRateLimitHeaders(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true, // Redis down → allow request instead of 500
    store: makeRedisStore('rl:affiliate:jit:'),
    keyGenerator: ipKey,
    skip: (req: Request) => req.method === 'OPTIONS',
    message: {
      success: false,
      error: 'affiliate_jit_rate_limit_exceeded',
      message: 'Rate limit exceeded (100/minute). Please try again later.',
    },
  })
);

export default {
  supplementSearchLimiter,
  supplementCrawlLimiter,
  supplementPricesLimiter,
  apiRateLimiter,
  affiliateJitLimiter,
  rateLimitHeadersMiddleware,
};
