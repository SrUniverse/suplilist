/**
 * Cache Metrics Extensions
 * Version: 1.0.0
 *
 * Extended Prometheus metrics specifically for query cache monitoring.
 * Adds to existing metrics in metrics.ts
 */

import client from 'prom-client';
import { logger } from './logger.js';

// Create a dedicated registry for cache metrics
const cacheRegistry = new client.Registry();

// ─────────────────────────────────────────────────────────────────────────────
// Query Cache Specific Counters
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Total cache hits per query type
 */
export const queryCacheHitsTotal = new client.Counter({
  name: 'query_cache_hits_total',
  help: 'Total query cache hits',
  labelNames: ['operation', 'cache_type', 'table'],
  registers: [cacheRegistry],
});

/**
 * Total cache misses per query type
 */
export const queryCacheMissesTotal = new client.Counter({
  name: 'query_cache_misses_total',
  help: 'Total query cache misses',
  labelNames: ['operation', 'cache_type', 'table'],
  registers: [cacheRegistry],
});

/**
 * Cache invalidations triggered
 */
export const cacheInvalidationsTotal = new client.Counter({
  name: 'cache_invalidations_total',
  help: 'Total cache invalidations',
  labelNames: ['operation', 'table'],
  registers: [cacheRegistry],
});

/**
 * Cache keys invalidated
 */
export const cacheKeysInvalidatedTotal = new client.Counter({
  name: 'cache_keys_invalidated_total',
  help: 'Total cache keys invalidated',
  labelNames: ['pattern'],
  registers: [cacheRegistry],
});

// ─────────────────────────────────────────────────────────────────────────────
// Query Cache Histograms
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Query execution time with cache
 */
export const queryCacheLatency = new client.Histogram({
  name: 'query_cache_latency_seconds',
  help: 'Query execution latency with cache',
  labelNames: ['operation', 'cache_type', 'hit'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [cacheRegistry],
});

/**
 * Cache serialization time
 */
export const cacheSerialization = new client.Histogram({
  name: 'cache_serialization_duration_seconds',
  help: 'Cache serialization/deserialization time',
  labelNames: ['operation'],
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01],
  registers: [cacheRegistry],
});

/**
 * Invalidation processing time
 */
