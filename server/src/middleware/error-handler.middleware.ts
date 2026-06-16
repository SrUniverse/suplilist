/**
 * Global Error Handler Middleware
 *
 * Standardized error handling with:
 * - Consistent error response format
 * - Error classification and status codes
 * - Structured logging with context
 * - Stack trace masking in production
 * - Error metrics and alerting
 * - Request correlation IDs
 *
 * Must be the LAST middleware in the express app
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../shared/utils/logger.js';
import { isAppError, AppError, ErrorCode } from '../shared/errors/app-error.js';
import { errorMetrics } from '../shared/services/error-metrics.service.js';
import { alertingService } from '../shared/services/alerting.service.js';

/**
 * Parse unknown error and convert to AppError
 */
function parseError(error: unknown, requestId?: string): AppError {
  // Already an AppError
  if (isAppError(error)) {
    return error as AppError;
  }

  // Error instance
  if (error instanceof Error) {
    const message = error.message || 'Unknown error';
    const metadata = {
      originalError: error.constructor.name,
      ...(error.stack && { stack: error.stack }),
    };

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError' || error.constructor.name === 'ValidationError') {
      return new AppError(message, ErrorCode.VALIDATION_ERROR, 400, metadata, requestId);
    }

    // Handle Mongoose duplicate key errors
    if (error.name === 'MongoServerError' && 'code' in error && (error as any).code === 11000) {
      return new AppError(
        'Resource already exists',
        ErrorCode.CONFLICT,
        409,
        { ...metadata, duplicateField: (error as any).keyPattern },
        requestId,
      );
    }

    // Handle Mongoose cast errors
    if (error.name === 'CastError' || error.constructor.name === 'CastError') {
      return new AppError(
        'Invalid resource ID format',
        ErrorCode.BAD_REQUEST,
        400,
        metadata,
        requestId,
      );
    }

    // Handle Zod validation errors
    if (error.name === 'ZodError' || error.constructor.name === 'ZodError') {
      const zodError = error as any;
      return new AppError(
        'Validation failed',
        ErrorCode.VALIDATION_ERROR,
        400,
        {
          ...metadata,
          validationIssues: zodError.issues || zodError.errors,
        },
        requestId,
      );
    }

    // Default to internal server error
    return new AppError(message, ErrorCode.INTERNAL_SERVER_ERROR, 500, metadata, requestId);
  }

  // Unknown error type
  const metadata = {
    errorType: typeof error,
    errorString: String(error),
  };
  return new AppError(
    'Unknown error occurred',
    ErrorCode.INTERNAL_SERVER_ERROR,
    500,
    metadata,
    requestId,
  );
}

/**
 * Global error handler middleware
 * Must be defined LAST in the express app
 */
export function errorHandlerMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = (req as any).requestId || (req as any).traceId || 'unknown';
  const appError = parseError(err, requestId);

  // Record error metrics
  errorMetrics.recordError(
    appError.code,
    appError.status,
    req.method,
    req.path,
  );

  // Log error with full context
  const logEntry = {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    status: appError.status,
    error: appError.code,
    message: appError.message,
    metadata: appError.metadata,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== 'production' && {
      stack: appError.stack,
    }),
  };

  // Log based on error level
  if (appError.status >= 500) {
    logger.error('Server error', logEntry);
  } else if (appError.status >= 400) {
    logger.warn('Client error', logEntry);
  } else {
    logger.info('Error response', logEntry);
  }

  // Check if error requires alerting
  if (shouldAlert(appError)) {
    alertingService.alert({
      severity: getSeverity(appError),
      title: `${appError.code}: ${appError.message}`,
      description: `Request: ${req.method} ${req.path}`,
      metadata: {
        requestId,
        errorCode: appError.code,
        status: appError.status,
        ...appError.metadata,
      },
    });
  }

  // Send error response
  const response = {
    success: false,
    error: appError.code,
    message: appError.message,
    ...(process.env.NODE_ENV !== 'production' && {
      metadata: appError.metadata,
      stack: appError.stack,
    }),
    ...(appError instanceof AppError && appError.requestId && {
      requestId: appError.requestId,
    }),
  };

  // Add retry-after header for rate limit and service unavailable errors
  if (appError.status === 429 || appError.status === 503) {
    const retryAfter = (appError as any).retryAfter || 60;
    res.set('Retry-After', String(retryAfter));
  }

  res.status(appError.status).json(response);
}

/**
 * Determine if error should trigger an alert
 */
function shouldAlert(error: AppError): boolean {
  // Alert on server errors
  if (error.status >= 500) {
    return true;
  }

  // Alert on authentication/authorization failures (potential security issue)
  if ([ErrorCode.AUTHENTICATION_FAILED, ErrorCode.UNAUTHORIZED].includes(error.code)) {
    return true;
  }

  // Alert on external service failures
  if (error.code === ErrorCode.EXTERNAL_SERVICE_ERROR) {
    return true;
  }

  // Alert on database errors
  if (error.code === ErrorCode.DATABASE_ERROR) {
    return true;
  }

  return false;
}

/**
 * Get severity level for error
 */
function getSeverity(error: AppError): 'critical' | 'high' | 'medium' | 'low' {
  if (error.status >= 500) {
    return error.code === ErrorCode.DATABASE_ERROR ? 'critical' : 'high';
  }

  if (error.code === ErrorCode.AUTHENTICATION_FAILED) {
    return 'medium';
  }

  return 'low';
}

/**
 * Async error wrapper for route handlers
 * Usage: router.get('/', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default errorHandlerMiddleware;
