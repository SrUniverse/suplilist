# Post-Deploy Monitoring Guide
## SupliList PWA Offline-First Feature

**Deployment Date:** 2026-06-03  
**Feature:** Offline-first with Service Worker caching, IndexedDB sync queue, background sync  
**Monitoring Period:** T+0 to T+7 days (then ongoing)

---

## 🎯 Critical Metrics

### 1. Service Worker Health
**What:** Service Worker activation & cache hit rate  
**Why:** If SW fails, users can't access app offline at all

#### Metrics to Track
- **SW Activation Rate** (target: >95%)
  - Query: Count of successful SW activations / total page loads
  - Alert if: <90% for 10 min

- **SW Cache Hit Rate** (target: >80% after T+10min)
  - Query: Cache hits on `/api/profile/me`, `/api/stack`, `/api/favorites`, `/api/settings/me`
  - Alert if: <70% sustained for 30 min

- **SW Errors**
  - Query: Count of `[Service Worker] Error:` logs
  - Alert if: >0 errors in production

#### Implementation (Pick one platform)

**Option A: Browser Console Logging (Quick & Free)**
```javascript
// In service-worker.js - add metrics collection
const metricsQueue = [];

function logMetric(name, value, tags = {}) {
  metricsQueue.push({
    timestamp: Date.now(),
    name,
    value,
    tags,
  });
  
  // Flush every 10 metrics or 60s
  if (metricsQueue.length >= 10) {
    flushMetrics();
  }
}

async function flushMetrics() {
  if (metricsQueue.length === 0) return;
  
  try {
    await fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metricsQueue),
    });
    metricsQueue.length = 0;
  } catch (err) {
    console.warn('[Metrics] Failed to flush:', err);
  }
}

// Use in SW:
self.addEventListener('activate', (event) => {
  logMetric('sw.activated', 1, { version: CACHE_VERSION });
  // ...
});

self.addEventListener('fetch', (event) => {
  // ...cache logic...
  logMetric('cache.hit', 1, { url: requestUrl });
});
```

**Option B: Datadog (Enterprise)**
```javascript
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: 'YOUR_APP_ID',
  clientToken: 'YOUR_CLIENT_TOKEN',
  site: 'datadoghq.com',
  service: 'suplilist-pwa',
  env: 'production',
});

// In SW, send custom events:
datadogRum.addUserAction('sw_activated', {
  version: CACHE_VERSION,
  timestamp: Date.now(),
});
```

**Option C: Custom Backend Endpoint (Recommended for SupliList)**
Create simple `/api/metrics` endpoint that accepts POST:
```json
{
  "metrics": [
    { "name": "sw.activated", "value": 1, "timestamp": 1780520900000 },
    { "name": "cache.hit", "value": 1, "url": "/api/profile/me", "timestamp": 1780520905000 },
    { "name": "sync.success", "value": 5, "timestamp": 1780520910000 }
  ]
}
```

Then query with SQL:
```sql
SELECT name, COUNT(*) as count, AVG(value) as avg_value
FROM metrics
WHERE timestamp > NOW() - INTERVAL 1 HOUR
  AND name IN ('sw.activated', 'cache.hit', 'sync.success')
GROUP BY name
```

---

### 2. Offline Sync Queue Health
**What:** Background sync success/failure rates  
**Why:** If sync fails, users' offline checkins are lost

#### Metrics to Track
- **Sync Queue Success Rate** (target: >98%)
  - Query: COUNT(status='synced') / COUNT(status IN ('synced','failed'))
  - Alert if: <95%

- **Sync Queue Items Pending** (target: 0 within 5s of coming online)
  - Query: SELECT COUNT(*) FROM 'offline-checkins' WHERE status='pending'
  - Alert if: >50 items pending for >1 min

- **Sync Retry Count** (target: avg <1.5 retries per item)
  - Query: AVG(retries) FROM offline-checkins WHERE status='synced'
  - Alert if: >3 avg retries (indicates upstream issues)

- **Sync Errors**
  - Query: COUNT of `[SyncQueue] Error:` logs
  - Alert if: >5 errors per hour

#### Implementation

**Option A: IndexedDB Monitoring (Client-side)**
```javascript
// In sync-queue.js, add telemetry
async getQueueStats() {
  const tx = this.db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  
  const pending = store.index('status').count(IDBKeyRange.only('pending'));
  const synced = store.index('status').count(IDBKeyRange.only('synced'));
  const failed = store.index('status').count(IDBKeyRange.only('failed'));
  
  return {
    pending: await pending,
    synced: await synced,
    failed: await failed,
    successRate: synced / (synced + failed),
  };
}

// Periodically log stats (every 5 min)
setInterval(async () => {
  const stats = await syncQueue.getQueueStats();
  await fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify({
      metric: 'sync_queue',
      ...stats,
      timestamp: Date.now(),
    }),
  });
}, 5 * 60 * 1000);
```

**Option B: Backend Query (Server-side)**
If you track sync submissions, query your database:
```sql
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_syncs,
  COUNT(CASE WHEN status='success' THEN 1 END) as successful,
  COUNT(CASE WHEN status='failed' THEN 1 END) as failed,
  ROUND(100.0 * COUNT(CASE WHEN status='success' THEN 1 END) / COUNT(*), 2) as success_rate
FROM sync_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
```

---

### 3. API Performance
**What:** `/api/checkin/bulk` latency & error rate  
**Why:** Sync speed affects user experience when coming online

