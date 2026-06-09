import { describe, it, expect, vi } from 'vitest';

vi.mock('../utils/logger.js', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

import { retryAsync, retrySimple, retryWithJitter } from './retry-helper.js';

describe('retryAsync', () => {
  it('should return result on first success', async () => {
    const op = vi.fn().mockResolvedValue('ok');
    const result = await retryAsync(op, { maxAttempts: 3, delayMs: 0 });
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('should retry and succeed on second attempt', async () => {
    const op = vi.fn()
      .mockRejectedValueOnce(new Error('temp'))
      .mockResolvedValueOnce('ok');
    const result = await retryAsync(op, { maxAttempts: 3, delayMs: 0, backoffMultiplier: 1 });
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('should throw after all attempts exhausted', async () => {
    const op = vi.fn().mockRejectedValue(new Error('always fails'));
    await expect(retryAsync(op, { maxAttempts: 3, delayMs: 0, backoffMultiplier: 1 })).rejects.toThrow('always fails');
    expect(op).toHaveBeenCalledTimes(3);
  });

  it('should not retry on 4xx client errors', async () => {
    const err = Object.assign(new Error('Not Found'), { status: 404 });
    const op = vi.fn().mockRejectedValue(err);
    await expect(retryAsync(op, { maxAttempts: 3, delayMs: 0 })).rejects.toThrow('Not Found');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('should retry on 5xx server errors', async () => {
    const err = Object.assign(new Error('Server Error'), { status: 500 });
    const op = vi.fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce('recovered');
    const result = await retryAsync(op, { maxAttempts: 3, delayMs: 0, backoffMultiplier: 1 });
    expect(result).toBe('recovered');
  });

  it('should respect custom shouldRetry returning false', async () => {
    const op = vi.fn().mockRejectedValue(new Error('custom'));
    await expect(retryAsync(op, {
      maxAttempts: 3,
      delayMs: 0,
      shouldRetry: () => false
    })).rejects.toThrow('custom');
    expect(op).toHaveBeenCalledTimes(1);
  });
});

describe('retrySimple', () => {
  it('should succeed on first try', async () => {
    const op = vi.fn().mockResolvedValue('result');
    expect(await retrySimple(op, 3, 0)).toBe('result');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('should retry up to maxAttempts and throw', async () => {
    const op = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(retrySimple(op, 3, 0)).rejects.toThrow('fail');
    expect(op).toHaveBeenCalledTimes(3);
  });

  it('should succeed on second attempt', async () => {
    const op = vi.fn()
      .mockRejectedValueOnce(new Error('err'))
      .mockResolvedValueOnce('ok');
    expect(await retrySimple(op, 3, 0)).toBe('ok');
    expect(op).toHaveBeenCalledTimes(2);
  });
});

describe('retryWithJitter', () => {
  it('should succeed and return result', async () => {
    const op = vi.fn().mockResolvedValue('jitter-ok');
    expect(await retryWithJitter(op, { maxAttempts: 2, delayMs: 0 })).toBe('jitter-ok');
  });

  it('should retry and succeed', async () => {
    const op = vi.fn()
      .mockRejectedValueOnce(new Error('jitter-err'))
      .mockResolvedValueOnce('jitter-ok');
    expect(await retryWithJitter(op, { maxAttempts: 3, delayMs: 0 })).toBe('jitter-ok');
  });
});
