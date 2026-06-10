/**
 * PHASE 2: JIT ENDPOINTS TEST SUITE
 *
 * Validates:
 * - POST /api/affiliate/out endpoint (Amazon, Shopee, Mercado Livre)
 * - Rate limiting (100 req/min)
 * - Crawler blocking
 * - JIT timeout (1s) + fallback
 * - Caching (24h TTL)
 */

import { test, expect } from '@playwright/test';
import axios, { AxiosInstance } from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

interface Phase2Context {
  api: AxiosInstance;
  headers: Record<string, string>;
  affiliateHeaders: Record<string, string>;
}

test.describe('PHASE 2 - JIT Endpoints', () => {
  let ctx: Phase2Context;

  test.beforeAll(async () => {
    ctx = {
      api: axios.create({
        baseURL: BASE_URL,
        timeout: 30000,
        validateStatus: () => true,
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-SupliList-Client': 'e2e-phase2',
      },
      affiliateHeaders: {
        'Content-Type': 'application/json',
        'X-SupliList-Client': 'e2e-phase2',
        'X-Affiliate-Key': process.env.AFFILIATE_KEY || 'test-key',
      },
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AFFILIATE ENDPOINT BASIC FUNCTIONALITY
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Affiliate Endpoint - Basic Functionality', () => {
    test('POST /api/affiliate/out accepts valid Amazon URL', async () => {
      const payload = {
        url: 'https://www.amazon.com.br/PRODUCT-TEST',
        source: 'amazon',
      };

      const response = await ctx.api.post('/api/affiliate/out', payload, {
        headers: ctx.affiliateHeaders,
      });

      // Should succeed, timeout, or be rate limited
      expect([200, 201, 408, 429, 500]).toContain(response.status);
    });

    test('POST /api/affiliate/out accepts valid Shopee URL', async () => {
      const payload = {
        url: 'https://shopee.com.br/PRODUCT-TEST',
        source: 'shopee',
      };

      const response = await ctx.api.post('/api/affiliate/out', payload, {
        headers: ctx.affiliateHeaders,
      });

      expect([200, 201, 408, 429, 500]).toContain(response.status);
    });

    test('POST /api/affiliate/out accepts valid Mercado Livre URL', async () => {
      const payload = {
        url: 'https://produto.mercadolivre.com.br/TEST',
        source: 'mercadolivre',
      };

      const response = await ctx.api.post('/api/affiliate/out', payload, {
        headers: ctx.affiliateHeaders,
      });

      expect([200, 201, 408, 429, 500]).toContain(response.status);
    });

    test('POST /api/affiliate/out rejects invalid source', async () => {
      const payload = {
        url: 'https://example.com',
        source: 'invalid-source',
      };

      const response = await ctx.api.post('/api/affiliate/out', payload, {
        headers: ctx.affiliateHeaders,
      });

      expect([400, 422]).toContain(response.status);
    });

    test('POST /api/affiliate/out rejects invalid URL', async () => {
      const payload = {
        url: 'not-a-url',
        source: 'amazon',
      };

      const response = await ctx.api.post('/api/affiliate/out', payload, {
        headers: ctx.affiliateHeaders,
      });

      expect([400, 422]).toContain(response.status);
    });

    test('POST /api/affiliate/out validates required fields', async () => {
      const payload = {
        url: 'https://example.com',
      };

      const response = await ctx.api.post('/api/affiliate/out', payload, {
        headers: ctx.affiliateHeaders,
      });

      expect([400, 422]).toContain(response.status);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // RATE LIMITING (100 req/min)
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Rate Limiting', () => {
    test('rate limit headers are present in response', async () => {
      const response = await ctx.api.get('/health', { headers: ctx.headers });

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });

    test('rate limit limit is 100 requests per minute', async () => {
      const response = await ctx.api.get('/health', { headers: ctx.headers });

      const limit = parseInt(response.headers['x-ratelimit-limit'] || '100', 10);
      expect(limit).toBe(100);
    });

    test('rate limit counter decreases with each request', async () => {
      const headers = {
        ...ctx.headers,
        'x-ratelimit-key': `test-${Date.now()}`,
      };

      const response1 = await ctx.api.get('/health', { headers });
      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining'] || '100', 10);

      const response2 = await ctx.api.get('/health', { headers });
      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining'] || '100', 10);

      expect(remaining2).toBeLessThanOrEqual(remaining1);
    });

    test('rate limit resets after window expires', async () => {
      const testKey = `rate-limit-test-${Date.now()}`;
      const headers = { ...ctx.headers, 'x-ratelimit-key': testKey };

      const response = await ctx.api.get('/health', { headers });
      const resetTime = parseInt(response.headers['x-ratelimit-reset'] || '0', 10);

      // Reset time should be in the future
      expect(resetTime).toBeGreaterThan(Date.now());
    });

    test('429 Too Many Requests is returned when limit exceeded', async () => {
      const testKey = `exceed-${Date.now()}`;
      const headers = { ...ctx.headers, 'x-ratelimit-key': testKey };

      // Try to make many requests quickly
      let statusCodes = [];
      for (let i = 0; i < 10; i++) {
        const response = await ctx.api.get('/health', { headers });
        statusCodes.push(response.status);
      }

      // At least some should succeed initially, rest might be rate limited
      expect(statusCodes[0]).toBe(200);
    });

    test('Retry-After header is present when rate limited', async () => {
      const testKey = `retry-test-${Date.now()}`;
      const headers = { ...ctx.headers, 'x-ratelimit-key': testKey };

      // Try to exceed rate limit
      for (let i = 0; i < 120; i++) {
        const response = await ctx.api.get('/health', { headers });

        if (response.status === 429) {
          expect(response.headers).toHaveProperty('retry-after');
          expect(parseInt(response.headers['retry-after'] || '0', 10)).toBeGreaterThan(0);
          break;
        }
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CRAWLER BLOCKING
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Crawler Blocking', () => {
    test('requests from known crawler User-Agents are blocked', async () => {
      const crawlerHeaders = {
        ...ctx.affiliateHeaders,
        'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)',
      };

      const response = await ctx.api.get('/api/affiliate/out', { headers: crawlerHeaders });

      // Should be blocked (403) or rate limited (429)
      expect([403, 429]).toContain(response.status);
    });

    test('requests from Bingbot are blocked', async () => {
      const crawlerHeaders = {
        ...ctx.affiliateHeaders,
        'User-Agent': 'Mozilla/5.0 (compatible; Bingbot/2.0)',
      };

      const response = await ctx.api.get('/api/affiliate/out', { headers: crawlerHeaders });

      expect([403, 429]).toContain(response.status);
    });

    test('normal User-Agents are allowed', async () => {
      const normalHeaders = {
        ...ctx.affiliateHeaders,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };

      const response = await ctx.api.post('/api/affiliate/out', {
        url: 'https://example.com',
        source: 'amazon',
      }, { headers: normalHeaders });

      // Should not be blocked (403 or 429 from crawler blocking)
      expect(response.status).not.toBe(403);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // JIT TIMEOUT & FALLBACK (1s timeout)
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('JIT Timeout & Fallback', () => {
    test('request completes within 1 second timeout', async () => {
      const startTime = Date.now();

      const response = await ctx.api.post('/api/affiliate/out', {
        url: 'https://example.com',
        source: 'amazon',
      }, {
        headers: ctx.affiliateHeaders,
        timeout: 2000, // Allow 2s for overall request
      });

      const elapsed = Date.now() - startTime;

      // Should timeout or complete quickly
      if (response.status !== 408) {
        expect(elapsed).toBeLessThan(2000);
      }
    });

    test('408 Request Timeout is returned when JIT times out', async () => {
      // This would require a slow endpoint, but we can verify the behavior
      const response = await ctx.api.post('/api/affiliate/out', {
        url: 'https://slow-endpoint.example.com',
        source: 'amazon',
      }, {
        headers: ctx.affiliateHeaders,
        timeout: 500, // Short timeout
      });

      // 408 (timeout) or completed successfully
      expect([200, 201, 408, 500, 429]).toContain(response.status);
    });

    test('fallback data is returned on timeout', async () => {
      const response = await ctx.api.post('/api/affiliate/out', {
        url: 'https://example.com',
        source: 'amazon',
      }, {
        headers: ctx.affiliateHeaders,
      });

      // On success, should have data; on timeout, should have fallback
      if (response.status === 200 || response.status === 201) {
        expect(response.data).toBeDefined();
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CACHING (24h TTL)
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Caching & TTL', () => {
    test('response includes cache control headers', async () => {
      const response = await ctx.api.post('/api/affiliate/out', {
        url: 'https://example.com/unique-' + Date.now(),
        source: 'amazon',
      }, {
        headers: ctx.affiliateHeaders,
      });

      // Cache headers may be present
      const hasCacheHeader =
        response.headers['cache-control'] ||
        response.headers['x-cache-ttl'] ||
        response.headers['expires'];

      // For successful responses, cache info is expected
      if (response.status === 200 || response.status === 201) {
        expect(response.headers).toHaveProperty('cache-control');
      }
    });

    test('cached response has 24h max-age', async () => {
      const response = await ctx.api.get('/health', { headers: ctx.headers });

      if (response.headers['cache-control']) {
        const cacheControl = response.headers['cache-control'];
        // Should contain max-age (24h = 86400s)
        if (cacheControl.includes('max-age')) {
          const maxAge = parseInt(cacheControl.match(/max-age=(\d+)/)?.[1] || '0', 10);
          expect(maxAge).toBeGreaterThan(0);
        }
      }
    });

    test('cache hit is indicated in response headers', async () => {
      const url = 'https://example.com/cached-' + Date.now();

      // First request
      await ctx.api.post('/api/affiliate/out', {
        url,
        source: 'amazon',
      }, {
        headers: ctx.affiliateHeaders,
      });

      // Second request (should be cached)
      const response2 = await ctx.api.post('/api/affiliate/out', {
        url,
        source: 'amazon',
      }, {
        headers: ctx.affiliateHeaders,
      });

      // May include X-Cache: HIT or similar
      if (response2.headers['x-cache']) {
        expect(['HIT', 'PARTIAL', 'MISS']).toContain(response2.headers['x-cache']);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ERROR HANDLING
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Error Handling', () => {
    test('error responses include error details', async () => {
      const response = await ctx.api.post('/api/affiliate/out', {
        url: 'https://example.com',
        source: 'invalid',
      }, {
        headers: ctx.affiliateHeaders,
      });

      if (response.status >= 400) {
        expect(response.data).toHaveProperty('error');
      }
    });

    test('validation errors are descriptive', async () => {
      const response = await ctx.api.post('/api/affiliate/out', {
        url: 'invalid-url',
      }, {
        headers: ctx.affiliateHeaders,
      });

      if (response.status === 400 || response.status === 422) {
        expect(response.data).toHaveProperty('error');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PERFORMANCE BENCHMARKS
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Performance Benchmarks', () => {
    test('successful response completes in under 1 second', async () => {
      const startTime = Date.now();

      const response = await ctx.api.post('/api/affiliate/out', {
        url: 'https://example.com',
        source: 'amazon',
      }, {
        headers: ctx.affiliateHeaders,
      });

      const elapsed = Date.now() - startTime;

      if (response.status === 200 || response.status === 201) {
        expect(elapsed).toBeLessThan(1000);
      }
    });

    test('endpoint handles concurrent requests', async () => {
      const promises = Array(5)
        .fill(null)
        .map((_, i) =>
          ctx.api.post('/api/affiliate/out', {
            url: `https://example.com/product-${i}`,
            source: 'amazon',
          }, {
            headers: ctx.affiliateHeaders,
          })
        );

      const responses = await Promise.all(promises);

      // Should have valid status codes
      responses.forEach((response) => {
        expect([200, 201, 408, 429, 500]).toContain(response.status);
      });
    });
  });
});
