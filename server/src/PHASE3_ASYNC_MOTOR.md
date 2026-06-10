# SupliList Phase 3: Async Motor with BullMQ

## Overview

Phase 3 implements a production-grade async job queue system for affiliate data processing using BullMQ, Redis, and 3 worker pools.

**Architecture:**
```
Scrape Queue → Dedup Queue → Filter Queue → Database
   (1 worker)    (1 worker)    (1 worker)
```

## Components

### 1. Queue Configuration (`queue/affiliate.queue.ts`)

Defines job schemas and queue factories with BullMQ.

**Queues:**
- `affiliate:scrape` - Web scraping via Firecrawl
- `affiliate:dedup` - Semantic deduplication
- `affiliate:filter` - IQR-based outlier removal

**Key Features:**
- Zod validation for all job data
- Exponential backoff on failures (3 retries)
- Auto-cleanup of completed jobs after 1 hour
- Job event monitoring

### 2. Workers (`workers/affiliate.worker.ts`)

Three independent workers processing the pipeline.

**ScrapeWorker:**
- Concurrency: 1 (controlled parallelism)
- Calls Firecrawl API to extract product data
- Auto-queues deduplication job on success
- Logs progress at 10%, 50%, 100%

**DedupWorker:**
- Semantic grouping: trim + lowercase + preserve qualifiers
- Similarity threshold: 80%
- Selects cheapest representative per group
- Auto-queues filter job

**FilterWorker:**
- IQR statistics: Q1, Q2, Q3, bounds
- Removes prices outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR]
- Per-source analysis to preserve marketplace diversity
- Stores results in Redis cache for seed scripts

### 3. Deduplication Service (`services/deduplication.service.ts`)

Semantic duplicate detection and merging.

**Algorithm:**
1. Extract core product name (remove quantities and package info)
2. Calculate similarity score (char + word level)
3. Group products >80% similar
4. Select best representative (cheapest, multi-source preferred)

**Example:**
```
Input:  [
  "Whey Protein 1kg Isolado",
  "Whey Protein 1kg Isolado",  // duplicate
  "Whey Isolado 1kg",           // similar
]
Output: [
  "Whey Protein 1kg Isolado"    // one representative
]
```

### 4. Filtering Service (`services/filtering.service.ts`)

Statistical outlier detection using IQR method.

**Algorithm:**
1. Calculate quartiles (Q1, Q2, Q3) from price distribution
2. Define bounds: [Q1 - 1.5*IQR, Q3 + 1.5*IQR]
3. Remove products outside bounds
4. Prefer per-source filtering to preserve marketplace diversity

**Example:**
```
Input:  [R$29, R$45, R$50, R$52, R$999]  // R$999 is outlier
Stats:  Q1=45, Q3=52, IQR=7, bounds=[34.5, 62.5]
Output: [R$29, R$45, R$50, R$52]         // R$999 removed
```

### 5. Seed Scripts

#### Stage 1: Restricted Batch (`scripts/seed-stage1.ts`)

Controlled testing with core supplements.

**Products:** 10 core supplements
- Whey Protein, Creatina, BCAA, Colágeno, Ômega 3, Vitamina D, Magnésio, Zinco, Cafeína, Pré-treino

**Flow:**
```
Queue 10 × 3 sources = 30 jobs
↓
Monitor completion (5 min timeout)
↓
Retrieve results from Redis cache
↓
Log processed products
```

**Usage:**
```bash
npm run seed:stage1
```

#### Stage 2: Express Refresh (`scripts/seed-stage2.ts`)

Full catalog refresh with batch processing.

**Products:** 40 supplements across 8 categories
- Proteins (8), Creatine (3), Recovery (3), Omega (3), Vitamins (7), Energy (4), Digestive (3), Growth (3)

**Flow:**
```
Split into 20-product batches
↓
Process sequentially (10s pause between)
↓
Monitor each batch (10 min timeout)
↓
Generate summary statistics
↓
Calculate success rate and duration
```

**Configuration:**
```bash
REFRESH_BATCH_SIZE=20 npm run seed:stage2      # Default: 20 products per batch
REFRESH_TIMEOUT_MS=600000 npm run seed:stage2  # Default: 10 minutes
```

## Installation

### 1. Install Dependencies

```bash
npm install bullmq
```

### 2. Configure Environment

