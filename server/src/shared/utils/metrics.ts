/**
 * Prometheus Metrics Client
 * Production-ready metrics collection with proper types and labels
 *
 * Metrics tracked:
 * - HTTP request latency (histograms by method/endpoint)
 * - Rate limit hits (counter)
 * - JIT timeout counter
 * - Conversion latency
 * - Cache hit/miss rates
 * - Worker job metrics
 * - Database query latency
 * - Error rates by type
 */

import client from 'prom-client';

// Create registry
const register = new client.Registry();

// ─────────────────────────────────────────────────────────────────────────────
// Counter Metrics
// ─────────────────────────────────────────────────────────────────────────────

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests processed',
  labelNames: ['method', 'endpoint', 'status'],
  registers: [register],
});

export const rateLimitHitsTotal = new client.Counter({
  name: 'rate_limit_hits_total',
  help: 'Total rate limit hits',
  labelNames: ['endpoint'],
  registers: [register],
});

export const jitTimeoutTotal = new client.Counter({
  name: 'jit_timeout_total',
  help: 'Total JIT endpoint timeouts',
  labelNames: ['reason'],
  registers: [register],
});

export const cacheHitsTotal = new client.Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['operation', 'key_type'],
  registers: [register],
});

export const cacheMissesTotal = new client.Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['operation', 'key_type'],
  registers: [register],
});

export const conversionErrorsTotal = new client.Counter({
  name: 'conversion_errors_total',
  help: 'Total conversion errors',
  labelNames: ['source', 'error_type'],
  registers: [register],
});

export const workerJobsTotal = new client.Counter({
  name: 'worker_jobs_total',
  help: 'Total worker jobs processed',
  labelNames: ['job_type', 'status'],
  registers: [register],
});

export const outboxEventsProcessedTotal = new client.Counter({
  name: 'outbox_events_processed_total',
  help: 'Total outbox events processed',
  labelNames: ['status'],
  registers: [register],
});

// ─────────────────────────────────────────────────────────────────────────────
// Histogram Metrics
// ─────────────────────────────────────────────────────────────────────────────

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'endpoint'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const conversionLatencyHistogram = new client.Histogram({
  name: 'conversion_latency_seconds',
  help: 'Conversion operation latency in seconds',
  labelNames: ['source'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

export const cacheOperationDuration = new client.Histogram({
  name: 'cache_operation_duration_seconds',
  help: 'Cache operation latency in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
  registers: [register],
});

export const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query latency in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});

export const workerJobDuration = new client.Histogram({
  name: 'worker_job_duration_seconds',
  help: 'Worker job execution time in seconds',
  labelNames: ['job_type'],
  buckets: [1, 5, 10, 30, 60, 300],
  registers: [register],
});

// ─────────────────────────────────────────────────────────────────────────────
// Gauge Metrics
// ─────────────────────────────────────────────────────────────────────────────

export const workerQueueDepth = new client.Gauge({
  name: 'worker_queue_depth',
  help: 'Number of jobs waiting in worker queue',
  labelNames: ['queue_name'],
  registers: [register],
});

export const cacheSize = new client.Gauge({
  name: 'cache_size_bytes',
  help: 'Cache memory usage in bytes',
  registers: [register],
});

export const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active database connections',
  labelNames: ['database'],
  registers: [register],
});

export const httpRequestsInFlight = new client.Gauge({
  name: 'http_requests_in_flight',
  help: 'Number of HTTP requests currently being processed',
  labelNames: ['method'],
  registers: [register],
});

// ─────────────────────────────────────────────────────────────────────────────
// Error Rate Gauge
// ─────────────────────────────────────────────────────────────────────────────

export const errorRateGauge = new client.Gauge({
  name: 'error_rate',
  help: 'Percentage of failed requests in the last 5 minutes',
  labelNames: ['endpoint'],
  registers: [register],
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Record HTTP request metrics
 */
export function recordHttpMetrics(
  method: string,
  endpoint: string,
  statusCode: number,
  durationSeconds: number,
): void {
  httpRequestsTotal.inc({ method, endpoint, status: statusCode });
  httpRequestDuration.observe({ method, endpoint }, durationSeconds);
}

/**
 * Record cache operation metrics
 */
export function recordCacheMetrics(
  operation: string,
  keyType: string,
  hit: boolean,
  durationSeconds: number,
): void {
  if (hit) {
    cacheHitsTotal.inc({ operation, key_type: keyType });
  } else {
    cacheMissesTotal.inc({ operation, key_type: keyType });
  }
  cacheOperationDuration.observe({ operation }, durationSeconds);
}

/**
 * Record conversion metrics
 */
export function recordConversionMetrics(
  source: string,
  durationSeconds: number,
  error?: string,
): void {
  conversionLatencyHistogram.observe({ source }, durationSeconds);
  if (error) {
    conversionErrorsTotal.inc({ source, error_type: error });
  }
}

/**
 * Record worker job metrics
 */
export function recordWorkerMetrics(
  jobType: string,
  status: 'success' | 'failed',
  durationSeconds: number,
): void {
  workerJobsTotal.inc({ job_type: jobType, status });
  workerJobDuration.observe({ job_type: jobType }, durationSeconds);
}

/**
 * Record database query metrics
 */
export function recordDbMetrics(
  operation: string,
  collection: string,
  durationSeconds: number,
): void {
  dbQueryDuration.observe({ operation, collection }, durationSeconds);
}

/**
 * Get Prometheus metrics in text format
 */
export function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Get content type for Prometheus metrics endpoint
 */
export function getMetricsContentType(): string {
  return register.contentType;
}

export default register;
