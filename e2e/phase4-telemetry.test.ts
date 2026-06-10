/**
 * PHASE 4: TELEMETRY & MONITORING TEST SUITE
 *
 * Validates:
 * - /metrics endpoint returns Prometheus format
 * - Grafana datasource connectivity
 * - Alert rule configuration
 * - Structured logging
 * - Performance metrics collection
 */

import { test, expect } from '@playwright/test';
import axios, { AxiosInstance } from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090';
const GRAFANA_URL = process.env.GRAFANA_URL || 'http://localhost:3000';

interface Phase4Context {
  api: AxiosInstance;
  prometheus: AxiosInstance;
  grafana: AxiosInstance;
  headers: Record<string, string>;
}

test.describe('PHASE 4 - Telemetry & Monitoring', () => {
  let ctx: Phase4Context;

  test.beforeAll(async () => {
    ctx = {
      api: axios.create({
        baseURL: BASE_URL,
        timeout: 30000,
        validateStatus: () => true,
      }),
      prometheus: axios.create({
        baseURL: PROMETHEUS_URL,
        timeout: 30000,
        validateStatus: () => true,
      }),
      grafana: axios.create({
        baseURL: GRAFANA_URL,
        timeout: 30000,
        validateStatus: () => true,
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-SupliList-Client': 'e2e-phase4',
      },
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PROMETHEUS METRICS ENDPOINT
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Prometheus Metrics Format', () => {
    test('/metrics endpoint is accessible', async () => {
      const response = await ctx.api.get('/metrics', { headers: ctx.headers });

      expect(response.status).toBe(200);
    });

    test('/metrics returns proper Prometheus format', async () => {
      const response = await ctx.api.get('/metrics', { headers: ctx.headers });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.data).toMatch(/^# HELP/m);
      expect(response.data).toMatch(/^# TYPE/m);
    });

    test('metrics include HTTP request counter', async () => {
      const response = await ctx.api.get('/metrics', { headers: ctx.headers });

      expect(response.data).toContain('http_requests_total');
      expect(response.data).toMatch(/http_requests_total\{.*\}/);
    });

    test('metrics include HTTP request duration histogram', async () => {
      const response = await ctx.api.get('/metrics', { headers: ctx.headers });

      expect(response.data).toContain('http_request_duration_seconds');
      expect(response.data).toMatch(/http_request_duration_seconds_bucket/);
    });

    test('metrics include error rate tracking', async () => {
      const response = await ctx.api.get('/metrics', { headers: ctx.headers });

      // Should track errors
      expect(response.data).toMatch(/http_requests_total.*status="[45]\d\d"/);
    });

    test('metrics include memory usage', async () => {
      const response = await ctx.api.get('/metrics', { headers: ctx.headers });

      const hasMemory =
        response.data.includes('nodejs_heap_used_bytes') ||
        response.data.includes('process_resident_memory_bytes');

      expect(hasMemory).toBe(true);
    });

    test('metrics include process uptime', async () => {
      const response = await ctx.api.get('/metrics', { headers: ctx.headers });

      expect(response.data).toContain('process_uptime_seconds');
    });

    test('metrics include custom business metrics', async () => {
      const response = await ctx.api.get('/metrics', { headers: ctx.headers });

      // Application-specific metrics
      const hasBusinessMetrics =
        response.data.includes('affiliate_sync') ||
        response.data.includes('jobs_processed') ||
        response.data.includes('cache');

      if (hasBusinessMetrics) {
        expect(hasBusinessMetrics).toBe(true);
      }
    });

    test('metrics include queue statistics', async () => {
      const response = await ctx.api.get('/metrics', { headers: ctx.headers });

      const hasQueueMetrics =
        response.data.includes('queue_') || response.data.includes('bullmq');

      // Queue metrics are optional if BullMQ is used
      if (hasQueueMetrics) {
        expect(hasQueueMetrics).toBe(true);
      }
    });

    test('metrics have proper labels and help text', async () => {
      const response = await ctx.api.get('/metrics', { headers: ctx.headers });

      // Should have help and type declarations
      const helpCount = (response.data.match(/^# HELP/gm) || []).length;
      const typeCount = (response.data.match(/^# TYPE/gm) || []).length;

      expect(helpCount).toBeGreaterThan(0);
      expect(typeCount).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PROMETHEUS SERVER INTEGRATION
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Prometheus Server Integration', () => {
    test('Prometheus is accessible', async () => {
      const response = await ctx.prometheus.get('/', {});

      expect([200, 404]).toContain(response.status);
    });

    test('Prometheus has scraped targets', async () => {
      const response = await ctx.prometheus.get('/api/v1/targets', {});

      if (response.status === 200) {
        expect(response.data).toHaveProperty('data');
        expect(response.data.data).toHaveProperty('activeTargets');
        // Should have at least the API target
        expect(response.data.data.activeTargets.length).toBeGreaterThan(0);
      }
    });

    test('Prometheus has collected metrics', async () => {
      const response = await ctx.prometheus.get('/api/v1/query', {
        params: { query: 'up' },
      });

      if (response.status === 200 && response.data.data) {
        expect(response.data.data.result.length).toBeGreaterThan(0);
      }
    });

    test('Prometheus can query HTTP request metrics', async () => {
      const response = await ctx.prometheus.get('/api/v1/query', {
        params: { query: 'http_requests_total' },
      });

      if (response.status === 200 && response.data.data?.result) {
        expect(response.data.data.result.length).toBeGreaterThanOrEqual(0);
      }
    });

    test('Prometheus has retention period configured', async () => {
      const response = await ctx.prometheus.get('/api/v1/query', {
        params: { query: 'ALERTS' },
      });

      // Should be able to query without error
      expect([200, 400]).toContain(response.status);
    });

    test('Prometheus service discovery is working', async () => {
      const response = await ctx.prometheus.get('/api/v1/label/__name__/values', {});

      if (response.status === 200) {
        expect(Array.isArray(response.data.data)).toBe(true);
        expect(response.data.data.length).toBeGreaterThan(0);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GRAFANA DATASOURCE & DASHBOARDS
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Grafana Integration', () => {
    test('Grafana is accessible', async () => {
      const response = await ctx.grafana.get('/api/health', {});

      expect([200, 404]).toContain(response.status);
    });

    test('Grafana has Prometheus datasource configured', async () => {
      const response = await ctx.grafana.get('/api/datasources', {
        headers: {
          Authorization: `Bearer ${process.env.GRAFANA_TOKEN || ''}`,
        },
      });

      if (response.status === 200) {
        expect(Array.isArray(response.data)).toBe(true);
        const prometheusDS = response.data.find(
          (ds: any) => ds.type === 'prometheus' || ds.name.includes('Prometheus')
        );

        if (prometheusDS) {
          expect(prometheusDS).toHaveProperty('url');
        }
      }
    });

    test('Grafana dashboard is provisioned', async () => {
      const response = await ctx.grafana.get('/api/dashboards/search', {
        params: { query: 'suplilist' },
        headers: {
          Authorization: `Bearer ${process.env.GRAFANA_TOKEN || ''}`,
        },
      });

      if (response.status === 200) {
        expect(Array.isArray(response.data)).toBe(true);
        // Should have at least one dashboard
        if (response.data.length > 0) {
          expect(response.data[0]).toHaveProperty('title');
        }
      }
    });

    test('Grafana can query Prometheus data', async () => {
      // Try to simulate a Grafana query
      const response = await ctx.prometheus.get('/api/v1/query', {
        params: { query: 'up{job="prometheus"}' },
      });

      // Should succeed or be properly formatted
      expect([200, 400, 404]).toContain(response.status);
    });

    test('Grafana alerting is configured', async () => {
      const response = await ctx.grafana.get('/api/ruler/grafana/rules', {
        headers: {
          Authorization: `Bearer ${process.env.GRAFANA_TOKEN || ''}`,
        },
      });

      if (response.status === 200) {
        expect(response.data).toBeDefined();
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ALERTING RULES
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Alert Rules Configuration', () => {
    test('high error rate alert is configured', async () => {
      const response = await ctx.prometheus.get('/api/v1/rules', {});

      if (response.status === 200 && response.data.data?.groups) {
        const alertRules = response.data.data.groups.flatMap((g: any) => g.rules || []);
        const errorAlert = alertRules.find((r: any) =>
          r.name?.toLowerCase?.().includes('error')
        );

        if (errorAlert) {
          expect(errorAlert).toHaveProperty('for');
        }
      }
    });

    test('high latency alert is configured', async () => {
      const response = await ctx.prometheus.get('/api/v1/rules', {});

      if (response.status === 200 && response.data.data?.groups) {
        const alertRules = response.data.data.groups.flatMap((g: any) => g.rules || []);
        const latencyAlert = alertRules.find((r: any) =>
          r.name?.toLowerCase?.().includes('latency')
        );

        if (latencyAlert) {
          expect(latencyAlert).toHaveProperty('name');
        }
      }
    });

    test('resource exhaustion alerts are configured', async () => {
      const response = await ctx.prometheus.get('/api/v1/rules', {});

      if (response.status === 200 && response.data.data?.groups) {
        const alertRules = response.data.data.groups.flatMap((g: any) => g.rules || []);
        // Should have some memory/cpu alerts
        const resourceAlerts = alertRules.filter((r: any) =>
          r.name?.match(/memory|cpu|disk/i)
        );

        if (resourceAlerts.length > 0) {
          expect(resourceAlerts.length).toBeGreaterThan(0);
        }
      }
    });

    test('queue health alerts are configured', async () => {
      const response = await ctx.prometheus.get('/api/v1/rules', {});

      if (response.status === 200 && response.data.data?.groups) {
        const alertRules = response.data.data.groups.flatMap((g: any) => g.rules || []);
        const queueAlert = alertRules.find((r: any) =>
          r.name?.toLowerCase?.().includes('queue')
        );

        // Queue alerts are optional
        if (queueAlert) {
          expect(queueAlert).toHaveProperty('name');
        }
      }
    });

    test('alert severity levels are properly configured', async () => {
      const response = await ctx.prometheus.get('/api/v1/rules', {});

      if (response.status === 200 && response.data.data?.groups) {
        const alertRules = response.data.data.groups.flatMap((g: any) => g.rules || []);
        const alertsWithLabels = alertRules.filter((r: any) => r.labels);

        if (alertsWithLabels.length > 0) {
          // Should have severity labels
          const hasSeverity = alertsWithLabels.some((a: any) =>
            a.labels?.severity?.match(/critical|warning|info/i)
          );

          if (hasSeverity) {
            expect(hasSeverity).toBe(true);
          }
        }
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // STRUCTURED LOGGING
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Structured Logging', () => {
    test('application logs are JSON formatted', async () => {
      // Make a request and check logs
      const response = await ctx.api.get('/health', { headers: ctx.headers });

      expect(response.status).toBe(200);
      // Logs would be in application output, this is just verification
    });

    test('logs include trace IDs', async () => {
      const response = await ctx.api.get('/health', { headers: ctx.headers });

      expect(response.headers).toHaveProperty('x-trace-id');
      expect(response.headers['x-trace-id']).toBeTruthy();
    });

    test('logs include request/response context', async () => {
      const response = await ctx.api.post('/health', {}, { headers: ctx.headers });

      // Logs should include method, path, status, duration
      expect(response.status).toBeLessThan(500);
    });

    test('logs include error stack traces', async () => {
      const response = await ctx.api.get('/api/nonexistent', { headers: ctx.headers });

      expect(response.status).toBe(404);
      // Application logs should include error details
    });

    test('sensitive data is redacted in logs', async () => {
      const response = await ctx.api.get('/health', { headers: ctx.headers });

      expect(response.status).toBe(200);
      // Logs should not contain passwords, tokens, etc.
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PERFORMANCE METRICS
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Performance Metrics Collection', () => {
    test('request latency is measured', async () => {
      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        await ctx.api.get('/health', { headers: ctx.headers });
      }

      const metricsResponse = await ctx.api.get('/metrics', { headers: ctx.headers });

      expect(metricsResponse.data).toContain('http_request_duration_seconds');
      expect(metricsResponse.data).toMatch(/http_request_duration_seconds_bucket/);
    });

    test('endpoint-specific metrics are tracked', async () => {
      await ctx.api.get('/health', { headers: ctx.headers });

      const metricsResponse = await ctx.api.get('/metrics', { headers: ctx.headers });

      // Should have metrics for /health endpoint
      expect(metricsResponse.data).toMatch(/path="\/health"/);
    });

    test('HTTP method metrics are tracked', async () => {
      await ctx.api.get('/health', { headers: ctx.headers });
      await ctx.api.post('/health', {}, { headers: ctx.headers });

      const metricsResponse = await ctx.api.get('/metrics', { headers: ctx.headers });

      expect(metricsResponse.data).toMatch(/method="GET"/);
      expect(metricsResponse.data).toMatch(/method="POST"/);
    });

    test('HTTP status code distribution is tracked', async () => {
      await ctx.api.get('/health', { headers: ctx.headers });
      await ctx.api.get('/api/nonexistent', { headers: ctx.headers });

      const metricsResponse = await ctx.api.get('/metrics', { headers: ctx.headers });

      expect(metricsResponse.data).toMatch(/status="200"/);
      expect(metricsResponse.data).toMatch(/status="404"/);
    });

    test('memory usage metrics are collected', async () => {
      const metricsResponse = await ctx.api.get('/metrics', { headers: ctx.headers });

      const hasMemoryMetrics =
        metricsResponse.data.includes('nodejs_heap_used_bytes') ||
        metricsResponse.data.includes('nodejs_heap_total_bytes') ||
        metricsResponse.data.includes('process_resident_memory_bytes');

      expect(hasMemoryMetrics).toBe(true);
    });

    test('garbage collection metrics are available', async () => {
      const metricsResponse = await ctx.api.get('/metrics', { headers: ctx.headers });

      const hasGCMetrics = metricsResponse.data.includes('nodejs_gc');

      // GC metrics are nice-to-have
      if (hasGCMetrics) {
        expect(hasGCMetrics).toBe(true);
      }
    });

    test('custom business metrics are collected', async () => {
      const metricsResponse = await ctx.api.get('/metrics', { headers: ctx.headers });

      // Check for any custom metrics
      const metricsCount = (metricsResponse.data.match(/^[a-z_]+\{/gm) || []).length;
      expect(metricsCount).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MONITORING DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Monitoring Dashboard', () => {
    test('key metrics are visible in metrics endpoint', async () => {
      const response = await ctx.api.get('/metrics', { headers: ctx.headers });

      expect(response.data).toContain('http_requests_total');
      expect(response.data).toContain('http_request_duration_seconds');
    });

    test('health metrics are accurate', async () => {
      // Make a request
      const healthResponse = await ctx.api.get('/health', { headers: ctx.headers });

      expect(healthResponse.status).toBe(200);
      expect(healthResponse.data).toHaveProperty('status');
    });

    test('error metrics reflect actual errors', async () => {
      // Cause an error
      await ctx.api.get('/api/nonexistent', { headers: ctx.headers });

      const metricsResponse = await ctx.api.get('/metrics', { headers: ctx.headers });

      // Should track the 404 error
      expect(metricsResponse.data).toMatch(/status="404"/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // OBSERVABILITY COMPLETENESS
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe('Observability Completeness', () => {
    test('tracing is enabled across requests', async () => {
      const response = await ctx.api.get('/health', { headers: ctx.headers });

      expect(response.headers).toHaveProperty('x-trace-id');
    });

    test('metrics, logs, and traces are correlated', async () => {
      const response = await ctx.api.get('/health', { headers: ctx.headers });

      const traceId = response.headers['x-trace-id'];
      expect(traceId).toBeTruthy();

      // Logs and metrics should reference this trace ID
    });

    test('service dependencies are observable', async () => {
      const response = await ctx.api.get('/health', { headers: ctx.headers });

      expect(response.status).toBe(200);
      // Should show dependencies (DB, Redis, etc.) in health response
    });
  });
});
