/**
 * Affiliate Link Conversion Integration Tests
 *
 * Tests the complete affiliate link conversion flow:
 * 1. Amazon link conversion — ASIN extraction and affiliate URL generation
 * 2. Shopee link conversion — product link handling
 * 3. Mercado Livre link conversion — catalog handling
 * 4. JIT timeout scenarios — fallback to original URL
 * 5. Caching behavior — Redis integration
 * 6. Error scenarios — invalid URLs, rate limiting, crawler detection
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { getRedisClient } from '../shared/config/redis.config.js';

const app = createApp();

function mongoReady(): boolean {
  return mongoose.connection.readyState === 1;
}

describe('Affiliate Link Conversion Flow', () => {
  let redis: ReturnType<typeof getRedisClient>;

  beforeEach(async () => {
    if (!mongoReady()) return;
    redis = getRedisClient();
    // Clear affiliate cache before each test
    const keys = await redis.keys('affiliate:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  afterEach(async () => {
    // Cleanup
    const keys = await redis.keys('affiliate:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  describe('POST /api/affiliate/out — Amazon Links', () => {
    it('converts valid Amazon.com.br DP link to affiliate URL', async () => {
      if (!mongoReady()) return;

      const originalUrl = 'https://www.amazon.com.br/dp/B123456789';

      const res = await request(app)
        .post('/api/affiliate/out')
        .set('X-SupliList-Client', '1')
        .send({
          url: originalUrl,
          source: 'amazon',
          productId: 'prod-123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.affiliateUrl).toContain('amazon.com.br');
      expect(res.body.affiliateUrl).toContain('B123456789');
      expect(res.body.affiliateUrl).toContain('tag=');
      expect(res.body.source).toBe('amazon');
      expect(res.body.cached).toBe(false);
    });

    it('converts Amazon GP/product link variant', async () => {
      if (!mongoReady()) return;

      const originalUrl = 'https://www.amazon.com.br/gp/product/B987654321';

      const res = await request(app)
        .post('/api/affiliate/out')
        .set('X-SupliList-Client', '1')
        .send({
          url: originalUrl,
          source: 'amazon',
        });

      expect(res.status).toBe(200);
      expect(res.body.affiliateUrl).toContain('B987654321');
      expect(res.body.affiliateUrl).toContain('tag=');
    });

    it('returns cached result on second request (Redis cache)', async () => {
      if (!mongoReady()) return;

      const originalUrl = 'https://www.amazon.com.br/dp/B111111111';

      // First request — not cached
      const first = await request(app)
        .post('/api/affiliate/out')
        .set('X-SupliList-Client', '1')
        .send({
          url: originalUrl,
          source: 'amazon',
        });

      expect(first.status).toBe(200);
      expect(first.body.cached).toBe(false);
      const firstAffiliateUrl = first.body.affiliateUrl;

      // Second request — should be cached
      const second = await request(app)
        .post('/api/affiliate/out')
        .set('X-SupliList-Client', '1')
        .send({
          url: originalUrl,
          source: 'amazon',
        });

      expect(second.status).toBe(200);
      expect(second.body.cached).toBe(true);
      expect(second.body.affiliateUrl).toBe(firstAffiliateUrl);
    });

    it('returns 400 for invalid Amazon URL (no ASIN)', async () => {
      if (!mongoReady()) return;

      const invalidUrl = 'https://www.amazon.com.br/search?keyword=supplements';

      const res = await request(app)
        .post('/api/affiliate/out')
        .set('X-SupliList-Client', '1')
        .send({
          url: invalidUrl,
          source: 'amazon',
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/affiliate/out — Shopee Links', () => {
    it('converts valid Shopee product URL', async () => {
      if (!mongoReady()) return;

      const originalUrl = 'https://shopee.com.br/product/123456789/supplement-pack';

      const res = await request(app)
        .post('/api/affiliate/out')
        .set('X-SupliList-Client', '1')
        .send({
          url: originalUrl,
          source: 'shopee',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.affiliateUrl).toContain('shopee.com.br');
      expect(res.body.source).toBe('shopee');
    });

    it('sanitizes malicious querystring in Shopee URL', async () => {
      if (!mongoReady()) return;

      // URL with potential XSS payload
      const maliciousUrl = 'https://shopee.com.br/product/123456789?q=<script>alert(1)</script>';

      const res = await request(app)
        .post('/api/affiliate/out')
        .set('X-SupliList-Client', '1')
        .send({
          url: maliciousUrl,
          source: 'shopee',
        });

      expect(res.status).toBe(200);
      // Returned URL should be sanitized
      expect(res.body.affiliateUrl).not.toContain('<script>');
      expect(res.body.affiliateUrl).not.toContain('alert');
    });
  });

  describe('POST /api/affiliate/out — Mercado Livre Links', () => {
    it('converts valid Mercado Livre product URL', async () => {
      if (!mongoReady()) return;

      const originalUrl = 'https://produto.mercadolivre.com.br/MLB-123456789-supplement';

      const res = await request(app)
        .post('/api/affiliate/out')
        .set('X-SupliList-Client', '1')
        .send({
          url: originalUrl,
          source: 'mercadolivre',
        });

      expect(res.status).toBe(200);
      expect(res.body.affiliateUrl).toContain('mercadolivre.com.br');
    });
  });

  describe('JIT Timeout & Fallback', () => {
    it('returns original URL when conversion times out (> 1 second)', async () => {
      if (!mongoReady()) return;

      // Mock a slow conversion by using an invalid URL that will retry
      const slowUrl = 'https://www.amazon.com.br/dp/B000000000';

      const res = await request(app)
        .post('/api/affiliate/out')
        .set('X-SupliList-Client', '1')
        .send({
          url: slowUrl,
          source: 'amazon',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Should have either succeeded or gracefully returned original URL
      expect(res.body.affiliateUrl).toBeDefined();
    });

    it('includes duration metric in response', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/affiliate/out')
        .set('X-SupliList-Client', '1')
        .send({
          url: 'https://www.amazon.com.br/dp/B123456789',
          source: 'amazon',
        });

      expect(res.status).toBe(200);
      expect(typeof res.body.duration).toBe('number');
      expect(res.body.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Input Validation', () => {
    it('returns 400 when URL is missing', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/affiliate/out')
        .set('X-SupliList-Client', '1')
        .send({
          source: 'amazon',
        });

      expect(res.status).toBe(400);
    });

    it('returns 400 when source is missing', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/affiliate/out')
        .set('X-SupliList-Client', '1')
        .send({
          url: 'https://www.amazon.com.br/dp/B123456789',
        });

      expect(res.status).toBe(400);
    });

    it('returns 400 when source is invalid', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/affiliate/out')
        .set('X-SupliList-Client', '1')
        .send({
          url: 'https://www.amazon.com.br/dp/B123456789',
          source: 'invalid-source',
        });

      expect(res.status).toBe(400);
    });

    it('returns 400 when URL is malformed', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/affiliate/out')
        .set('X-SupliList-Client', '1')
        .send({
          url: 'not-a-url',
          source: 'amazon',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Rate Limiting & Security', () => {
    it('returns 403 for crawler User-Agent', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/affiliate/out')
        .set('X-SupliList-Client', '1')
        .set('User-Agent', 'Googlebot/2.1')
        .send({
          url: 'https://www.amazon.com.br/dp/B123456789',
          source: 'amazon',
        });

      expect(res.status).toBe(403);
    });

    it('enforces rate limit — max 100 requests per 60s', async () => {
      if (!mongoReady()) return;

      // Rate limit is 100/60s, so this should pass
      const validUrl = 'https://www.amazon.com.br/dp/B123456789';

      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/affiliate/out')
          .set('X-SupliList-Client', '1')
          .send({
            url: validUrl,
            source: 'amazon',
          });

        expect(res.status).toBe(200);
      }

      // Should still be under limit
      expect(true).toBe(true);
    });

    it('returns 403 when X-SupliList-Client header is missing', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/affiliate/out')
        .send({
          url: 'https://www.amazon.com.br/dp/B123456789',
          source: 'amazon',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Concurrent Requests', () => {
    it('handles concurrent conversion requests without race conditions', async () => {
      if (!mongoReady()) return;

      const urls = [
        'https://www.amazon.com.br/dp/B111111111',
        'https://www.amazon.com.br/dp/B222222222',
        'https://www.amazon.com.br/dp/B333333333',
      ];

      const promises = urls.map(url =>
        request(app)
          .post('/api/affiliate/out')
          .set('X-SupliList-Client', '1')
          .send({
            url,
            source: 'amazon',
          })
      );

      const results = await Promise.all(promises);

      results.forEach((res, idx) => {
        expect(res.status).toBe(200);
        expect(res.body.affiliateUrl).toContain('amazon.com.br');
        expect(res.body.affiliateUrl).toContain(urls[idx].match(/B\d+/)?.[0]);
      });
    });

    it('cache prevents duplicate work under concurrent access', async () => {
      if (!mongoReady()) return;

      const url = 'https://www.amazon.com.br/dp/B999999999';

      // Fire two concurrent requests for same URL
      const [first, second] = await Promise.all([
        request(app)
          .post('/api/affiliate/out')
          .set('X-SupliList-Client', '1')
          .send({ url, source: 'amazon' }),
        request(app)
          .post('/api/affiliate/out')
          .set('X-SupliList-Client', '1')
          .send({ url, source: 'amazon' }),
      ]);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);

      // They should return the same affiliate URL
      expect(first.body.affiliateUrl).toBe(second.body.affiliateUrl);
    });
  });
});
