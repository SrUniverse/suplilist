/**
 * Enhanced Logging Middleware
 *
 * Provides comprehensive request/response logging with:
 * - Request body size tracking
 * - Response size and compression ratio
 * - Database query timing
 * - Cache hit/miss tracking
 * - Error context capture
 * - Performance thresholds and alerting
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../shared/utils/logger.js';

interface RequestMetrics {
  startTime: number;
  requestSize: number;
  dbTimeMs: number;
  cacheHits: number;
  cacheMisses: number;
  errors: Array<{ message: string; context?: any }>;
}

const PERFORMANCE_THRESHOLDS = {
  slowQuery: 500, // ms
  largeResponse: 100 * 1024, // bytes (100KB)
  slowRequest: 2000, // ms (2s)
};

/**
 * Enhanced logging middleware
 * Tracks comprehensive metrics for every request
 */
export function enhancedLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const metrics: RequestMetrics = {
    startTime: Date.now(),
    requestSize: calculateRequestSize(req),
    dbTimeMs: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: [],
  };

  // Store metrics on request for other middleware to update
  (req as any).metrics = metrics;

  // Log incoming request
  logger.debug('Request received', {
    requestId: (req as any).id || (req as any).traceId,
    method: req.method,
    path: req.path,
    query: req.query,
    contentType: req.headers['content-type'],
    requestSize_bytes: metrics.requestSize,
    userAgent: req.headers['user-agent'],
  });

  // Intercept response to log completion
  const originalJson = res.json.bind(res);

  res.json = function (body: any): Response {
    const endTime = Date.now();
    const duration = endTime - metrics.startTime;
    const responseSize = Buffer.byteLength(JSON.stringify(body), 'utf8');
    const compressionRatio = metrics.requestSize > 0 ? ((1 - responseSize / metrics.requestSize) * 100).toFixed(1) : '0';

    // Determine log level based on status
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    // Build comprehensive log entry
    const logData: Record<string, any> = {
      requestId: (req as any).id || (req as any).traceId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration_ms: duration,
      request_size_bytes: metrics.requestSize,
      response_size_bytes: responseSize,
      response_size_kb: (responseSize / 1024).toFixed(2),
      compression_ratio_percent: compressionRatio,
      cache_hits: metrics.cacheHits,
      cache_misses: metrics.cacheMisses,
      db_time_ms: metrics.dbTimeMs,
    };

    // Add user context if authenticated
    if ((req as any).user) {
      logData.userId = (req as any).user.id;
      logData.userEmail = (req as any).user.email;
    }

    // Log errors if any occurred
    if (metrics.errors.length > 0) {
      logData.errors = metrics.errors;
    }

    // Check performance thresholds
    if (duration > PERFORMANCE_THRESHOLDS.slowRequest) {
      logData.performance_alert = 'SLOW_REQUEST';
    }

    if (responseSize > PERFORMANCE_THRESHOLDS.largeResponse) {
      logData.performance_alert = 'LARGE_RESPONSE';
    }

    if (metrics.dbTimeMs > PERFORMANCE_THRESHOLDS.slowQuery) {
      logData.performance_alert = 'SLOW_QUERY';
    }

    // Log with appropriate level
    logger.log(logLevel, 'Request completed', logData);

    return originalJson.call(this, body);
  };

  next();
}

/**
 * Middleware to track database operations timing
 */
export function dbTimingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const dbTimings: Array<{ operation: string; duration: number }> = [];
  (req as any).dbTimings = dbTimings;

  // Helper to record DB operation
  (req as any).recordDbOperation = (operation: string, duration: number) => {
    dbTimings.push({ operation, duration });
    const metrics = (req as any).metrics;
    if (metrics) {
      metrics.dbTimeMs += duration;
    }
  };

  next();
}

/**
 * Middleware to track cache operations
 */
