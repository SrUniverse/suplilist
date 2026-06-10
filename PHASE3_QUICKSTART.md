# Phase 3 Quick Start

## 5-Minute Setup

### 1. Install BullMQ
```bash
cd server
npm install bullmq
```

### 2. Verify Redis
```bash
# Check if running
redis-cli ping
# Should output: PONG

# If not running, start with Docker
docker run -d -p 6379:6379 redis:7
```

### 3. Configure Environment
```bash
# .env (already exists)
REDIS_URI=redis://localhost:6379
FIRECRAWL_API_KEY=your_key_here
```

### 4. Build
```bash
npm run build
```

### 5. Start Workers (Terminal 1)
```bash
npm run workers:start
```

You should see:
```
[Workers] Started: scrape, dedup, filter
```

### 6. Run Seed (Terminal 2)
```bash
# Quick test (10 products, ~2 minutes)
npm run seed:stage1

# Full catalog (40 products, ~5 minutes)
npm run seed:stage2
```

## What Each Component Does

| File | Purpose | Lines |
|------|---------|-------|
| `queue/affiliate.queue.ts` | BullMQ queue setup | 175 |
| `workers/affiliate.worker.ts` | Job processing (3 workers) | 283 |
| `services/deduplication.service.ts` | Remove duplicates | 220 |
| `services/filtering.service.ts` | Remove price outliers | 240 |
| `scripts/seed-stage1.ts` | Test with 10 products | 220 |
| `scripts/seed-stage2.ts` | Full refresh with 40 products | 320 |

## Data Flow

```
┌─────────────┐
│ Seed Script │
└──────┬──────┘
       │ Queue 30 jobs (10 products × 3 sources)
       ↓
┌─────────────────────┐
│  Scrape Queue       │ → ScrapeWorker → Firecrawl API
└──────┬──────────────┘
       │ Auto-queue dedup jobs
       ↓
┌─────────────────────┐
│  Dedup Queue        │ → DedupWorker → Remove duplicates (80% similarity)
└──────┬──────────────┘
       │ Auto-queue filter jobs
       ↓
┌─────────────────────┐
│  Filter Queue       │ → FilterWorker → Remove outliers (IQR)
└──────┬──────────────┘
       │ Save to Redis cache
       ↓
┌─────────────────────┐
│ Redis Cache         │ → Seed script retrieves results
└─────────────────────┘
```

## Expected Output

### Stage 1 (10 products, ~2 min)
```
╔════════════════════════════════════════════════════════════╗
║       SupliList Phase 3 - Seed Stage 1: Restricted        ║
╚════════════════════════════════════════════════════════════╝

[Seed:Stage1] Queued 30 jobs (10 products × 3 sources)
[Seed:Stage1] Job monitoring complete: 30 completed, 0 failed

Results:
- Whey Protein: R$89.90 (amazon)
- Creatina: R$25.50 (shopee)
- (27 more products)

Total processed: 30 raw → 45 deduplicated → 42 final
```

### Stage 2 (40 products, ~5 min)
```
╔════════════════════════════════════════════════════════════╗
║     SupliList Phase 3 - Seed Stage 2: Express Refresh     ║
╚════════════════════════════════════════════════════════════╝

Batch 1: 60/60 completed (100%)
Batch 2: 60/60 completed (100%)

Total: 120/120 jobs completed (100%)
Duration: 245 seconds
```

## Troubleshooting

### "Redis connection failed"
```bash
# Check Redis is running
redis-cli ping

# If not running
docker run -d -p 6379:6379 redis:7

# Update .env if needed
REDIS_URI=redis://localhost:6379
```

### "FIRECRAWL_API_KEY not configured"
```bash
# Set in .env
FIRECRAWL_API_KEY=your_actual_key

# Or via environment
export FIRECRAWL_API_KEY=your_key
npm run seed:stage1
```

### "Workers not processing jobs"
```bash
# Ensure workers are running in separate terminal
npm run workers:start

# Check Redis for queue keys
redis-cli KEYS "bull:*"
```

### "Jobs stuck in queue"
```bash
# Check failed jobs
redis-cli LLEN bull:affiliate:scrape:failed

# Inspect failed job
redis-cli LPOP bull:affiliate:scrape:failed

# Clear failed queue (dev only!)
redis-cli DEL bull:affiliate:scrape:failed
```

## Common Commands

```bash
# Check queue status
redis-cli
> KEYS "bull:*"
> LLEN bull:affiliate:scrape
> HGETALL bull:affiliate:scrape:job:*

# Monitor in real-time
redis-cli MONITOR

# Get processed results
redis-cli GET "affiliate:batch:*"
```

## Performance Tips

### Slow Processing?
```bash
# Check Firecrawl API plan (rate limiting)
# Check Redis memory usage
redis-cli INFO memory

# Increase batch timeout
REFRESH_TIMEOUT_MS=900000 npm run seed:stage2
```

### Too Many Failures?
```bash
# Enable debug logging
NODE_ENV=development npm run workers:start

# Check failed jobs
redis-cli LRANGE bull:affiliate:scrape:failed 0 10
```

## Next Steps

1. ✅ Phase 3 complete (async motor)
2. ⬜ Phase 4: Save to database (MongoDB/PostgreSQL)
3. ⬜ Phase 5: API endpoints (search, filter, sort)
4. ⬜ Phase 6: Real-time updates (WebSocket, notifications)

## File Locations

```
server/
├── src/
│   ├── queue/
│   │   └── affiliate.queue.ts          ← Queue setup
│   ├── workers/
│   │   └── affiliate.worker.ts         ← Worker logic
│   ├── services/
│   │   ├── deduplication.service.ts    ← Semantic dedup
│   │   └── filtering.service.ts        ← IQR filtering
│   ├── scripts/
│   │   ├── seed-stage1.ts              ← Quick test
│   │   └── seed-stage2.ts              ← Full refresh
│   └── PHASE3_ASYNC_MOTOR.md           ← Full docs
├── package.json                         ← Added bullmq
└── dist/                                ← Compiled output
```

## Support

- Full documentation: `server/src/PHASE3_ASYNC_MOTOR.md`
- Implementation details: `PHASE3_IMPLEMENTATION_SUMMARY.md`
- BullMQ docs: https://docs.bullmq.io/
- Redis docs: https://redis.io/docs/
