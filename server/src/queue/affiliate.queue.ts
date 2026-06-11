/**
 * BullMQ Queue Configuration for Affiliate Data Processing
 * Version: 1.0.0
 *
 * Defines job types, data schemas, and queue setup for async affiliate scraping
 */

import { Queue, QueueEvents } from 'bullmq';
import { z } from 'zod';
import { getRedisClient } from '../shared/config/redis.config.js';
import type Redis from 'ioredis';

// === SCHEMAS ===

export const ScrapeJobDataSchema = z.object({
  source: z.enum(['amazon', 'mercadolivre', 'shopee']),
  searchQuery: z.string().min(1).max(200),
  batchId: z.string().optional(),
  stage: z.enum(['restricted', 'express-refresh']).optional(),
});

export type ScrapeJobData = z.infer<typeof ScrapeJobDataSchema>;

export const DedupJobDataSchema = z.object({
  products: z.array(
    z.object({
      name: z.string(),
      price: z.number().positive(),
      source: z.enum(['amazon', 'mercadolivre', 'shopee']),
      url: z.string().url(),
    })
  ),
  batchId: z.string().optional(),
});

export type DedupJobData = z.infer<typeof DedupJobDataSchema>;

export const FilterJobDataSchema = z.object({
  products: z.array(
    z.object({
      name: z.string(),
      price: z.number().positive(),
      source: z.enum(['amazon', 'mercadolivre', 'shopee']),
      url: z.string().url(),
    })
  ),
  batchId: z.string().optional(),
});

export type FilterJobData = z.infer<typeof FilterJobDataSchema>;

// === QUEUE FACTORY ===

let scrapeQueue: Queue<ScrapeJobData> | null = null;
let dedupQueue: Queue<DedupJobData> | null = null;
let filterQueue: Queue<FilterJobData> | null = null;

/**
 * Get or create Scrape Job Queue
 * Handles web scraping tasks via Firecrawl
 */
export function getScrapeQueue(): Queue<ScrapeJobData> {
  if (!scrapeQueue) {
    const redis = getRedisClient();
    scrapeQueue = new Queue('affiliate:scrape', {
      connection: redis as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 3600, // Remove completed jobs after 1 hour
        },
        removeOnFail: false, // Keep failed jobs for debugging
      },
    });
  }
  return scrapeQueue;
}

/**
 * Get or create Deduplication Queue
 * Handles semantic deduplication of products
 */
export function getDedupQueue(): Queue<DedupJobData> {
  if (!dedupQueue) {
    const redis = getRedisClient();
    dedupQueue = new Queue('affiliate:dedup', {
      connection: redis as any,
      defaultJobOptions: {
        attempts: 2,
        removeOnComplete: {
          age: 3600,
        },
        removeOnFail: false,
      },
    });
  }
  return dedupQueue;
}

/**
 * Get or create Filter Queue
 * Handles IQR filtering to remove outliers
 */
export function getFilterQueue(): Queue<FilterJobData> {
  if (!filterQueue) {
    const redis = getRedisClient();
    filterQueue = new Queue('affiliate:filter', {
      connection: redis as any,
      defaultJobOptions: {
        attempts: 2,
        removeOnComplete: {
          age: 3600,
        },
        removeOnFail: false,
      },
    });
  }
  return filterQueue;
}

/**
 * Initialize all queues and queue events
 */
export async function initializeQueues(): Promise<void> {
  const redis = getRedisClient();
  const scrape = getScrapeQueue();
  const dedup = getDedupQueue();
  const filter = getFilterQueue();

  // Setup event listeners for monitoring
  const scrapeEvents = new QueueEvents('affiliate:scrape', {
    connection: redis as any,
  });

  scrapeEvents.on('completed', ({ jobId }) => {
    console.log(`[Scrape Queue] Job ${jobId} completed`);
  });

  scrapeEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`[Scrape Queue] Job ${jobId} failed: ${failedReason}`);
  });

  scrapeEvents.on('error', (error) => {
    console.error(`[Scrape Queue] Error: ${error}`);
  });

  console.log('[Queues] Initialized: scrape, dedup, filter');
}

/**
 * Add a scrape job to the queue
 */
export async function addScrapeJob(
  data: ScrapeJobData
): Promise<string> {
  const queue = getScrapeQueue();
  const validated = ScrapeJobDataSchema.parse(data);
  const job = await queue.add('scrape', validated, {
    jobId: `scrape-${validated.source}-${Date.now()}`,
  });
  return job.id!;
}

/**
 * Add a deduplication job to the queue
 */
export async function addDedupJob(
  data: DedupJobData
): Promise<string> {
  const queue = getDedupQueue();
  const validated = DedupJobDataSchema.parse(data);
  const job = await queue.add('dedup', validated, {
    jobId: `dedup-${Date.now()}`,
  });
  return job.id!;
}

/**
 * Add a filter job to the queue
 */
export async function addFilterJob(
  data: FilterJobData
): Promise<string> {
  const queue = getFilterQueue();
  const validated = FilterJobDataSchema.parse(data);
  const job = await queue.add('filter', validated, {
    jobId: `filter-${Date.now()}`,
  });
  return job.id!;
}

/**
 * Close all queues gracefully
 */
export async function closeQueues(): Promise<void> {
  if (scrapeQueue) await scrapeQueue.close();
  if (dedupQueue) await dedupQueue.close();
  if (filterQueue) await filterQueue.close();
  console.log('[Queues] Closed gracefully');
}
