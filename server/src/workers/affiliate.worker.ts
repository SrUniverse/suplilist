/**
 * BullMQ Workers for Affiliate Data Processing
 * Version: 1.0.0
 *
 * 3 Workers: Scrape → Dedup → Filter
 * Concurrency: 1 worker per queue (controlled parallelism)
 */

import { Worker, Job } from 'bullmq';
import { getRedisClient } from '../shared/config/redis.config.js';
import firecrawlService from '../shared/services/firecrawl.service.js';
import {
  getScrapeQueue,
  getDedupQueue,
  getFilterQueue,
  type ScrapeJobData,
  type DedupJobData,
  type FilterJobData,
} from '../queue/affiliate.queue.js';
import { deduplicateProducts } from '../services/deduplication.service.js';
import { filterOutliers } from '../services/filtering.service.js';
import { logger } from '../shared/utils/logger.js';

interface ProcessedProduct {
  name: string;
  price: number;
  source: 'amazon' | 'mercadolivre' | 'shopee';
  url: string;
  directUrl?: string;
  affiliateApplied?: boolean;
}

// === SCRAPE WORKER ===

export function createScrapeWorker(): Worker<ScrapeJobData> {
  return new Worker<ScrapeJobData>(
    'affiliate:scrape',
    async (job: Job<ScrapeJobData>) => {
      logger.info(`[ScrapeWorker] Processing job ${job.id}:`, job.data);

      try {
        const { source, searchQuery, batchId, stage } = job.data;

        // Update job progress
        await job.updateProgress({ stage: 'scraping', progress: 10 });

        // Scrape data from Firecrawl
        const products = await firecrawlService.scrapeSupplementsFromSource(
          source,
          searchQuery
        );

        logger.info(
          `[ScrapeWorker] Scraped ${products.length} products from ${source}`
        );

        if (products.length === 0) {
          logger.warn(
            `[ScrapeWorker] No products found for ${source} - ${searchQuery}`
          );
          return {
            jobId: job.id,
            source,
            productCount: 0,
            products: [],
            batchId,
            stage,
          };
        }

        // Update progress
        await job.updateProgress({ stage: 'scraped', progress: 50 });

        // Queue deduplication job
        const dedupQueue = getDedupQueue();
        await dedupQueue.add(
          'dedup',
          {
            products: products.map((p) => ({
              name: p.name,
              price: p.price,
              source: p.source,
              url: p.url,
            })),
            batchId,
          },
          {
            jobId: `dedup-${job.id}`,
          }
        );

        await job.updateProgress({ stage: 'queued_dedup', progress: 100 });

        return {
          jobId: job.id,
          source,
          productCount: products.length,
          products,
          batchId,
          stage,
        };
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error);
        logger.error(`[ScrapeWorker] Error processing job ${job.id}:`, errorMsg);
        throw error;
      }
    },
    {
      connection: getRedisClient() as any,
      concurrency: 1, // One concurrent scrape job
    }
  );
}

// === DEDUPLICATION WORKER ===

export function createDedupWorker(): Worker<DedupJobData> {
  return new Worker<DedupJobData>(
    'affiliate:dedup',
    async (job: Job<DedupJobData>) => {
      logger.info(`[DedupWorker] Processing job ${job.id}:`, {
        productCount: job.data.products.length,
        batchId: job.data.batchId,
      });

      try {
        await job.updateProgress({ stage: 'deduplicating', progress: 20 });

        // Deduplicate products
        const deduplicated = deduplicateProducts(job.data.products);

        logger.info(
          `[DedupWorker] Deduplicated: ${job.data.products.length} → ${deduplicated.length} products`
        );

        await job.updateProgress({ stage: 'deduplicated', progress: 60 });

        // Queue filter job
        const filterQueue = getFilterQueue();
        await filterQueue.add(
          'filter',
          {
            products: deduplicated,
            batchId: job.data.batchId,
          },
          {
            jobId: `filter-${job.id}`,
          }
        );

        await job.updateProgress({ stage: 'queued_filter', progress: 100 });

        return {
          jobId: job.id,
          originalCount: job.data.products.length,
          deduplicatedCount: deduplicated.length,
          deduplicatedProducts: deduplicated,
          batchId: job.data.batchId,
        };
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error);
        logger.error(`[DedupWorker] Error processing job ${job.id}:`, errorMsg);
        throw error;
      }
    },
    {
      connection: getRedisClient() as any,
      concurrency: 1,
    }
  );
}

