/**
 * Resilience Patterns
 *
 * Utilities for implementing resilient error handling:
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 * - Timeout handling
 * - Graceful degradation
 */

import { logger } from './logger.js';
import { GatewayTimeoutError, ExternalServiceError } from '../errors/app-error.js';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  timeoutMs?: number;
  jitter?: boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  timeoutMs: 10000,
  jitter: true,
};

/**
 * Retry an async operation with exponential backoff
 *
 * Usage:
 *   const result = await retry(
 *     () => fetchFromAPI(),
 *     { maxAttempts: 3, initialDelayMs: 100 }
 *   );
 */
export async function retry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;
  let delayMs = finalConfig.initialDelayMs;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      logger.debug('Retry attempt', {
        attempt,
        maxAttempts: finalConfig.maxAttempts,
      });

      const result = await withTimeout(operation(), finalConfig.timeoutMs);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if this is the last attempt
      if (attempt === finalConfig.maxAttempts) {
        break;
      }

      // Calculate next delay with optional jitter
      let nextDelay = Math.min(delayMs * finalConfig.backoffMultiplier, finalConfig.maxDelayMs);

      if (finalConfig.jitter) {
        nextDelay = nextDelay * (0.5 + Math.random() * 0.5); // Random between 50-100% of delay
      }

      logger.debug('Retry backoff', {
        attempt,
        nextDelayMs: nextDelay,
        error: lastError.message,
      });

      // Wait before retrying
      await sleep(nextDelay);
      delayMs = nextDelay;
    }
  }

  throw lastError || new Error('Retry exhausted');
}

/**
 * Execute an operation with a timeout
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
  if (!timeoutMs) {
    return promise;
  }

  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new GatewayTimeoutError(`Operation timed out after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Circuit Breaker State
 */
enum CircuitBreakerState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes before closing from half-open
  timeout: number; // Time before transitioning from open to half-open (ms)
  name: string; // Circuit breaker name for logging
}

/**
 * Circuit Breaker implementation
 *
 * Prevents cascading failures by stopping requests to failing services
 *
 * Usage:
 *   const breaker = new CircuitBreaker(
 *     async () => fetchFromAPI(),
 *     { failureThreshold: 5, timeout: 60000, name: 'external-api' }
 *   );
 *   const result = await breaker.execute();
 */
export class CircuitBreaker<T> {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly config: CircuitBreakerConfig;
  private readonly operation: () => Promise<T>;

  constructor(operation: () => Promise<T>, config: CircuitBreakerConfig) {
    this.operation = operation;
    this.config = config;
  }

