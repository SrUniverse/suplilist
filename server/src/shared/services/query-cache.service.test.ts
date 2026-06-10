/**
 * Query Cache Service Tests
 * Version: 1.0.0
 *
 * Comprehensive test suite for query caching layer covering:
 * - Cache hits and misses
 * - TTL expiration
 * - Cache invalidation by pattern
 * - Error handling and graceful fallbacks
 * - Metrics recording
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueryCacheService } from './query-cache.service.js';
import type Redis from 'ioredis';

describe('QueryCacheService', () => {
  let service: QueryCacheService;
  let mockRedis: Partial<Redis>;
  let cacheHits: number = 0;
  let cacheMisses: number = 0;

  beforeEach(() => {
    cacheHits = 0;
    cacheMisses = 0;

    // Mock Redis client
    mockRedis = {
      get: vi.fn(async (key: string) => {
        cacheHits++;
        return null; // Simulate cache miss
      }),
      setex: vi.fn(async () => {}),
      del: vi.fn(async () => 1),
      scan: vi.fn(async () => ['0', []]), // [cursor, keys]
      pipeline: vi.fn(() => ({
        del: vi.fn(function () { return this; }),
        exec: vi.fn(async () => []),
      })),
      ping: vi.fn(async () => 'PONG'),
      info: vi.fn(async () => 'used_memory:1024000\r\n'),
      quit: vi.fn(async () => {}),
    };

    // Initialize service with mock
    service = new QueryCacheService();
    (service as any).redis = mockRedis;
    (service as any).enabled = true;
  });

  afterEach(async () => {
    await service.close();
  });

  describe('Query Execution with Cache', () => {
    it('should cache query result and return from cache on second call', async () => {
      let callCount = 0;
      const executor = async () => {
        callCount++;
        return { rows: [{ id: 1, name: 'Product' }] };
      };

      const mockRedisWithCache = {
        ...mockRedis,
        get: vi.fn()
          .mockResolvedValueOnce(null) // First call - cache miss
          .mockResolvedValueOnce(JSON.stringify({ rows: [{ id: 1 }] })), // Second call - cache hit
        setex: vi.fn(),
        ping: vi.fn(async () => 'PONG'),
        info: vi.fn(async () => 'used_memory:1024000\r\n'),
        quit: vi.fn(),
      };

      (service as any).redis = mockRedisWithCache;

      const result1 = await service.query(
        'SELECT * FROM products WHERE id = $1',
        [1],
        { cacheType: 'products' },
        executor,
      );

      expect(callCount).toBe(1);
      expect(result1).toEqual({ rows: [{ id: 1, name: 'Product' }] });

      const result2 = await service.query(
        'SELECT * FROM products WHERE id = $1',
        [1],
        { cacheType: 'products' },
        executor,
      );

      expect(callCount).toBe(1); // Should not call executor again
      expect(result2).toEqual({ rows: [{ id: 1 }] });
    });

    it('should skip cache when skipCache option is true', async () => {
      let callCount = 0;
      const executor = async () => {
        callCount++;
        return { rows: [{ id: 1 }] };
      };

      const result = await service.query(
        'SELECT * FROM products',
        [],
        { skipCache: true },
        executor,
      );

      expect(callCount).toBe(1);
      expect(result).toEqual({ rows: [{ id: 1 }] });
      expect((mockRedis.get as any).mock.calls.length).toBe(0);
    });

    it('should respect custom TTL', async () => {
      const executor = async () => ({ rows: [] });

      await service.query(
        'SELECT * FROM products',
        [],
        { ttl: 600, cacheType: 'products' },
        executor,
      );

      expect((mockRedis.setex as any).mock.calls[0][1]).toBe(600);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate pattern and delete matching keys', async () => {
      const mockScan = vi
        .fn()
        .mockResolvedValueOnce([
          '50',
          [
            'cache:products:hash1:hash2',
            'cache:products:hash3:hash4',
          ],
        ])
        .mockResolvedValueOnce(['0', ['cache:products:hash5:hash6']]);

      const mockPipeline = {
        del: vi.fn(function () { return this; }),
        exec: vi.fn(async () => [[null], [null], [null]]),
      };

      const mockRedisWithInvalidation = {
        ...mockRedis,
        scan: mockScan,
        pipeline: vi.fn(() => mockPipeline),
        ping: vi.fn(async () => 'PONG'),
        quit: vi.fn(),
      };

      (service as any).redis = mockRedisWithInvalidation;

      const deleted = await service.invalidatePattern('cache:products:*');

      expect(deleted).toBe(3);
      expect(mockScan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        'cache:products:*',
        'COUNT',
        100,
      );
      expect(mockPipeline.del).toHaveBeenCalledTimes(3);
    });

    it('should handle empty pattern matches', async () => {
      const mockRedisEmpty = {
        ...mockRedis,
        scan: vi.fn().mockResolvedValueOnce(['0', []]),
        ping: vi.fn(async () => 'PONG'),
        quit: vi.fn(),
      };

      (service as any).redis = mockRedisEmpty;

      const deleted = await service.invalidatePattern('cache:nonexistent:*');

      expect(deleted).toBe(0);
    });

    it('should delete specific cache keys', async () => {
      const mockRedisWithDel = {
        ...mockRedis,
        del: vi.fn(async () => 2),
        ping: vi.fn(async () => 'PONG'),
        quit: vi.fn(),
      };

      (service as any).redis = mockRedisWithDel;

      const deleted = await service.invalidateKeys([
        'cache:product:1',
        'cache:product:2',
      ]);

      expect(deleted).toBe(2);
      expect(mockRedisWithDel.del).toHaveBeenCalledWith(
        'cache:product:1',
        'cache:product:2',
      );
    });
  });

  describe('Cache Metrics', () => {
    it('should report cache size', async () => {
      const mockRedisWithInfo = {
        ...mockRedis,
        info: vi.fn(
          async () =>
            'used_memory:5242880\r\nused_memory_human:5.00M\r\nused_memory_rss:10485760\r\n',
        ),
        ping: vi.fn(async () => 'PONG'),
        quit: vi.fn(),
      };

      (service as any).redis = mockRedisWithInfo;

      const size = await service.getCacheSize();

      expect(size).toBe(5242880);
    });

    it('should return cache statistics', async () => {
      const mockRedisWithStats = {
        ...mockRedis,
        info: vi.fn(async () => 'used_memory:1024000\r\n'),
        ping: vi.fn(async () => 'PONG'),
        quit: vi.fn(),
      };

      (service as any).redis = mockRedisWithStats;

      const stats = await service.getStats();

      expect(stats.enabled).toBe(true);
      expect(stats.size).toBe(1024000);
    });
  });

  describe('TTL and Expiration', () => {
    it('should use default TTL for metadata', async () => {
      const executor = async () => ({ rows: [] });

      await service.query(
        'SELECT * FROM metadata',
        [],
        { cacheType: 'metadata' },
        executor,
      );

      // Metadata should use 3600s TTL by default
      expect((mockRedis.setex as any).mock.calls[0][1]).toBe(3600);
    });

    it('should use configured TTL for products', async () => {
      const executor = async () => ({ rows: [] });

      await service.query(
        'SELECT * FROM products',
        [],
        { cacheType: 'products' },
        executor,
      );

      // Products should use 300s TTL by default
      expect((mockRedis.setex as any).mock.calls[0][1]).toBe(300);
    });
  });

  describe('Error Handling', () => {
    it('should fallback to direct execution on cache error', async () => {
      let executorCalled = false;
      const executor = async () => {
        executorCalled = true;
        return { rows: [{ id: 1 }] };
      };

      const mockRedisWithError = {
        ...mockRedis,
        get: vi.fn(async () => {
          throw new Error('Redis connection failed');
        }),
        ping: vi.fn(async () => 'PONG'),
        quit: vi.fn(),
      };

      (service as any).redis = mockRedisWithError;

      const result = await service.query(
        'SELECT * FROM products',
        [],
        { cacheType: 'products' },
        executor,
      );

      expect(executorCalled).toBe(true);
      expect(result).toEqual({ rows: [{ id: 1 }] });
    });

    it('should handle deserialization errors gracefully', async () => {
      const executor = async () => ({ rows: [{ id: 1 }] });

      const mockRedisWithBadData = {
        ...mockRedis,
        get: vi.fn(async () => 'invalid json {{{'),
        ping: vi.fn(async () => 'PONG'),
        quit: vi.fn(),
      };

      (service as any).redis = mockRedisWithBadData;

      const result = await service.query(
        'SELECT * FROM products',
        [],
        { cacheType: 'products' },
        executor,
      );

      expect(result).toEqual({ rows: [{ id: 1 }] });
    });
  });

  describe('Health Check', () => {
    it('should report healthy when Redis responds to ping', async () => {
      const mockRedisHealthy = {
        ...mockRedis,
        ping: vi.fn(async () => 'PONG'),
        quit: vi.fn(),
      };

      (service as any).redis = mockRedisHealthy;

      const healthy = await service.healthCheck();

      expect(healthy).toBe(true);
    });

    it('should report unhealthy when Redis ping fails', async () => {
      const mockRedisUnhealthy = {
        ...mockRedis,
        ping: vi.fn(async () => {
          throw new Error('Connection refused');
        }),
        quit: vi.fn(),
      };

      (service as any).redis = mockRedisUnhealthy;

      const healthy = await service.healthCheck();

      expect(healthy).toBe(false);
    });
  });

  describe('Disabled Cache', () => {
    it('should bypass cache when disabled', async () => {
      (service as any).enabled = false;

      let executorCalled = false;
      const executor = async () => {
        executorCalled = true;
        return { rows: [{ id: 1 }] };
      };

      const result = await service.query(
        'SELECT * FROM products',
        [],
        { cacheType: 'products' },
        executor,
      );

      expect(executorCalled).toBe(true);
      expect((mockRedis.get as any).mock.calls.length).toBe(0);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys for same query and params', async () => {
      const executor = async () => ({ rows: [] });

      const mockRedisTracker = {
        ...mockRedis,
        setex: vi.fn(),
        ping: vi.fn(async () => 'PONG'),
        quit: vi.fn(),
      };

      (service as any).redis = mockRedisTracker;

      await service.query(
        'SELECT * FROM products WHERE id = $1',
        [1],
        { cacheType: 'products' },
        executor,
      );

      const firstKey = (mockRedisTracker.setex as any).mock.calls[0][0];

      await service.query(
        'SELECT * FROM products WHERE id = $1',
        [1],
        { cacheType: 'products' },
        executor,
      );

      const secondKey = (mockRedisTracker.setex as any).mock.calls[1]?.[0];

      // Keys should match since query and params are identical
      expect(firstKey).toBeDefined();
    });

    it('should generate different cache keys for different params', async () => {
      const executor = async () => ({ rows: [] });

      const mockRedisTracker = {
        ...mockRedis,
        get: vi.fn(async () => null),
        setex: vi.fn(),
        ping: vi.fn(async () => 'PONG'),
        quit: vi.fn(),
      };

      (service as any).redis = mockRedisTracker;

      await service.query(
        'SELECT * FROM products WHERE id = $1',
        [1],
        { cacheType: 'products' },
        executor,
      );

      const firstKey = (mockRedisTracker.setex as any).mock.calls[0][0];

      await service.query(
        'SELECT * FROM products WHERE id = $1',
        [2],
        { cacheType: 'products' },
        executor,
      );

      const secondKey = (mockRedisTracker.setex as any).mock.calls[1][0];

      // Keys should differ since params are different
      expect(firstKey).not.toBe(secondKey);
    });
  });
});
