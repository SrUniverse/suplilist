import { Queue, Worker } from 'bullmq';
import { redisConnection } from '../database/redis';
import { logger } from '../utils/logger';
import { priceMonitorService } from '../services/price-monitor.service';

// Create the price monitoring queue
export const priceMonitorQueue = new Queue('price-monitor', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
    },
  },
});

// Handle schedule jobs
export const priceMonitorWorker = new Worker(
  'price-monitor',
  async (job) => {
    logger.info('Starting price monitoring job', { jobId: job.id });

    try {
      const result = await priceMonitorService.monitorPrices();

      logger.info('Price monitoring job completed', {
        jobId: job.id,
        result,
      });

      return result;
    } catch (error) {
      logger.error('Price monitoring job failed', {
        jobId: job.id,
        error,
      });
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // Run one at a time
  }
);

// Register event handlers
priceMonitorWorker.on('completed', (job) => {
  logger.info('Price monitor job completed', { jobId: job.id });
});

priceMonitorWorker.on('failed', (job, error) => {
  logger.error('Price monitor job failed', {
    jobId: job?.id,
    error: error.message,
  });
});

priceMonitorWorker.on('error', (error) => {
  logger.error('Price monitor worker error', { error });
});

/**
 * Schedule price monitoring to run every 30 minutes
 */
export async function schedulePriceMonitoring(): Promise<void> {
  try {
    // Remove existing scheduled jobs
    const jobs = await priceMonitorQueue.getJobs(['delayed']);
    for (const job of jobs) {
      await job.remove();
    }

    // Schedule new recurring job every 30 minutes
    const repeatOptions = {
      pattern: '*/30 * * * *', // Every 30 minutes
      tz: 'UTC',
    };

    await priceMonitorQueue.add(
      'monitor-prices',
      { type: 'scheduled-monitoring' },
      {
        repeat: repeatOptions,
      }
    );

    logger.info('Price monitoring scheduled', { interval: '30 minutes' });
  } catch (error) {
    logger.error('Failed to schedule price monitoring', { error });
    throw error;
  }
}

/**
 * Start the price monitor worker
 */
export async function startPriceMonitor(): Promise<void> {
  try {
    await schedulePriceMonitoring();
    logger.info('Price monitor started');
  } catch (error) {
    logger.error('Failed to start price monitor', { error });
    throw error;
  }
}

/**
 * Stop the price monitor worker
 */
export async function stopPriceMonitor(): Promise<void> {
  try {
    await priceMonitorWorker.close();
    await priceMonitorQueue.close();
    logger.info('Price monitor stopped');
  } catch (error) {
    logger.error('Failed to stop price monitor', { error });
    throw error;
  }
}

/**
 * Queue a manual price check
 */
export async function queuePriceCheck(productId?: string): Promise<string> {
  try {
    const job = await priceMonitorQueue.add(
      'manual-price-check',
      { productId },
      {
        priority: 1, // High priority
        removeOnComplete: true,
      }
    );

    logger.info('Price check queued', { jobId: job.id, productId });
    return job.id!;
  } catch (error) {
    logger.error('Failed to queue price check', { error });
    throw error;
  }
}

/**
 * Get price monitoring stats
 */
export async function getPriceMonitorStats(): Promise<{
  activeJobs: number;
  delayedJobs: number;
  failedJobs: number;
  completedJobs: number;
}> {
  try {
    const [active, delayed, failed, completed] = await Promise.all([
      priceMonitorQueue.getActiveCount(),
      priceMonitorQueue.getDelayedCount(),
      priceMonitorQueue.getFailedCount(),
      priceMonitorQueue.getCompletedCount(),
    ]);

    return {
      activeJobs: active,
      delayedJobs: delayed,
      failedJobs: failed,
      completedJobs: completed,
    };
  } catch (error) {
    logger.error('Failed to get price monitor stats', { error });
    throw error;
  }
}
