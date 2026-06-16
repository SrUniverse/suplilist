/**
 * Standardized API Response Types
 * Version: 2.0.0
 *
 * All API endpoints must return responses conforming to this interface.
 * This ensures consistent error handling, pagination, and metadata across the entire API.
 */

/**
 * Error details with code, message, and field-level errors for validation
 */
export interface ApiError {
  code: string; // 'validation_error', 'not_found', 'unauthorized', 'conflict', etc.
  message: string; // User-friendly error message
  details?: Record<string, string | string[]>; // Field-level errors for validation errors
  timestamp?: string; // ISO 8601 timestamp when error occurred
  traceId?: string; // Trace ID for debugging
}

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
  total: number; // Total number of items matching query
  page: number; // Current page (1-indexed)
  limit: number; // Items per page
  hasMore: boolean; // Whether there are more pages
  totalPages?: number; // Total number of pages
}

/**
 * Response metadata
 */
export interface ResponseMeta extends Record<string, unknown> {
  timestamp: string; // ISO 8601 timestamp of response
  version?: string; // API version
  requestId?: string; // Trace ID for request correlation
  pagination?: PaginationMeta;
  rateLimit?: {
    limit: number;
    remaining: number;
    resetAt: string;
  };
}

/**
 * Standard successful API response
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

/**
 * Standard error API response
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  meta: ResponseMeta;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Type guards
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

export function isErrorResponse(response: ApiResponse): response is ApiErrorResponse {
  return response.success === false;
}

/**
 * Standard error codes
 */
export enum ErrorCode {
  BAD_REQUEST = 'bad_request',
  VALIDATION_ERROR = 'validation_error',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  GONE = 'gone',
  INTERNAL_SERVER_ERROR = 'internal_server_error',
  SERVICE_UNAVAILABLE = 'service_unavailable',
}
