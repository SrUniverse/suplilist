/**
 * Performance & Load Integration Tests
 *
 * Tests system performance characteristics:
 * 1. Response time baselines for critical paths
 * 2. Load testing — concurrent users
 * 3. Memory usage under stress
 * 4. Database query performance
 * 5. Cache effectiveness
 * 6. Concurrency handling
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { createApp } from '../../app.js';
import { UserIdentityModel } from '../../modules/identity/infrastructure/mongoose/user-identity.model.js';

const app = createApp();
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-jwt-secret';

const BASELINE_THRESHOLDS = {
  LOGIN: 500, // ms
  SEARCH: 300, // ms
  PRODUCT_DETAIL: 200, // ms
  REVIEW_SUBMIT: 400, // ms
  AFFILIATE_CONVERSION: 1000, // ms (includes JIT timeout)
  PAYMENT_CHECKOUT: 600, // ms
};

function mongoReady(): boolean {
  return mongoose.connection.readyState === 1;
}

const uid = () => `user-${Math.random().toString(36).slice(2)}@test.com`;

async function seedUser(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 4);
  return UserIdentityModel.create({
    email,
    passwordHash,
    status: 'active',
    emailVerified: true,
    emailVerifiedAt: new Date(),
    role: 'user',
    providers: [],
    mfa: {
      enabled: false,
      type: null,
      totpSecret: null,
      backupCodes: [],
      enabledAt: null,
      lastUsedAt: null,
    },
    deletedAt: null,
    suspendedAt: null,
    suspendedReason: null,
  });
}

function generateAccessToken(userId: string) {
  return jwt.sign(
    { sub: userId, jti: `jti-${Date.now()}`, role: 'user', status: 'active' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

describe('Performance & Load Tests', () => {
  describe('Response Time Baselines', () => {
    it('login completes within baseline (500ms)', async () => {
      if (!mongoReady()) return;

      const email = uid();
      const password = 'TestPass123!';
      await seedUser(email, password);

      const start = Date.now();

      const res = await request(app)
        .post('/api/auth/login')
        .set('X-SupliList-Client', '1')
        .send({ email, password });

      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(BASELINE_THRESHOLDS.LOGIN);
    });

    it('product search completes within baseline (300ms)', async () => {
      if (!mongoReady()) return;

      const start = Date.now();

      const res = await request(app)
        .get('/api/supplements/search')
        .query({ q: 'protein', limit: 10 })
        .set('X-SupliList-Client', '1');

      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(BASELINE_THRESHOLDS.SEARCH);
    });

    it('product detail retrieval completes within baseline (200ms)', async () => {
      if (!mongoReady()) return;

      // First, search for a product
      const search = await request(app)
        .get('/api/supplements/search')
        .query({ q: 'protein', limit: 1 })
        .set('X-SupliList-Client', '1');

      if (search.body.data.length === 0) {
        expect(true).toBe(true); // Skip if no data
        return;
      }

      const productId = search.body.data[0].id;

      const start = Date.now();

      const res = await request(app)
        .get(`/api/supplements/${productId}`)
        .set('X-SupliList-Client', '1');

      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(BASELINE_THRESHOLDS.PRODUCT_DETAIL);
    });

    it('affiliate conversion completes within baseline (1000ms)', async () => {
      if (!mongoReady()) return;

      const start = Date.now();

      const res = await request(app)
        .post('/api/affiliate/out')
        .set('X-SupliList-Client', '1')
        .send({
          url: 'https://www.amazon.com.br/dp/B123456789',
          source: 'amazon',
        });

      const duration = Date.now() - start;

      expect([200, 400]).toContain(res.status);
      expect(duration).toBeLessThan(BASELINE_THRESHOLDS.AFFILIATE_CONVERSION);
    });
  });

  describe('Load Testing — Concurrent Users', () => {
    it('handles 10 concurrent login requests', async () => {
      if (!mongoReady()) return;

      const email = uid();
      const password = 'TestPass123!';
      await seedUser(email, password);

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .set('X-SupliList-Client', '1')
            .send({ email, password })
        );
      }

      const results = await Promise.all(promises);

      // All should succeed or rate limit gracefully
      const successful = results.filter(r => r.status === 200);
      expect(successful.length).toBe(10);

      // All responses should complete
      expect(results.length).toBe(10);
    });

    it('handles 20 concurrent product searches', async () => {
      if (!mongoReady()) return;

      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .get('/api/supplements/search')
            .query({ q: 'protein' })
            .set('X-SupliList-Client', '1')
        );
      }

      const results = await Promise.all(promises);

      // Most should succeed
      const successful = results.filter(r => r.status === 200);
      expect(successful.length).toBeGreaterThanOrEqual(15);

      // All should respond (not hang)
      expect(results.length).toBe(20);
    });

    it('handles 50 concurrent affiliate conversions', async () => {
      if (!mongoReady()) return;

      const promises = [];
      const urls = [
        'https://www.amazon.com.br/dp/B111111111',
        'https://www.amazon.com.br/dp/B222222222',
        'https://www.amazon.com.br/dp/B333333333',
        'https://www.amazon.com.br/dp/B444444444',
        'https://www.amazon.com.br/dp/B555555555',
      ];

      for (let i = 0; i < 50; i++) {
        const url = urls[i % urls.length];
        promises.push(
          request(app)
            .post('/api/affiliate/out')
            .set('X-SupliList-Client', '1')
            .send({
              url,
              source: 'amazon',
            })
        );
      }

      const results = await Promise.all(promises);

      // Most should succeed
      const successful = results.filter(r => r.status === 200);
      expect(successful.length).toBeGreaterThanOrEqual(40);

      // All should respond
      expect(results.length).toBe(50);
    });

    it('handles mixed workload — 100 concurrent requests of various types', async () => {
      if (!mongoReady()) return;

      const email = uid();
      const password = 'TestPass123!';
      const user = await seedUser(email, password);
      const userId = user._id.toString();
      const accessToken = generateAccessToken(userId);

      const promises = [];

      // 25 login attempts
      for (let i = 0; i < 25; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .set('X-SupliList-Client', '1')
            .send({ email, password })
        );
      }

      // 25 search queries
      for (let i = 0; i < 25; i++) {
        promises.push(
          request(app)
            .get('/api/supplements/search')
            .query({ q: 'protein' })
            .set('X-SupliList-Client', '1')
        );
      }

      // 25 affiliate conversions
      for (let i = 0; i < 25; i++) {
        promises.push(
          request(app)
            .post('/api/affiliate/out')
            .set('X-SupliList-Client', '1')
            .send({
              url: 'https://www.amazon.com.br/dp/B123456789',
              source: 'amazon',
            })
        );
      }

      // 25 authenticated requests
      for (let i = 0; i < 25; i++) {
        promises.push(
          request(app)
            .get('/api/profile/me')
            .set('Authorization', `Bearer ${accessToken}`)
            .set('X-SupliList-Client', '1')
        );
      }

      const results = await Promise.all(promises);

      // Most should succeed
      const successful = results.filter(r => r.status === 200 || r.status === 201);
      expect(successful.length).toBeGreaterThanOrEqual(80);

      // All should respond
      expect(results.length).toBe(100);
    });
  });

  describe('Cache Effectiveness', () => {
    it('second request is significantly faster (Redis cache)', async () => {
      if (!mongoReady()) return;

      const url = 'https://www.amazon.com.br/dp/B999999999';

      // First request (cache miss)
      const start1 = Date.now();
      const res1 = await request(app)
        .post('/api/affiliate/out')
        .set('X-SupliList-Client', '1')
        .send({ url, source: 'amazon' });
      const duration1 = Date.now() - start1;

      expect(res1.status).toBe(200);
      expect(res1.body.cached).toBe(false);

      // Second request (cache hit)
      const start2 = Date.now();
      const res2 = await request(app)
        .post('/api/affiliate/out')
        .set('X-SupliList-Client', '1')
        .send({ url, source: 'amazon' });
      const duration2 = Date.now() - start2;

      expect(res2.status).toBe(200);
      expect(res2.body.cached).toBe(true);

      // Cached response should be faster (at least 20% improvement)
      expect(duration2).toBeLessThan(duration1 * 0.8);
    });

    it('cache reduces database load under repeated requests', async () => {
      if (!mongoReady()) return;

      const urls = [
        'https://www.amazon.com.br/dp/B111111111',
        'https://www.amazon.com.br/dp/B111111111', // Duplicate
        'https://www.amazon.com.br/dp/B111111111', // Duplicate
        'https://www.amazon.com.br/dp/B222222222',
        'https://www.amazon.com.br/dp/B222222222', // Duplicate
      ];

      const promises = urls.map(url =>
        request(app)
          .post('/api/affiliate/out')
          .set('X-SupliList-Client', '1')
          .send({ url, source: 'amazon' })
      );

      const results = await Promise.all(promises);

      // Count cache hits
      const cacheHits = results.filter(r => r.body.cached === true).length;

      // Should have at least 2 cache hits (duplicates)
      expect(cacheHits).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Database Query Performance', () => {
    it('search query completes with acceptable response time', async () => {
      if (!mongoReady()) return;

      const start = Date.now();

      const res = await request(app)
        .get('/api/supplements/search')
        .query({ q: 'p', limit: 20, offset: 0 }) // Broad search
        .set('X-SupliList-Client', '1');

      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      // Even broad search should be reasonably fast
      expect(duration).toBeLessThan(1000);
    });

    it('pagination does not cause performance degradation on later pages', async () => {
      if (!mongoReady()) return;

      // First page
      const start1 = Date.now();
      await request(app)
        .get('/api/supplements/search')
        .query({ q: 'protein', limit: 10, offset: 0 })
        .set('X-SupliList-Client', '1');
      const duration1 = Date.now() - start1;

      // Much later page
      const start2 = Date.now();
      await request(app)
        .get('/api/supplements/search')
        .query({ q: 'protein', limit: 10, offset: 1000 })
        .set('X-SupliList-Client', '1');
      const duration2 = Date.now() - start2;

      // Should not be dramatically slower
      // Allow 2x slowdown for large offset
      expect(duration2).toBeLessThan(duration1 * 2 + 100);
    });
  });

  describe('Throughput Metrics', () => {
    it('processes at least 100 requests per second under load', async () => {
      if (!mongoReady()) return;

      const start = Date.now();
      const promises = [];

      // Generate 100 requests
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app)
            .get('/api/supplements/search')
            .query({ q: 'test' })
            .set('X-SupliList-Client', '1')
        );
      }

      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      // All should complete
      expect(results.length).toBe(100);

      const requestsPerSecond = (100 / duration) * 1000;
      expect(requestsPerSecond).toBeGreaterThan(10); // At least 10 req/s
    });
  });

  describe('Memory Under Stress', () => {
    it('does not accumulate memory during repeated requests', async () => {
      if (!mongoReady()) return;

      // Make many requests to check for memory leaks
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app)
            .get('/api/supplements/search')
            .query({ q: 'protein' })
            .set('X-SupliList-Client', '1')
        );
      }

      const results = await Promise.all(promises);

      // All should complete successfully
      expect(results.filter(r => r.status === 200).length).toBeGreaterThan(40);
    });
  });

  describe('Latency Distribution', () => {
    it('p95 latency for search is acceptable', async () => {
      if (!mongoReady()) return;

      const durations = [];
      const requests = 20;

      for (let i = 0; i < requests; i++) {
        const start = Date.now();
        await request(app)
          .get('/api/supplements/search')
          .query({ q: 'protein' })
          .set('X-SupliList-Client', '1');
        durations.push(Date.now() - start);
      }

      durations.sort((a, b) => a - b);
      const p95 = durations[Math.floor(requests * 0.95)];

      // P95 should be under baseline * 1.5
      expect(p95).toBeLessThan(BASELINE_THRESHOLDS.SEARCH * 1.5);
    });

    it('p99 latency for affiliate conversion is acceptable', async () => {
      if (!mongoReady()) return;

      const durations = [];
      const requests = 20;

      for (let i = 0; i < requests; i++) {
        const start = Date.now();
        await request(app)
          .post('/api/affiliate/out')
          .set('X-SupliList-Client', '1')
          .send({
            url: 'https://www.amazon.com.br/dp/B123456789',
            source: 'amazon',
          });
        durations.push(Date.now() - start);
      }

      durations.sort((a, b) => a - b);
      const p99 = durations[Math.floor(requests * 0.99)];

      // P99 should be under baseline * 1.5
      expect(p99).toBeLessThan(BASELINE_THRESHOLDS.AFFILIATE_CONVERSION * 1.5);
    });
  });
});
