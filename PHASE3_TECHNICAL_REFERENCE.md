# Phase 3 - Technical Reference

## Complete Implementation Reference

### 1. Queue Configuration: `queue/affiliate.queue.ts`

#### Imports
```typescript
import { Queue, QueueEvents } from 'bullmq';
import { z } from 'zod';
import { getRedisClient } from '../shared/config/redis.config';
```

#### Schema Definitions
```typescript
// Input validation schemas
ScrapeJobDataSchema: {
  source: 'amazon' | 'mercadolivre' | 'shopee'
  searchQuery: string (1-200 chars)
  batchId?: string
  stage?: 'restricted' | 'express-refresh'
}

DedupJobDataSchema: {
  products: Array<{name, price, source, url}>
  batchId?: string
}

FilterJobDataSchema: {
  products: Array<{name, price, source, url}>
  batchId?: string
}
```

#### Queue Defaults
```typescript
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 3600 },
  removeOnFail: false
}
```

#### Key Functions
```typescript
getScrapeQueue(): Queue<ScrapeJobData>
getDedupQueue(): Queue<DedupJobData>
getFilterQueue(): Queue<FilterJobData>
initializeQueues(): Promise<void>
addScrapeJob(data: ScrapeJobData): Promise<string>
addDedupJob(data: DedupJobData): Promise<string>
addFilterJob(data: FilterJobData): Promise<string>
closeQueues(): Promise<void>
```

---

### 2. Workers: `workers/affiliate.worker.ts`

#### Worker Creation Pattern
```typescript
new Worker<JobDataType>(
  'queue-name',
  async (job: Job<JobDataType>) => {
    // Process job
    await job.updateProgress({ stage: 'name', progress: 0 });
    const result = await processWork(job.data);
    await job.updateProgress({ stage: 'done', progress: 100 });
    return result;
  },
  { connection: getRedisClient(), concurrency: 1 }
);
```

#### ScrapeWorker Flow
1. Extract job data: `{source, searchQuery, batchId, stage}`
2. Call Firecrawl API via `firecrawlService.scrapeSupplementsFromSource()`
3. Receive raw products array
4. Auto-queue dedup job: `dedupQueue.add('dedup', {...})`
5. Return metadata

#### DedupWorker Flow
1. Extract products array
2. Call `deduplicateProducts(products)` → deduplicated list
3. Auto-queue filter job
4. Return statistics (original, deduplicated count)

#### FilterWorker Flow
1. Extract products array
2. Call `filterOutliers(products)` → filtered list + stats
3. **Cache in Redis:** `affiliate:batch:{batchId}`
4. Return cacheKey for seed script retrieval

#### Worker Management
```typescript
startWorkers(): Promise<void>        // Create all 3 workers
stopWorkers(): Promise<void>         // Graceful shutdown
getWorkerStatus(): Promise<object>   // Check if running
```

---

### 3. Deduplication: `services/deduplication.service.ts`

#### Core Algorithm
```typescript
function extractCoreProductName(name: string): string
  // Remove: quantities (1kg, 300g), package info, common suffixes
  // Example: "Whey Protein 1kg Isolado" → "whey protein isolado"

function extractQualifiers(name: string): string[]
  // Extract: quantities, type (isolado, concentrado), flavor
  // Example: "Whey 1kg Isolado" → ["1kg", "isolado"]

function calculateSimilarity(name1: string, name2: string): number
  // Returns: 0-1 score
  // 1.0 = identical
  // 0.8+ = grouped together
  // Components: 70% word-level + 30% char-level

function groupBySimilarity(products: Product[]): Map<string, DedupMap>
  // Threshold: 80% (0.8)
  // Groups similar products together
  // Preserves qualifiers

function selectBestRepresentative(group: DedupMap): Product
  // Selection criteria:
  // 1. Cheapest price
  // 2. If tied: prefer rarer source (multi-source diversity)

export function deduplicateProducts(products: Product[]): Product[]
  // Main entry point
  // Input: 30 raw products
  // Output: ~20-30 deduplicated (varies by similarity)
```

