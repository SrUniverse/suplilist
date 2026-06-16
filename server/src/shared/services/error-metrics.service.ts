/**
 * Error Metrics Service
 *
 * Tracks error rates, types, and patterns for:
 * - Error rate monitoring
 * - Error distribution by type and endpoint
 * - Error trend analysis
 * - Performance SLO tracking
 *
 * Integrates with Prometheus for visualization and alerting
 */

import client from 'prom-client';
import { ErrorCode } from '../errors/app-error.js';
import { logger } from '../utils/logger.js';

// Create or reuse registry
let register: client.Registry;
try {
  register = new client.Registry();
} catch {
  register = client.register;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Metrics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Counter: Total errors by type and status
 */
export const errorsTotal = new client.Counter({
  name: 'errors_total',
  help: 'Total errors by type and HTTP status',
  labelNames: ['error_code', 'status'],
  registers: [register],
});

/**
 * Counter: Errors by endpoint
 */
export const errorsByEndpoint = new client.Counter({
  name: 'errors_by_endpoint_total',
  help: 'Total errors by endpoint',
  labelNames: ['method', 'endpoint', 'error_code'],
  registers: [register],
});

/**
 * Gauge: Error rate per endpoint (percentage)
 */
export const errorRateByEndpoint = new client.Gauge({
  name: 'error_rate_by_endpoint',
  help: 'Error rate percentage by endpoint',
  labelNames: ['method', 'endpoint'],
  registers: [register],
});

/**
 * Counter: Validation errors
 */
export const validationErrorsTotal = new client.Counter({
  name: 'validation_errors_total',
  help: 'Total validation errors',
  labelNames: ['field', 'error_type'],
  registers: [register],
});

/**
 * Counter: Authentication errors
 */
export const authErrorsTotal = new client.Counter({
  name: 'auth_errors_total',
  help: 'Total authentication errors',
  labelNames: ['error_type'],
  registers: [register],
});

/**
 * Counter: External service errors
 */
export const externalServiceErrorsTotal = new client.Counter({
  name: 'external_service_errors_total',
  help: 'Total external service errors',
  labelNames: ['service_name'],
  registers: [register],
});

/**
 * Gauge: Critical error count (5xx)
 */
export const criticalErrorsGauge = new client.Gauge({
  name: 'critical_errors_count',
  help: 'Number of critical (5xx) errors in last minute',
  registers: [register],
});

/**
 * Gauge: Server error ratio
 */
export const serverErrorRatio = new client.Gauge({
  name: 'server_error_ratio',
  help: 'Ratio of server errors (5xx) to total errors',
  registers: [register],
});

// ─────────────────────────────────────────────────────────────────────────────
// Error Tracking State
// ─────────────────────────────────────────────────────────────────────────────

interface ErrorWindow {
  errors: number;
  total: number;
  timestamp: number;
}

const errorWindows = new Map<string, ErrorWindow>();
const criticalErrorQueue: { timestamp: number }[] = [];
const WINDOW_SIZE = 5 * 60 * 1000; // 5 minute window
const CRITICAL_ERROR_WINDOW = 60 * 1000; // 1 minute window

// Cleanup old windows periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, window] of errorWindows.entries()) {
    if (now - window.timestamp > WINDOW_SIZE + 60000) {
      errorWindows.delete(key);
    }
  }

  // Clean critical error queue
  while (criticalErrorQueue.length > 0 && criticalErrorQueue[0].timestamp < now - CRITICAL_ERROR_WINDOW) {
    criticalErrorQueue.shift();
  }
}, 60 * 1000);

// ─────────────────────────────────────────────────────────────────────────────
// Error Metrics Service
// ─────────────────────────────────────────────────────────────────────────────

