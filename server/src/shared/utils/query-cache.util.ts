/**
 * Query Cache Utilities
 * Version: 1.0.0
 *
 * Helper functions for query cache integration and invalidation management.
 * Provides utilities for:
 * - Building cache keys
 * - Pattern-based invalidation
 * - Cache key generation for common operations
 */

import { createHash } from 'crypto';

/**
 * Generate cache key for database query
 * @param query SQL query string
 * @param params Query parameters
 * @param prefix Key prefix (e.g., 'cache:products')
 */
export function generateQueryCacheKey(
  query: string,
  params: any[] = [],
  prefix: string = 'cache:query',
): string {
  const queryHash = createHash('sha256')
    .update(query)
    .digest('hex')
    .slice(0, 16);
  const paramsHash = createHash('sha256')
    .update(JSON.stringify(params))
    .digest('hex')
    .slice(0, 16);

  return `${prefix}:${queryHash}:${paramsHash}`;
}

/**
 * Generate cache key for entity by ID
 * @param entityType Entity type (e.g., 'product', 'list')
 * @param id Entity ID
 */
export function generateEntityCacheKey(
  entityType: string,
  id: string | number,
): string {
  return `cache:${entityType}:${id}`;
}

/**
 * Generate cache key for collection/list
 * @param collectionType Collection type (e.g., 'products', 'lists')
 * @param filters Optional filter parameters
 */
export function generateCollectionCacheKey(
  collectionType: string,
  filters: Record<string, any> = {},
): string {
  const filterStr = Object.entries(filters)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join('&');

  const hash = filterStr
    ? createHash('sha256')
        .update(filterStr)
        .digest('hex')
        .slice(0, 16)
    : 'all';

  return `cache:${collectionType}:${hash}`;
}

/**
 * Common cache invalidation patterns
 */
export const INVALIDATION_PATTERNS = {
  // Product cache
  ALL_PRODUCTS: 'cache:products:*',
  PRODUCT_BY_ID: (id: string | number) => `cache:product:${id}`,

  // List cache
  ALL_LISTS: 'cache:lists:*',
  LIST_BY_ID: (id: string | number) => `cache:list:${id}`,
  USER_LISTS: (userId: string | number) => `cache:user:${userId}:lists`,

  // User cache
  ALL_USERS: 'cache:users:*',
  USER_BY_ID: (id: string | number) => `cache:user:${id}`,

  // Supplement cache
  ALL_SUPPLEMENTS: 'cache:supplements:*',
  SUPPLEMENT_BY_ID: (id: string | number) => `cache:supplement:${id}`,

  // Search cache
  SEARCH_RESULTS: 'cache:search:*',
  SEARCH_FOR: (query: string) => {
    const hash = createHash('sha256')
      .update(query)
      .digest('hex')
      .slice(0, 16);
    return `cache:search:${hash}`;
  },

  // Metadata cache
  METADATA: 'cache:metadata:*',

  // Query cache
  QUERY_CACHE: 'cache:query:*',
};

/**
 * Determine cache invalidation patterns based on mutation operation
 * @param operation Operation type (INSERT, UPDATE, DELETE)
 * @param table Table name
 * @param data Affected data
 */
export function getInvalidationPatterns(
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  table: string,
  data?: Record<string, any>,
): string[] {
  const patterns: string[] = [];

  // Always invalidate the specific entity type
  switch (table) {
    case 'products':
      patterns.push(INVALIDATION_PATTERNS.ALL_PRODUCTS);
      if (data?.id) {
        patterns.push(INVALIDATION_PATTERNS.PRODUCT_BY_ID(data.id));
      }
      break;

    case 'lists':
      patterns.push(INVALIDATION_PATTERNS.ALL_LISTS);
      if (data?.id) {
        patterns.push(INVALIDATION_PATTERNS.LIST_BY_ID(data.id));
      }
      if (data?.user_id) {
        patterns.push(INVALIDATION_PATTERNS.USER_LISTS(data.user_id));
      }
      break;

    case 'users':
      patterns.push(INVALIDATION_PATTERNS.ALL_USERS);
      if (data?.id) {
        patterns.push(INVALIDATION_PATTERNS.USER_BY_ID(data.id));
      }
      break;

    case 'supplements':
      patterns.push(INVALIDATION_PATTERNS.ALL_SUPPLEMENTS);
      if (data?.id) {
        patterns.push(INVALIDATION_PATTERNS.SUPPLEMENT_BY_ID(data.id));
      }
      break;

    default:
      // Generic pattern for unknown tables
      patterns.push(`cache:${table}:*`);
  }

  // Also invalidate search cache on mutations
  patterns.push(INVALIDATION_PATTERNS.SEARCH_RESULTS);

  return patterns;
}

/**
 * TTL values in seconds for different query types
 */
export const CACHE_TTL = {
  SHORT: 120, // 2 minutes (search, volatile data)
  MEDIUM: 300, // 5 minutes (products, supplements)
  LONG: 600, // 10 minutes (lists, relationships)
  EXTENDED: 900, // 15 minutes (user data)
  MAX: 3600, // 1 hour (metadata, static data)
};

/**
 * Format cache statistics for logging
 */
export function formatCacheStats(stats: {
  enabled: boolean;
  size: number;
  hitsTotal?: number;
  missesTotal?: number;
}): string {
  const sizeKb = (stats.size / 1024).toFixed(2);
  const hitRate =
    stats.hitsTotal && stats.missesTotal
      ? (
          (stats.hitsTotal / (stats.hitsTotal + stats.missesTotal)) *
          100
        ).toFixed(1)
      : 'N/A';

  return (
    `Cache Stats: ` +
    `Enabled=${stats.enabled}, ` +
    `Size=${sizeKb}KB, ` +
    `HitRate=${hitRate}%`
  );
}
