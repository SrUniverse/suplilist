# Performance Optimization Guide

Based on load testing results, this guide provides actionable recommendations for improving SupliList's performance.

## Quick Reference

| Issue | Impact | Priority | Effort | Solution |
|-------|--------|----------|--------|----------|
| High response time | p95 > 500ms | Critical | Medium | Database indexing, caching |
| High error rate | > 5% | Critical | Medium | Resource limits, error handling |
| Low throughput | < 1000 RPS | High | High | Horizontal scaling |
| Memory usage | > 80% | High | Low | Heap size, garbage collection |
| CPU usage | > 80% | High | Medium | Query optimization, caching |

## Database Optimization

### 1. Query Optimization

#### Identify Slow Queries
```javascript
// MongoDB profiling
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(10)

// Review slow queries
db.system.profile.aggregate([
  { $match: { millis: { $gt: 100 } } },
  { $group: {
      _id: "$op",
      count: { $sum: 1 },
      avgMs: { $avg: "$millis" }
    }
  },
  { $sort: { avgMs: -1 } }
])
```

#### Optimization Techniques
```javascript
// 1. Add compound indexes
db.supplements.createIndex({ category: 1, popularity: -1 })

// 2. Use projection to reduce data transfer
db.supplements.find(
  { category: "protein" },
  { id: 1, name: 1, price: 1 }  // Only needed fields
).limit(20)

// 3. Use aggregation pipeline for complex queries
db.supplements.aggregate([
  { $match: { category: "protein" } },
  { $group: { _id: "$brand", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 10 }
])

// 4. Batch similar queries
// Instead of N requests:
for (let id of ids) {
  const item = await Supplement.findById(id)
}

// Batch them:
const items = await Supplement.find({ _id: { $in: ids } })
```

### 2. Indexing Strategy

#### Create Essential Indexes
```javascript
// Supplement searches
db.supplements.createIndex({ name: "text" })
db.supplements.createIndex({ category: 1 })
db.supplements.createIndex({ createdAt: -1 })

// User queries
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ createdAt: -1 })

// Stack management
db.stack_items.createIndex({ userId: 1, createdAt: -1 })

// Favorites
db.favorites.createIndex({ userId: 1, supplementId: 1 }, { unique: true })

// Check index effectiveness
db.supplements.aggregate([
  { $indexStats: {} }
])
```

#### Index Maintenance
```javascript
// Rebuild indexes
db.supplements.reIndex()

// Remove unused indexes
db.collection.dropIndex("unused_index")

// Monitor index usage
db.supplements.aggregate([
  { $indexStats: {} }
]).pretty()
```

### 3. Connection Pool Tuning

```javascript
// In MongoDB connection string
mongodb://host/db?maxPoolSize=100&minPoolSize=10

// Or in Node.js
const client = new MongoClient(uri, {
  maxPoolSize: 100,
  minPoolSize: 10,
  maxIdleTimeMS: 60000,
  waitQueueTimeoutMS: 10000
})

// Monitor connection pool
mongosh
db.serverStatus().connections
```

### 4. Data Archival

```javascript
// Archive old data to reduce active dataset
db.createCollection("supplements_archive")
db.supplements.aggregate([
  { $match: { lastViewed: { $lt: new Date(Date.now() - 365*24*60*60*1000) } } },
  { $out: "supplements_archive" }
])

// Delete archived records
db.supplements.deleteMany({
  lastViewed: { $lt: new Date(Date.now() - 365*24*60*60*1000) }
})
```

## API Optimization

### 1. Response Caching

```typescript
// Redis caching strategy
import { cacheService } from '@/shared/services/cache.service'

// Cache supplement search results
async getSupplements(query: string, limit: number) {
  const cacheKey = `supplements:${query}:${limit}`
  const cached = await cacheService.get(cacheKey)

  if (cached) {
    return JSON.parse(cached)
  }

  const results = await db.supplements.find({ $text: { $search: query } }).limit(limit)
  
  // Cache for 1 hour
  await cacheService.set(cacheKey, JSON.stringify(results), 3600)
  
  return results
}
```