// === FILTER WORKER ===

export function createFilterWorker(): Worker<FilterJobData> {
  return new Worker<FilterJobData>(
    'affiliate:filter',
    async (job: Job<FilterJobData>) => {
      logger.info(`[FilterWorker] Processing job ${job.id}:`, {
        productCount: job.data.products.length,
        batchId: job.data.batchId,
      });

      try {
        await job.updateProgress({ stage: 'filtering', progress: 30 });

        // Apply IQR filtering
        const filtered = filterOutliers(job.data.products);

        logger.info(
          `[FilterWorker] Filtered: ${job.data.products.length} → ${filtered.count} products (removed ${filtered.removed.length} outliers)`
        );

        if (filtered.removed.length > 0) {
          logger.info(
            `[FilterWorker] Removed outliers: `,
            filtered.removed.map(
              (p) => `${p.name} (R$${p.price.toFixed(2)})`
            )
          );
        }

        await job.updateProgress({ stage: 'filtering_complete', progress: 100 });

        // Store final results in Redis for seed scripts to access
        const redis = getRedisClient();
        const cacheKey = `affiliate:batch:${job.data.batchId || Date.now()}`;
        await redis.setex(
          cacheKey,
          3600, // 1 hour TTL
          JSON.stringify({
            products: filtered.products,
            timestamp: Date.now(),
            stats: {
              original: job.data.products.length,
              filtered: filtered.count,
              removed: filtered.removed.length,
            },
          })
        );

        return {
          jobId: job.id,
          originalCount: job.data.products.length,
          filteredCount: filtered.count,
          removedCount: filtered.removed.length,
          filteredProducts: filtered.products,
          batchId: job.data.batchId,
          cacheKey,
        };
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error);
        logger.error(`[FilterWorker] Error processing job ${job.id}:`, errorMsg);
        throw error;
      }
    },
    {
      connection: getRedisClient() as any,
      concurrency: 1,
    }
  );
}

// === WORKER MANAGER ===

let scrapeWorker: Worker<ScrapeJobData> | null = null;
let dedupWorker: Worker<DedupJobData> | null = null;
let filterWorker: Worker<FilterJobData> | null = null;

/**
 * Start all workers
 */
export async function startWorkers(): Promise<void> {
  try {
    scrapeWorker = createScrapeWorker();
    dedupWorker = createDedupWorker();
    filterWorker = createFilterWorker();

    // Setup error handlers
    scrapeWorker.on('error', (error) => {
      logger.error('[ScrapeWorker] Error:', error);
    });

    dedupWorker.on('error', (error) => {
      logger.error('[DedupWorker] Error:', error);
    });

    filterWorker.on('error', (error) => {
      logger.error('[FilterWorker] Error:', error);
    });

    logger.info('[Workers] Started: scrape, dedup, filter');
  } catch (error) {
    logger.error('[Workers] Failed to start:', error);
    throw error;
  }
}

/**
 * Stop all workers gracefully
 */
export async function stopWorkers(): Promise<void> {
  if (scrapeWorker) await scrapeWorker.close();
  if (dedupWorker) await dedupWorker.close();
  if (filterWorker) await filterWorker.close();
  logger.info('[Workers] Stopped gracefully');
}

/**
 * Get worker status
 */
export async function getWorkerStatus(): Promise<object> {
  return {
    scrape: {
      isRunning: scrapeWorker?.isRunning(),
      isPaused: scrapeWorker?.isPaused(),
    },
    dedup: {
      isRunning: dedupWorker?.isRunning(),
      isPaused: dedupWorker?.isPaused(),
    },
    filter: {
      isRunning: filterWorker?.isRunning(),
      isPaused: filterWorker?.isPaused(),
    },
  };
}
