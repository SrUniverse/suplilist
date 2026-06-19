/**
 * Response Optimization Middleware
 *
 * Features:
 * - Remove unnecessary fields from responses
 * - Add pagination metadata when applicable
 * - Gzip compression headers
 * - ETag support for cache validation
 * - Content-Length tracking
 * - Response size logging
 */

import { Request, Response, NextFunction } from 'express';
import { createHash } from 'node:crypto';
import { logger } from '../shared/utils/logger.js';

/**
 * Fields commonly returned but not needed by clients
 * These are selectively removed based on context
 */
const REMOVABLE_FIELDS = [
  '_id', // MongoDB ObjectID usually has no frontend use
  '__v', // Mongoose version key
  '_v', // Custom version markers
];

/**
 * Fields to always keep (whitelisting approach)
 * Used for sensitive endpoints
 */
const SENSITIVE_ONLY_FIELDS = ['id', 'userId', 'email', 'createdAt', 'updatedAt'];

interface OptimizationOptions {
  minimizeResponse?: boolean; // Remove non-essential fields
  trackSize?: boolean; // Log response size
  enableETag?: boolean; // Add ETag header for caching
  addPagination?: boolean; // Include pagination metadata
}

/**
 * Middleware to optimize API responses
 */
export function responseOptimizationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override res.json to intercept responses
  res.json = function (body: any): Response {
    // Get optimization options from request or use defaults
    const options: OptimizationOptions = {
      minimizeResponse: true,
      trackSize: true,
      enableETag: true,
      addPagination: false,
      ...(req as any).optimizationOptions,
    };

    // Minimize response payload
    if (options.minimizeResponse && body && typeof body === 'object') {
      body = removeUnnecessaryFields(body, req.path);
    }

    // Add ETag for cacheable responses
    if (options.enableETag && res.statusCode === 200) {
      const etagValue = generateETag(body);
      res.setHeader('ETag', etagValue);
    }

    // Track response size
    if (options.trackSize) {
      const payload = JSON.stringify(body);
      const sizeBytes = Buffer.byteLength(payload, 'utf8');
      const sizeKB = (sizeBytes / 1024).toFixed(2);

      res.setHeader('X-Response-Size-KB', sizeKB);

      // Log large responses for monitoring
      if (sizeBytes > 100 * 1024) {
        // 100KB threshold
        logger.warn('Large response', {
          endpoint: req.path,
          method: req.method,
          size_kb: sizeKB,
          status: res.statusCode,
        });
      }
    }

    // Call original json with optimized body
    return originalJson.call(this, body);
  };

  next();
}

/**
 * Remove unnecessary fields from response objects
 * Reduces payload size and improves security
 */
function removeUnnecessaryFields(
  obj: any,
  endpoint: string,
): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => removeUnnecessaryFields(item, endpoint));
  }

  // Create new object to avoid mutation
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Keep field if not in removable list
    if (!REMOVABLE_FIELDS.includes(key)) {
      // Recursively clean nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        cleaned[key] = removeUnnecessaryFields(value, endpoint);
      } else if (Array.isArray(value)) {
        cleaned[key] = value.map((item) =>
          typeof item === 'object' && item !== null
            ? removeUnnecessaryFields(item, endpoint)
            : item,
        );
      } else {
        cleaned[key] = value;
      }
    }
  }

  return cleaned;
}

/**
 * Generate ETag for response body
 * Used for HTTP caching validation
 */
function generateETag(body: any): string {
  const payload = JSON.stringify(body);
  const hash = createHash('sha256').update(payload).digest('hex').substring(0, 16);
  return `"${hash}"`;
}

/**
 * Middleware to add pagination metadata to list responses
 */
export function addPaginationMetadata(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const originalJson = res.json.bind(res);

  res.json = function (body: any): Response {
    // Only process successful list responses
    if (
      res.statusCode === 200 &&
      body &&
      typeof body === 'object' &&
      Array.isArray(body.data) &&
      !body.pagination
    ) {
      // Extract pagination params from query
      const page = parseInt(String(req.query.page || '1'), 10);
      const limit = parseInt(String(req.query.limit || '20'), 10);
      const total = body.total || body.data.length;

      body.pagination = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      };
    }

    return originalJson.call(this, body);
  };

  next();
}

/**
 * Middleware to enable compression headers
 * Works with Node.js compression module
 */
export function compressionHeadersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Only compress for supported endpoints
  const isCompressible =
    req.path.includes('/api/') &&
    !req.path.includes('/api/webhooks/');

  if (isCompressible) {
    // Enable compression for text, json, and api responses
    res.setHeader('Vary', 'Accept-Encoding');
  }

  next();
}

/**
 * Request/Response logging with size tracking
 */
export function requestResponseLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startTime = Date.now();

  // Intercept response to log details
  const originalJson = res.json.bind(res);

  res.json = function (body: any): Response {
    const duration = Date.now() - startTime;
    const responseSize = Buffer.byteLength(JSON.stringify(body), 'utf8');

    // Log performance metrics
    logger.debug('Request completed', {
      requestId: (req as any).id || (req as any).traceId,
      method: req.method,
      endpoint: req.path,
      statusCode: res.statusCode,
      duration_ms: duration,
      response_size_bytes: responseSize,
      response_size_kb: (responseSize / 1024).toFixed(2),
    });

    return originalJson.call(this, body);
  };

  next();
}

/**
 * Field selection middleware
 * Allows clients to request only specific fields: ?fields=id,name,email
 * Reduces response payload when clients don't need all data
 */
export function fieldSelectionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const fields = req.query.fields as string;

  if (!fields) {
    return next();
  }

  const fieldList = fields.split(',').map((f) => f.trim()).filter(Boolean);

  if (fieldList.length === 0) {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = function (body: any): Response {
    if (body && typeof body === 'object') {
      if (Array.isArray(body.data)) {
        body.data = body.data.map((item: any) =>
          selectFields(item, fieldList),
        );
      } else if (body.data && typeof body.data === 'object') {
        body.data = selectFields(body.data, fieldList);
      }
    }

    return originalJson.call(this, body);
  };

  next();
}

/**
 * Select only specified fields from an object
 */
function selectFields(obj: any, fields: string[]): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const selected: Record<string, any> = {};

  for (const field of fields) {
    if (field in obj) {
      selected[field] = obj[field];
    }
  }

  return selected;
}

export default responseOptimizationMiddleware;