#### Cache Invalidation Strategy
```typescript
// Invalidate on writes
async addSupplement(data: SupplementInput) {
  const supplement = await db.supplements.create(data)
  
  // Clear related caches
  await cacheService.del("supplements:*")
  await cacheService.del("trending:*")
  
  return supplement
}

// TTL-based expiration (automatic)
// Set expire time in Redis for all cache keys
```

### 2. Payload Optimization

```typescript
// 1. Field selection
app.get("/api/supplements/:id", (req, res) => {
  const fields = req.query.fields?.split(",") || [
    "id", "name", "price", "rating", "image"
  ]
  
  return db.supplements
    .findById(req.params.id)
    .select(fields.join(" "))
})

// 2. Pagination
app.get("/api/supplements", (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = Math.min(parseInt(req.query.limit) || 20, 100)
  const skip = (page - 1) * limit
  
  return db.supplements
    .find()
    .skip(skip)
    .limit(limit)
    .lean()  // Lean queries are faster
})

// 3. Compression middleware
import compression from "compression"
app.use(compression({
  level: 6,  // Balance between speed and compression
  threshold: 1024  // Only compress responses > 1KB
}))
```

### 3. Asynchronous Processing

```typescript
// Move long operations to background jobs
import { Queue } from "bullmq"

const emailQueue = new Queue("emails", {
  connection: redisClient,
  defaultJobOptions: { removeOnComplete: true }
})

// Don't wait for email
app.post("/api/auth/register", async (req, res) => {
  const user = await createUser(req.body)
  
  // Queue email asynchronously
  await emailQueue.add("welcome", { email: user.email })
  
  res.json(user)  // Respond immediately
})

// Process emails in background
emailQueue.process("welcome", async (job) => {
  await sendWelcomeEmail(job.data.email)
})
```

## Server Optimization

### 1. Node.js Heap Management

```bash
# Set heap size for large datasets
node --max-old-space-size=4096 dist/server.js

# Monitor heap usage
node --inspect dist/server.js
# Connect to chrome://inspect in Chrome DevTools
```

### 2. Worker Threads for CPU-Intensive Tasks

```typescript
// Use worker threads for heavy computations
import { Worker } from "worker_threads"

app.post("/api/recommendations", (req, res) => {
  const worker = new Worker("./calculate-recommendations.worker.ts")
  
  worker.on("message", (recommendations) => {
    res.json(recommendations)
    worker.terminate()
  })
  
  worker.postMessage({ userId: req.user.id })
})
```

### 3. Connection Limits

```typescript
// Configure reasonable limits
app.set("trust proxy", 1)
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ limit: "10mb" }))

// Timeout handling
const timeout = 30000  // 30 seconds
app.use((req, res, next) => {
  req.setTimeout(timeout)
  res.setTimeout(timeout)
  next()
})
```

## Caching Strategy

### Multi-Layer Caching

```typescript
// 1. Response caching (HTTP)
// Cache: GET /api/supplements/trending (5 minutes)
app.get("/api/supplements/trending", (req, res) => {
  res.set("Cache-Control", "public, max-age=300")
  res.json(results)
})

// 2. In-memory caching (Application)
const memoryCache = new Map()
function getCached<T>(key: string, fn: () => Promise<T>, ttl: number = 60) {
  const cached = memoryCache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.value
  }
  
  const value = await fn()
  memoryCache.set(key, {
    value,
    expires: Date.now() + ttl * 1000
  })
  return value
}

// 3. Redis caching (Distributed)
// Used for shared data across instances

// 4. Database caching (MongoDB)
// Use MongoDB caching tier (advanced feature)
```

## Load Balancing

### 1. Horizontal Scaling

