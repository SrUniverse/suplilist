/**
 * Express Middleware for Prometheus Metrics Collection
 *
 * Automatically collects:
 * - HTTP request latency
 * - Request counts by method/endpoint/status
 * - In-flight requests
 * - Error rates
 */

import { Request, Response, NextFunction } from 'express';
import {
  httpRequestsTotal,
  httpRequestDuration,
  httpRequestsInFlight,
  errorRateGauge,
  recordHttpMetrics,
} from '../shared/utils/metrics.js';
import { logger } from '../shared/utils/logger.js';

// Track error counts for rate calculation
const errorCounts: Map<string, { errors: number; total: number; resetAt: number }> = new Map();

/**
 * Metrics collection middleware
 */
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const method = req.method;
  const endpoint = normalizeEndpoint(req.path);
  const startTime = Date.now();

  // Increment in-flight requests
  httpRequestsInFlight.inc({ method });

  // Capture original res.json to intercept response
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    res.json = originalJson; // Restore original for potential future calls
    return originalJson(body);
  };

  // Handle response completion
  res.on('finish', () => {
    const statusCode = res.statusCode;
    const durationMs = Date.now() - startTime;
    const durationSeconds = durationMs / 1000;

    // Record metrics
    recordHttpMetrics(method, endpoint, statusCode, durationSeconds);

    // Decrement in-flight requests
    httpRequestsInFlight.dec({ method });

    // Update error rate
    updateErrorRate(endpoint, statusCode);

    // Log if error status
    if (statusCode >= 400) {
      logger.warn(`HTTP ${statusCode}`, {
        method,
        endpoint,
        duration_ms: durationMs,
      });
    }
  });

  next();
}

/**
 * Normalize endpoint path for metrics aggregation
 * Converts /api/users/123/posts/456 -> /api/users/:id/posts/:id
 */
function normalizeEndpoint(path: string): string {
  // Remove query parameters
  const basePath = path.split('?')[0];

  // Replace numeric IDs with :id
  const normalized = basePath.replace(/\/\d+/g, '/:id');

  // Limit length to prevent cardinality explosion
  return normalized.substring(0, 100);
}

/**
 * Update error rate gauge for an endpoint
 */
function updateErrorRate(endpoint: string, statusCode: number): void {
  const isError = statusCode >= 400;

  // Get or create counter for this endpoint
  let counter = errorCounts.get(endpoint);
  if (!counter) {
    counter = { errors: 0, total: 0, resetAt: Date.now() + 5 * 60 * 1000 }; // 5 min window
    errorCounts.set(endpoint, counter);
  }

  // Reset if window expired
  if (Date.now() >= counter.resetAt) {
    counter.errors = 0;
    counter.total = 0;
    counter.resetAt = Date.now() + 5 * 60 * 1000;
  }

  // Update counts
  counter.total++;
  if (isError) counter.errors++;

  // Calculate and record error rate
  const errorRate = counter.total > 0 ? (counter.errors / counter.total) * 100 : 0;
  errorRateGauge.set({ endpoint }, errorRate);
}

/**
 * Clean up old error rate counters periodically
 */
export function startErrorRateCleanup(): void {
  setInterval(() => {
    for (const [endpoint, counter] of errorCounts.entries()) {
      if (Date.now() >= counter.resetAt + 60000) { // 1 minute after reset
        errorCounts.delete(endpoint);
      }
    }
  }, 60 * 1000); // Run every minute
}

export default metricsMiddleware;