#### Metrics to Track
- **Response Time** (target: <200ms p50, <500ms p95)
  - Alert if: p95 > 1s consistently

- **Error Rate** (target: <0.5%)
  - Alert if: >2% for 5 min

- **Timeout Rate** (target: 0%)
  - Alert if: >0 timeouts per hour

#### Implementation

**Option A: Application Monitoring (APM)**
If using Datadog APM, error tracking is automatic:
```sql
-- Datadog
service:suplilist-api resource_name:"POST /api/checkin/bulk" 
| stats avg(duration) as p50_latency, 
        pct(duration, 95) as p95_latency,
        count(error) / count(*) as error_rate
```

**Option B: Simple Log Query**
```sql
SELECT 
  endpoint,
  COUNT(*) as requests,
  ROUND(AVG(response_time_ms), 2) as avg_latency,
  MAX(response_time_ms) as max_latency,
  ROUND(100.0 * COUNT(CASE WHEN status_code >= 400 THEN 1 END) / COUNT(*), 2) as error_rate
FROM api_logs
WHERE endpoint = '/api/checkin/bulk'
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY endpoint;
```

---

## 📊 Dashboard Setup

### Datadog Dashboard (if using Datadog)
```json
{
  "title": "SupliList Offline-First Health",
  "widgets": [
    {
      "type": "timeseries",
      "title": "Service Worker Activation Rate",
      "query": "sum:sw.activated.count{service:suplilist-pwa}",
      "alert_threshold": 0.95
    },
    {
      "type": "query_value",
      "title": "Sync Queue Success Rate (Last Hour)",
      "query": "sum:sync.success.count / (sum:sync.success.count + sum:sync.failed.count)",
      "alert_threshold": 0.98
    },
    {
      "type": "timeseries",
      "title": "API /checkin/bulk Latency",
      "query": "avg:trace.web.request.duration{resource_name:/api/checkin/bulk}",
      "alert_threshold": 0.5
    },
    {
      "type": "alert_graph",
      "title": "Critical Errors (SW, Sync, API)",
      "query": "sum:sw.error.count + sum:sync.error.count + sum:api.error.count"
    }
  ]
}
```

### Grafana Dashboard (if self-hosted)
Create a new dashboard with:
1. **Row 1: Service Worker**
   - Panel: SW activation rate (gauge, >95%)
   - Panel: Cache hit rate (gauge, >80%)
   - Panel: SW errors (stat, target: 0)

2. **Row 2: Sync Queue**
   - Panel: Items synced/failed (stacked bar)
   - Panel: Success rate (gauge, >98%)
   - Panel: Pending items (stat, target: <5)

3. **Row 3: API**
   - Panel: /api/checkin/bulk latency (graph)
   - Panel: Error rate (graph)
   - Panel: Timeout rate (stat)

---

## 🚨 Alert Rules

### Critical (Page on-call immediately)
```
sw.activation_rate < 90% for 10 min
sync.success_rate < 95% for 15 min
api.checkin_bulk.error_rate > 5% for 5 min
```

### Warning (Notify in Slack #platform-alerts)
```
sw.activation_rate < 95% for 5 min
sync.queue.pending_count > 100 for 5 min
api.checkin_bulk.p95_latency > 1s for 10 min
```

### Info (Log to monitoring system)
```
sync.queue.avg_retries > 2
cache.hit_rate < 80% for 30 min
```

---

## 🔧 Implementation Checklist

### Week 1 (Immediate)
- [ ] Pick monitoring platform (Datadog/Grafana/Custom Backend)
- [ ] Add SW metrics logging (activation, cache hits, errors)
- [ ] Add sync queue stats endpoint
- [ ] Create dashboard with 3 key metrics
- [ ] Set up critical alerts (Slack webhook or PagerDuty)
- [ ] Test alerts by simulating failures

### Week 2
- [ ] Add detailed API metrics for `/api/checkin/bulk`
- [ ] Set up error budget tracking (SLO: 98% sync success)
- [ ] Create runbook for on-call: "Sync queue backing up"
- [ ] Share dashboard with team

### Ongoing
- [ ] Review metrics daily for first week
- [ ] Review weekly for first month
- [ ] Adjust thresholds based on baseline data
- [ ] Correlate offline usage with app metrics

---

## 📋 Rollback Triggers (from Metrics)

Roll back immediately if:
1. **SW activation rate drops to <85%** → app can't load offline
2. **Sync success rate drops to <90%** → users losing checkins
3. **API error rate jumps to >5%** → backend is struggling
4. **Cache hit rate stays <50% after 30min** → caching not working

```bash
# Rollback command (if metrics alert triggers)
git revert <commit-hash>
npm run build && npm run deploy
```

---

## 📞 Escalation Path

1. **Alert triggers** → Check dashboard
2. **Is it a real issue?** → Check console logs
3. **Is it user-facing?** → Notify team in Slack
4. **Should we rollback?** → Check rollback triggers above
5. **Post-incident** → Root cause analysis + update runbook

---

## 🧪 Testing Your Monitoring

Before fully deploying monitoring, test alerts:

```bash
# Simulate SW error
# In DevTools console:
navigator.serviceWorker.getRegistrations().then(r => r[0].unregister())

# Simulate sync failure
# In DevTools console:
indexedDB.deleteDatabase('suplilist')

# Metrics should fire within 2 min
```

---

**Owner:** Platform Team  
**Review Frequency:** Weekly (first month), then monthly  
**Last Updated:** 2026-06-03