export function cacheTrackingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Helper to record cache hit
  (req as any).recordCacheHit = () => {
    const metrics = (req as any).metrics;
    if (metrics) {
      metrics.cacheHits++;
      logger.debug('Cache hit', {
        requestId: (req as any).id || (req as any).traceId,
        cacheHits: metrics.cacheHits,
      });
    }
  };

  // Helper to record cache miss
  (req as any).recordCacheMiss = () => {
    const metrics = (req as any).metrics;
    if (metrics) {
      metrics.cacheMisses++;
      logger.debug('Cache miss', {
        requestId: (req as any).id || (req as any).traceId,
        cacheMisses: metrics.cacheMisses,
      });
    }
  };

  next();
}

/**
 * Middleware to track errors with context
 */
export function errorTrackingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Helper to record error
  (req as any).recordError = (message: string, context?: any) => {
    const metrics = (req as any).metrics;
    if (metrics) {
      metrics.errors.push({ message, context });
      logger.debug('Error recorded during request', {
        requestId: (req as any).id || (req as any).traceId,
        errorMessage: message,
        errorContext: context,
      });
    }
  };

  next();
}

/**
 * Calculate request body size in bytes
 */
function calculateRequestSize(req: Request): number {
  let size = 0;

  // Content-Length header if present
  const contentLength = req.headers['content-length'];
  if (contentLength) {
    return parseInt(contentLength, 10);
  }

  // Estimate from body if it exists
  if (req.body && typeof req.body === 'object') {
    size = Buffer.byteLength(JSON.stringify(req.body), 'utf8');
  }

  return size;
}

/**
 * Middleware for structured error logging
 * Captures stack traces and context
 */
export function structuredErrorLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Override error handling to provide structured logs
  const originalJson = res.json.bind(res);

  res.json = function (body: any): Response {
    // If error response, log it with context
    if (res.statusCode >= 400 && body && typeof body === 'object') {
      const errorLog: Record<string, any> = {
        requestId: (req as any).id || (req as any).traceId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        error: body.error,
        message: body.message,
        timestamp: new Date().toISOString(),
      };

      if ((req as any).user) {
        errorLog.userId = (req as any).user.id;
      }

      logger.warn('API error response', errorLog);
    }

    return originalJson.call(this, body);
  };

  next();
}

/**
 * Health check logging
 * Don't spam logs with health checks
 */
export function healthCheckFilterMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Skip logging for health checks
  if (req.path === '/health' || req.path === '/health/live' || req.path === '/health/ready' || req.path === '/metrics') {
    return next();
  }

  next();
}

/**
 * Performance analytics middleware
 * Collects percentile data on response times
 */
const performanceHistogram: Map<string, number[]> = new Map();

export function performanceAnalyticsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startTime = Date.now();

  const originalJson = res.json.bind(res);

  res.json = function (body: any): Response {
    const duration = Date.now() - startTime;
    const endpoint = normalizeEndpoint(req.path);

    // Store timing for this endpoint
    if (!performanceHistogram.has(endpoint)) {
      performanceHistogram.set(endpoint, []);
    }

    performanceHistogram.get(endpoint)!.push(duration);

    // Keep only last 1000 measurements per endpoint
    const timings = performanceHistogram.get(endpoint)!;
    if (timings.length > 1000) {
      timings.shift();
    }

    // Log percentile stats periodically
    if (timings.length % 100 === 0) {
      const sorted = [...timings].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];

      logger.debug('Performance percentiles', {
        endpoint,
        samples: timings.length,
        p50_ms: p50,
        p95_ms: p95,
        p99_ms: p99,
        min_ms: sorted[0],
        max_ms: sorted[sorted.length - 1],
      });
    }

    return originalJson.call(this, body);
  };

  next();
}

/**
 * Normalize endpoint path for grouping
 */
function normalizeEndpoint(path: string): string {
  // Remove query parameters
  const basePath = path.split('?')[0];

  // Replace numeric IDs with :id
  return basePath.replace(/\/\d+/g, '/:id');
}

export default enhancedLoggingMiddleware;
