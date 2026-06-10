/**
 * PostgreSQL Database Configuration
 * Version: 2.0.0
 *
 * Manages database connection pooling and initialization.
 * Uses native pg driver for maximum compatibility and performance.
 * Integrated with query caching layer for automatic result caching.
 */

import { Pool, PoolClient } from 'pg';
import { env } from './env.config.js';
import {
  queryCacheService,
  type QueryCacheOptions,
} from '../services/query-cache.service.js';
import { queryCacheInvalidatorService } from '../services/query-cache-invalidator.service.js';

let pool: Pool | null = null;

/**
 * Get or create PostgreSQL connection pool
 */
export function getDatabasePool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,

      // Connection pool settings
      max: 20,                      // Maximum number of clients in pool
      idleTimeoutMillis: 30000,    // Close idle connections after 30s
      connectionTimeoutMillis: 2000, // Connection timeout

      // Application name for pg_stat_activity
      application_name: 'suplilist-api',

      // Connection verification
      statement_timeout: 30000,    // Query timeout
    });

    // Handle unexpected errors on idle clients
    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client:', err);
      process.exit(1);
    });

    // Log pool events in development
    if (env.NODE_ENV === 'development') {
      pool.on('connect', (client) => {
        console.log('[DB] Client connected to pool');
      });

      pool.on('remove', (client) => {
        console.log('[DB] Client removed from pool');
      });
    }
  }

  return pool;
}

/**
 * Execute a single query with automatic connection management and caching
 * @param text SQL query string
 * @param values Query parameters
 * @param cacheOptions Cache configuration (optional)
 */
export async function query<T = any>(
  text: string,
  values?: any[],
  cacheOptions?: QueryCacheOptions,
): Promise<{ rows: T[]; rowCount: number }> {
  const pool = getDatabasePool();

  // If caching is enabled, use the cache service
  if (cacheOptions && !cacheOptions.skipCache) {
    const result = await queryCacheService.query(
      text,
      values,
      cacheOptions,
      async (query: string, params: any[]) => {
        const res = await pool.query(query, params);
        return {
          rows: res.rows as T[],
          rowCount: res.rowCount || 0,
        };
      },
    );
    return result;
  }

  // Direct query without caching
  try {
    const result = await pool.query(text, values);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount || 0,
    };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Execute multiple queries in a transaction with automatic cache invalidation
 * @param callback Transaction callback
 * @param mutations Optional list of mutations for cache invalidation
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>,
  mutations?: Array<{
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    table: string;
    data?: Record<string, any>;
  }>,
): Promise<T> {
  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');

    // Invalidate cache after successful commit
    if (mutations && mutations.length > 0) {
      await queryCacheInvalidatorService.invalidateTransactionMutations(
        mutations,
      );
    }

    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Initialize database connection
 * Called once on server startup
 */
export async function initializeDatabase(): Promise<void> {
  const pool = getDatabasePool();

  try {
    // Test connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();

    console.log(
      '✅ PostgreSQL connected successfully at',
      result.rows[0].now,
    );

    // Verify critical extensions
    const extensionsResult = await pool.query(
      `SELECT extname FROM pg_extension
       WHERE extname IN ('uuid-ossp', 'pg_trgm', 'btree_gin', 'btree_gist')`,
    );

    const loadedExtensions = extensionsResult.rows.map(
      (row: any) => row.extname,
    );

    if (!loadedExtensions.includes('uuid-ossp')) {
      console.warn(
        '⚠️  uuid-ossp extension not loaded (required for UUID generation)',
      );
    }

    if (!loadedExtensions.includes('pg_trgm')) {
      console.warn(
        '⚠️  pg_trgm extension not loaded (required for full-text search)',
      );
    }

    console.log('Loaded extensions:', loadedExtensions.join(', '));
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Close database connection pool and cache
 * Called on graceful shutdown
 */
export async function closeDatabase(): Promise<void> {
  // Stop cache invalidator batch processor
  queryCacheInvalidatorService.stopBatchProcessor();
  await queryCacheInvalidatorService.forceFlush();

  // Close query cache
  await queryCacheService.close();

  // Close database pool
  if (pool) {
    await pool.end();
    pool = null;
    console.log('PostgreSQL connection pool closed');
  }
}

/**
 * Get pool statistics
 */
export function getPoolStats() {
  if (!pool) return null;

  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

/**
 * Health check for database
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT 1');
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
