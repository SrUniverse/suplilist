/**
 * Affiliate Routes Tests - FASE 2
 * Version: 1.0.0
 *
 * Unit and integration tests for /api/affiliate/out endpoint
 *
 * Run with: npm test -- affiliate.routes.test.ts
 */

import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { Express } from 'express';
import { affiliateRouter } from './affiliate.routes';
import * as affiliateService from '../services/affiliate.service';
import { getRedisClient } from '../shared/config/redis.config';

// Mock Redis for testing - MUST be at top level (hoisted before imports)
vi.mock('../shared/config/redis.config', () => ({
  getRedisClient: vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    exists: vi.fn().mockResolvedValue(0),
    del: vi.fn().mockResolvedValue(0),
  })),
}));

let app: Express;

beforeEach(() => {
  // Setup Express app for testing
  app = express();
  app.use(express.json());
  app.use('/api/affiliate', affiliateRouter);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/affiliate/out', () => {
  describe('Valid Requests', () => {
    it('should convert Amazon link successfully', async () => {
      const response = await request(app)
        .post('/api/affiliate/out')
        .send({
          url: 'https://www.amazon.com.br/dp/B123456789',
          source: 'amazon',
        })
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          source: 'amazon',
          affiliateUrl: expect.stringContaining('amazon.com.br'),
          redirectDelay: expect.any(Number),
        })
      );
    });

    it('should convert Shopee link successfully', async () => {
      const response = await request(app)
        .post('/api/affiliate/out')
        .send({
          url: 'https://shopee.com.br/product/123456789',
          source: 'shopee',
        })
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          source: 'shopee',
          affiliateUrl: expect.stringContaining('shopee.com.br'),
        })
      );
    });

    it('should convert Mercado Livre link successfully', async () => {
      const response = await request(app)
        .post('/api/affiliate/out')
        .send({
          url: 'https://www.mercadolivre.com.br/item/MLB123456789',
          source: 'mercadolivre',
        })
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          source: 'mercadolivre',
          affiliateUrl: expect.stringContaining('mercadolivre.com.br'),
        })
      );
    });

    it('should include productId in response when provided', async () => {
      const response = await request(app)
        .post('/api/affiliate/out')
        .send({
          url: 'https://www.amazon.com.br/dp/B123456789',
          source: 'amazon',
          productId: 'internal-prod-123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // productId should be tracked but not necessarily returned
    });
  });

  describe('Invalid Requests', () => {
    it('should reject invalid URL', async () => {
      const response = await request(app)
        .post('/api/affiliate/out')
        .send({
          url: 'not-a-url',
          source: 'amazon',
        })
        .expect(400);

      expect(response.body).toEqual(
        expect.objectContaining({
          error: 'validation_error',
        })
      );
    });

    it('should reject unsupported source', async () => {
      const response = await request(app)
        .post('/api/affiliate/out')
        .send({
          url: 'https://www.amazon.com.br/dp/B123456789',
          source: 'unsupported',
        })
        .expect(400);

      expect(response.body).toEqual(
        expect.objectContaining({
          error: 'validation_error',
        })
      );
    });

    it('should reject URL from unsupported marketplace', async () => {
      const response = await request(app)
        .post('/api/affiliate/out')
        .send({
          url: 'https://www.ebay.com/item/123456789',
          source: 'amazon', // Mismatch!
        })
        .expect(400);

      expect(response.body).toEqual(
        expect.objectContaining({
          error: 'validation_error',
        })
      );
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/affiliate/out')
        .send({
          url: 'https://www.amazon.com.br/dp/B123456789',
          // Missing source!
        })
        .expect(400);

      expect(response.body).toEqual(
        expect.objectContaining({
          error: 'validation_error',
        })
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit (100 req/min)', async () => {
      // Send 101 requests from same IP
      // First 100 should succeed, 101st should be 429
      const requests = Array(101)
        .fill(null)
        .map(() =>
          request(app).post('/api/affiliate/out').send({
            url: 'https://www.amazon.com.br/dp/B123456789',
            source: 'amazon',
          })
        );

      const responses = await Promise.all(requests);

      // Last response should be 429 Too Many Requests
      expect(responses[100].status).toBe(429);
      expect(responses[100].body).toEqual(
        expect.objectContaining({
          error: 'Too many requests',
        })
      );
    });

    it('should include rate limit headers', async () => {
      const response = await request(app)
        .post('/api/affiliate/out')
        .send({
          url: 'https://www.amazon.com.br/dp/B123456789',
          source: 'amazon',
        });

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('Crawler Detection', () => {
    it('should block requests from known crawlers', async () => {
      const crawlerUserAgents = [
        'Mozilla/5.0 (compatible; Googlebot/2.1)',
        'Mozilla/5.0 (compatible; bingbot/2.0)',
        'curl/7.64.1',
        'python-requests/2.25.1',
      ];

      for (const userAgent of crawlerUserAgents) {
        const response = await request(app)
          .post('/api/affiliate/out')
          .set('User-Agent', userAgent)
          .send({
            url: 'https://www.amazon.com.br/dp/B123456789',
            source: 'amazon',
          });

        expect(response.status).toBe(403);
        expect(response.body).toEqual(
          expect.objectContaining({
            error: 'Forbidden',
          })
        );
      }
    });

    it('should allow legitimate browser requests', async () => {
      const browserUserAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      ];

      for (const userAgent of browserUserAgents) {
        const response = await request(app)
          .post('/api/affiliate/out')
          .set('User-Agent', userAgent)
          .send({
            url: 'https://www.amazon.com.br/dp/B123456789',
            source: 'amazon',
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('JIT Timeout Fallback', () => {
    it('should return original URL on conversion timeout', async () => {
      // Mock slow conversion (timeout)
      vi.spyOn(affiliateService, 'convertAmazonLink').mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  affiliateUrl: 'https://www.amazon.com.br/dp/B123456789',
                  source: 'amazon',
                  redirectDelay: 15,
                  cached: false,
                }),
              2000 // Longer than 1s timeout
            )
          )
      );

      const response = await request(app)
        .post('/api/affiliate/out')
        .send({
          url: 'https://www.amazon.com.br/dp/B123456789',
          source: 'amazon',
        });

      // Should still return 200 with fallback
      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          timedOut: true,
          fallback: 'original_url',
        })
      );
    });
  });

  describe('Caching', () => {
    it('should cache successful conversions', async () => {
      // First request
      await request(app)
        .post('/api/affiliate/out')
        .send({
          url: 'https://www.amazon.com.br/dp/B123456789',
          source: 'amazon',
        })
        .expect(200);

      // Second request should be cached
      const response = await request(app)
        .post('/api/affiliate/out')
        .send({
          url: 'https://www.amazon.com.br/dp/B123456789',
          source: 'amazon',
        })
        .expect(200);

      expect(response.body.cached).toBe(true);
    });
  });

  describe('GET /api/affiliate/health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/affiliate/health')
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          status: expect.stringMatching(/healthy|degraded/),
          service: 'affiliate-jit',
          timestamp: expect.any(String),
        })
      );
    });
  });
});

/**
 * Integration Tests
 *
 * These test the full flow with real services (if available)
 */
describe('Affiliate JIT - Integration Tests', () => {
  it('should handle complete end-to-end flow', async () => {
    // This would test with real Redis, real database, etc.
    // Skipped if services not available
    const response = await request(app)
      .post('/api/affiliate/out')
      .send({
        url: 'https://www.amazon.com.br/dp/B123456789',
        source: 'amazon',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('affiliateUrl');
    expect(response.body).toHaveProperty('duration');
  });
});