#### Example Walkthrough
```
Input: [
  {name: "Whey Protein 1kg Isolado", price: 89.90, source: "amazon"},
  {name: "Whey Isolado 1kg", price: 95.00, source: "mercadolivre"},
  {name: "Whey Protein Isolado", price: 87.50, source: "shopee"},
  {name: "Creatina Monohidratada 300g", price: 25.50, source: "amazon"},
]

Step 1: Extract cores
  "whey protein isolado"
  "whey isolado"
  "whey protein isolado"
  "creatina monohidratada"

Step 2: Calculate similarities
  [0] ↔ [1] = 0.95 (>0.8) → group
  [0] ↔ [2] = 0.92 (>0.8) → group
  [3] ↔ others < 0.8 → separate

Step 3: Group
  Group 1: [0, 1, 2] → Whey Isolado variants
  Group 2: [3] → Creatina Monohidratada

Step 4: Select representatives
  Group 1 representative: [2] (R$87.50, cheapest)
  Group 2 representative: [3] (R$25.50, only one)

Output: [
  {name: "Whey Protein Isolado", price: 87.50, source: "shopee"},
  {name: "Creatina Monohidratada 300g", price: 25.50, source: "amazon"},
]

Result: 4 inputs → 2 outputs (50% reduction via dedup)
```

---

### 4. Filtering: `services/filtering.service.ts`

#### Statistical Method: Interquartile Range (IQR)
```
IQR Formula:
  IQR = Q3 - Q1
  Lower Bound = Q1 - 1.5 × IQR
  Upper Bound = Q3 + 1.5 × IQR
  
Outliers: prices < Lower Bound OR > Upper Bound
```

#### Algorithm
```typescript
function calculateIQRStats(prices: number[]): IQRStats
  // Returns: {q1, q2, q3, iqr, lowerBound, upperBound, min, max, mean, stdDev}

function identifyOutliers(products: Product[], stats: IQRStats)
  // Returns: {outliers, valid}
  // Uses global bounds

function identifyOutliersPerSource(products: Product[], stats: IQRStats)
  // Per-source analysis for marketplace diversity
  // If removes >30%, falls back to global

export function filterOutliers(products: Product[]): FilterResult
  // Main entry point
  // Input: 45 deduplicated products
  // Output: ~42 final products (removed outliers)
```

#### Example Walkthrough
```
Input: [R$29, R$45, R$50, R$52, R$999]

Step 1: Sort
  [R$29, R$45, R$50, R$52, R$999]

Step 2: Calculate quartiles
  Q1 (25th percentile) = R$45
  Q2 (50th percentile) = R$50
  Q3 (75th percentile) = R$52
  IQR = Q3 - Q1 = R$52 - R$45 = R$7

Step 3: Define bounds
  Lower = Q1 - 1.5×IQR = R$45 - R$10.5 = R$34.5
  Upper = Q3 + 1.5×IQR = R$52 + R$10.5 = R$62.5

Step 4: Identify outliers
  R$29 ✓ (within bounds)
  R$45 ✓ (within bounds)
  R$50 ✓ (within bounds)
  R$52 ✓ (within bounds)
  R$999 ✗ (exceeds upper bound)

Output: [R$29, R$45, R$50, R$52]
Removed: [R$999] (suspiciously expensive)

Result: 5 inputs → 4 outputs (1 outlier removed)
```

#### Per-Source Strategy
```
Prevents removing all products from expensive marketplace

Example:
  Amazon: [R$50, R$55, R$60]
  Shopee: [R$20, R$25, R$30]
  
  Global IQR would remove Shopee (too cheap)
  Per-source IQR keeps both marketplaces
```

---

### 5. Seed Stage 1: `scripts/seed-stage1.ts`

#### Execution Flow
```
main()
  ↓
connect Redis
  ↓
initializeQueues()
  ↓
startWorkers()
  ↓
queueRestrictedBatch() → 30 jobs
  ├─ 10 products (Whey, Creatina, BCAA, Colágeno, Ômega, Vitamina D, Magnésio, Zinco, Cafeína, Pré-treino)
  └─ 3 sources each (amazon, mercadolivre, shopee)
  ↓
monitorJobs() → 5 min timeout
  ├─ Check job status every 2s
  └─ Track completion/failures
  ↓
retrieveResults() → query Redis cache
  ├─ Get affiliate:batch:{batchId}
  └─ Display sample products
  ↓
cleanup()
  ├─ stopWorkers()
  ├─ closeQueues()
  └─ redis.quit()
```

#### Configuration
```typescript
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

const TIMEOUT_MS = 300000; // 5 minutes
```