```env
# Redis (required)
REDIS_URI=redis://localhost:6379

# Firecrawl (required for scraping)
FIRECRAWL_API_KEY=your_api_key

# Affiliate codes (optional, defaults provided)
AFFILIATE_CODE_AMAZON=suplilist01-20
AFFILIATE_CODE_MERCADOLIVRE=matt:suplilist:35217033
AFFILIATE_CODE_SHOPEE=
```

### 3. Ensure Redis is Running

```bash
# Docker
docker run -d -p 6379:6379 redis:7

# Or local Redis
redis-server
```

## Usage

### Starting Workers

Workers must run continuously in production (separate process/container).

```bash
# Development
tsx src/workers/affiliate.worker.ts

# Production
npm run build
node dist/workers/affiliate.worker.js
```

### Running Seed Scripts

#### Test Stage 1 (10 products, quick feedback)

```bash
npm run seed:stage1
```

**Output:**
```
╔════════════════════════════════════════════════════════════╗
║       SupliList Phase 3 - Seed Stage 1: Restricted        ║
║                   Batch Processing                        ║
╚════════════════════════════════════════════════════════════╝

Batch ID: seed-stage1-1718372847123

[Seed:Stage1] Connecting to Redis...
[Seed:Stage1] Redis connected

[Seed:Stage1] Initializing queues...
[Seed:Stage1] Initializing queues...
[Seed:Stage1] Starting workers...
[Seed:Stage1] Workers started

[Seed:Stage1] Queuing restricted batch (10 products)
[Seed:Stage1] Queued: Whey Protein from amazon (job: scrape-amazon-1718372847150)
...
[Seed:Stage1] Queued 30 jobs (10 products × 3 sources)

[Seed:Stage1] Monitoring 30 jobs (timeout: 300000ms)
[Seed:Stage1] Job monitoring complete: 30 completed, 0 failed

[Seed:Stage1] Processed Results:
  total: 30,
  deduplicated: 45,
  removed: 3,
  timestamp: 2024-06-13T10:20:47.123Z

[Seed:Stage1] Sample Products (first 5):
  1. Whey Protein - R$89.90 (amazon)
  2. Whey Protein Isolado - R$120.00 (mercadolivre)
  ...

╔════════════════════════════════════════════════════════════╗
║                    SEED COMPLETE ✓                        ║
╚════════════════════════════════════════════════════════════╝
```

#### Full Refresh (40 products, batch processing)

```bash
npm run seed:stage2
```

**Output:**
```
╔════════════════════════════════════════════════════════════╗
║     SupliList Phase 3 - Seed Stage 2: Express Refresh     ║
║              Full Catalog Update                          ║
╚════════════════════════════════════════════════════════════╝

Configuration:
  Batch Size: 20 products
  Timeout: 600000ms
  Total Batches: 2

[Refresh] Connecting to Redis...
[Refresh] Redis connected
[Refresh] Initializing queues...
[Refresh] Starting workers...

[Refresh] Processing batch 1/2
[Refresh] Products: Whey Protein, Whey Isolado, ...
[Refresh] Queued 60 jobs for batch
[Refresh] Batch progress: 60/60 (100%)
[Refresh] Batch complete: 60 successful, 0 failed

[Refresh] Processing batch 2/2
...

╔════════════════════════════════════════════════════════════╗
║                  REFRESH SUMMARY                        ║
╚════════════════════════════════════════════════════════════╝

Batch 1: 60/60 (100%) ✓
Batch 2: 60/60 (100%) ✓

Total: 120/120 jobs completed (100%)
Duration: 245 seconds
Average: 122s per batch

╔════════════════════════════════════════════════════════════╗
║                    REFRESH COMPLETE ✓                    ║
╚════════════════════════════════════════════════════════════╝
```

## Data Flow

### 1. Scraping
```
[Seed Script] 
  ↓ (add job)
[Scrape Queue]
  ↓ (process)
[ScrapeWorker] → [Firecrawl API] → 30 products (raw)
  ↓ (add job)
[Dedup Queue]
```

### 2. Deduplication
```
[Dedup Queue]
  ↓ (process: semantic grouping)
[DedupWorker] → 45 products (merged similar)
  ↓ (add job)
[Filter Queue]
```

