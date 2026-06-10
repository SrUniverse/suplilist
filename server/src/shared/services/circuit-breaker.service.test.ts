import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker, CircuitState, circuitBreakerRegistry } from './circuit-breaker.service.js';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;
  const config = {
    name: 'test-breaker',
    failureThreshold: 3,
    windowMs: 1000,
    timeoutMs: 100,
    halfOpenRequests: 1,
  };

  beforeEach(() => {
    breaker = new CircuitBreaker(config);
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should allow requests in CLOSED state', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await breaker.execute(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledOnce();
    });
  });

  describe('CLOSED to OPEN transition', () => {
    it('should transition to OPEN after failure threshold reached', async () => {
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));
      const config = {
        name: 'test-breaker',
        failureThreshold: 3,
        windowMs: 60000,
        timeoutMs: 100,
        halfOpenRequests: 1,
      };
      const breaker = new CircuitBreaker(config);

      // Fail 3 times to trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(failFn);
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should fail fast when OPEN', async () => {
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));
      const config = {
        name: 'test-breaker',
        failureThreshold: 2,
        windowMs: 60000,
        timeoutMs: 100,
        halfOpenRequests: 1,
      };
      const breaker = new CircuitBreaker(config);

      // Trip the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(failFn);
        } catch {
          // Expected
        }
      }

      // Circuit is now OPEN, should fail immediately without calling fn
      const fn = vi.fn();
      try {
        await breaker.execute(fn);
      } catch (error) {
        expect((error as Error).message).toContain('Circuit is OPEN');
      }

      // fn should not have been called (fast fail)
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('fallback mechanism', () => {
    it('should use fallback when circuit is OPEN', async () => {
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));
      const fallback = vi.fn().mockResolvedValue('fallback_result');
      const config = {
        name: 'test-breaker',
        failureThreshold: 2,
        windowMs: 60000,
        timeoutMs: 100,
        halfOpenRequests: 1,
      };
      const breaker = new CircuitBreaker(config);

      // Trip the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(failFn);
        } catch {
          // Expected
        }
      }

      // Should use fallback instead of throwing
      const result = await breaker.execute(failFn, fallback);
      expect(result).toBe('fallback_result');
      expect(fallback).toHaveBeenCalledOnce();
    });
  });

  describe('OPEN to HALF_OPEN transition', () => {
    it('should transition to HALF_OPEN after timeout', async () => {
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));
      const config = {
        name: 'test-breaker',
        failureThreshold: 2,
        windowMs: 60000,
        timeoutMs: 50, // Short timeout for testing
        halfOpenRequests: 1,
      };
      const breaker = new CircuitBreaker(config);

      // Trip the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(failFn);
        } catch {
          // Expected
        }
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Should transition to HALF_OPEN on next check
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
    });
  });

  describe('HALF_OPEN to CLOSED transition', () => {
    it('should transition to CLOSED after successful request in HALF_OPEN', async () => {
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));
      const successFn = vi.fn().mockResolvedValue('success');
      const config = {
        name: 'test-breaker',
        failureThreshold: 2,
        windowMs: 60000,
        timeoutMs: 50,
        halfOpenRequests: 1,
      };
      const breaker = new CircuitBreaker(config);

      // Trip the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(failFn);
        } catch {
          // Expected
        }
      }

      // Wait for timeout to enter HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      // Successful request should close the circuit
      const result = await breaker.execute(successFn);
      expect(result).toBe('success');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should reopen circuit on failure in HALF_OPEN', async () => {
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));
      const config = {
        name: 'test-breaker',
        failureThreshold: 2,
        windowMs: 60000,
        timeoutMs: 50,
        halfOpenRequests: 1,
      };
      const breaker = new CircuitBreaker(config);

      // Trip the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(failFn);
        } catch {
          // Expected
        }
      }

      // Wait for timeout to enter HALF_OPEN
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      // Failure in HALF_OPEN should reopen
      try {
        await breaker.execute(failFn);
      } catch {
        // Expected
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('synchronous execute', () => {
    it('should work with synchronous functions', () => {
      const fn = vi.fn().mockReturnValue('sync_result');
      const result = breaker.executeSync(fn);
      expect(result).toBe('sync_result');
    });

    it('should fail fast when circuit is OPEN (sync)', () => {
      const failFn = () => {
        throw new Error('fail');
      };
      const config = {
        name: 'test-breaker',
        failureThreshold: 2,
        windowMs: 60000,
        timeoutMs: 100,
        halfOpenRequests: 1,
      };
      const breaker = new CircuitBreaker(config);

      // Trip the circuit
      for (let i = 0; i < 2; i++) {
        try {
          breaker.executeSync(failFn);
        } catch {
          // Expected
        }
      }

      expect(() => breaker.executeSync(failFn)).toThrow('Circuit is OPEN');
    });
  });

  describe('status monitoring', () => {
    it('should report correct status', async () => {
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));
      const config = {
        name: 'test-breaker',
        failureThreshold: 3,
        windowMs: 60000,
        timeoutMs: 100,
        halfOpenRequests: 1,
      };
      const breaker = new CircuitBreaker(config);

      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(failFn);
        } catch {
          // Expected
        }
      }

      const status = breaker.getStatus();
      expect(status.state).toBe(CircuitState.OPEN);
      expect(status.failureCount).toBe(3);
      expect(status.successCountInHalfOpen).toBe(0);
    });
  });

  describe('state change callback', () => {
    it('should call onStateChange callback on transitions', async () => {
      const onStateChange = vi.fn();
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));
      const config = {
        name: 'test-breaker',
        failureThreshold: 2,
        windowMs: 60000,
        timeoutMs: 50,
        halfOpenRequests: 1,
        onStateChange,
      };
      const breaker = new CircuitBreaker(config);

      // Trip the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(failFn);
        } catch {
          // Expected
        }
      }

      expect(onStateChange).toHaveBeenCalledWith(CircuitState.CLOSED, CircuitState.OPEN);
    });
  });

  describe('reset', () => {
    it('should reset to CLOSED state', async () => {
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));
      const config = {
        name: 'test-breaker',
        failureThreshold: 2,
        windowMs: 60000,
        timeoutMs: 100,
        halfOpenRequests: 1,
      };
      const breaker = new CircuitBreaker(config);

      // Trip the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(failFn);
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Reset
      breaker.reset();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('CircuitBreakerRegistry', () => {
    beforeEach(() => {
      circuitBreakerRegistry.resetAll();
    });

    it('should create and retrieve circuit breakers', () => {
      const breaker = circuitBreakerRegistry.getOrCreate('firecrawl', {
        failureThreshold: 5,
      });

      expect(breaker).toBeDefined();

      // Same instance on retrieval
      const sameBr = circuitBreakerRegistry.getOrCreate('firecrawl', {});
      expect(sameBr).toBe(breaker);
    });

    it('should get all status', async () => {
      circuitBreakerRegistry.getOrCreate('service1', { failureThreshold: 2 });
      circuitBreakerRegistry.getOrCreate('service2', { failureThreshold: 2 });

      const allStatus = circuitBreakerRegistry.getAllStatus();
      expect(Object.keys(allStatus).length).toBe(2);
      expect(allStatus.service1.state).toBe(CircuitState.CLOSED);
      expect(allStatus.service2.state).toBe(CircuitState.CLOSED);
    });

    it('should reset all circuit breakers', async () => {
      const breaker1 = circuitBreakerRegistry.getOrCreate('service1', {
        failureThreshold: 1,
        windowMs: 60000,
      });
      const breaker2 = circuitBreakerRegistry.getOrCreate('service2', {
        failureThreshold: 1,
        windowMs: 60000,
      });

      // Trip both circuits
      try {
        await breaker1.execute(() => Promise.reject(new Error('fail')));
      } catch {
        // Expected
      }

      try {
        await breaker2.execute(() => Promise.reject(new Error('fail')));
      } catch {
        // Expected
      }

      expect(breaker1.getState()).toBe(CircuitState.OPEN);
      expect(breaker2.getState()).toBe(CircuitState.OPEN);

      // Reset all
      circuitBreakerRegistry.resetAll();
      expect(breaker1.getState()).toBe(CircuitState.CLOSED);
      expect(breaker2.getState()).toBe(CircuitState.CLOSED);
    });

    it('should reset specific circuit breaker', async () => {
      const breaker = circuitBreakerRegistry.getOrCreate('service1', {
        failureThreshold: 1,
        windowMs: 60000,
      });

      try {
        await breaker.execute(() => Promise.reject(new Error('fail')));
      } catch {
        // Expected
      }

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      const reset = circuitBreakerRegistry.reset('service1');
      expect(reset).toBe(true);
      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      const notFound = circuitBreakerRegistry.reset('nonexistent');
      expect(notFound).toBe(false);
    });
  });
});