```yaml
# Docker Compose - Multiple instances
version: '3.8'
services:
  server-1:
    image: suplilist-server:latest
    ports:
      - "3001:3000"

  server-2:
    image: suplilist-server:latest
    ports:
      - "3002:3000"

  server-3:
    image: suplilist-server:latest
    ports:
      - "3003:3000"

  nginx:
    image: nginx:latest
    ports:
      - "3000:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - server-1
      - server-2
      - server-3
```

### 2. Nginx Configuration

```nginx
upstream suplilist {
    least_conn;
    server server-1:3000;
    server server-2:3000;
    server server-3:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name localhost;

    # Compression
    gzip on;
    gzip_min_length 1024;
    gzip_types text/plain application/json;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://suplilist;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
```

## Monitoring & Profiling

### 1. Application Performance Monitoring

```typescript
// Setup APM with Sentry
import * as Sentry from "@sentry/node"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  profiles SampleRate: 0.1
})

app.use(Sentry.Handlers.requestHandler())
app.use(Sentry.Handlers.errorHandler())
```

### 2. Metrics Collection

```typescript
// Prometheus metrics
import { register, Counter, Histogram, Gauge } from "prom-client"

const httpDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests",
  labelNames: ["method", "route", "status"],
  buckets: [0.1, 0.5, 1, 2, 5]
})

const activeConnections = new Gauge({
  name: "active_connections",
  help: "Number of active database connections"
})

app.use((req, res, next) => {
  const start = Date.now()
  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000
    httpDuration.labels(req.method, req.route?.path || req.path, res.statusCode).observe(duration)
  })
  next()
})

app.get("/metrics", (req, res) => {
  res.set("Content-Type", register.contentType)
  res.end(register.metrics())
})
```

### 3. Custom Profiling

```typescript
// Memory profiling
import v8 from "v8"

app.get("/debug/heap-snapshot", (req, res) => {
  const snapshot = v8.writeHeapSnapshot()
  res.download(snapshot)
})

// CPU profiling
import { profiler } from "@node-profiler/core"

profiler.startCpuProfiling("cpu-profile")
// ... operations ...
profiler.stopCpuProfiling()
```

## Scaling Recommendations

### Small Scale (< 100 RPS)
- Single server instance
- Shared MongoDB
- Redis for caching
- Basic monitoring

### Medium Scale (100-1000 RPS)
- 3-5 server instances
- MongoDB replica set
- Redis cluster
- Load balancer (nginx)
- APM with Sentry
- Prometheus + Grafana

### Large Scale (> 1000 RPS)
- 10+ server instances
- MongoDB sharded cluster
- Redis cluster with sentinel
- CDN for static assets
- API gateway
- Distributed tracing
- Advanced monitoring and alerting

## Performance Checklist

### Before Production
- [ ] Response times validated against SLA
- [ ] Error rate < 5% under normal load
- [ ] Throughput meets requirements
- [ ] Memory usage stable
- [ ] CPU usage < 80%
- [ ] No memory leaks detected
- [ ] Database queries optimized
- [ ] Caching strategy implemented
- [ ] Load balancing configured
- [ ] Monitoring and alerts set up
- [ ] Capacity planning completed
- [ ] Disaster recovery plan ready

### Regular Maintenance
- [ ] Weekly: Review slow query logs
- [ ] Weekly: Check cache hit rates
- [ ] Monthly: Analyze performance trends
- [ ] Quarterly: Review and update baselines
- [ ] Quarterly: Capacity planning review
- [ ] Annually: Major optimization review

## Resources

- [MongoDB Performance](https://docs.mongodb.com/manual/administration/analyzing-mongodb-performance/)
- [Node.js Performance](https://nodejs.org/en/docs/guides/nodejs-performance-hooks/)
- [Redis Performance](https://redis.io/topics/optimization)
- [Nginx Optimization](https://nginx.org/en/docs/)

## Support

For optimization questions or issues, contact the DevOps team or consult the main [Load Testing Guide](./README.md).
