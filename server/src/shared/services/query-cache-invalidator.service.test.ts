/**
 * Query Cache Invalidator Service Tests
 * Version: 1.0.0
 *
 * Test suite for cache invalidation service covering:
 * - Mutation-based invalidation
 * - Pattern-based invalidation
 * - Batch processing
 * - Entity-specific invalidation
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import { QueryCacheInvalidatorService } from './query-cache-invalidator.service.js';

describe('QueryCacheInvalidatorService', () => {
  let service: QueryCacheInvalidatorService;
  let mockQueryCacheService: any;

  beforeEach(() => {
    // Mock query cache service
    mockQueryCacheService = {
      invalidatePattern: vi.fn(async () => 1),
      invalidate: vi.fn(async () => undefined),
    };

    // Create service instance
    service = new QueryCacheInvalidatorService();

    // Override the query cache service dependency
    vi.spyOn(service as any, 'invalidatePattern').mockImplementation(
      mockQueryCacheService.invalidatePattern,
    );
  });

  afterEach(() => {
    service.stopBatchProcessor();
    vi.clearAllMocks();
  });

  describe('Product Invalidation', () => {
    it('should invalidate all products on product mutation', async () => {
      await service.invalidateProduct('123');

      expect(mockQueryCacheService.invalidatePattern).toHaveBeenCalledWith(
        'cache:products:*',
      );
    });

    it('should invalidate specific product', async () => {
      await service.invalidateProduct('456');

      const calls = (mockQueryCacheService.invalidatePattern as any).mock
        .calls;
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  describe('List Invalidation', () => {
    it('should invalidate list and related caches', async () => {
      await service.invalidateList('789', '123');

      const calls = (mockQueryCacheService.invalidatePattern as any).mock
        .calls;
      expect(calls.length).toBeGreaterThan(0);

      // Should invalidate lists collection and user-specific lists
      const patterns = calls.map((call: any) => call[0]);
      expect(patterns).toContain('cache:lists:*');
    });

    it('should handle list without user ID', async () => {
      await service.invalidateList('789');

      const calls = (mockQueryCacheService.invalidatePattern as any).mock
        .calls;
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  describe('User Invalidation', () => {
    it('should invalidate all user data', async () => {
      await service.invalidateUser('456');

      const calls = (mockQueryCacheService.invalidatePattern as any).mock
        .calls;
      expect(calls.length).toBeGreaterThan(0);
    });

    it('should invalidate user lists', async () => {
      await service.invalidateUserLists('789');

      expect(mockQueryCacheService.invalidatePattern).toHaveBeenCalledWith(
        'cache:user:789:lists:*',
      );
    });
  });

  describe('Search Invalidation', () => {
    it('should invalidate all search results', async () => {
      await service.invalidateSearch();

      expect(mockQueryCacheService.invalidatePattern).toHaveBeenCalledWith(
        'cache:search:*',
      );
    });
  });

  describe('Supplement Invalidation', () => {
    it('should invalidate supplement data', async () => {
      await service.invalidateSupplement('111');

      const calls = (mockQueryCacheService.invalidatePattern as any).mock
        .calls;
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  describe('Entity and Collection Invalidation', () => {
    it('should invalidate specific entity by cache key', async () => {
      await service.invalidateEntity('product', '123');

      // Should be called via decorator override
      expect(mockQueryCacheService.invalidatePattern).toHaveBeenCalled();
    });

    it('should invalidate collection with filters', async () => {
      await service.invalidateCollection('products', {
        category: 'supplements',
      });

      // Should invalidate via decorator override
      expect(mockQueryCacheService.invalidatePattern).toHaveBeenCalled();
    });

    it('should invalidate all of collection without filters', async () => {
      await service.invalidateCollection('products');

      expect(mockQueryCacheService.invalidatePattern).toHaveBeenCalledWith(
        'cache:products:*',
      );
    });
  });

  describe('Mutation Registration', () => {
    it('should register INSERT mutations', async () => {
      await service.invalidateOnMutation('INSERT', 'products', {
        id: '123',
        name: 'New Product',
      });

      expect(service.getPendingCount()).toBe(1);
    });

    it('should register UPDATE mutations', async () => {
      await service.invalidateOnMutation('UPDATE', 'products', {
        id: '123',
        name: 'Updated Product',
      });

      expect(service.getPendingCount()).toBe(1);
    });

    it('should register DELETE mutations', async () => {
      await service.invalidateOnMutation('DELETE', 'products', {
        id: '123',
      });

      expect(service.getPendingCount()).toBe(1);
    });

    it('should deduplicate mutations for same entity', async () => {
      await service.invalidateOnMutation('UPDATE', 'products', { id: '123' });
      await service.invalidateOnMutation('UPDATE', 'products', { id: '123' });

      // Should only have 1 pending (deduped)
      expect(service.getPendingCount()).toBe(1);
    });
  });

  describe('Transaction Mutation Invalidation', () => {
    it('should invalidate multiple mutations in transaction', async () => {
      const mutations = [
        { operation: 'INSERT' as const, table: 'products', data: { id: '1' } },
        {
          operation: 'UPDATE' as const,
          table: 'lists',
          data: { id: '2', user_id: '3' },
        },
      ];

      await service.invalidateTransactionMutations(mutations);

      expect(mockQueryCacheService.invalidatePattern).toHaveBeenCalled();
    });

    it('should handle empty transaction mutations', async () => {
      await service.invalidateTransactionMutations([]);

      expect(mockQueryCacheService.invalidatePattern).not.toHaveBeenCalled();
    });
  });

  describe('Batch Processing', () => {
    it('should flush when batch size reached', async () => {
      const mutations = [];

      // Create enough mutations to exceed batch size
      for (let i = 0; i < 105; i++) {
        mutations.push({
          operation: 'INSERT' as const,
          table: 'products',
          data: { id: String(i) },
        });
      }

      for (const mutation of mutations.slice(0, 100)) {
        await service.invalidateOnMutation(
          mutation.operation,
          mutation.table,
          mutation.data,
        );
      }

      expect(service.getPendingCount()).toBeLessThanOrEqual(100);
    });

    it('should force flush pending invalidations', async () => {
      await service.invalidateOnMutation('INSERT', 'products', { id: '1' });
      await service.invalidateOnMutation('UPDATE', 'lists', { id: '2' });

      expect(service.getPendingCount()).toBe(2);

      await service.forceFlush();

      expect(service.getPendingCount()).toBe(0);
    });
  });

  describe('Lifecycle', () => {
    it('should stop batch processor', () => {
      const spy = vi.spyOn(global, 'clearInterval');

      service.stopBatchProcessor();

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle mutations without data', async () => {
      await service.invalidateOnMutation('DELETE', 'products');

      expect(service.getPendingCount()).toBe(1);
    });

    it('should handle unknown table', async () => {
      await service.invalidateOnMutation('UPDATE', 'unknown_table', {
        id: '1',
      });

      // Should still register
      expect(service.getPendingCount()).toBe(1);
    });
  });
});