#### Expected Metrics
```
Jobs: 30 (10 products × 3 sources)
Duration: 2-3 minutes
Success Rate: >95%
Final Products: 40-50 (after dedup + filter)
```

---

### 6. Seed Stage 2: `scripts/seed-stage2.ts`

#### Execution Flow
```
main()
  ↓
Connect Redis & Initialize
  ↓
chunk(FULL_CATALOG, BATCH_SIZE) → 2 batches of 20
  ↓
For each batch:
  processBatch()
    ├─ Queue 60 jobs (20 products × 3 sources)
    ├─ Monitor with 10 min timeout
    └─ Report: X/60 completed
  ↓
  Pause 10 seconds before next batch
  ↓
Summary Report
  ├─ Batch success rates
  ├─ Total jobs: 120
  ├─ Duration: ~250 seconds
  └─ Average per batch: ~125 seconds
  ↓
Cleanup
```

#### Configuration
```typescript
const FULL_CATALOG = [
  // 40 supplements across 8 categories
];

const BATCH_SIZE = process.env.REFRESH_BATCH_SIZE || 20;
const TIMEOUT_MS = process.env.REFRESH_TIMEOUT_MS || 600000; // 10 min
```

#### Environment Variables
```bash
REFRESH_BATCH_SIZE=20         # Products per batch (default: 20)
REFRESH_TIMEOUT_MS=600000     # Job timeout in ms (default: 10 min)
```

#### Expected Metrics
```
Total Products: 40
Total Jobs: 120 (40 × 3 sources)
Total Batches: 2 (20 products each)
Batch Size: 20
Duration: 4-5 minutes total
Success Rate: >95%
Final Products: 120-150 (after dedup + filter)
```

---

## Integration Points

### With Firecrawl Service
```typescript
// Existing: shared/services/firecrawl.service.ts
import firecrawlService from '../shared/services/firecrawl.service';

// In ScrapeWorker:
const products = await firecrawlService.scrapeSupplementsFromSource(source, query);
// Returns: ScrapedSupplement[]
// {name, price, source, url, directUrl?, affiliateApplied?}
```

### With Redis Config
```typescript
// Existing: shared/config/redis.config.ts
import { getRedisClient } from '../shared/config/redis.config';

const redis = getRedisClient();
// Already connected, handles reconnection
```

### With Zod Validation
```typescript
// Existing: zod dependency
import { z } from 'zod';

const schema = z.object({...});
const validated = schema.parse(data); // throws on invalid
```

---

## Error Scenarios & Handling

### Scenario 1: Firecrawl API Timeout
```
ScrapeWorker:
  ├─ Attempt 1: Timeout
  ├─ Wait 2s
  ├─ Attempt 2: Timeout
  ├─ Wait 4s
  └─ Attempt 3: Timeout → Job FAILED
  
Result: Job moved to failed queue
Recovery: Investigate API status, retry manually
```

### Scenario 2: Redis Connection Lost
```
FilterWorker:
  ├─ Try to cache result
  ├─ redis.setex() → Connection error
  ├─ Catch error, log warning
  ├─ Proceed without cache
  └─ Job COMPLETED (with partial data)

Result: Worker continues, data not cached
Impact: Seed script won't retrieve results
Recovery: Manual database insertion or retry
```

### Scenario 3: Worker Crash
```
ScrapeWorker process exits unexpectedly
  ├─ Incomplete jobs remain in queue
  ├─ Next time workers start: jobs reprocessed
  ├─ Exponential backoff applies
  └─ Eventually succeeds or max retries reached

Recommendation: Use PM2 or Docker with restart policy
```

### Scenario 4: Job Timeout
```
Job takes >job timeout to complete
  ├─ Bull marks job as stalled
  ├─ Auto-retry on next worker run
  ├─ Max attempts: 3
  └─ Remaining retries: 2

Solutions:
  - Increase timeout: jobOptions.timeout
  - Optimize job processor
  - Reduce job scope (smaller batches)
```

---

## Monitoring & Debugging

### Check Queue Status
```typescript
import { getScrapeQueue } from './queue/affiliate.queue';

const queue = getScrapeQueue();
const counts = await queue.getJobCounts();
console.log(counts);
// { active, completed, failed, delayed, waiting, paused }
```

### List Failed Jobs
```typescript
const failed = await queue.getFailed();
console.log(failed);
// Array of failed job objects
```

