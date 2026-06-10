# FASE 4: Exemplos de Integração

## Integração com Endpoints JIT

### Exemplo 1: JIT Endpoint com Timeout e Métrica

```typescript
// routes/jit.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { recordConversionMetrics } from '../shared/utils/metrics.js';
import { jitTimeoutTotal } from '../shared/utils/metrics.js';
import { logJIT, logError } from '../shared/utils/logger.js';

export const jitRouter = Router();

jitRouter.post('/convert', async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = (req as any).id;

  try {
    // Log inicio
    logJIT('conversion_started', req.user?.id || 'anonymous', {
      source: req.body.source,
      requestId,
    });

    // Setup timeout
    const timeoutMs = 10000; // 10 segundos
    const timeoutPromise = new Promise((_resolve, reject) => {
      setTimeout(() => {
        reject(new Error('JIT conversion timeout'));
      }, timeoutMs);
    });

    // Race entre conversão e timeout
    const result = await Promise.race([
      jitService.convert(req.body),
      timeoutPromise,
    ]);

    const durationSeconds = (Date.now() - startTime) / 1000;
    recordConversionMetrics(req.body.source, durationSeconds);

    logJIT('conversion_completed', req.user?.id || 'anonymous', {
      source: req.body.source,
      requestId,
      duration_ms: Date.now() - startTime,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    const durationSeconds = (Date.now() - startTime) / 1000;

    if (error instanceof Error && error.message.includes('timeout')) {
      // Registrar timeout
      jitTimeoutTotal.inc({ reason: 'service_slow' });
      recordConversionMetrics(req.body.source, durationSeconds, 'timeout');

      logJIT('conversion_timeout', req.user?.id || 'anonymous', {
        source: req.body.source,
        requestId,
        duration_ms: Date.now() - startTime,
      });

      return res.status(504).json({
        success: false,
        error: 'conversion_timeout',
        message: 'Conversion took too long',
      });
    }

    // Registrar outro erro
    recordConversionMetrics(
      req.body.source,
      durationSeconds,
      error instanceof Error ? error.message : 'unknown',
    );

    logError('JIT conversion failed', error as Error, {
      source: req.body.source,
      requestId,
    });

    next(error);
  }
});
```

---

## Integração com BullMQ Worker

### Exemplo 2: Worker Job com Métricas

```typescript
// workers/supplement-crawler.worker.ts
import { Queue, Worker } from 'bullmq';
import { recordWorkerMetrics } from '../shared/utils/metrics.js';
import { workerQueueDepth } from '../shared/utils/metrics.js';
import { logWorkerJob } from '../shared/utils/logger.js';
import { redisClient } from '../shared/infrastructure/redis/redis.client.js';

const crawlQueue = new Queue('supplement-crawl', {
  connection: redisClient,
});

// Track queue depth
setInterval(async () => {
  const count = await crawlQueue.count();
  workerQueueDepth.set({ queue_name: 'supplement-crawl' }, count);
}, 30000); // every 30 seconds

const worker = new Worker('supplement-crawl', async (job) => {
  const startTime = Date.now();
  const jobId = job.id || 'unknown';
  const jobData = job.data as { source: string; itemId: string };

  logWorkerJob('crawl-supplement', jobId, 'started');

  try {
    // Simule crawl
    const result = await crawlSupplementFromSource(jobData.source, jobData.itemId);

    const durationSeconds = (Date.now() - startTime) / 1000;
    recordWorkerMetrics('crawl-supplement', 'success', durationSeconds);

    logWorkerJob('crawl-supplement', jobId, 'completed', Date.now() - startTime);

    return { success: true, data: result };
  } catch (error) {
    const durationSeconds = (Date.now() - startTime) / 1000;
    recordWorkerMetrics('crawl-supplement', 'failed', durationSeconds);

    logWorkerJob(
      'crawl-supplement',
      jobId,
      'failed',
      Date.now() - startTime,
      error instanceof Error ? error.message : 'unknown',
    );

    // Retry logic
    throw error;
  }
}, {
  connection: redisClient,
  concurrency: 5,
});

// Worker event listeners
worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});
```

---

## Integração com Cache Service

### Exemplo 3: Cache com Métricas

```typescript
// shared/services/cache.service.ts
import { recordCacheMetrics } from '../utils/metrics.js';
import { logCache } from '../utils/logger.js';

export class CacheService {
  async get<T>(key: string, requestId?: string): Promise<T | null> {
    const startTime = Date.now();
    try {
      const value = await this.redis.get(key);
      const durationSeconds = (Date.now() - startTime) / 1000;
      const hit = value !== null;

      recordCacheMetrics('get', this.extractKeyType(key), hit, durationSeconds);
      logCache('get', key, hit, requestId);

      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get failed:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl = 3600): Promise<void> {
    const startTime = Date.now();
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      const durationSeconds = (Date.now() - startTime) / 1000;

      recordCacheMetrics('set', this.extractKeyType(key), true, durationSeconds);
    } catch (error) {
      console.error('Cache set failed:', error);
    }
  }

  private extractKeyType(key: string): string {
    // supplement:123 -> supplement
    return key.split(':')[0];
  }
}
```

