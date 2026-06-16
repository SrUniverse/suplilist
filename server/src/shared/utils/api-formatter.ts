/**
 * API Response Formatter Utilities
 * Version: 2.0.0
 *
 * Provides standardized response formatting for all API endpoints.
 */

import { Response } from 'express';
import {
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiError,
  PaginationMeta,
  ResponseMeta,
  ErrorCode,
} from '../types/api-response.js';

/**
 * Response formatter for successful responses
 */
export function formatSuccess<T>(
  data: T,
  options?: {
    pagination?: PaginationMeta;
    traceId?: string;
    version?: string;
  }
): ApiSuccessResponse<T> {
  const meta: ResponseMeta = {
    timestamp: new Date().toISOString(),
    ...options,
  };

  return {
    success: true,
    data,
    meta,
  };
}

/**
 * Response formatter for error responses
 */
export function formatError(
  error: ApiError | string | { code: string; message: string },
  options?: {
    traceId?: string;
    version?: string;
  }
): ApiErrorResponse {
  let apiError: ApiError;

  if (typeof error === 'string') {
    apiError = {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: error,
    };
  } else if ('code' in error && 'message' in error) {
    apiError = error as ApiError;
  } else {
    apiError = {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
    };
  }

  const meta: ResponseMeta = {
    timestamp: new Date().toISOString(),
    ...options,
  };

  return {
    success: false,
    error: apiError,
    meta,
  };
}

/**
 * Express response helper - sends formatted success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  options?: {
    pagination?: PaginationMeta;
    traceId?: string;
    version?: string;
  }
): Response {
  const response = formatSuccess(data, options);
  return res.status(statusCode).json(response);
}

/**
 * Express response helper - sends formatted error response
 */
export function sendError(
  res: Response,
  error: ApiError | string | { code: string; message: string },
  statusCode: number = 500,
  options?: {
    traceId?: string;
    version?: string;
  }
): Response {
  const response = formatError(error, options);
  return res.status(statusCode).json(response);
}

/**
 * Helper to create validation error response
 */
export function createValidationError(
  details: Record<string, string | string[]>,
  message: string = 'Validation failed'
): ApiError {
  return {
    code: ErrorCode.VALIDATION_ERROR,
    message,
    details,
  };
}

/**
 * Helper to create not found error response
 */
export function createNotFoundError(resource: string): ApiError {
  return {
    code: ErrorCode.NOT_FOUND,
    message: `${resource} not found`,
  };
}

/**
 * Helper to create conflict error response
 */
export function createConflictError(message: string, details?: Record<string, string>): ApiError {
  return {
    code: ErrorCode.CONFLICT,
    message,
    details,
  };
}

/**
 * Helper to format pagination metadata
 */
export function createPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    hasMore: page < totalPages,
    totalPages,
  };
}
