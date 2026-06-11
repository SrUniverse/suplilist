/**
 * Winston Logger Setup
 * Structured JSON logging with proper context correlation
 *
 * Features:
 * - Structured JSON output (ECS compatible)
 * - Request correlation IDs
 * - Error stack traces
 * - Performance metrics integration
 * - Log levels: error, warn, info, debug, trace
 * - Automatic log masking for sensitive data (GDPR, security)
 */

import winston from 'winston';
import { Request } from 'express';
import { maskLogEntry, maskObjectProperties } from '../../middleware/log-masking.middleware.js';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

// Custom Winston format for JSON with automatic log masking
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    // Mask the log message
    const maskedMessage = maskLogEntry(String(info.message));

    const base = {
      timestamp: info.timestamp,
      level: info.level.toUpperCase(),
      message: maskedMessage,
      service: 'suplilist-api',
    };

    if (info.stack) {
      // Mask stack trace to remove sensitive paths/URLs
      const maskedStack = maskLogEntry(String(info.stack));
      return JSON.stringify({
        ...base,
        error: {
          message: maskedMessage,
          stack: maskedStack,
          type: info.errorType || 'Error',
        },
      });
    }

    // Mask metadata recursively for structured logs
    const maskedMetadata = maskObjectProperties(info.metadata || {});

    return JSON.stringify({
      ...base,
      ...maskedMetadata,
    });
  }),
);

// Serverless platforms (Vercel/Lambda) have a read-only filesystem — creating
// logs/ crashes the function at import time. Use console (captured by the
// platform's log drain) there; files only on writable hosts.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const fileTransports = isServerless
  ? [new winston.transports.Console({ format: jsonFormat })]
  : [
      // File transport for errors
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      // File transport for all logs
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 10,
      }),
    ];

// Create logger instance
export const logger = winston.createLogger({
  levels,
  format: jsonFormat,
  defaultMeta: { service: 'suplilist-api' },
  transports: fileTransports,
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf((info) => {
          const timestamp = new Date(String(info.timestamp)).toISOString();
          return `${timestamp} [${info.level}]: ${info.message}`;
        }),
      ),
    }),
  );
}

/**
 * Request context with correlation ID
 */
export interface LogContext {
  requestId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  duration?: number;
  statusCode?: number;
  [key: string]: unknown;
}

/**
 * Log helper for structured logging
 */
export function logWithContext(
  level: keyof typeof levels,
  message: string,
  context?: LogContext,
  error?: Error,
): void {
  const metadata = context || {};

  if (error) {
    logger.log(level, message, {
      ...metadata,
      errorType: error.constructor.name,
      errorMessage: error.message,
      stack: error.stack,
    });
  } else {
    logger.log(level, message, metadata);
  }
}

/**
 * Log HTTP request
 */
export function logRequest(
  method: string,
  endpoint: string,
  statusCode: number,
  durationMs: number,
  requestId?: string,
): void {
  logWithContext('info', 'HTTP Request', {
    requestId,
    method,
    endpoint,
    statusCode,
    duration_ms: durationMs,
  });
}

/**
 * Log API error
 */
export function logError(
  message: string,
  error: Error,
  context?: LogContext,
): void {
  logWithContext('error', message, context, error);
}

/**
 * Log cache operation
 */
export function logCache(
  operation: string,
  key: string,
  hit: boolean,
  requestId?: string,
): void {
  logWithContext('debug', 'Cache Operation', {
    requestId,
    operation,
    key,
    hit,
  });
}

/**
 * Log conversion operation
 */
export function logConversion(
  source: string,
  itemsCount: number,
  durationMs: number,
  error?: string,
  requestId?: string,
): void {
  logWithContext(
    error ? 'warn' : 'info',
    'Conversion Operation',
    {
      requestId,
      source,
      items_count: itemsCount,
      duration_ms: durationMs,
      error,
    },
  );
}

/**
 * Log worker job
 */
export function logWorkerJob(
  jobType: string,
  jobId: string,
  status: 'started' | 'completed' | 'failed',
  durationMs?: number,
  error?: string,
): void {
  logWithContext(
    status === 'failed' ? 'error' : 'info',
    `Worker Job ${status}`,
    {
      job_type: jobType,
      job_id: jobId,
      duration_ms: durationMs,
      error,
    },
  );
}

/**
 * Log JIT event
 */
export function logJIT(
  action: string,
  userId: string,
  context?: Record<string, unknown>,
): void {
  logWithContext('info', 'JIT Event', {
    action,
    user_id: userId,
    ...context,
  });
}

/**
 * Log database operation
 */
export function logDbOperation(
  operation: string,
  collection: string,
  durationMs: number,
  error?: string,
): void {
  logWithContext(
    error ? 'warn' : 'debug',
    'Database Operation',
    {
      operation,
      collection,
      duration_ms: durationMs,
      error,
    },
  );
}

/**
 * Create middleware to attach request ID and log context
 */
export function createLoggerMiddleware(req: Request, _res: unknown, next: Function): void {
  // Get or create request ID
  const requestId = (req.headers['x-request-id'] as string) || generateRequestId();
  (req as any).id = requestId;
  (req as any).startTime = Date.now();

  next();
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export default logger;
