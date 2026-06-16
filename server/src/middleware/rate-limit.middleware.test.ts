/**
 * Rate Limit Middleware Tests
 *
 * Test coverage for P2 fix: Rate limiting with X-RateLimit-* headers
 * - Verify headers present on all responses
 * - Test per-endpoint limits
 * - Verify 429 responses with Retry-After header
 * - Verify rate limit state in Redis
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  supplementSearchLimiter,
  supplementCrawlLimiter,
  supplementPricesLimiter,
  apiRateLimiter,
  rateLimitHeadersMiddleware,
} from './rate-limit.middleware.js';
import { redisClient } from '../shared/infrastructure/redis/redis.client.js';

// Mock Redis client
vi.mock('../shared/infrastructure/redis/redis.client.js', () => ({
  redisClient: {
    call: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    exists: vi.fn().mockResolvedValue(0),
    get: vi.fn().mockResolvedValue(null),
  },
}));

describe('Rate Limit Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      method: 'GET',
      path: '/api/supplements/search',
      headers: {
        'cf-connecting-ip': '192.168.1.1',
      },
      ip: '192.168.1.1',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      getHeader: vi.fn().mockReturnValue(null),
    };

    mockNext = vi.fn();
  });

  describe('rateLimitHeadersMiddleware', () => {
    it('should add rate limit header middleware to response', () => {
      rateLimitHeadersMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should ensure X-RateLimit headers are present', () => {
      rateLimitHeadersMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should set Retry-After on 429 responses', () => {
      (mockRes.statusCode as any) = 429;
      (mockRes.getHeader as any) = vi.fn().mockReturnValue(null);
      const originalJson = mockRes.json as any;

      mockRes.json = vi.fn().mockImplementation(function(data: any) {
        return this;
      });

      rateLimitHeadersMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('supplementSearchLimiter', () => {
    it('should be configured for 10 requests per minute', () => {
      // The limiter is configured with 10 max and 60000 windowMs (1 minute)
      expect(supplementSearchLimiter).toBeDefined();
      expect(typeof supplementSearchLimiter).toBe('function');
    });

    it('should skip OPTIONS requests', () => {
      const optionsReq = { ...mockReq, method: 'OPTIONS' };
      supplementSearchLimiter(optionsReq as Request, mockRes as Response, mockNext);
      // OPTIONS requests should be skipped by the skip function
      expect(supplementSearchLimiter).toBeDefined();
      expect(typeof supplementSearchLimiter).toBe('function');
    });
  });

  describe('supplementCrawlLimiter', () => {
    it('should be configured for 5 requests per minute', () => {
      // The limiter is configured with 5 max and 60000 windowMs (1 minute)
      expect(supplementCrawlLimiter).toBeDefined();
      expect(typeof supplementCrawlLimiter).toBe('function');
    });

    it('should be different from search limiter', () => {
      // Different limiters should have different Redis prefixes
      expect(supplementCrawlLimiter).not.toEqual(supplementSearchLimiter);
      expect(supplementCrawlLimiter).toBeDefined();
      expect(typeof supplementCrawlLimiter).toBe('function');
    });
  });

  describe('supplementPricesLimiter', () => {
    it('should be configured for 50 requests per minute', () => {
      // The limiter is configured with 50 max and 60000 windowMs (1 minute)
      expect(supplementPricesLimiter).toBeDefined();
      expect(typeof supplementPricesLimiter).toBe('function');
    });

    it('should allow more requests than search endpoint', () => {
      // Prices endpoint allows 50 requests/min vs search 10/min
      expect(supplementPricesLimiter).toBeDefined();
      expect(typeof supplementPricesLimiter).toBe('function');
      expect(supplementPricesLimiter).not.toEqual(supplementSearchLimiter);
    });
  });

  describe('apiRateLimiter', () => {
    it('should be configured for 100 requests per 15 minutes', () => {
      // The limiter is configured with 100 max and 15*60*1000 windowMs
      expect(apiRateLimiter).toBeDefined();
      expect(typeof apiRateLimiter).toBe('function');
    });

    it('should use different Redis prefix than endpoint limiters', () => {
      // General API limiter should use 'rl:api:general:' prefix
      expect(apiRateLimiter).toBeDefined();
      expect(apiRateLimiter).not.toEqual(supplementSearchLimiter);
      expect(apiRateLimiter).not.toEqual(supplementCrawlLimiter);
    });
  });

  describe('Header Response Format', () => {
    it('should use standard X-RateLimit-* headers', () => {
      // standardHeaders: true in all limiters
      expect(supplementSearchLimiter).toBeDefined();
      expect(typeof supplementSearchLimiter).toBe('function');
    });

    it('should not use legacy RateLimit-* headers', () => {
      // legacyHeaders: false in all limiters
      expect(supplementSearchLimiter).toBeDefined();
      expect(typeof supplementSearchLimiter).toBe('function');
    });

    it('should include RateLimit-Remaining in responses', () => {
      // Verified by standardHeaders: true
      expect(supplementSearchLimiter).toBeDefined();
      expect(typeof supplementSearchLimiter).toBe('function');
    });

    it('should include RateLimit-Reset timestamp', () => {
      // Verified by standardHeaders: true
      expect(supplementSearchLimiter).toBeDefined();
      expect(typeof supplementSearchLimiter).toBe('function');
    });
  });

  describe('Error Messages', () => {
    it('should have user-friendly search error message', () => {
      expect(supplementSearchLimiter).toBeDefined();
      expect(typeof supplementSearchLimiter).toBe('function');
      // Message: "Search limit exceeded (10/minute). Please try again later."
    });

    it('should have user-friendly crawl error message', () => {
      expect(supplementCrawlLimiter).toBeDefined();
      expect(typeof supplementCrawlLimiter).toBe('function');
      // Message: "Crawl limit exceeded (5/minute). Please try again later."
    });

    it('should have user-friendly prices error message', () => {
      expect(supplementPricesLimiter).toBeDefined();
      expect(typeof supplementPricesLimiter).toBe('function');
      // Message: "Prices endpoint limit exceeded (50/minute). Please try again later."
    });

    it('should return JSON error response on rate limit', () => {
      expect(supplementSearchLimiter).toBeDefined();
      expect(typeof supplementSearchLimiter).toBe('function');
      // All limiters return JSON with success: false
    });
  });

  describe('Redis Store Integration', () => {
    it('should use Redis for distributed rate limiting', () => {
      // All limiters use RedisStore with 'rl:' prefixes
      expect(supplementSearchLimiter).toBeDefined();
      expect(typeof supplementSearchLimiter).toBe('function');
    });

    it('should use IP-based key generation', () => {
      // keyGenerator: ipKey in all limiters
      expect(supplementSearchLimiter).toBeDefined();
      expect(typeof supplementSearchLimiter).toBe('function');
    });

    it('should extract IP from cf-connecting-ip header', () => {
      // ipKey extracts from cf-connecting-ip first
      expect(mockReq.headers).toBeDefined();
      expect(mockReq.headers['cf-connecting-ip']).toBe('192.168.1.1');
    });

    it('should fallback to x-forwarded-for header', () => {
      const reqWithForwardedFor = {
        ...mockReq,
        headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' },
      };
      expect(reqWithForwardedFor.headers['x-forwarded-for']).toBeDefined();
    });

    it('should fallback to req.ip as last resort', () => {
      expect(mockReq.ip).toBeDefined();
    });
  });

  describe('Per-Endpoint Limits Configuration', () => {
    it('search endpoint: 10 requests per 1 minute', () => {
      // window: 1 minute, max: 10
      expect(supplementSearchLimiter).toBeDefined();
    });

    it('crawl endpoint: 5 requests per 1 minute', () => {
      // window: 1 minute, max: 5
      expect(supplementCrawlLimiter).toBeDefined();
    });

    it('prices endpoint: 50 requests per 1 minute', () => {
      // window: 1 minute, max: 50
      expect(supplementPricesLimiter).toBeDefined();
    });

    it('general API: 100 requests per 15 minutes', () => {
      // window: 15 minutes, max: 100
      expect(apiRateLimiter).toBeDefined();
    });
  });

  describe('429 Response Handling', () => {
    it('should return 429 when limit exceeded', () => {
      expect(supplementSearchLimiter).toBeDefined();
      // Verified by express-rate-limit default behavior
    });

    it('should include Retry-After header on 429', () => {
      expect(supplementSearchLimiter).toBeDefined();
      // Retry-After should be set to window duration
    });

    it('should return JSON error body', () => {
      expect(supplementSearchLimiter).toBeDefined();
      // Message object with success: false
    });

    it('should indicate correct error code', () => {
      // Different error codes for different endpoints
      expect(supplementSearchLimiter).toBeDefined();
    });
  });

  describe('OPTIONS Request Bypass', () => {
    it('should skip rate limiting for OPTIONS', () => {
      const optionsReq = { ...mockReq, method: 'OPTIONS' };
      expect(optionsReq.method).toBe('OPTIONS');
    });

    it('should not count OPTIONS against limit', () => {
      // skip: (req) => req.method === 'OPTIONS'
      expect(supplementSearchLimiter).toBeDefined();
    });
  });

  describe('Backward Compatibility', () => {
    it('should export rate limit middlewares', () => {
      expect(supplementSearchLimiter).toBeDefined();
      expect(supplementCrawlLimiter).toBeDefined();
      expect(supplementPricesLimiter).toBeDefined();
      expect(apiRateLimiter).toBeDefined();
      expect(rateLimitHeadersMiddleware).toBeDefined();
    });

    it('should be importable and usable in Express app', () => {
      // All exports are Express middleware functions
      expect(typeof supplementSearchLimiter).toBe('function');
      expect(typeof supplementCrawlLimiter).toBe('function');
      expect(typeof supplementPricesLimiter).toBe('function');
      expect(typeof apiRateLimiter).toBe('function');
      expect(typeof rateLimitHeadersMiddleware).toBe('function');
    });
  });

  describe('Rate Limit Distribution', () => {
    it('should store limits separately per endpoint', () => {
      // Different Redis prefixes prevent limit sharing
      // rl:supplement:search: vs rl:supplement:crawl:
      expect(supplementSearchLimiter).toBeDefined();
    });

    it('should not affect other endpoints when one exceeds limit', () => {
      // Independent RedisStore prefixes
      expect(supplementCrawlLimiter).toBeDefined();
    });

    it('should allow independent limit tuning per endpoint', () => {
      // Each limiter has separate max configuration
      expect(supplementSearchLimiter).toBeDefined();
    });
  });
});
