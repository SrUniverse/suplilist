import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { redisClient } from '../shared/infrastructure/redis/redis.client.js';

/**
 * Distributed Tracing Middleware
 *
 * Implements request tracing for end-to-end debugging and performance analysis:
 * 1. Generate or propagate trace ID (X-Trace-ID header)
 * 2. Add trace ID to all logs (structured logging)
 * 3. Include trace ID in API responses
 * 4. Track timing metadata (request duration, DB query time)
 * 5. Store traces in Redis for debugging
 *
 * Usage in logs:
 * ```
 * logger.info('User login', { traceId: req.traceId, userId: user.id })
 * ```
 *
 * Response includes:
 * - X-Trace-ID header
 * - trace-id field in JSON responses
 */

export interface TracedRequest extends Request {
  traceId: string;
  startTime: number;
  timings: {
    requestStart: number;
    dbStart?: number;
    dbEnd?: number;
  };
}

const TRACE_STORAGE_TTL = 24 * 60 * 60; // 24 hours
const TRACE_PREFIX = 'trace:';

/**
 * Generate a new trace ID
 * Format: timestamp-random (e.g., 1640000000000-abc123def456)
 */
export function generateTraceId(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${random}`;
}

/**
 * Extract trace ID from request headers or generate new one
 */
function getOrGenerateTraceId(req: Request): string {
  const headerTraceId = req.headers['x-trace-id'] as string;
  if (headerTraceId && /^[\d\w\-]+$/.test(headerTraceId)) {
    return headerTraceId;
  }
  return generateTraceId();
}

/**
 * Store trace metadata in Redis for later analysis
 */
async function storeTraceMetadata(
  traceId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    const key = `${TRACE_PREFIX}${traceId}`;
    const value = JSON.stringify({
      ...metadata,
      timestamp: new Date().toISOString(),
    });
    await redisClient.setex(key, TRACE_STORAGE_TTL, value);
  } catch (error) {
    // Silently fail trace storage to not impact request
    console.error('[Tracing] Failed to store trace metadata:', error);
  }
}

/**
 * Middleware: Initialize request tracing
 * Should be applied early in middleware stack
 */
export const tracingInitMiddleware = (req: TracedRequest, res: Response, next: NextFunction) => {
  // Generate or extract trace ID
  req.traceId = getOrGenerateTraceId(req);
  req.startTime = Date.now();
  req.timings = {
    requestStart: Date.now(),
  };

  // Add trace ID to response headers
  res.setHeader('X-Trace-ID', req.traceId);

  // Intercept response to add trace ID to JSON responses
  const originalJson = res.json;
  res.json = function(data: any) {
    // Add trace ID to response body if it's an object
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      data.traceId = req.traceId;
    }

    // Log request completion with timing
    const duration = Date.now() - req.startTime;
    const dbDuration = req.timings.dbEnd && req.timings.dbStart
      ? req.timings.dbEnd - req.timings.dbStart
      : 0;

    console.log('[Request]', {
      traceId: req.traceId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      dbDuration: dbDuration > 0 ? `${dbDuration}ms` : 'N/A',
      timestamp: new Date().toISOString(),
    });

    // Store trace metadata asynchronously (don't await)
    storeTraceMetadata(req.traceId, {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      dbDuration,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch(err => console.error('[Tracing] Storage error:', err));

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Middleware: Track database operation timing
 * Call before DB operations
 */
export function startDbTiming(req: TracedRequest): void {
  if (!req.timings) {
    req.timings = { requestStart: Date.now() };
  }
  req.timings.dbStart = Date.now();
}

/**
 * Middleware: Mark database operation as complete
 * Call after DB operations
 */
export function endDbTiming(req: TracedRequest): void {
  if (req.timings && req.timings.dbStart) {
    req.timings.dbEnd = Date.now();
  }
}

/**
 * Retrieve trace metadata from Redis
 */
export async function getTraceMetadata(traceId: string): Promise<Record<string, unknown> | null> {
  try {
    const key = `${TRACE_PREFIX}${traceId}`;
    const data = await redisClient.get(key);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('[Tracing] Failed to retrieve trace:', error);
    return null;
  }
}

/**
 * Logger utility that automatically includes trace ID
 */
export function createTracedLogger(req: TracedRequest) {
  return {
    debug: (message: string, data?: Record<string, unknown>) => {
      console.debug(`[${req.traceId}] ${message}`, data || {});
    },
    info: (message: string, data?: Record<string, unknown>) => {
      console.info(`[${req.traceId}] ${message}`, data || {});
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      console.warn(`[${req.traceId}] ${message}`, data || {});
    },
    error: (message: string, error?: unknown, data?: Record<string, unknown>) => {
      console.error(`[${req.traceId}] ${message}`, error, data || {});
    },
  };
}

/**
 * Span recorder for tracking specific operations within a request
 */
export function createSpanRecorder(req: TracedRequest, spanName: string) {
  const spanStart = Date.now();

  return {
    end: (metadata?: Record<string, unknown>) => {
      const duration = Date.now() - spanStart;
      console.log(`[Span] ${spanName} in trace ${req.traceId}`, {
        duration: `${duration}ms`,
        ...metadata,
      });
    },
  };
}

export default {
  generateTraceId,
  tracingInitMiddleware,
  startDbTiming,
  endDbTiming,
  getTraceMetadata,
  createTracedLogger,
  createSpanRecorder,
};