export class ErrorMetricsService {
  /**
   * Record an error
   */
  recordError(
    errorCode: ErrorCode | string,
    status: number,
    method: string,
    endpoint: string,
    metadata?: Record<string, unknown>,
  ): void {
    // Record total error count
    errorsTotal.inc({ error_code: errorCode, status });

    // Record error by endpoint
    errorsByEndpoint.inc({ method, endpoint, error_code: errorCode });

    // Track critical errors (5xx)
    if (status >= 500) {
      criticalErrorQueue.push({ timestamp: Date.now() });
      criticalErrorsGauge.set(criticalErrorQueue.length);
    }

    // Update error rate for this endpoint
    this.updateErrorRate(method, endpoint);

    // Record category-specific metrics
    if (errorCode === ErrorCode.VALIDATION_ERROR && metadata?.field) {
      validationErrorsTotal.inc({
        field: String(metadata.field),
        error_type: String(metadata.errorType || 'unknown'),
      });
    }

    if (
      [
        ErrorCode.AUTHENTICATION_FAILED,
        ErrorCode.UNAUTHORIZED,
        ErrorCode.FORBIDDEN,
      ].includes(errorCode as ErrorCode)
    ) {
      authErrorsTotal.inc({ error_type: errorCode });
    }

    if (errorCode === ErrorCode.EXTERNAL_SERVICE_ERROR && metadata?.service) {
      externalServiceErrorsTotal.inc({ service_name: String(metadata.service) });
    }

    logger.debug('Error recorded', {
      errorCode,
      status,
      method,
      endpoint,
      metadata,
    });
  }

  /**
   * Record validation error
   */
  recordValidationError(field: string, errorType: string): void {
    validationErrorsTotal.inc({ field, error_type: errorType });
  }

  /**
   * Record authentication error
   */
  recordAuthError(errorType: string): void {
    authErrorsTotal.inc({ error_type: errorType });
  }

  /**
   * Record external service error
   */
  recordExternalServiceError(serviceName: string): void {
    externalServiceErrorsTotal.inc({ service_name: serviceName });
  }

  /**
   * Get error metrics for an endpoint
   */
  getEndpointMetrics(method: string, endpoint: string): {
    errorRate: number;
    totalErrors: number;
  } {
    const windowKey = `${method}:${endpoint}`;
    const window = errorWindows.get(windowKey);

    if (!window) {
      return { errorRate: 0, totalErrors: 0 };
    }

    const errorRate = window.total > 0 ? (window.errors / window.total) * 100 : 0;
    return { errorRate, totalErrors: window.errors };
  }

  /**
   * Get critical error count (5xx errors in last minute)
   */
  getCriticalErrorCount(): number {
    const now = Date.now();
    return criticalErrorQueue.filter(
      (error) => now - error.timestamp < CRITICAL_ERROR_WINDOW,
    ).length;
  }

  /**
   * Get server error ratio
   */
  getServerErrorRatio(): number {
    const now = Date.now();
    let totalErrors = 0;
    let serverErrors = 0;

    for (const window of errorWindows.values()) {
      if (now - window.timestamp < WINDOW_SIZE) {
        totalErrors += window.total;
        serverErrors += window.errors;
      }
    }

    if (totalErrors === 0) return 0;
    return (serverErrors / totalErrors) * 100;
  }

  /**
   * Private: Update error rate for endpoint
   */
  private updateErrorRate(method: string, endpoint: string): void {
    const windowKey = `${method}:${endpoint}`;
    let window = errorWindows.get(windowKey);

    if (!window) {
      window = { errors: 0, total: 0, timestamp: Date.now() };
      errorWindows.set(windowKey, window);
    }

    // Reset window if expired
    const now = Date.now();
    if (now - window.timestamp > WINDOW_SIZE) {
      window = { errors: 0, total: 0, timestamp: now };
      errorWindows.set(windowKey, window);
    }

    window.errors++;
    window.total++;

    // Update gauge
    const errorRate = (window.errors / window.total) * 100;
    errorRateByEndpoint.set({ method, endpoint }, errorRate);
  }
}

export const errorMetrics = new ErrorMetricsService();

/**
 * Get all error metrics as Prometheus text format
 */
export function getErrorMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Export register for use in metrics endpoint
 */
export { register as errorMetricsRegister };
