/**
 * Query Cache Invalidator Service
 * Version: 1.0.0
 *
 * Manages automatic cache invalidation for database mutations.
 * Provides:
 * - INSERT/UPDATE/DELETE invalidation
 * - Pattern-based bulk invalidation
 * - Transaction-aware invalidation
 * - Event-driven cache busting
 *
 * Integration:
 * - Hook into database transaction completion
 * - Listen to mutation events (e.g., ProductCreated, UserUpdated)
 * - Explicit invalidation after mutations
 */

import { queryCacheService } from './query-cache.service.js';
import {
  getInvalidationPatterns,
  generateEntityCacheKey,
  generateCollectionCacheKey,
} from '../utils/query-cache.util.js';

/**
 * Mutation operation type
 */
export type MutationOperation = 'INSERT' | 'UPDATE' | 'DELETE';

/**
 * Cache invalidation event
 */
export interface CacheInvalidationEvent {
  operation: MutationOperation;
  table: string;
  data?: Record<string, any>;
  timestamp: number;
}

/**
 * Query Cache Invalidator Service
 * Handles automatic invalidation of cached queries when data changes
 */
export class QueryCacheInvalidatorService {
  private pendingInvalidations: Map<string, CacheInvalidationEvent> = new Map();
  private batchSize: number = 100;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startBatchProcessor();
  }

  /**
   * Register a cache invalidation event
   * Batches invalidations to reduce Redis calls
   */
  async invalidateOnMutation(
    operation: MutationOperation,
    table: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const event: CacheInvalidationEvent = {
      operation,
      table,
      data,
      timestamp: Date.now(),
    };

    const key = this.getEventKey(table, data?.id);
    this.pendingInvalidations.set(key, event);

    // Flush if we've accumulated enough events
    if (this.pendingInvalidations.size >= this.batchSize) {
      await this.flushInvalidations();
    }
  }

  /**
   * Immediately invalidate on product change
   */
  async invalidateProduct(productId: string | number): Promise<void> {
    const patterns = getInvalidationPatterns('UPDATE', 'products', {
      id: productId,
    });

    for (const pattern of patterns) {
      await queryCacheService.invalidatePattern(pattern);
    }
  }

  /**
   * Immediately invalidate on list change
   */
  async invalidateList(
    listId: string | number,
    userId?: string | number,
  ): Promise<void> {
    const patterns = getInvalidationPatterns('UPDATE', 'lists', {
      id: listId,
      user_id: userId,
    });

    for (const pattern of patterns) {
      await queryCacheService.invalidatePattern(pattern);
    }
  }

  /**
   * Immediately invalidate on user change
   */
  async invalidateUser(userId: string | number): Promise<void> {
    const patterns = getInvalidationPatterns('UPDATE', 'users', {
      id: userId,
    });

    for (const pattern of patterns) {
      await queryCacheService.invalidatePattern(pattern);
    }
  }

  /**
   * Invalidate all user lists
   */
  async invalidateUserLists(userId: string | number): Promise<void> {
    await queryCacheService.invalidatePattern(`cache:user:${userId}:lists:*`);
  }

  /**
   * Invalidate search cache
   */
  async invalidateSearch(query?: string): Promise<void> {
    if (query) {
      // Invalidate specific search
      await queryCacheService.invalidatePattern(`cache:search:*`);
    } else {
      // Invalidate all search results
      await queryCacheService.invalidatePattern('cache:search:*');
    }
  }

  /**
   * Invalidate specific supplement
   */
  async invalidateSupplement(supplementId: string | number): Promise<void> {
    const patterns = getInvalidationPatterns('UPDATE', 'supplements', {
      id: supplementId,
    });

    for (const pattern of patterns) {
      await queryCacheService.invalidatePattern(pattern);
    }
  }

  /**
   * Invalidate specific entity by cache key
   */
  async invalidateEntity(
    entityType: string,
    entityId: string | number,
  ): Promise<void> {
    const cacheKey = generateEntityCacheKey(entityType, entityId);
    await queryCacheService.invalidate(cacheKey);
  }

  /**
   * Invalidate collection with filters
   */
  async invalidateCollection(
    collectionType: string,
    filters?: Record<string, any>,
  ): Promise<void> {
    if (filters) {
      const cacheKey = generateCollectionCacheKey(collectionType, filters);
      await queryCacheService.invalidate(cacheKey);
    } else {
      // Invalidate all of this collection type
      await queryCacheService.invalidatePattern(`cache:${collectionType}:*`);
    }
  }

  /**
   * Invalidate after transaction commit
   */
  async invalidateTransactionMutations(
    mutations: Array<{
      operation: MutationOperation;
      table: string;
      data?: Record<string, any>;
    }>,
  ): Promise<void> {
    const patterns = new Set<string>();

    for (const mutation of mutations) {
      const mutationPatterns = getInvalidationPatterns(
        mutation.operation,
        mutation.table,
        mutation.data,
      );

      for (const pattern of mutationPatterns) {
        patterns.add(pattern);
      }
    }

    // Invalidate all collected patterns
    for (const pattern of patterns) {
      await queryCacheService.invalidatePattern(pattern);
    }

    console.log(
      `[CacheInvalidator] Invalidated ${patterns.size} patterns for ${mutations.length} mutations`,
    );
  }

  /**
   * Flush pending invalidations
   */
  private async flushInvalidations(): Promise<void> {
    if (this.pendingInvalidations.size === 0) return;

    const patterns = new Set<string>();

    for (const event of this.pendingInvalidations.values()) {
      const eventPatterns = getInvalidationPatterns(
        event.operation,
        event.table,
        event.data,
      );

      for (const pattern of eventPatterns) {
        patterns.add(pattern);
      }
    }

    let totalDeleted = 0;
    for (const pattern of patterns) {
      const deleted = await queryCacheService.invalidatePattern(pattern);
      totalDeleted += deleted;
    }

    console.log(
      `[CacheInvalidator] Flushed ${this.pendingInvalidations.size} events, deleted ${totalDeleted} cache keys`,
    );

    this.pendingInvalidations.clear();
  }

  /**
   * Start batch processor timer
   */
  private startBatchProcessor(): void {
    // Flush pending invalidations every 5 seconds
    this.flushInterval = setInterval(() => {
      if (this.pendingInvalidations.size > 0) {
        this.flushInvalidations().catch((error) => {
          console.error('[CacheInvalidator] Batch flush error:', error);
        });
      }
    }, 5000);
  }

  /**
   * Get event key for deduplication
   */
  private getEventKey(table: string, id?: string | number): string {
    return id ? `${table}:${id}` : `${table}:all`;
  }

  /**
   * Stop batch processor
   */
  stopBatchProcessor(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  /**
   * Get pending invalidations count
   */
  getPendingCount(): number {
    return this.pendingInvalidations.size;
  }

  /**
   * Force flush all pending invalidations
   */
  async forceFlush(): Promise<void> {
    await this.flushInvalidations();
  }
}

/**
 * Singleton instance
 */
export const queryCacheInvalidatorService =
  new QueryCacheInvalidatorService();
