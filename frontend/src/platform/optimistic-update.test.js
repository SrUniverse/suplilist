import { describe, it, expect, vi } from 'vitest';
import { performOptimisticUpdate } from './optimistic-update.js';

describe('performOptimisticUpdate', () => {
  it('should call all 4 functions in order on success', async () => {
    const order = [];
    const snapshotFn = vi.fn(() => { order.push('snapshot'); return { value: 1 }; });
    const dispatchFn = vi.fn((backup) => { order.push('dispatch'); });
    const networkFn = vi.fn(async () => { order.push('network'); return 'response'; });
    const rollbackFn = vi.fn();

    const result = await performOptimisticUpdate(snapshotFn, dispatchFn, networkFn, rollbackFn);

    expect(result).toBe('response');
    expect(order).toEqual(['snapshot', 'dispatch', 'network']);
    expect(rollbackFn).not.toHaveBeenCalled();
  });

  it('should pass snapshot backup to dispatchFn', async () => {
    const backup = { items: [1, 2] };
    const snapshotFn = vi.fn(() => backup);
    const dispatchFn = vi.fn();
    const networkFn = vi.fn().mockResolvedValue(null);
    const rollbackFn = vi.fn();

    await performOptimisticUpdate(snapshotFn, dispatchFn, networkFn, rollbackFn);

    expect(dispatchFn).toHaveBeenCalledWith(backup);
  });

  it('should call rollbackFn with backup and error on network failure', async () => {
    const backup = { snapshot: true };
    const networkError = new Error('500 Internal Server Error');
    const snapshotFn = vi.fn(() => backup);
    const dispatchFn = vi.fn();
    const networkFn = vi.fn().mockRejectedValue(networkError);
    const rollbackFn = vi.fn();

    await expect(
      performOptimisticUpdate(snapshotFn, dispatchFn, networkFn, rollbackFn)
    ).rejects.toThrow('500 Internal Server Error');

    expect(rollbackFn).toHaveBeenCalledWith(backup, networkError);
  });

  it('should rethrow after rollback', async () => {
    const err = new Error('conflict');
    await expect(
      performOptimisticUpdate(
        () => null,
        () => {},
        vi.fn().mockRejectedValue(err),
        vi.fn()
      )
    ).rejects.toBe(err);
  });

  it('should return the network result on success', async () => {
    const result = await performOptimisticUpdate(
      () => {},
      () => {},
      vi.fn().mockResolvedValue({ id: 'new-item', status: 'created' }),
      vi.fn()
    );
    expect(result).toEqual({ id: 'new-item', status: 'created' });
  });

  it('should handle 412 OCC conflict in rollbackFn', async () => {
    const conflictErr = Object.assign(new Error('Conflict'), { status: 412 });
    const rollbackFn = vi.fn((backup, err) => {
      if (err.status === 412) return 'occ-rollback';
    });

    await expect(
      performOptimisticUpdate(
        () => ({ version: 1 }),
        () => {},
        vi.fn().mockRejectedValue(conflictErr),
        rollbackFn
      )
    ).rejects.toThrow('Conflict');

    expect(rollbackFn).toHaveBeenCalledWith({ version: 1 }, conflictErr);
  });
});
