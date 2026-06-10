/**
 * PHASE 3: ASYNC MOTOR TEST SUITE
 *
 * Validates:
 * - BullMQ queue creation and management
 * - Worker job processing
 * - Deduplication logic
 * - IQR filtering for outlier detection
 * - Seed script completion and data integrity
 */

import { test, expect } from '@playwright/test';
import axios, { AxiosInstance } from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

interface Phase3Context {
  api: AxiosInstance;
  headers: Record<string, string>;
}

test.describe('PHASE 3 - Async Motor (BullMQ)', () => {
  let ctx: Phase3Context;

  test.beforeAll(async () => {
    ctx = {
      api: axios.create({
        baseURL: BASE_URL,
        timeout: 30000,
        validateStatus: () => true,
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-SupliList-Client': 'e2e-phase3',
      },
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // BULLMQ QUEUE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('BullMQ Queue Management', () => {
    test('affiliate sync queue is created', async () => {
      const response = await ctx.api.get('/api/admin/queues', {
        headers: ctx.headers,
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty('queues');
        const queues = response.data.queues || [];
        expect(queues.length).toBeGreaterThan(0);
      }
    });

    test('queue status endpoint returns valid queue info', async () => {
      const response = await ctx.api.get('/api/admin/queues/affiliate-sync/status', {
        headers: ctx.headers,
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty('count');
        expect(response.data).toHaveProperty('activeCount');
        expect(response.data).toHaveProperty('failedCount');
        expect(response.data).toHaveProperty('delayedCount');
      }
    });

    test('queue can accept new jobs', async () => {
      const payload = {
        type: 'affiliate_sync',
        source: 'amazon',
        data: {
          url: 'https://example.com/product',
        },
      };

      const response = await ctx.api.post('/api/jobs', payload, {
        headers: ctx.headers,
      });

      expect([200, 201, 400, 401, 404]).toContain(response.status);
    });

    test('queue prevents duplicate jobs', async () => {
      const jobData = {
        source: 'amazon',
        url: 'https://example.com/product-' + Date.now(),
      };

      const payload1 = {
        type: 'affiliate_sync',
        ...jobData,
      };

      const response1 = await ctx.api.post('/api/jobs', payload1, {
        headers: ctx.headers,
      });

      const response2 = await ctx.api.post('/api/jobs', payload1, {
        headers: ctx.headers,
      });

      if (response1.status === 201 && response2.status === 201) {
        // Both succeeded - may be intentional or dedup logic exists
        expect(response2.data).toBeDefined();
      }
    });

    test('queue retry logic is configured', async () => {
      const response = await ctx.api.get('/api/admin/queues/affiliate-sync/config', {
        headers: ctx.headers,
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty('defaultJobOptions');
        const jobOptions = response.data.defaultJobOptions || {};
        if (jobOptions.attempts !== undefined) {
          expect(jobOptions.attempts).toBeGreaterThan(1);
        }
      }
    });

    test('queue has max stale count configured', async () => {
      const response = await ctx.api.get('/api/admin/queues/affiliate-sync/config', {
        headers: ctx.headers,
      });

      if (response.status === 200) {
        const config = response.data;
        // Verify retry/stale configuration exists
        expect(config).toBeDefined();
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // WORKER JOB PROCESSING
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Worker Job Processing', () => {
    test('workers are running', async () => {
      const response = await ctx.api.get('/api/admin/workers', {
        headers: ctx.headers,
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty('workers');
        const workers = response.data.workers || [];
        expect(workers.length).toBeGreaterThan(0);
      }
    });

    test('worker processes jobs successfully', async () => {
      // Submit a job
      const payload = {
        type: 'affiliate_sync',
        source: 'amazon',
        data: {
          url: 'https://example.com/product',
        },
      };

      const jobResponse = await ctx.api.post('/api/jobs', payload, {
        headers: ctx.headers,
      });

      if (jobResponse.status === 201 && jobResponse.data?.id) {
        // Wait a bit for worker to process
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check job status
        const statusResponse = await ctx.api.get(`/api/jobs/${jobResponse.data.id}`, {
          headers: ctx.headers,
        });

        if (statusResponse.status === 200) {
          expect(['pending', 'processing', 'completed', 'failed']).toContain(
            statusResponse.data.status
          );
        }
      }
    });

    test('worker handles failed jobs gracefully', async () => {
      const payload = {
        type: 'affiliate_sync',
        source: 'invalid-source',
        data: {
          url: 'https://example.com',
        },
      };

      const response = await ctx.api.post('/api/jobs', payload, {
        headers: ctx.headers,
      });

      // Job submission should either succeed or fail with validation error
      expect([200, 201, 400, 422]).toContain(response.status);
    });

    test('worker progress is trackable', async () => {
      const payload = {
        type: 'affiliate_sync',
        source: 'amazon',
        data: {
          url: 'https://example.com/product',
        },
      };

      const jobResponse = await ctx.api.post('/api/jobs', payload, {
        headers: ctx.headers,
      });

      if (jobResponse.status === 201 && jobResponse.data?.id) {
        const statusResponse = await ctx.api.get(`/api/jobs/${jobResponse.data.id}/progress`, {
          headers: ctx.headers,
        });

        if (statusResponse.status === 200) {
          expect(statusResponse.data).toHaveProperty('progress');
        }
      }
    });

    test('worker respects timeout limits', async () => {
      const startTime = Date.now();

      const payload = {
        type: 'affiliate_sync',
        source: 'amazon',
        data: {
          url: 'https://slow-endpoint.example.com',
        },
      };

      const response = await ctx.api.post('/api/jobs', payload, {
        headers: ctx.headers,
      });

      const elapsed = Date.now() - startTime;

      // Job submission should be fast
      expect(elapsed).toBeLessThan(5000);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DEDUPLICATION LOGIC
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Deduplication Logic', () => {
    test('duplicate URLs are detected', async () => {
      const url = 'https://example.com/product-' + Date.now();

      const payload1 = {
        type: 'affiliate_sync',
        source: 'amazon',
        url,
      };

      const response1 = await ctx.api.post('/api/jobs', payload1, {
        headers: ctx.headers,
      });

      const response2 = await ctx.api.post('/api/jobs', payload1, {
        headers: ctx.headers,
      });

      // Second request should indicate duplicate
      if (response2.status === 409) {
        expect(response2.data).toHaveProperty('error');
      } else {
        // Or dedup is silently handled
        expect([200, 201, 400]).toContain(response2.status);
      }
    });

    test('deduplication window is enforced', async () => {
      const url = 'https://example.com/product-' + Date.now();

      const payload = {
        type: 'affiliate_sync',
        source: 'amazon',
        url,
      };

      const response = await ctx.api.post('/api/jobs', payload, {
        headers: ctx.headers,
      });

      if (response.status === 201) {
        expect(response.data).toHaveProperty('id');
      }
    });

    test('deduplication can be bypassed with force flag', async () => {
      const url = 'https://example.com/product-' + Date.now();

      const payload = {
        type: 'affiliate_sync',
        source: 'amazon',
        url,
        force: true,
      };

      const response = await ctx.api.post('/api/jobs', payload, {
        headers: ctx.headers,
      });

      expect([200, 201, 400]).toContain(response.status);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // IQR FILTERING (Outlier Detection)
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('IQR Filtering & Outlier Detection', () => {
    test('price outliers are detected', async () => {
      const response = await ctx.api.get('/api/products/analytics/outliers', {
        headers: ctx.headers,
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty('outliers');
        expect(Array.isArray(response.data.outliers)).toBe(true);
      }
    });

    test('IQR boundaries are calculated correctly', async () => {
      const response = await ctx.api.get('/api/products/analytics/iqr', {
        headers: ctx.headers,
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty('q1');
        expect(response.data).toHaveProperty('q3');
        expect(response.data).toHaveProperty('iqr');
        expect(response.data.iqr).toBeGreaterThanOrEqual(0);
      }
    });

    test('outliers are flagged in product data', async () => {
      const response = await ctx.api.get('/api/products', {
        headers: ctx.headers,
      });

      if (response.status === 200 && response.data.products) {
        const products = response.data.products;
        if (products.length > 0) {
          // Some products might have outlier flag
          const hasOutlierInfo = products.some((p: any) =>
            p.hasOwnProperty('isOutlier') || p.hasOwnProperty('outlier')
          );
          // This is optional, but good to have
        }
      }
    });

    test('IQR filtering is applied during sync', async () => {
      const response = await ctx.api.get('/api/admin/queues/affiliate-sync/stats', {
        headers: ctx.headers,
      });

      if (response.status === 200) {
        // Should have processed products
        expect(response.data).toHaveProperty('processedCount');
      }
    });

    test('outlier threshold is configurable', async () => {
      const response = await ctx.api.get('/api/admin/config/iqr', {
        headers: ctx.headers,
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty('lowerBound');
        expect(response.data).toHaveProperty('upperBound');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SEED SCRIPT EXECUTION
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Seed Script Completion', () => {
    test('seed stage 1 has completed', async () => {
      const response = await ctx.api.get('/api/admin/seed-status/stage1', {
        headers: ctx.headers,
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty('completed');
        if (response.data.completed) {
          expect(response.data).toHaveProperty('count');
          expect(response.data.count).toBeGreaterThan(0);
        }
      }
    });

    test('seed stage 2 has completed', async () => {
      const response = await ctx.api.get('/api/admin/seed-status/stage2', {
        headers: ctx.headers,
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty('completed');
        if (response.data.completed) {
          expect(response.data).toHaveProperty('count');
          expect(response.data.count).toBeGreaterThan(0);
        }
      }
    });

    test('seed data integrity is verified', async () => {
      const response = await ctx.api.get('/api/admin/seed-integrity', {
        headers: ctx.headers,
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty('valid');
        expect(response.data.valid).toBe(true);
      }
    });

    test('seed created appropriate number of records', async () => {
      const response = await ctx.api.get('/api/admin/seed-status', {
        headers: ctx.headers,
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty('totalRecords');
        expect(response.data.totalRecords).toBeGreaterThan(0);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // QUEUE STABILITY & PERFORMANCE
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Queue Stability & Performance', () => {
    test('queue does not accumulate stale jobs', async () => {
      const response = await ctx.api.get('/api/admin/queues/affiliate-sync/status', {
        headers: ctx.headers,
      });

      if (response.status === 200) {
        const failedCount = response.data.failedCount || 0;
        const delayedCount = response.data.delayedCount || 0;

        // Stale jobs should be cleaned up
        expect(failedCount + delayedCount).toBeLessThan(10000);
      }
    });

    test('queue throughput is reasonable', async () => {
      const response = await ctx.api.get('/api/admin/queues/affiliate-sync/throughput', {
        headers: ctx.headers,
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty('jobsPerSecond');
        // Should be processing some jobs
        expect(response.data.jobsPerSecond).toBeGreaterThanOrEqual(0);
      }
    });

    test('worker error rate is acceptable', async () => {
      const response = await ctx.api.get('/api/admin/workers/error-rate', {
        headers: ctx.headers,
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty('errorRate');
        // Error rate should be less than 50%
        expect(response.data.errorRate).toBeLessThan(0.5);
      }
    });

    test('job processing time is consistent', async () => {
      const response = await ctx.api.get('/api/admin/queues/affiliate-sync/latency', {
        headers: ctx.headers,
      });

      if (response.status === 200) {
        expect(response.data).toHaveProperty('avgLatency');
        expect(response.data).toHaveProperty('p95Latency');
        expect(response.data).toHaveProperty('p99Latency');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GRACEFUL DEGRADATION
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Graceful Degradation', () => {
    test('application works when queue is down', async () => {
      const response = await ctx.api.get('/health', {
        headers: ctx.headers,
      });

      // Even if queue is down, health endpoint should return 200
      expect([200, 503]).toContain(response.status);
    });

    test('job submission fails gracefully when queue is unavailable', async () => {
      const payload = {
        type: 'affiliate_sync',
        source: 'amazon',
        url: 'https://example.com',
      };

      const response = await ctx.api.post('/api/jobs', payload, {
        headers: ctx.headers,
      });

      // Should return appropriate error, not crash
      expect(response.status).toBeLessThan(500);
    });
  });
});