### Get Job Details
```typescript
const job = await queue.getJob(jobId);
console.log({
  id: job.id,
  data: job.data,
  progress: job.progress(),
  state: job.state(),
  returnValue: job.returnValue,
  failedReason: job.failedReason,
});
```

### Monitor in Real-time
```bash
# Terminal 1: Watch Redis keys
redis-cli MONITOR

# Terminal 2: Check job counts every 5s
watch -n 5 'redis-cli LLEN bull:affiliate:scrape && redis-cli LLEN bull:affiliate:scrape:active'

# Terminal 3: Watch failed jobs
watch -n 5 'redis-cli LLEN bull:affiliate:scrape:failed'
```

---

## Performance Tuning

### Increase Throughput
```typescript
// Increase worker concurrency
{ concurrency: 3 }  // Process 3 jobs simultaneously

// Trade-off: More API requests (rate limit check needed)
// Recommendation: Keep at 1 until Firecrawl quota increased
```

### Reduce Memory Usage
```typescript
// Remove completed jobs faster
removeOnComplete: { age: 600 }  // 10 minutes instead of 1 hour

// Enable compression
const queue = new Queue('name', {
  settings: {
    retryProcessDelay: 5000,
  }
});
```

### Handle Large Batches
```bash
# Process in smaller chunks
REFRESH_BATCH_SIZE=10 npm run seed:stage2  # 10 products per batch

# Results in more batches but safer
```

---

## Testing Strategy

### Unit Test Example: Deduplication
```typescript
import { deduplicateProducts } from './deduplication.service';

test('should merge similar products', () => {
  const input = [
    {name: 'Whey Protein 1kg', price: 90, source: 'amazon', url: '...'},
    {name: 'Whey Protein 1kg', price: 92, source: 'mercadolivre', url: '...'},
  ];
  
  const result = deduplicateProducts(input);
  
  expect(result.length).toBe(1);
  expect(result[0].price).toBe(90); // Cheaper one selected
});
```

### Unit Test Example: Filtering
```typescript
import { filterOutliers } from './filtering.service';

test('should remove outliers', () => {
  const input = [
    {name: 'Product', price: 29, source: 'a', url: '...'},
    {name: 'Product', price: 45, source: 'a', url: '...'},
    {name: 'Product', price: 999, source: 'a', url: '...'},
  ];
  
  const result = filterOutliers(input);
  
  expect(result.products.length).toBe(2);
  expect(result.removed[0].price).toBe(999);
});
```

### Integration Test: Full Pipeline
```bash
npm run seed:stage1

# Verify
redis-cli KEYS "affiliate:batch:*"
redis-cli GET "affiliate:batch:seed-stage1-*"
```

---

## Deployment Checklist

- [ ] Redis cluster configured (HA setup)
- [ ] Firecrawl API key set in .env
- [ ] Workers running in separate process/container
- [ ] Process manager configured (PM2, systemd, Docker)
- [ ] Job monitoring dashboard (optional: BullBoard)
- [ ] Alert on worker crashes
- [ ] Alert on failed jobs >5%
- [ ] Database storage implemented (Phase 4)
- [ ] Logs aggregated (ELK, CloudWatch)
- [ ] Backup strategy for Redis
- [ ] Rate limiting configured

---

## Size Summary

| File | Lines | Purpose |
|------|-------|---------|
| `queue/affiliate.queue.ts` | 175 | Queue setup |
| `workers/affiliate.worker.ts` | 283 | 3 worker processors |
| `services/deduplication.service.ts` | 220 | Semantic dedup |
| `services/filtering.service.ts` | 240 | IQR filtering |
| `scripts/seed-stage1.ts` | 220 | Quick test |
| `scripts/seed-stage2.ts` | 320 | Full refresh |
| **Total** | **1,658** | **Production code** |

---

## Key Takeaways

1. **BullMQ:** Production-grade job queue with Redis backend
2. **Semantic Dedup:** Preserves qualifiers while removing exact duplicates (80% similarity)
3. **IQR Filtering:** Statistical outlier removal (1.5×IQR bounds)
4. **Auto-Chaining:** Each worker auto-queues next stage
5. **Error Resilience:** 3 retries with exponential backoff
6. **Result Caching:** Redis persistence for seed script retrieval
7. **Monitoring:** Job status tracking, failure detection
8. **TypeScript:** Strict mode, Zod validation throughout