---

## Integração com Database Queries

### Exemplo 4: DB Query Metrics

```typescript
// shared/utils/db-metrics.ts
import { recordDbMetrics } from './metrics.js';
import { logDbOperation } from './logger.js';

export async function withDbMetrics<T>(
  operation: string,
  collection: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await fn();
    const durationSeconds = (Date.now() - startTime) / 1000;

    recordDbMetrics(operation, collection, durationSeconds);
    logDbOperation(operation, collection, Date.now() - startTime);

    return result;
  } catch (error) {
    const durationSeconds = (Date.now() - startTime) / 1000;
    const errorMsg = error instanceof Error ? error.message : 'unknown';

    recordDbMetrics(operation, collection, durationSeconds);
    logDbOperation(operation, collection, Date.now() - startTime, errorMsg);

    throw error;
  }
}

// Usage:
// const user = await withDbMetrics(
//   'findById',
//   'users',
//   () => User.findById(userId),
// );
```

---

## Integração com Outbox Pattern

### Exemplo 5: Outbox Event Processing

```typescript
// shared/infrastructure/jobs/outbox-processor.job.ts
import { outboxEventsProcessedTotal } from '../utils/metrics.js';
import { logWorkerJob } from '../utils/logger.js';

export class OutboxProcessorJob {
  static async execute(): Promise<void> {
    const startTime = Date.now();
    const jobId = `outbox_${Date.now()}`;

    logWorkerJob('outbox-processor', jobId, 'started');

    try {
      const events = await OutboxEvent.find({ processed: false }).limit(100);

      for (const event of events) {
        try {
          await eventBus.publish(event.payload);
          event.processed = true;
          await event.save();
          outboxEventsProcessedTotal.inc({ status: 'success' });
        } catch (error) {
          console.error('Failed to process outbox event:', error);
          outboxEventsProcessedTotal.inc({ status: 'failed' });
        }
      }

      logWorkerJob(
        'outbox-processor',
        jobId,
        'completed',
        Date.now() - startTime,
      );
    } catch (error) {
      logWorkerJob(
        'outbox-processor',
        jobId,
        'failed',
        Date.now() - startTime,
        error instanceof Error ? error.message : 'unknown',
      );

      throw error;
    }
  }
}
```

---

## Integração com Rate Limit

### Exemplo 6: Rate Limit Metrics

```typescript
// middleware/rate-limit.middleware.ts
import { rateLimitHitsTotal } from '../shared/utils/metrics.js';

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    handler: (req, res) => {
      // Record metric
      rateLimitHitsTotal.inc({ endpoint: normalizeEndpoint(req.path) });

      res.status(429).json({
        error: 'too_many_requests',
        message: 'Rate limit exceeded',
      });
    },
  });

  limiter(req, res, next);
}
```

---

## Prometheus PromQL Queries Úteis

### Latência p95 por endpoint
```
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Taxa de erro atual
```
increase(http_requests_total{status=~"5.."}[5m]) /
increase(http_requests_total[5m])
```

### Taxa de sucesso de jobs
```
rate(worker_jobs_total{status="success"}[5m]) /
(rate(worker_jobs_total{status="success"}[5m]) +
 rate(worker_jobs_total{status="failed"}[5m]))
```

### Eficiência de cache
```
sum(rate(cache_hits_total[5m])) /
(sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))
```

### Profundidade média da fila
```
avg_over_time(worker_queue_depth[5m])
```

---

## Testing Metrics Localmente

### 1. Gerar traffic
```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Generate requests
while true; do
  curl -X POST http://localhost:5000/api/jit/convert \
    -H "Content-Type: application/json" \
    -d '{"source":"firecrawl","url":"..."}'
  sleep 1
done
```

### 2. View metrics
```bash
curl http://localhost:5000/metrics | grep http_requests_total
```

### 3. Prometheus UI
http://localhost:9090/graph

### 4. Grafana Dashboard
http://localhost:3000 (admin/admin)

---

## Load Testing com k6

```javascript
// tests/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  // Test JIT endpoint
  let res = http.post('http://localhost:5000/api/jit/convert', {
    source: 'firecrawl',
    url: 'https://example.com',
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
```

```bash
# Run test
k6 run tests/load-test.js

# Watch metrics
curl http://localhost:5000/metrics
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/metrics.yml
name: Check Metrics

on: [push, pull_request]

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Start containers
        run: docker compose up -d
      
      - name: Wait for API
        run: npm install -g wait-on && wait-on http://localhost:5000/metrics
      
      - name: Test metrics endpoint
        run: |
          curl -f http://localhost:5000/metrics || exit 1
          curl -f http://localhost:9090/-/healthy || exit 1
      
      - name: Cleanup
        run: docker compose down
```
