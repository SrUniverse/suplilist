/**
 * CircuitBreakerService — Production-grade circuit breaker pattern
 * States: CLOSED → OPEN → HALF_OPEN → CLOSED
 * Prevents cascading failures by failing fast when a service degrades
 *
 * Configuration:
 * - Threshold: 5 failures in 60 seconds = OPEN
 * - Timeout: 30 seconds in OPEN state
 * - Half-open: Allows 1 request to test service recovery
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number; // Number of failures to trip the circuit
  windowMs: number; // Time window for counting failures (ms)
  timeoutMs: number; // Time to wait before attempting recovery (ms)
  halfOpenRequests: number; // Number of requests to allow in HALF_OPEN state before deciding
  onStateChange?: (prev: CircuitState, next: CircuitState) => void;
}

interface FailureRecord {
  timestamp: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureRecords: FailureRecord[] = [];
  private successCountInHalfOpen = 0;
  private lastStateChangeTime = Date.now();
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    // Auto-transition from OPEN to HALF_OPEN if timeout elapsed
    if (this.state === CircuitState.OPEN) {
      const timeSinceOpen = Date.now() - this.lastStateChangeTime;
      if (timeSinceOpen >= this.config.timeoutMs) {
        this.transitionTo(CircuitState.HALF_OPEN);
      }
    }

    return this.state;
  }

  /**
   * Execute a function with circuit breaker protection
   * Returns either the result or throws an error if circuit is OPEN
   */
  async execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === CircuitState.OPEN) {
      if (fallback) {
        return fallback();
      }
      throw new Error(
        `[CircuitBreaker:${this.config.name}] Circuit is OPEN - service unavailable`
      );
    }

    try {
      const result = await fn();

      // Success - reset counters
      this.onSuccess(currentState);
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Synchronous version for non-async functions
   */
  executeSync<T>(fn: () => T, fallback?: () => T): T {
    const currentState = this.getState();

    if (currentState === CircuitState.OPEN) {
      if (fallback) {
        return fallback();
      }
      throw new Error(
        `[CircuitBreaker:${this.config.name}] Circuit is OPEN - service unavailable`
      );
    }

    try {
      const result = fn();
      this.onSuccess(currentState);
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Record a failure
   */
  private onFailure(): void {
    const now = Date.now();
    this.failureRecords.push({ timestamp: now });

    // Clean up old failure records outside the window
    this.failureRecords = this.failureRecords.filter(
      (record) => now - record.timestamp < this.config.windowMs
    );

    // Check if we should trip the circuit
    if (this.failureRecords.length >= this.config.failureThreshold) {
      if (this.state !== CircuitState.OPEN) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  /**
   * Record a success
   */
  private onSuccess(previousState: CircuitState): void {
    // Clear failure records on success if in CLOSED state
    if (previousState === CircuitState.CLOSED) {
      this.failureRecords = [];
    }

    // In HALF_OPEN, track successes to decide if we should close
    if (previousState === CircuitState.HALF_OPEN) {
      this.successCountInHalfOpen++;
      if (this.successCountInHalfOpen >= this.config.halfOpenRequests) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(nextState: CircuitState): void {
    const previousState = this.state;
    this.state = nextState;
    this.lastStateChangeTime = Date.now();

    // Reset counters on state transition
    if (nextState === CircuitState.CLOSED) {
      this.failureRecords = [];
      this.successCountInHalfOpen = 0;
    } else if (nextState === CircuitState.HALF_OPEN) {
      this.successCountInHalfOpen = 0;
    }

    // Call state change callback
    if (this.config.onStateChange) {
      this.config.onStateChange(previousState, nextState);
    }
  }

  /**
   * Manual reset (for testing or admin operations)
   */
  reset(): void {
    this.transitionTo(CircuitState.CLOSED);
  }

  /**
   * Get circuit status for monitoring
   */
  getStatus(): {
    state: CircuitState;
    failureCount: number;
    lastStateChange: Date;
    successCountInHalfOpen: number;
  } {
    return {
      state: this.getState(),
      failureCount: this.failureRecords.length,
      lastStateChange: new Date(this.lastStateChangeTime),
      successCountInHalfOpen: this.successCountInHalfOpen,
    };
  }
}

/**
 * CircuitBreakerRegistry — Manage multiple circuit breakers
 */
export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Create or retrieve a circuit breaker
   */
  getOrCreate(name: string, config: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const fullConfig: CircuitBreakerConfig = {
        name,
        failureThreshold: config.failureThreshold ?? 5,
        windowMs: config.windowMs ?? 60000, // 60 seconds
        timeoutMs: config.timeoutMs ?? 30000, // 30 seconds
        halfOpenRequests: config.halfOpenRequests ?? 1,
        onStateChange: config.onStateChange,
      };

      this.breakers.set(name, new CircuitBreaker(fullConfig));
    }

    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breakers status
   */
  getAllStatus(): Record<string, ReturnType<CircuitBreaker['getStatus']>> {
    const status: Record<string, ReturnType<CircuitBreaker['getStatus']>> = {};
    for (const [name, breaker] of this.breakers) {
      status[name] = breaker.getStatus();
    }
    return status;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Remove all registered breakers from the registry (membership, not just
   * state). Use for shutdown/teardown and test isolation — resetAll() only
   * resets each breaker's state and leaves it registered.
   */
  clear(): void {
    this.breakers.clear();
  }

  /**
   * Reset a specific circuit breaker
   */
  reset(name: string): boolean {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.reset();
      return true;
    }
    return false;
  }
}

// Global singleton
export const circuitBreakerRegistry = new CircuitBreakerRegistry();