  /**
   * Execute the operation if circuit is not open
   */
  async execute(): Promise<T> {
    // Check if should transition from OPEN to HALF_OPEN
    if (
      this.state === CircuitBreakerState.OPEN &&
      Date.now() - this.lastFailureTime > this.config.timeout
    ) {
      logger.info('Circuit breaker transitioning to HALF_OPEN', {
        name: this.config.name,
      });
      this.state = CircuitBreakerState.HALF_OPEN;
      this.successCount = 0;
    }

    // Reject if circuit is open
    if (this.state === CircuitBreakerState.OPEN) {
      throw new ExternalServiceError(
        `Circuit breaker is OPEN for ${this.config.name}`,
        this.config.name,
        {
          circuitState: 'OPEN',
          retryAfter: this.config.timeout,
        },
      );
    }

    try {
      const result = await this.operation();

      // Success - update state
      if (this.state === CircuitBreakerState.HALF_OPEN) {
        this.successCount++;

        if (this.successCount >= this.config.successThreshold) {
          logger.info('Circuit breaker CLOSED', {
            name: this.config.name,
            successCount: this.successCount,
          });
          this.state = CircuitBreakerState.CLOSED;
          this.failureCount = 0;
        }
      } else if (this.state === CircuitBreakerState.CLOSED) {
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      // Failure - update state
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.config.failureThreshold) {
        logger.warn('Circuit breaker OPENED', {
          name: this.config.name,
          failureCount: this.failureCount,
          threshold: this.config.failureThreshold,
        });
        this.state = CircuitBreakerState.OPEN;
      } else if (this.state === CircuitBreakerState.HALF_OPEN) {
        logger.warn('Circuit breaker returning to OPEN', {
          name: this.config.name,
        });
        this.state = CircuitBreakerState.OPEN;
      }

      throw error;
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): string {
    return this.state;
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    logger.info('Circuit breaker reset', { name: this.config.name });
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

/**
 * Bulkhead Pattern - Limit concurrent operations
 *
 * Usage:
 *   const bulkhead = new Bulkhead(5); // Max 5 concurrent operations
 *   const result = await bulkhead.execute(() => someAsyncOperation());
 */
export class Bulkhead {
  private readonly maxConcurrent: number;
  private currentConcurrent: number = 0;
  private readonly queue: Array<() => void> = [];

  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Execute operation with bulkhead limit
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    while (this.currentConcurrent >= this.maxConcurrent) {
      // Wait for a slot to open
      await new Promise((resolve) => this.queue.push(resolve));
    }

    this.currentConcurrent++;

    try {
      return await operation();
    } finally {
      this.currentConcurrent--;

      // Notify next waiting operation
      const resolve = this.queue.shift();
      if (resolve) {
        resolve();
      }
    }
  }

  /**
   * Get bulkhead metrics
   */
  getMetrics() {
    return {
      currentConcurrent: this.currentConcurrent,
      maxConcurrent: this.maxConcurrent,
      queuedOperations: this.queue.length,
    };
  }
}

/**
 * Fallback - Return default value if operation fails
 *
 * Usage:
 *   const result = await fallback(
 *     () => fetchUserFromAPI(id),
 *     () => fetchUserFromCache(id),
 *     () => ({ id, name: 'Unknown User' })
 *   );
 */
export async function fallback<T>(
  primary: () => Promise<T>,
  ...fallbacks: Array<() => Promise<T> | T>
): Promise<T> {
  let lastError: Error | null = null;

  // Try primary
  try {
    return await primary();
  } catch (error) {
    lastError = error instanceof Error ? error : new Error(String(error));
  }

  // Try fallbacks
  for (let i = 0; i < fallbacks.length; i++) {
    try {
      const result = await fallbacks[i]();
      logger.info('Fallback succeeded', { fallbackIndex: i });
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.debug('Fallback failed', {
        fallbackIndex: i,
        error: lastError.message,
      });
    }
  }

  throw lastError || new Error('All fallbacks exhausted');
}

/**
 * Timeout wrapper
 *
 * Usage:
 *   try {
 *     const result = await timeout(someAsyncOp(), 5000);
 *   } catch (error) {
 *     // Handle timeout
 *   }
 */
export function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new GatewayTimeoutError(`Operation timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/**
 * Exponential backoff calculator
 *
 * Usage:
 *   for (let attempt = 1; attempt <= 5; attempt++) {
 *     const delayMs = exponentialBackoff(attempt, 100, 10000);
 *     await sleep(delayMs);
 *     // retry
 *   }
 */
export function exponentialBackoff(
  attempt: number,
  initialDelayMs: number = 100,
  maxDelayMs: number = 10000,
  multiplier: number = 2,
): number {
  const delay = initialDelayMs * Math.pow(multiplier, attempt - 1);
  return Math.min(delay, maxDelayMs);
}

/**
 * Health check - periodically verify service is responsive
 *
 * Usage:
 *   const healthCheck = new HealthCheck(
 *     async () => fetch('https://api.example.com/health'),
 *     { intervalMs: 30000, timeoutMs: 5000 }
 *   );
 *   healthCheck.start();
 */
export class HealthCheck {
  private readonly check: () => Promise<void>;
  private readonly intervalMs: number;
  private readonly timeoutMs: number;
  private isHealthy: boolean = true;
  private intervalId: NodeJS.Timer | null = null;
  private lastCheckTime: number = 0;

  constructor(
    check: () => Promise<void>,
    config: { intervalMs?: number; timeoutMs?: number } = {},
  ) {
    this.check = check;
    this.intervalMs = config.intervalMs || 30000;
    this.timeoutMs = config.timeoutMs || 10000;
  }

  /**
   * Start health checks
   */
  start(): void {
    if (this.intervalId) {
      logger.warn('Health check already running');
      return;
    }

    logger.info('Health check started', {
      intervalMs: this.intervalMs,
      timeoutMs: this.timeoutMs,
    });

    this.performCheck(); // Run immediately

    this.intervalId = setInterval(() => this.performCheck(), this.intervalMs);
  }

  /**
   * Stop health checks
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Health check stopped');
    }
  }

  /**
   * Get health status
   */
  isHealthy_(): boolean {
    return this.isHealthy;
  }

  /**
   * Get last check time
   */
  getLastCheckTime(): number {
    return this.lastCheckTime;
  }

  /**
   * Perform a health check
   */
  private async performCheck(): Promise<void> {
    try {
      await timeout(this.check(), this.timeoutMs);
      this.isHealthy = true;
      this.lastCheckTime = Date.now();
    } catch (error) {
      this.isHealthy = false;
      this.lastCheckTime = Date.now();
      logger.warn('Health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export default {
  retry,
  CircuitBreaker,
  Bulkhead,
  fallback,
  timeout,
  exponentialBackoff,
  HealthCheck,
  withTimeout,
};
