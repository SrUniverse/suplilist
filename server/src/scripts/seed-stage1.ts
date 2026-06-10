/**
 * Seed Stage 1: Restricted Batch Processing
 * Version: 1.0.0
 *
 * Processes a restricted set of high-demand supplements
 * Controlled batch processing with queue monitoring
 *
 * Usage: npm run seed:stage1
 */

import dotenv from 'dotenv';
import { addScrapeJob, initializeQueues, closeQueues } from '../queue/affiliate.queue';
import { startWorkers, stopWorkers } from '../workers/affiliate.worker';
import { getRedisClient } from '../shared/config/redis.config';

dotenv.config();

// Core supplements to seed (restricted set)
const RESTRICTED_BATCH = [
  'Whey Protein',
  'Creatina',
  'BCAA',
  'Colágeno',
  'Ômega 3',
  'Vitamina D',
  'Magnésio',
  'Zinco',
  'Cafeína',
  'Pré-treino',
];

interface JobProgress {
  jobId: string;
  source: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
}

/**
 * Monitor job completion
 */
async function monitorJobs(
  jobIds: string[],
  timeoutMs = 300000 // 5 minutes
): Promise<void> {
  const redis = getRedisClient();
  const startTime = Date.now();
  const completed = new Set<string>();
  const failed = new Set<string>();

  console.log(
    `[Seed:Stage1] Monitoring ${jobIds.length} jobs (timeout: ${timeoutMs}ms)`
  );

  while (
    Date.now() - startTime < timeoutMs &&
    completed.size + failed.size < jobIds.length
  ) {
    for (const jobId of jobIds) {
      if (completed.has(jobId) || failed.has(jobId)) continue;

      // Check job status in Redis
      const jobKey = `bull:affiliate:scrape:${jobId}`;
      const jobData = await redis.get(jobKey);

      if (jobData) {
        const job = JSON.parse(jobData);
        if (job.finishedOn) {
          if (job.failedReason) {
            failed.add(jobId);
            console.log(
              `[Seed:Stage1] Job ${jobId} FAILED: ${job.failedReason}`
            );
          } else {
            completed.add(jobId);
            console.log(`[Seed:Stage1] Job ${jobId} COMPLETED`);
          }
        }
      }
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log(
    `[Seed:Stage1] Job monitoring complete: ${completed.size} completed, ${failed.size} failed`
  );
}

/**
 * Queue jobs for restricted batch
 */
async function queueRestrictedBatch(batchId: string): Promise<string[]> {
  const jobIds: string[] = [];
  const sources: Array<'amazon' | 'mercadolivre' | 'shopee'> = [
    'amazon',
    'mercadolivre',
    'shopee',
  ];

  console.log(`[Seed:Stage1] Queuing restricted batch (${RESTRICTED_BATCH.length} products)`);

  for (const supplement of RESTRICTED_BATCH) {
    for (const source of sources) {
      try {
        const jobId = await addScrapeJob({
          source,
          searchQuery: supplement,
          batchId,
          stage: 'restricted',
        });

        jobIds.push(jobId);
        console.log(
          `[Seed:Stage1] Queued: ${supplement} from ${source} (job: ${jobId})`
        );
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[Seed:Stage1] Failed to queue ${supplement} from ${source}: ${errorMsg}`
        );
      }
    }

    // Rate limit: 1 product every 2 seconds
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log(
    `[Seed:Stage1] Queued ${jobIds.length} jobs (${RESTRICTED_BATCH.length} products × ${sources.length} sources)`
  );

  return jobIds;
}

/**
 * Retrieve processed results from cache
 */
async function retrieveResults(batchId: string): Promise<void> {
  const redis = getRedisClient();
  const cacheKey = `affiliate:batch:${batchId}`;
  const cached = await redis.get(cacheKey);

  if (!cached) {
    console.log('[Seed:Stage1] No processed results in cache yet');
    return;
  }

  const data = JSON.parse(cached);
  console.log('[Seed:Stage1] Processed Results:', {
    total: data.stats.original,
    deduplicated: data.stats.filtered,
    removed: data.stats.removed,
    timestamp: new Date(data.timestamp).toISOString(),
  });

  console.log(
    `[Seed:Stage1] Sample Products (first 5):`
  );
  for (let i = 0; i < Math.min(5, data.products.length); i++) {
    const p = data.products[i];
    console.log(
      `  ${i + 1}. ${p.name} - R$${p.price.toFixed(2)} (${p.source})`
    );
  }
}

/**
 * Main seed execution
 */
async function main(): Promise<void> {
  const batchId = `seed-stage1-${Date.now()}`;

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       SupliList Phase 3 - Seed Stage 1: Restricted        ║');
  console.log('║                   Batch Processing                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nBatch ID: ${batchId}\n`);

  try {
    // Initialize Redis connection
    console.log('[Seed:Stage1] Connecting to Redis...');
    const redis = getRedisClient();
    await redis.ping();
    console.log('[Seed:Stage1] Redis connected\n');

    // Initialize queues
    console.log('[Seed:Stage1] Initializing queues...');
    await initializeQueues();

    // Start workers
    console.log('[Seed:Stage1] Starting workers...');
    await startWorkers();
    console.log('[Seed:Stage1] Workers started\n');

    // Queue jobs
    const jobIds = await queueRestrictedBatch(batchId);
    console.log();

    // Monitor job completion
    await monitorJobs(jobIds, 300000); // 5 minute timeout
    console.log();

    // Retrieve results
    console.log('[Seed:Stage1] Retrieving processed results...');
    await retrieveResults(batchId);
    console.log();

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    SEED COMPLETE ✓                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
  } catch (error) {
    console.error('[Seed:Stage1] Fatal error:', error);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('\n[Seed:Stage1] Cleaning up...');
    await stopWorkers();
    await closeQueues();
    const redis = getRedisClient();
    await redis.quit();
    console.log('[Seed:Stage1] Done');
  }
}

// Run
main().catch((error) => {
  console.error('[Seed:Stage1] Unhandled error:', error);
  process.exit(1);
});
