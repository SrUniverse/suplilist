/**
 * Standardized Application Error Classes
 *
 * All application errors inherit from AppError with:
 * - Standard error codes (error_code field)
 * - HTTP status codes
 * - Error metadata and context
 * - Automatic logging and metrics tracking
 *
 * Usage:
 *   throw new ValidationError('Invalid email format', { field: 'email' });
 *   throw new NotFoundError('User not found', { userId: '123' });
 *   throw new AuthenticationError('Invalid credentials');
 *   throw new RateLimitError('Too many requests', { retryAfter: 60 });
 */

export enum ErrorCode {
  // Client Errors (4xx)
  VALIDATION_ERROR = 'validation_error',
  BAD_REQUEST = 'bad_request',
  UNAUTHORIZED = 'unauthorized',
  AUTHENTICATION_FAILED = 'authentication_failed',
  FORBIDDEN = 'forbidden',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  PAYMENT_REQUIRED = 'payment_required',
  UNPROCESSABLE_ENTITY = 'unprocessable_entity',

  // Server Errors (5xx)
  INTERNAL_SERVER_ERROR = 'internal_server_error',
  NOT_IMPLEMENTED = 'not_implemented',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  GATEWAY_TIMEOUT = 'gateway_timeout',
  DATABASE_ERROR = 'database_error',
  EXTERNAL_SERVICE_ERROR = 'external_service_error',

  // Domain-specific errors
  INVALID_STATE = 'invalid_state',
  OPERATION_NOT_ALLOWED = 'operation_not_allowed',
  RESOURCE_EXHAUSTED = 'resource_exhausted',
  DEADLINE_EXCEEDED = 'deadline_exceeded',
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly metadata: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly requestId?: string;

  constructor(
    message: string,
    code: ErrorCode,
    status: number,
    metadata?: Record<string, unknown>,
    requestId?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.metadata = metadata || {};
    this.timestamp = new Date();
    this.requestId = requestId;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    return {
      success: false,
      error: this.code,
      message: this.message,
      status: this.status,
      timestamp: this.timestamp.toISOString(),
      ...(this.requestId && { requestId: this.requestId }),
      ...(process.env.NODE_ENV !== 'production' && {
        metadata: this.metadata,
        stack: this.stack,
      }),
    };
  }

  /**
   * Convert error to structured log entry
   */
  toLogEntry() {
    return {
      error_code: this.code,
      error_message: this.message,
      error_name: this.name,
      status_code: this.status,
      metadata: this.metadata,
      timestamp: this.timestamp.toISOString(),
      ...(this.requestId && { request_id: this.requestId }),
      stack_trace: this.stack,
    };
  }
}

/**
 * Validation Error (400)
 * Thrown when input validation fails
 */
export class ValidationError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>, requestId?: string) {
    super(
      message || 'Request validation failed',
      ErrorCode.VALIDATION_ERROR,
      400,
      metadata,
      requestId,
    );
  }
}

/**
 * Bad Request Error (400)
 * Thrown when request is malformed
 */
export class BadRequestError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>, requestId?: string) {
    super(message || 'Bad request', ErrorCode.BAD_REQUEST, 400, metadata, requestId);
  }
}

/**
 * Authentication Error (401)
 * Thrown when authentication fails
 */
export class AuthenticationError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>, requestId?: string) {
    super(
      message || 'Authentication failed',
      ErrorCode.AUTHENTICATION_FAILED,
      401,
      metadata,
      requestId,
    );
  }
}

/**
 * Unauthorized Error (401)
 * Thrown when user lacks credentials
 */
export class UnauthorizedError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>, requestId?: string) {
    super(message || 'Unauthorized', ErrorCode.UNAUTHORIZED, 401, metadata, requestId);
  }
}

/**
 * Forbidden Error (403)
 * Thrown when user lacks permissions
 */
export class ForbiddenError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>, requestId?: string) {
    super(message || 'Forbidden', ErrorCode.FORBIDDEN, 403, metadata, requestId);
  }
}

/**
 * Not Found Error (404)
 * Thrown when resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>, requestId?: string) {
    super(message || 'Resource not found', ErrorCode.NOT_FOUND, 404, metadata, requestId);
  }
}

/**
 * Conflict Error (409)
 * Thrown when request conflicts with current state
 */
export class ConflictError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>, requestId?: string) {
    super(message || 'Resource conflict', ErrorCode.CONFLICT, 409, metadata, requestId);
  }
}

