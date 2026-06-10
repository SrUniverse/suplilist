/**
 * Query Cache Integration Examples
 * Version: 1.0.0
 *
 * Real-world examples of how to integrate the query cache layer
 * into your application code.
 */

import {
  query,
  transaction,
} from '../config/database.config.js';
import {
  queryCacheService,
  type QueryCacheOptions,
} from '../services/query-cache.service.js';
import { queryCacheInvalidatorService } from '../services/query-cache-invalidator.service.js';
import { Cacheable } from '../decorators/cacheable.decorator.js';
import {
  CACHE_TTL,
  generateEntityCacheKey,
} from '../utils/query-cache.util.js';

// ─────────────────────────────────────────────────────────────────────────────
// Example 1: Basic Query with Caching
// ─────────────────────────────────────────────────────────────────────────────

export async function getProductById(
  productId: string,
): Promise<{ id: string; name: string; price: number } | null> {
  // Cache for 5 minutes
  const result = await query(
    'SELECT id, name, price FROM products WHERE id = $1',
    [productId],
    {
      cacheType: 'products',
      ttl: CACHE_TTL.MEDIUM, // 5 min
    },
  );

  return result.rows[0] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 2: Collection Query with Custom TTL
// ─────────────────────────────────────────────────────────────────────────────

export async function getProductsByCategory(
  category: string,
  limit: number = 50,
): Promise<Array<{ id: string; name: string }>> {
  const result = await query(
    'SELECT id, name FROM products WHERE category = $1 LIMIT $2',
    [category, limit],
    {
      cacheType: 'products',
      ttl: CACHE_TTL.MEDIUM, // 5 min
    },
  );

  return result.rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 3: Skip Cache for Real-time Data
// ─────────────────────────────────────────────────────────────────────────────

export async function getProductCount(): Promise<number> {
  const result = await query(
    'SELECT COUNT(*) as count FROM products',
    [],
    {
      cacheType: 'metadata',
      skipCache: true, // Always get fresh count
    },
  );

  return parseInt(result.rows[0].count, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 4: Search Results (Short TTL)
// ─────────────────────────────────────────────────────────────────────────────

export async function searchProducts(
  searchQuery: string,
  limit: number = 20,
): Promise<Array<{ id: string; name: string; score: number }>> {
  const result = await query(
    `SELECT id, name, ts_rank(search_vector, query) as score
     FROM products, plainto_tsquery($1) query
     WHERE search_vector @@ query
     ORDER BY score DESC
     LIMIT $2`,
    [searchQuery, limit],
    {
      cacheType: 'search',
      ttl: CACHE_TTL.SHORT, // 2 min (volatile)
    },
  );

  return result.rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 5: Mutation with Automatic Cache Invalidation
// ─────────────────────────────────────────────────────────────────────────────

export async function createProduct(data: {
  id: string;
  name: string;
  category: string;
  price: number;
}): Promise<{ id: string }> {
  // Execute with automatic cache invalidation
  const result = await transaction(
    async (client) => {
      const insertResult = await client.query(
        'INSERT INTO products (id, name, category, price) VALUES ($1, $2, $3, $4) RETURNING id',
        [data.id, data.name, data.category, data.price],
      );

      return insertResult.rows[0];
    },
    [
      {
        operation: 'INSERT',
        table: 'products',
        data: { id: data.id, category: data.category },
      },
    ],
  );

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 6: Update with Explicit Invalidation
// ─────────────────────────────────────────────────────────────────────────────

export async function updateProduct(
  productId: string,
  updates: { name?: string; price?: number },
): Promise<void> {
  const setClauses = [];
  const values = [];
  let paramCount = 1;

  if (updates.name) {
    setClauses.push(`name = $${paramCount++}`);
    values.push(updates.name);
  }

  if (updates.price) {
    setClauses.push(`price = $${paramCount++}`);
    values.push(updates.price);
  }

  values.push(productId);

  await transaction(
    async (client) => {
      await client.query(
        `UPDATE products SET ${setClauses.join(', ')} WHERE id = $${paramCount}`,
        values,
      );
    },
    [
      {
        operation: 'UPDATE',
        table: 'products',
        data: { id: productId },
      },
    ],
  );

  // Explicit invalidation (in case transaction invalidation doesn't cover all patterns)
  await queryCacheInvalidatorService.invalidateProduct(productId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 7: Using @Cacheable Decorator on Class Method
// ─────────────────────────────────────────────────────────────────────────────

export class ProductRepository {
  @Cacheable({
    ttl: 300, // 5 minutes
    cacheType: 'products',
    keyPrefix: 'cache:product-repo',
  })
  async findById(productId: string): Promise<{
    id: string;
    name: string;
    description: string;
  } | null> {
    // Actual database query
    const result = await query(
      'SELECT id, name, description FROM products WHERE id = $1',
      [productId],
    );

    return result.rows[0] || null;
  }

  async getRelated(productId: string): Promise<
    Array<{ id: string; name: string }>
  > {
    // This method is NOT cached - you can combine cached and non-cached methods
    const result = await query(
      `SELECT id, name FROM products
       WHERE category = (SELECT category FROM products WHERE id = $1)
       AND id != $1
       LIMIT 5`,
      [productId],
    );

    return result.rows;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 8: List Operations with User Scope
// ─────────────────────────────────────────────────────────────────────────────

export async function getUserLists(
  userId: string,
): Promise<Array<{ id: string; name: string; itemCount: number }>> {
  const result = await query(
    `SELECT l.id, l.name, COUNT(li.id) as item_count
     FROM lists l
     LEFT JOIN list_items li ON l.id = li.list_id
     WHERE l.user_id = $1
     GROUP BY l.id, l.name`,
    [userId],
    {
      cacheType: 'lists',
      ttl: CACHE_TTL.LONG, // 10 min
    },
  );

  return result.rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 9: Bulk Operations with Transaction
// ─────────────────────────────────────────────────────────────────────────────

export async function addProductsToList(
  listId: string,
  productIds: string[],
): Promise<number> {
  const mutations = productIds.map((productId) => ({
    operation: 'INSERT' as const,
    table: 'list_items',
    data: { list_id: listId, product_id: productId },
  }));

  const result = await transaction(
    async (client) => {
      let inserted = 0;

      for (const productId of productIds) {
        const res = await client.query(
          'INSERT INTO list_items (list_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [listId, productId],
        );
        inserted += res.rowCount || 0;
      }

      return inserted;
    },
    mutations,
  );

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 10: Cache Invalidation Events
// ─────────────────────────────────────────────────────────────────────────────

export async function onProductPriceChanged(
  productId: string,
  newPrice: number,
): Promise<void> {
  // Update database
  await query(
    'UPDATE products SET price = $1, updated_at = NOW() WHERE id = $2',
    [newPrice, productId],
    { skipCache: true }, // Skip cache for write
  );

  // Invalidate all caches that might contain this product
  await queryCacheInvalidatorService.invalidateProduct(productId);

  // Also invalidate search results as they might include price
  await queryCacheInvalidatorService.invalidateSearch();

  console.log(`Product ${productId} cache invalidated due to price change`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 11: Direct Query Cache Service Usage (Advanced)
// ─────────────────────────────────────────────────────────────────────────────

export async function getDetailedProduct(productId: string): Promise<any> {
  // Using queryCacheService directly for full control
  const result = await queryCacheService.query(
    'SELECT * FROM products WHERE id = $1',
    [productId],
    {
      cacheType: 'products',
      ttl: CACHE_TTL.MEDIUM,
      skipCache: false,
    },
    // Executor function that actually runs the query
    async (sql: string, params: any[]) => {
      return query(sql, params);
    },
  );

  return result.rows[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 12: Cache Statistics and Monitoring
// ─────────────────────────────────────────────────────────────────────────────

export async function getCacheMetrics(): Promise<{
  enabled: boolean;
  size: number;
  healthy: boolean;
  pending: number;
}> {
  const stats = await queryCacheService.getStats();
  const healthy = await queryCacheService.healthCheck();
  const pending = queryCacheInvalidatorService.getPendingCount();

  return {
    enabled: stats.enabled,
    size: stats.size,
    healthy,
    pending,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 13: Supplement Queries with Category Caching
// ─────────────────────────────────────────────────────────────────────────────

export async function getSupplementsByBenefit(
  benefit: string,
): Promise<Array<{ id: string; name: string; dosage: string }>> {
  const result = await query(
    `SELECT id, name, dosage FROM supplements
     WHERE benefits @> $1::jsonb
     ORDER BY rating DESC`,
    [JSON.stringify([benefit])],
    {
      cacheType: 'supplements',
      ttl: CACHE_TTL.MEDIUM,
    },
  );

  return result.rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Example 14: Metadata Queries (Long TTL)
// ─────────────────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Array<{ id: string; name: string }>> {
  const result = await query(
    'SELECT DISTINCT id, category as name FROM products ORDER BY category',
    [],
    {
      cacheType: 'metadata',
      ttl: CACHE_TTL.MAX, // 1 hour - stable data
    },
  );

  return result.rows;
}

// Usage example:
// const product = await getProductById('123');
// const relatedProducts = await getRelatedProducts('123');
// const lists = await getUserLists('user-456');
// const metrics = await getCacheMetrics();
