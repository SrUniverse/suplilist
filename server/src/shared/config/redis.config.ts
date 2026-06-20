/**
 * Redis Cache Configuration
 * Version: 1.0.0
 *
 * Manages Redis client with automatic reconnection and error handling.
 * Used for caching, sessions, and rate limiting.
 */

import { Redis } from 'ioredis';
import { env } from './env.config.js';
import { logger } from '../utils/logger.js';

let redisClient: Redis | null = null;

/**
 * Get or create Redis client
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      // Connection settings
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true,

      // Timeouts
      connectTimeout: 10000,
      commandTimeout: 5000,

      // Connection pool
      lazyConnect: false,

      // Logging
      ...(env.NODE_ENV === 'development' && {
        showFriendlyErrorStack: true,
      }),
    });

    // Event handlers
    redisClient.on('connect', () => {
      logger.info('✅ Redis connected');
    });

    redisClient.on('ready', () => {
      logger.info('✅ Redis ready');
    });

    redisClient.on('error', (err) => {
      logger.error('❌ Redis error:', err);
    });

    redisClient.on('reconnecting', () => {
      logger.info('🔄 Redis reconnecting...');
    });

    redisClient.on('close', () => {
      logger.info('Redis connection closed');
    });

    redisClient.on('end', () => {
      logger.info('Redis connection ended');
    });
  }

  return redisClient;
}

/**
 * Initialize Redis client
 * Called once on server startup
 */
export async function initializeRedis(): Promise<void> {
  try {
    const client = getRedisClient();

    // Test connection with ping
    const result = await client.ping();

    if (result === 'PONG') {
      logger.info('✅ Redis connection verified');
    }

    // Verify configuration
    const config = (await client.config('GET', 'maxmemory')) as string[];

    logger.info(`Redis maxmemory: ${config[1]}`);

    const policyConfig = (await client.config('GET', 'maxmemory-policy')) as string[];

    logger.info(`Redis eviction policy: ${policyConfig[1]}`);
  } catch (error) {
    logger.error('❌ Failed to initialize Redis:', error);
    throw error;
  }
}

/**
 * Close Redis connection
 * Called on graceful shutdown
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}

/**
 * Health check for Redis
 */
export async function healthCheckRedis(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
}

/**
 * Get Redis client statistics
 */
export async function getRedisStats() {
  try {
    const client = getRedisClient();
    const info = await client.info('stats');
    const memory = await client.info('memory');

    return { info, memory };
  } catch (error) {
    logger.error('Failed to get Redis stats:', error);
    return null;
  }
}

/**
 * Clear all cache
 * CAUTION: This should only be used in development!
 */
export async function flushRedis(): Promise<void> {
  if (env.NODE_ENV !== 'development') {
    throw new Error('Cannot flush Redis in production environment');
  }

  try {
    const client = getRedisClient();
    await client.flushall();
    logger.info('Redis cache flushed');
  } catch (error) {
    logger.error('Failed to flush Redis:', error);
    throw error;
  }
}

// Export Redis for direct usage in other modules
export { Redis };
