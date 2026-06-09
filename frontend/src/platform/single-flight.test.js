import { describe, it, expect, vi } from 'vitest';
import { createSingleFlight } from './single-flight.js';

describe('createSingleFlight', () => {
  it('should call the function and return its result', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const deduplicated = createSingleFlight(fn);
    const result = await deduplicated();
    expect(result).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should deduplicate concurrent calls', async () => {
    let resolveInner;
    const fn = vi.fn(() => new Promise(res => { resolveInner = res; }));
    const deduplicated = createSingleFlight(fn);

    const p1 = deduplicated();
    const p2 = deduplicated();

    expect(fn).toHaveBeenCalledTimes(1);
    resolveInner('shared');
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe('shared');
    expect(r2).toBe('shared');
  });

  it('should allow a new call after the previous one settles', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const deduplicated = createSingleFlight(fn);

    await deduplicated();
    await deduplicated();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should clear the in-flight slot even on rejection', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success');
    const deduplicated = createSingleFlight(fn);

    await expect(deduplicated()).rejects.toThrow('fail');
    const result = await deduplicated();
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should share promise across concurrent calls that fail', async () => {
    let rejectInner;
    const fn = vi.fn(() => new Promise((_, rej) => { rejectInner = rej; }));
    const deduplicated = createSingleFlight(fn);

    const p1 = deduplicated();
    const p2 = deduplicated();

    expect(fn).toHaveBeenCalledTimes(1);
    rejectInner(new Error('network error'));

    await expect(p1).rejects.toThrow('network error');
    await expect(p2).rejects.toThrow('network error');
  });
});