### 3. Filtering
```
[Filter Queue]
  ↓ (process: IQR outlier removal)
[FilterWorker] → 42 products (final)
  ↓ (store in Redis)
[Redis Cache: affiliate:batch:*]
```

### 4. Retrieval
```
[Seed Script]
  ↓ (query)
[Redis] → Product list for database insertion
```

## Error Handling

### Job Failures

**Automatic Retry:**
- Max attempts: 3
- Backoff: exponential (2s, 4s, 8s)
- Failed jobs kept in queue for manual inspection

**Check Failed Jobs:**
```bash
# Using Redis CLI
redis-cli
> LLEN bull:affiliate:scrape:failed
> LPOP bull:affiliate:scrape:failed
```

### Worker Errors

**Logging:**
- All errors logged with context (jobId, data, message)
- Worker crashes logged to stderr
- Graceful shutdown on fatal error

**Recovery:**
1. Worker process restarts (via supervisor like PM2)
2. Incomplete jobs automatically retried (BullMQ)
3. Failed jobs moved to failed queue for inspection

## Performance Tuning

### Concurrency
- Default: 1 worker per queue
- Increase for parallel processing:
  ```typescript
  // workers/affiliate.worker.ts
  { concurrency: 3 }  // Process 3 jobs simultaneously
  ```

### Timeouts
- Scrape timeout: 30s per page
- Job timeout: inherits from job options
- Worker loop: 2s check interval

### Rate Limiting
- Firecrawl: 3 requests/day (production plan)
- Seed script: 2s pause between products

### Redis Optimization
- Connection pooling: via ioredis
- Compression: for large job data (optional)
- Expiry: completed jobs after 1 hour

## Monitoring

### Queue Status
```typescript
import { getScrapeQueue } from './queue/affiliate.queue';

const queue = getScrapeQueue();
const counts = await queue.getJobCounts();
console.log(counts);
// { active, completed, failed, delayed, ... }
```

### Worker Health
```typescript
import { getWorkerStatus } from './workers/affiliate.worker';

const status = await getWorkerStatus();
console.log(status);
// { scrape: {isRunning, isPaused}, ... }
```

## Integration with Database

**Next Phase (Phase 4):**
1. Retrieve results from Redis cache
2. Transform product format to database schema
3. Bulk insert into MongoDB/PostgreSQL
4. Update cache with DB IDs

**Sample Integration:**
```typescript
// Phase 4: store-products.service.ts
async function storeProcessedProducts(batchId: string) {
  const cacheKey = `affiliate:batch:${batchId}`;
  const cached = await redisClient.get(cacheKey);
  const { products } = JSON.parse(cached);
  
  // Insert to database
  await productCollection.insertMany(products);
  
  // Cleanup cache
  await redisClient.del(cacheKey);
}
```

## TypeScript Strict Mode

All files use TypeScript strict mode:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

## Testing

**Unit Tests (future):**
- Deduplication logic: 100+ products
- Filtering algorithm: edge cases (empty, single, duplicates)
- Queue operations: job queuing, completion

**Integration Tests:**
- Full pipeline: scrape → dedup → filter
- Error scenarios: API failure, timeout, invalid data
- Worker recovery: crash and restart

## Production Checklist

- [ ] Redis cluster configured (HA setup)
- [ ] Workers running in separate process/container
- [ ] Job monitoring dashboard (optional: BullBoard UI)
- [ ] Alert on worker crashes
- [ ] Database cleanup strategy (archive old batches)
- [ ] Rate limiting configured per Firecrawl plan
- [ ] Logs centralized (ELK, CloudWatch, etc.)
- [ ] Backups for Redis persistence
- [ ] Graceful shutdown on SIGTERM

## Files Created

1. `queue/affiliate.queue.ts` - Queue configuration
2. `workers/affiliate.worker.ts` - Worker implementation
3. `services/deduplication.service.ts` - Semantic dedup
4. `services/filtering.service.ts` - IQR filtering
5. `scripts/seed-stage1.ts` - Restricted batch seed
6. `scripts/seed-stage2.ts` - Express refresh seed
7. `package.json` - Updated dependencies

## Dependencies Added

```json
{
  "bullmq": "^5.11.0"
}
```

## Next Steps

- **Phase 4:** Database integration (MongoDB/PostgreSQL insertion)
- **Phase 5:** API endpoints for product search and filters
- **Phase 6:** Real-time price updates and notifications
