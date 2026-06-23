/**
 * CacheService Tests — Race Condition & Memory Leak Fixes
 * Tests: TOCTOU prevention, MULTI/EXEC transactions, event listener cleanup
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Redis from 'ioredis';
import { CacheService } from './cache.service.js';

// Mock Redis
vi.mock('ioredis');

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockRedis: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Redis instance
    mockRedis = {
      on: vi.fn(),
      off: vi.fn(),
      ping: vi.fn().mockResolvedValue('PONG'),
      get: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
      scan: vi.fn(),
      pipeline: vi.fn(),
      quit: vi.fn().mockResolvedValue('OK'),
    };

    // Mock the Redis constructor. Must be a regular function (not an arrow): the
    // service calls `new Redis(...)`, and an arrow function cannot be constructed
    // ("is not a constructor"). Returning an object from a constructor yields it.
    (Redis as any).mockImplementation(function (this: any) { return mockRedis; });

    // Set Redis URI to enable initialization
    process.env.REDIS_URI = 'redis://localhost:6379';

    cacheService = new CacheService();
  });

  afterEach(async () => {
    await cacheService.close();
  });

  describe('deletePattern - TOCTOU Race Condition Fix', () => {
    it('should use SCAN to collect all keys first, then MULTI/EXEC to delete atomically', async () => {
      // Mock SCAN responses
      const mockKeys = ['supplement:vitamin-d', 'supplement:whey', 'prices:list1', 'prices:list2'];

      mockRedis.scan
        .mockResolvedValueOnce(['0', mockKeys.slice(0, 2)]) // First cursor, 2 keys
        .mockResolvedValueOnce(['0', []]); // Final cursor

      // Mock pipeline for atomic deletion
      const mockPipeline = {
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([['OK'], ['OK']]),
      };

      mockRedis.pipeline.mockReturnValue(mockPipeline);

      await cacheService.deletePattern('supplement:*');

      // Verify: SCAN was used (not KEYS)
      expect(mockRedis.scan).toHaveBeenCalled();

      // Verify: Pipeline (MULTI/EXEC) was used for atomic deletion
      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should handle pagination when SCAN returns multiple cursors', async () => {
      // Simulate SCAN pagination
      mockRedis.scan
        .mockResolvedValueOnce(['1', ['supplement:vitamin-d', 'supplement:whey']]) // cursor=1
        .mockResolvedValueOnce(['2', ['supplement:zinc', 'supplement:iron']]) // cursor=2
        .mockResolvedValueOnce(['0', ['supplement:magnesium']]); // Final cursor=0

      const mockPipeline = {
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };

      mockRedis.pipeline.mockReturnValue(mockPipeline);

      await cacheService.deletePattern('supplement:*');

      // Verify: SCAN was called multiple times for pagination
      expect(mockRedis.scan).toHaveBeenCalledTimes(3);

      // Verify: All 5 keys were collected
      expect(mockPipeline.del).toHaveBeenCalledTimes(5);

      // Verify: Deletion was atomic (single exec call)
      expect(mockPipeline.exec).toHaveBeenCalledOnce();
    });

    it('should handle empty key set gracefully', async () => {
      mockRedis.scan.mockResolvedValueOnce(['0', []]); // No keys match

      const mockPipeline = {
        del: vi.fn(),
        exec: vi.fn(),
      };

      mockRedis.pipeline.mockReturnValue(mockPipeline);

      await cacheService.deletePattern('nonexistent:*');

      // Should not create pipeline if no keys found
      expect(mockRedis.pipeline).not.toHaveBeenCalled();
    });

    it('should handle SCAN cursor pagination with large key sets', async () => {
      // Simulate many keys across multiple SCAN iterations
      const batch1 = Array.from({ length: 100 }, (_, i) => `key:${i}`);
      const batch2 = Array.from({ length: 50 }, (_, i) => `key:${100 + i}`);

      mockRedis.scan
        .mockResolvedValueOnce(['cursor1', batch1])
        .mockResolvedValueOnce(['0', batch2]);

      const mockPipeline = {
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(Array(150).fill(['OK'])),
      };

      mockRedis.pipeline.mockReturnValue(mockPipeline);

      await cacheService.deletePattern('key:*');

      // Verify: All 150 keys were queued for deletion
      expect(mockPipeline.del).toHaveBeenCalledTimes(150);

      // Verify: Single atomic exec
      expect(mockPipeline.exec).toHaveBeenCalledOnce();
    });

    it('should prevent race condition where new keys added during SCAN', async () => {
      // SCAN returns first batch, then second batch
      // Even if new keys were added between SCAN calls, only pre-scanned keys are deleted
      mockRedis.scan
        .mockResolvedValueOnce(['1', ['key:1', 'key:2']])
        .mockResolvedValueOnce(['0', ['key:3', 'key:4']]); // key:5 could be added here by concurrent write

      const mockPipeline = {
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([['OK'], ['OK'], ['OK'], ['OK']]),
      };

      mockRedis.pipeline.mockReturnValue(mockPipeline);

      await cacheService.deletePattern('key:*');

      // Verify: Exactly 4 keys are deleted (only those found in SCAN)
      expect(mockPipeline.del).toHaveBeenCalledTimes(4);

      // Verify: Atomic transaction used (MULTI/EXEC)
      expect(mockPipeline.exec).toHaveBeenCalledOnce();
    });
  });

  describe('Event Listener Cleanup - Memory Leak Fix', () => {
    it('should register event listeners on initialization', async () => {
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should remove all event listeners on close()', async () => {
      // Initialize should register listeners
      const numListeners = mockRedis.on.mock.calls.length;
      expect(numListeners).toBeGreaterThan(0);

      // Close should remove them
      await cacheService.close();

      // Verify: off() was called for each listener
      expect(mockRedis.off).toHaveBeenCalledTimes(numListeners);
    });

    it('should call quit() to close Redis connection', async () => {
      await cacheService.close();

      expect(mockRedis.quit).toHaveBeenCalledOnce();
    });

    it('should handle errors during close gracefully', async () => {
      const closeError = new Error('Redis connection already closed');
      mockRedis.quit.mockRejectedValue(closeError);

      // Should not throw
      await expect(cacheService.close()).resolves.toBeUndefined();

      // Should still attempt to remove listeners
      expect(mockRedis.off).toHaveBeenCalled();
    });

    it('should prevent memory leaks with repeated close calls', async () => {
      const initialOffCalls = mockRedis.off.mock.calls.length;

      await cacheService.close();
      const afterFirstClose = mockRedis.off.mock.calls.length;

      // Second close should not add more listener removals
      await cacheService.close();
      const afterSecondClose = mockRedis.off.mock.calls.length;

      // Listeners should only be removed once
      expect(afterSecondClose - initialOffCalls).toBe(afterFirstClose - initialOffCalls);
    });
  });

  describe('Cache Operations - Basic Functionality', () => {
    it('should get value from cache', async () => {
      const cacheValue = { id: '1', name: 'Test Supplement' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cacheValue));

      const result = await cacheService.get('supplement:1');

      expect(result).toEqual(cacheValue);
      expect(mockRedis.get).toHaveBeenCalledWith('supplement:1');
    });

    it('should set value in cache with TTL', async () => {
      const cacheValue = { id: '1', name: 'Test Supplement' };

      await cacheService.set('supplement:1', cacheValue, 3600);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'supplement:1',
        3600,
        JSON.stringify(cacheValue)
      );
    });

    it('should delete key from cache', async () => {
      await cacheService.delete('supplement:1');

      expect(mockRedis.del).toHaveBeenCalledWith('supplement:1');
    });

    it('should return null when cache is disabled', async () => {
      // Override enabled flag
      (cacheService as any).enabled = false;
      (cacheService as any).redis = null;

      const result = await cacheService.get('supplement:1');

      expect(result).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle SCAN errors gracefully', async () => {
      mockRedis.scan.mockRejectedValue(new Error('Redis connection lost'));

      // Should not throw
      await expect(cacheService.deletePattern('supplement:*')).resolves.toBeUndefined();
    });

    it('should handle pipeline exec errors gracefully', async () => {
      mockRedis.scan
        .mockResolvedValueOnce(['0', ['key:1', 'key:2']]);

      const mockPipeline = {
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockRejectedValue(new Error('Pipeline failed')),
      };

      mockRedis.pipeline.mockReturnValue(mockPipeline);

      // Should not throw
      await expect(cacheService.deletePattern('key:*')).resolves.toBeUndefined();
    });

    it('should handle get errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis read failed'));

      const result = await cacheService.get('supplement:1');

      expect(result).toBeNull();
    });

    it('should handle set errors gracefully', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis write failed'));

      // Should not throw
      await expect(cacheService.set('supplement:1', { test: true }, 3600)).resolves.toBeUndefined();
    });
  });
});
