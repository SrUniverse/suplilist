/**
 * Seed Stage 2: Express Refresh
 * Version: 1.0.0
 *
 * Full product catalog refresh with extended timeout
 * Designed for periodic background updates (daily/weekly)
 *
 * Usage: npm run seed:stage2
 *
 * Environment:
 * - REFRESH_BATCH_SIZE: Number of products per batch (default: 20)
 * - REFRESH_TIMEOUT_MS: Job timeout in milliseconds (default: 600000 = 10min)
 */

import dotenv from 'dotenv';
import { addScrapeJob, initializeQueues, closeQueues } from '../queue/affiliate.queue.js';
import { startWorkers, stopWorkers, getWorkerStatus } from '../workers/affiliate.worker.js';
import { getRedisClient } from '../shared/config/redis.config.js';

dotenv.config();

// Extended product list for full refresh
const FULL_CATALOG = [
  // Proteins & Amino Acids
  'Whey Protein',
  'Whey Isolado',
  'Whey Concentrado',
  'Caseína',
  'Albumina',
  'BCAA',
  'EAA',
  'Glutamina',

  // Creatine variants
  'Creatina Monohidratada',
  'Creatina Micronizada',
  'Creatina Hidratada',

  // Joint & Recovery
  'Colágeno Hidrolisado',
  'Colágeno Puro',
  'Glucosamina',
  'Condroitina',

  // Omega & Fats
  'Ômega 3',
  'Ômega 6',
  'Ômega 9',
  'Óleo de Peixe',

  // Vitamins & Minerals
  'Vitamina D',
  'Vitamina C',
  'Complexo B',
  'Magnésio',
  'Zinco',
  'Ferro',
  'Cálcio',

  // Energy & Performance
  'Cafeína',
  'Pré-treino',
  'Termogênico',
  'Melatonina',

  // Digestive & Immune
  'Probiótico',
  'Colostro',
  'Imunidade Plus',

  // Growth & Hormones
  'Tribulus Terrestris',
  'Tribullus',
  'ZMA',
  'D-Aspartato',
];

const BATCH_SIZE = parseInt(process.env.REFRESH_BATCH_SIZE || '20', 10);
const TIMEOUT_MS = parseInt(
  process.env.REFRESH_TIMEOUT_MS || '600000',
  10
); // 10 minutes default

interface BatchResult {
  batchId: string;
  supplements: string[];
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
}

/**
 * Split array into chunks
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Process a single batch of supplements
 */
async function processBatch(
  supplements: string[],
  batchIndex: number,
  totalBatches: number
): Promise<BatchResult> {
  const redis = getRedisClient();
  const batchId = `seed-stage2-batch-${batchIndex}-${Date.now()}`;
  const jobIds: string[] = [];
  const sources: Array<'amazon' | 'mercadolivre' | 'shopee'> = [
    'amazon',
    'mercadolivre',
    'shopee',
  ];

  console.log(
    `\n[Refresh] Processing batch ${batchIndex + 1}/${totalBatches}`
  );
  console.log(`[Refresh] Products: ${supplements.join(', ')}`);

  // Queue jobs for batch
  for (const supplement of supplements) {
    for (const source of sources) {
      try {
        const jobId = await addScrapeJob({
          source,
          searchQuery: supplement,
          batchId,
          stage: 'express-refresh',
        });

        jobIds.push(jobId);
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[Refresh] Failed to queue ${supplement} from ${source}: ${errorMsg}`
        );
      }
    }

    // Rate limit between products
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(`[Refresh] Queued ${jobIds.length} jobs for batch`);

  // Monitor batch completion
  const startTime = Date.now();
  let completedCount = 0;
  let failedCount = 0;

  while (
    Date.now() - startTime < TIMEOUT_MS &&
    completedCount + failedCount < jobIds.length
  ) {
    for (const jobId of jobIds) {
      const jobKey = `bull:affiliate:scrape:${jobId}`;
      const jobData = await redis.get(jobKey);

      if (jobData) {
        const job = JSON.parse(jobData);
        if (job.finishedOn) {
          if (job.failedReason) {
            failedCount++;
          } else {
            completedCount++;
          }
        }
      }
    }

    // Update progress
    const progress = completedCount + failedCount;
    const percent = Math.round((progress / jobIds.length) * 100);
    console.log(
      `[Refresh] Batch progress: ${progress}/${jobIds.length} (${percent}%)`
    );

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  console.log(
    `[Refresh] Batch complete: ${completedCount} successful, ${failedCount} failed`
  );

  return {
    batchId,
    supplements,
    totalJobs: jobIds.length,
    completedJobs: completedCount,
    failedJobs: failedCount,
  };
}

/**
 * Main refresh execution
 */
async function main(): Promise<void> {
  const startTime = Date.now();
  const batchGroups = chunk(FULL_CATALOG, BATCH_SIZE);
  const results: BatchResult[] = [];

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     SupliList Phase 3 - Seed Stage 2: Express Refresh     ║');
  console.log('║              Full Catalog Update                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(
    `\nConfiguration:\n  Batch Size: ${BATCH_SIZE} products\n  Timeout: ${TIMEOUT_MS}ms\n  Total Batches: ${batchGroups.length}\n`
  );

  try {
    // Initialize
    console.log('[Refresh] Connecting to Redis...');
    const redis = getRedisClient();
    await redis.ping();
    console.log('[Refresh] Redis connected');

    console.log('[Refresh] Initializing queues...');
    await initializeQueues();

    console.log('[Refresh] Starting workers...');
    await startWorkers();

    // Show worker status
    const workerStatus = await getWorkerStatus();
    console.log('[Refresh] Worker Status:', workerStatus);
    console.log();

    // Process batches sequentially
    for (let i = 0; i < batchGroups.length; i++) {
      const result = await processBatch(batchGroups[i], i, batchGroups.length);
      results.push(result);

      // Pause between batches to avoid overwhelming workers
      if (i < batchGroups.length - 1) {
        console.log('[Refresh] Pausing between batches (10 seconds)...');
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }

    // Summary
    console.log(
      '\n╔════════════════════════════════════════════════════════════╗'
    );
    console.log('║                  REFRESH SUMMARY                        ║');
    console.log(
      '╚════════════════════════════════════════════════════════════╝'
    );

    let totalJobs = 0;
    let totalCompleted = 0;
    let totalFailed = 0;

    for (const batch of results) {
      totalJobs += batch.totalJobs;
      totalCompleted += batch.completedJobs;
      totalFailed += batch.failedJobs;
      const percent = batch.totalJobs > 0
        ? Math.round((batch.completedJobs / batch.totalJobs) * 100)
        : 0;
      console.log(
        `Batch ${results.indexOf(batch) + 1}: ${batch.completedJobs}/${batch.totalJobs} (${percent}%) ✓`
      );
    }

    const successRate = totalJobs > 0
      ? Math.round((totalCompleted / totalJobs) * 100)
      : 0;
    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(
      `\nTotal: ${totalCompleted}/${totalJobs} jobs completed (${successRate}%)`
    );
    console.log(`Duration: ${duration} seconds`);
    console.log(`Average: ${Math.round(duration / results.length)}s per batch\n`);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    REFRESH COMPLETE ✓                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
  } catch (error) {
    console.error('[Refresh] Fatal error:', error);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('\n[Refresh] Cleaning up...');
    await stopWorkers();
    await closeQueues();
    const redis = getRedisClient();
    await redis.quit();
    console.log('[Refresh] Done');
  }
}

// Run
main().catch((error) => {
  console.error('[Refresh] Unhandled error:', error);
  process.exit(1);
});
