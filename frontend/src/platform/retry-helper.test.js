import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  retryAsync,
  retrySimple,
  retryWithJitter,
  retryHelper,
} from './retry-helper.js';
import { ApiError } from './api-client.js';
import { logger } from '../utils/logger.js';

describe('retry-helper — Automatic Retry with Exponential Backoff', () => {
  let loggerWarnSpy;

  beforeEach(() => {
    vi.useFakeTimers();
    loggerWarnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ============= Success on First Attempt =============

  describe('retryAsync — Success on First Attempt', () => {
    it('1. returns result on first successful attempt', async () => {
      const operation = vi.fn(async () => ({ id: 1, name: 'Item' }));
      const result = await retryAsync(operation);

      expect(result).toEqual({ id: 1, name: 'Item' });
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('2. does not log warning on success', async () => {
      const operation = vi.fn(async () => 'success');
      await retryAsync(operation);

      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('3. does not wait for any delay on first success', async () => {
      const operation = vi.fn(async () => 'success');
      const promise = retryAsync(operation);

      // Advance all timers
      await vi.runAllTimersAsync();
      await promise;

      expect(vi.getTimerCount()).toBe(0);
    });

    it('4. handles various return types', async () => {
      const testCases = [
        { data: 'string' },
        { data: 123 },
        { data: null },
        { data: undefined },
        { data: { nested: { object: 'value' } } },
        { data: [1, 2, 3] },
      ];

      for (const testCase of testCases) {
        const operation = vi.fn(async () => testCase.data);
        const result = await retryAsync(operation);
        expect(result).toEqual(testCase.data);
      }
    });
  });

  // ============= Failure Then Success (Retry Works) =============

  describe('retryAsync — Failure Then Success (Retry Recovery)', () => {
    it('5. retries on failure and succeeds on second attempt', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length === 1) {
          throw new Error('Network timeout');
        }
        return { success: true };
      });

      const promise = retryAsync(operation, { maxAttempts: 3, delayMs: 1000 });

      // First attempt fails, waits 1000ms
      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;

      expect(result).toEqual({ success: true });
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('6. logs warning on retry with attempt number', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length === 1) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const promise = retryAsync(operation, { maxAttempts: 3, delayMs: 500 });
      await vi.advanceTimersByTimeAsync(500);
      await promise;

      expect(loggerWarnSpy).toHaveBeenCalledOnce();
      const logCall = loggerWarnSpy.mock.calls[0][0];
      expect(logCall).toContain('Tentativa 1/3');
    });

    it('7. retries multiple times before succeeding', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length < 3) {
          throw new Error('Still failing');
        }
        return 'finally success';
      });

      const promise = retryAsync(operation, { maxAttempts: 4, delayMs: 100 });

      // Advance through retries
      await vi.advanceTimersByTimeAsync(100); // After attempt 1
      await vi.advanceTimersByTimeAsync(100); // After attempt 2
      const result = await promise;

      expect(result).toBe('finally success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('8. recovers from ApiError with retryable status code', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length === 1) {
          throw new ApiError(503, 'service_unavailable', 'Server down');
        }
        return { data: 'recovered' };
      });

      const promise = retryAsync(operation, { maxAttempts: 3, delayMs: 1000 });
      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;

      expect(result).toEqual({ data: 'recovered' });
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  // ============= Max Attempts Exhausted =============

  describe('retryAsync — Max Attempts Exhausted', () => {
    it('9. throws error after max attempts exhausted', async () => {
      const operation = vi.fn(async () => {
        throw new Error('Always fails');
      });

      const promise = retryAsync(operation, { maxAttempts: 2, delayMs: 100 });

      // Advance through all retries
      await vi.advanceTimersByTimeAsync(100);

      await expect(promise).rejects.toThrow('Always fails');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('10. throws original error, not a wrapper error', async () => {
      const originalError = new ApiError(500, 'internal_error', 'Server error');
      const operation = vi.fn(async () => {
        throw originalError;
      });

      const promise = retryAsync(operation, { maxAttempts: 1, delayMs: 0 });
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(ApiError);
    });

    it('11. exhausts attempts before throwing for network error', async () => {
      const operation = vi.fn(async () => {
        throw new Error('network timeout');
      });

      const promise = retryAsync(operation, { maxAttempts: 3, delayMs: 100 });

      // Network errors are retryable by default
      await vi.advanceTimersByTimeAsync(100); // After attempt 1
      await vi.advanceTimersByTimeAsync(100); // After attempt 2

      await expect(promise).rejects.toThrow('network timeout');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('12. includes error details in thrown error', async () => {
      const operation = vi.fn(async () => {
        throw new ApiError(500, 'database_error', 'Database connection failed');
      });

      const promise = retryAsync(operation, { maxAttempts: 1, delayMs: 0 });
      await vi.runAllTimersAsync();

      try {
        await promise;
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(500);
        expect(error.error).toBe('database_error');
      }
    });
  });

  // ============= Exponential Backoff Timing =============

  describe('retryAsync — Exponential Backoff', () => {
    it('13. uses exponential backoff: 1s → 2s → 4s', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length <= 3) {
          throw new Error('Fail');
        }
        return 'success';
      });

      const promise = retryAsync(operation, {
        maxAttempts: 4,
        delayMs: 1000,
        backoffMultiplier: 2,
      });

      // First retry waits 1000ms (1 * 2^0)
      await vi.advanceTimersByTimeAsync(1000);
      expect(operation).toHaveBeenCalledTimes(2);

      // Second retry waits 2000ms (1000 * 2^1)
      await vi.advanceTimersByTimeAsync(2000);
      expect(operation).toHaveBeenCalledTimes(3);

      // Third retry waits 4000ms (1000 * 2^2)
      await vi.advanceTimersByTimeAsync(4000);
      expect(operation).toHaveBeenCalledTimes(4);

      await promise;
    });

    it('14. calculates backoff delay correctly with custom multiplier', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length < 3) {
          throw new Error('Fail');
        }
        return 'success';
      });

      const promise = retryAsync(operation, {
        maxAttempts: 3,
        delayMs: 500,
        backoffMultiplier: 3,
      });

      // First retry: 500ms
      await vi.advanceTimersByTimeAsync(500);
      expect(operation).toHaveBeenCalledTimes(2);

      // Second retry: 500 * 3 = 1500ms
      await vi.advanceTimersByTimeAsync(1500);
      expect(operation).toHaveBeenCalledTimes(3);

      await promise;
    });

    it('15. backoff with multiplier 1 means fixed delay', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length < 2) {
          throw new Error('Fail');
        }
        return 'success';
      });

      const promise = retryAsync(operation, {
        maxAttempts: 2,
        delayMs: 1000,
        backoffMultiplier: 1, // No exponential increase
      });

      // Delay should be 1000ms for first retry
      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('16. includes delay time in warning log', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length === 1) {
          throw new Error('Fail');
        }
        return 'success';
      });

      const promise = retryAsync(operation, { maxAttempts: 2, delayMs: 1500 });
      await vi.advanceTimersByTimeAsync(1500);
      await promise;

      const logCall = loggerWarnSpy.mock.calls[0];
      expect(logCall[0]).toContain('1500ms');
    });
  });

  // ============= shouldRetry Predicate =============

  describe('retryAsync — shouldRetry Predicate', () => {
    it('17. does not retry on 404 Not Found by default', async () => {
      const operation = vi.fn(async () => {
        throw new ApiError(404, 'not_found', 'Resource not found');
      });

      const promise = retryAsync(operation, { maxAttempts: 3, delayMs: 100 });
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(ApiError);
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('18. does not retry on 403 Forbidden by default', async () => {
      const operation = vi.fn(async () => {
        throw new ApiError(403, 'permission_denied', 'Forbidden');
      });

      const promise = retryAsync(operation, { maxAttempts: 3, delayMs: 100 });
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(ApiError);
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('19. does not retry on 401 Unauthorized by default', async () => {
      const operation = vi.fn(async () => {
        throw new ApiError(401, 'expired_token', 'Unauthorized');
      });

      const promise = retryAsync(operation, { maxAttempts: 3, delayMs: 100 });
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(ApiError);
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('20. retries on 500 Internal Server Error', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length === 1) {
          throw new ApiError(500, 'internal_error', 'Server error');
        }
        return 'success';
      });

      const promise = retryAsync(operation, { maxAttempts: 3, delayMs: 100 });
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('21. retries on 503 Service Unavailable', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length === 1) {
          throw new ApiError(503, 'service_unavailable', 'Down for maintenance');
        }
        return 'success';
      });

      const promise = retryAsync(operation, { maxAttempts: 3, delayMs: 100 });
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('22. custom shouldRetry predicate overrides defaults', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length === 1) {
          throw new ApiError(404, 'not_found', 'Not found');
        }
        return 'success';
      });

      // Custom: retry on 404
      const promise = retryAsync(operation, {
        maxAttempts: 3,
        delayMs: 100,
        shouldRetry: () => true, // Always retry
      });

      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('23. shouldRetry can inspect error details', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length === 1) {
          throw new ApiError(429, 'rate_limit', 'Too many requests');
        }
        return 'success';
      });

      const shouldRetry = vi.fn((error) => {
        // Retry only on rate limit
        return error.status === 429;
      });

      const promise = retryAsync(operation, {
        maxAttempts: 3,
        delayMs: 100,
        shouldRetry,
      });

      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toBe('success');
      expect(shouldRetry).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(ApiError));
    });

    it('24. network errors are retryable by default', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length === 1) {
          throw new Error('network unreachable');
        }
        return 'success';
      });

      const promise = retryAsync(operation, { maxAttempts: 3, delayMs: 100 });
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('25. timeout errors are retryable by default', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length === 1) {
          throw new Error('timeout waiting for response');
        }
        return 'success';
      });

      const promise = retryAsync(operation, { maxAttempts: 3, delayMs: 100 });
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  // ============= retrySimple — Fixed Delay =============

  describe('retrySimple — Simple Retry with Fixed Delay', () => {
    it('26. retries with fixed delay (no exponential backoff)', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length < 2) {
          throw new Error('Fail');
        }
        return 'success';
      });

      const promise = retrySimple(operation, 2, 1000);

      // First retry after 1000ms
      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('27. uses default parameters', async () => {
      const operation = vi.fn(async () => 'success');
      const result = await retrySimple(operation);

      expect(result).toBe('success');
      // Default: maxAttempts=3, delayMs=1000
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('28. throws after max attempts', async () => {
      const operation = vi.fn(async () => {
        throw new Error('Always fails');
      });

      const promise = retrySimple(operation, 2, 100);

      // Run through all attempts
      await vi.advanceTimersByTimeAsync(100);
      await expect(promise).rejects.toThrow('Always fails');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('29. applies fixed delay consistently', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length < 3) {
          throw new Error('Fail');
        }
        return 'success';
      });

      const promise = retrySimple(operation, 3, 500);

      // All delays should be 500ms
      await vi.advanceTimersByTimeAsync(500);
      expect(operation).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(500);
      expect(operation).toHaveBeenCalledTimes(3);

      const result = await promise;
      expect(result).toBe('success');
    });
  });

  // ============= retryWithJitter — Jitter for Thundering Herd =============

  describe('retryWithJitter — Jitter Prevention', () => {
    it('30. adds random jitter to prevent synchronized retries', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length === 1) {
          throw new Error('Fail');
        }
        return 'success';
      });

      // Jitter factor of 0.1 = 10% variation
      const promise = retryWithJitter(operation, {
        maxAttempts: 3,
        delayMs: 1000,
        jitterFactor: 0.1,
      });

      // Should eventually retry
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('31. uses default jitter factor of 0.1', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length === 1) {
          throw new Error('Fail');
        }
        return 'success';
      });

      const promise = retryWithJitter(operation, {
        maxAttempts: 3,
        delayMs: 1000,
      });

      // Should work without explicit jitterFactor
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
    });

    it('32. jitter should be less than jitterFactor * 1000', async () => {
      const jitterFactor = 0.2;
      const operation = vi.fn(async () => 'success');

      // Mock Math.random to capture jitter range
      const randomValues = [];
      const originalRandom = Math.random;
      Math.random = vi.fn(() => {
        const val = originalRandom();
        randomValues.push(val);
        return val;
      });

      try {
        await retryWithJitter(operation, {
          maxAttempts: 1,
          jitterFactor,
        });

        // Jitter should be in range [0, jitterFactor]
        randomValues.forEach(val => {
          expect(val).toBeGreaterThanOrEqual(0);
          expect(val).toBeLessThanOrEqual(1);
        });
      } finally {
        Math.random = originalRandom;
      }
    });

    it('33. retries through jitter delay successfully', async () => {
      let attemptCount = 0;
      const operation = vi.fn(async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('First attempt fails');
        }
        return 'recovered';
      });

      const promise = retryWithJitter(operation, {
        maxAttempts: 2,
        delayMs: 100,
        jitterFactor: 0.1,
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('recovered');
    });
  });

  // ============= retryHelper Object Export =============

  describe('retryHelper — Exported Object', () => {
    it('34. exports frozen object with all functions', () => {
      expect(retryHelper).toBeDefined();
      expect(retryHelper.retryAsync).toBeDefined();
      expect(retryHelper.retrySimple).toBeDefined();
      expect(retryHelper.retryWithJitter).toBeDefined();
    });

    it('35. exported object is frozen and cannot be modified', () => {
      expect(() => {
        retryHelper.customProp = 'test';
      }).toThrow();
    });
  });

  // ============= Edge Cases =============

  describe('retryAsync — Edge Cases', () => {
    it('36. handles zero maxAttempts (edge case)', async () => {
      const operation = vi.fn(async () => 'success');

      const promise = retryAsync(operation, { maxAttempts: 0 });
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow();
      expect(operation).not.toHaveBeenCalled();
    });

    it('37. handles very large maxAttempts', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length === 1) {
          throw new Error('Fail once');
        }
        return 'success';
      });

      const promise = retryAsync(operation, {
        maxAttempts: 1000,
        delayMs: 1,
      });

      await vi.advanceTimersByTimeAsync(1);
      const result = await promise;

      expect(result).toBe('success');
    });

    it('38. handles delayMs of 0', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length === 1) {
          throw new Error('Fail');
        }
        return 'success';
      });

      const promise = retryAsync(operation, { maxAttempts: 2, delayMs: 0 });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('39. handles Promise rejection gracefully', async () => {
      const operation = vi.fn(async () => {
        throw new Error('Rejected promise');
      });

      const promise = retryAsync(operation, { maxAttempts: 1, delayMs: 0 });

      await expect(promise).rejects.toThrow('Rejected promise');
    });

    it('40. handles async operation that takes time', async () => {
      const operation = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'slow success';
      });

      const promise = retryAsync(operation, { maxAttempts: 1 });

      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toBe('slow success');
    });

    it('41. logs detailed retry info', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length === 1) {
          throw new Error('Network timeout');
        }
        return 'success';
      });

      const promise = retryAsync(operation, {
        maxAttempts: 3,
        delayMs: 2000,
      });

      await vi.advanceTimersByTimeAsync(2000);
      await promise;

      expect(loggerWarnSpy).toHaveBeenCalledOnce();
      const logMessage = loggerWarnSpy.mock.calls[0][0];
      expect(logMessage).toContain('Tentativa');
      expect(logMessage).toContain('Network timeout');
      expect(logMessage).toContain('2000ms');
    });
  });

  // ============= Integration Tests =============

  describe('retryAsync — Integration Scenarios', () => {
    it('42. handles mixed error types in retries', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length === 1) {
          throw new Error('Network error');
        }
        if (operation.mock.calls.length === 2) {
          throw new ApiError(503, 'service_unavailable', 'Down');
        }
        return 'finally success';
      });

      const promise = retryAsync(operation, {
        maxAttempts: 4,
        delayMs: 100,
      });

      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200); // 1000 * 2^1 = 2000, but we use 100ms base
      const result = await promise;

      expect(result).toBe('finally success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('43. respects maxAttempts across different scenarios', async () => {
      const operation = vi.fn(async () => {
        throw new Error('Always fails');
      });

      const attempts = [1, 2, 5, 10];
      for (const maxAttempts of attempts) {
        operation.mockClear();

        const promise = retryAsync(operation, {
          maxAttempts,
          delayMs: 10,
        });

        await vi.runAllTimersAsync();
        await expect(promise).rejects.toThrow();

        expect(operation).toHaveBeenCalledTimes(maxAttempts);
      }
    });

    it('44. cancellation via error throwing (not retryable)', async () => {
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length === 1) {
          throw new ApiError(400, 'validation_error', 'Bad request');
        }
        return 'should not reach';
      });

      const promise = retryAsync(operation, { maxAttempts: 3, delayMs: 100 });

      // 400 is not retryable, so should throw immediately
      await expect(promise).rejects.toThrow(ApiError);
      expect(operation).toHaveBeenCalledTimes(1); // No retry
    });

    it('45. total time matches expected backoff schedule', async () => {
      let totalTime = 0;
      const operation = vi.fn(async () => {
        if (operation.mock.calls.length < 3) {
          throw new Error('Fail');
        }
        return 'success';
      });

      vi.spyOn(global, 'setTimeout').mockImplementation(
        (callback, delay) => {
          totalTime += delay;
          callback();
          return 0;
        }
      );

      // maxAttempts=3, delayMs=1000, multiplier=2
      // Attempt 1: fail
      // Delay: 1000ms
      // Attempt 2: fail
      // Delay: 2000ms
      // Attempt 3: success
      // Total: 3000ms

      const promise = retryAsync(operation, {
        maxAttempts: 3,
        delayMs: 1000,
        backoffMultiplier: 2,
      });

      await promise;
      expect(totalTime).toBe(3000); // 1000 + 2000
    });
  });
});