export const invalidationLatency = new client.Histogram({
  name: 'cache_invalidation_duration_seconds',
  help: 'Cache invalidation processing time',
  labelNames: ['operation', 'pattern'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [cacheRegistry],
});

// ─────────────────────────────────────────────────────────────────────────────
// Cache Gauges
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Redis memory usage in bytes
 */
export const redisMemoryUsageBytes = new client.Gauge({
  name: 'redis_memory_usage_bytes',
  help: 'Redis memory usage in bytes',
  registers: [cacheRegistry],
});

/**
 * Number of keys in cache
 */
export const cacheKeyCount = new client.Gauge({
  name: 'cache_key_count',
  help: 'Number of keys in cache',
  registers: [cacheRegistry],
});

/**
 * Pending cache invalidations
 */
export const pendingInvalidations = new client.Gauge({
  name: 'cache_pending_invalidations',
  help: 'Number of pending cache invalidations',
  registers: [cacheRegistry],
});

/**
 * Cache hit ratio (computed)
 */
export const cacheHitRatio = new client.Gauge({
  name: 'cache_hit_ratio',
  help: 'Cache hit ratio (0-1)',
  labelNames: ['cache_type'],
  registers: [cacheRegistry],
});

/**
 * Estimated memory per key
 */
export const cacheAverageSizePerKey = new client.Gauge({
  name: 'cache_average_size_per_key_bytes',
  help: 'Average cache size per key in bytes',
  registers: [cacheRegistry],
});

// ─────────────────────────────────────────────────────────────────────────────
// Cache Health Gauge
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cache health status (1 = healthy, 0 = unhealthy)
 */
export const cacheHealthStatus = new client.Gauge({
  name: 'cache_health_status',
  help: 'Cache health status (1=healthy, 0=unhealthy)',
  registers: [cacheRegistry],
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions for Recording Metrics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Record query cache hit
 */
export function recordCacheHit(
  operation: string,
  cacheType: string,
  table?: string,
): void {
  queryCacheHitsTotal.inc({
    operation,
    cache_type: cacheType,
    table: table || 'unknown',
  });
}

/**
 * Record query cache miss
 */
export function recordCacheMiss(
  operation: string,
  cacheType: string,
  table?: string,
): void {
  queryCacheMissesTotal.inc({
    operation,
    cache_type: cacheType,
    table: table || 'unknown',
  });
}

/**
 * Record cache invalidation
 */
export function recordInvalidation(
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  table: string,
  keysInvalidated: number,
): void {
  cacheInvalidationsTotal.inc({ operation, table });
  cacheKeysInvalidatedTotal.inc({ pattern: `${table}:*` }, keysInvalidated);
}

/**
 * Record query latency with cache
 */
export function recordCacheQueryLatency(
  operation: string,
  cacheType: string,
  durationSeconds: number,
  hit: boolean,
): void {
  queryCacheLatency
    .labels(operation, cacheType, hit ? 'yes' : 'no')
    .observe(durationSeconds);
}

/**
 * Record serialization time
 */
export function recordSerializationTime(
  operation: 'serialize' | 'deserialize',
  durationSeconds: number,
): void {
  cacheSerialization.labels(operation).observe(durationSeconds);
}

/**
 * Record invalidation processing time
 */
export function recordInvalidationTime(
  operation: 'pattern' | 'specific',
  pattern: string,
  durationSeconds: number,
): void {
  invalidationLatency
    .labels(operation, pattern)
    .observe(durationSeconds);
}

/**
 * Update cache statistics
 */
export function updateCacheStats(stats: {
  memoryBytes: number;
  keyCount: number;
  pendingInvalidations: number;
  healthy: boolean;
}): void {
  redisMemoryUsageBytes.set(stats.memoryBytes);
  cacheKeyCount.set(stats.keyCount);
  pendingInvalidations.set(stats.pendingInvalidations);
  cacheHealthStatus.set(stats.healthy ? 1 : 0);

  if (stats.keyCount > 0) {
    cacheAverageSizePerKey.set(stats.memoryBytes / stats.keyCount);
  }
}

/**
 * Update cache hit ratio
 */
export function updateHitRatio(cacheType: string, ratio: number): void {
  cacheHitRatio.labels(cacheType).set(ratio);
}

/**
 * Get all cache metrics as text
 */
export function getCacheMetrics(): Promise<string> {
  return cacheRegistry.metrics();
}

/**
 * Get content type for Prometheus
 */
export function getCacheMetricsContentType(): string {
  return cacheRegistry.contentType;
}

/**
 * Reset all cache metrics (development only)
 */
export function resetCacheMetrics(env: string = 'development'): void {
  if (env !== 'development') {
    throw new Error('Cannot reset metrics in production');
  }

  queryCacheHitsTotal.reset();
  queryCacheMissesTotal.reset();
  cacheInvalidationsTotal.reset();
  cacheKeysInvalidatedTotal.reset();
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache Performance Report
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate cache performance report
 */
export async function generateCacheReport(): Promise<{
  summary: string;
  hitRate: number;
  avgLatency: number;
  memoryMB: number;
  keyCount: number;
  recommendation: string;
}> {
  // These would be populated from actual metrics values
  // This is a template for reporting

  return {
    summary: 'Cache Performance Report',
    hitRate: 0, // Should be calculated from actual hits/misses
    avgLatency: 0, // Should be calculated from histogram
    memoryMB: 0, // Should be from gauge
    keyCount: 0, // Should be from gauge
    recommendation: 'Monitor and adjust TTL values based on hit rate',
  };
}

/**
 * Sample cache metrics at regular interval
 */
export function setupCacheMetricsSampling(intervalMs: number = 60000): NodeJS.Timer {
  return setInterval(() => {
    // This would be called periodically to update gauges
    // Connect to your cache service and update stats
    logger.info('[Cache Metrics] Sampling metrics...');
  }, intervalMs);
}

export default cacheRegistry;