/**
 * Rate Limit Error (429)
 * Thrown when rate limit is exceeded
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(message: string, retryAfter: number = 60, metadata?: Record<string, unknown>, requestId?: string) {
    super(
      message || 'Rate limit exceeded',
      ErrorCode.RATE_LIMIT_EXCEEDED,
      429,
      { ...metadata, retryAfter },
      requestId,
    );
    this.retryAfter = retryAfter;
  }
}

/**
 * Payment Required Error (402)
 * Thrown when payment is required
 */
export class PaymentRequiredError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>, requestId?: string) {
    super(
      message || 'Payment required',
      ErrorCode.PAYMENT_REQUIRED,
      402,
      metadata,
      requestId,
    );
  }
}

/**
 * Unprocessable Entity Error (422)
 * Thrown when entity cannot be processed
 */
export class UnprocessableEntityError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>, requestId?: string) {
    super(
      message || 'Unprocessable entity',
      ErrorCode.UNPROCESSABLE_ENTITY,
      422,
      metadata,
      requestId,
    );
  }
}

/**
 * Internal Server Error (500)
 * Thrown for unexpected server errors
 */
export class InternalServerError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>, requestId?: string) {
    super(
      message || 'Internal server error',
      ErrorCode.INTERNAL_SERVER_ERROR,
      500,
      metadata,
      requestId,
    );
  }
}

/**
 * Database Error (500)
 * Thrown when database operation fails
 */
export class DatabaseError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>, requestId?: string) {
    super(message || 'Database operation failed', ErrorCode.DATABASE_ERROR, 500, metadata, requestId);
  }
}

/**
 * External Service Error (502)
 * Thrown when external service fails
 */
export class ExternalServiceError extends AppError {
  public readonly serviceName: string;

  constructor(message: string, serviceName: string, metadata?: Record<string, unknown>, requestId?: string) {
    super(
      message || `${serviceName} service error`,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      502,
      { ...metadata, service: serviceName },
      requestId,
    );
    this.serviceName = serviceName;
  }
}

/**
 * Service Unavailable Error (503)
 * Thrown when service is temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  public readonly retryAfter: number;

  constructor(message: string, retryAfter: number = 60, metadata?: Record<string, unknown>, requestId?: string) {
    super(
      message || 'Service unavailable',
      ErrorCode.SERVICE_UNAVAILABLE,
      503,
      { ...metadata, retryAfter },
      requestId,
    );
    this.retryAfter = retryAfter;
  }
}

/**
 * Gateway Timeout Error (504)
 * Thrown when request times out
 */
export class GatewayTimeoutError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>, requestId?: string) {
    super(
      message || 'Request timeout',
      ErrorCode.GATEWAY_TIMEOUT,
      504,
      metadata,
      requestId,
    );
  }
}

/**
 * Invalid State Error (500)
 * Thrown when operation violates domain rules
 */
export class InvalidStateError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>, requestId?: string) {
    super(message || 'Invalid operation state', ErrorCode.INVALID_STATE, 500, metadata, requestId);
  }
}

/**
 * Operation Not Allowed Error (403)
 * Thrown when operation is not allowed
 */
export class OperationNotAllowedError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>, requestId?: string) {
    super(
      message || 'Operation not allowed',
      ErrorCode.OPERATION_NOT_ALLOWED,
      403,
      metadata,
      requestId,
    );
  }
}

/**
 * Resource Exhausted Error (429)
 * Thrown when resource limits exceeded
 */
export class ResourceExhaustedError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>, requestId?: string) {
    super(
      message || 'Resource limit exceeded',
      ErrorCode.RESOURCE_EXHAUSTED,
      429,
      metadata,
      requestId,
    );
  }
}

/**
 * Deadline Exceeded Error (504)
 * Thrown when deadline exceeded
 */
export class DeadlineExceededError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>, requestId?: string) {
    super(
      message || 'Operation deadline exceeded',
      ErrorCode.DEADLINE_EXCEEDED,
      504,
      metadata,
      requestId,
    );
  }
}

/**
 * Helper function to determine if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Helper function to get error status code
 */
export function getErrorStatus(error: unknown): number {
  if (isAppError(error)) {
    return error.status;
  }
  return 500;
}

/**
 * Helper function to get error code
 */
export function getErrorCode(error: unknown): string {
  if (isAppError(error)) {
    return error.code;
  }
  return ErrorCode.INTERNAL_SERVER_ERROR;
}
