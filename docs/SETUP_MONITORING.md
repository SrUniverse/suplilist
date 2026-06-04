# Monitoring Setup Implementation Checklist
## Step-by-Step: From Zero to Production Monitoring

**Timeline:** ~2 hours to full setup  
**Difficulty:** Medium  
**Owner:** Cássio (or whoever is doing this)

---

## Phase 1: Choose Your Platform (15 min)

Pick ONE of these:

### Option A: Custom Backend Endpoint (Recommended - Simple, Free)
**Pros:** Simple, no external dependencies, full control  
**Cons:** Need to build endpoint

**Pick this if:** You want simplicity and control

### Option B: Datadog (Enterprise, Pre-built)
**Pros:** Pre-built dashboards, auto-alerts, easy setup  
**Cons:** $$$, needs API token

**Pick this if:** You have budget and want easy setup

### Option C: Grafana + Prometheus (Self-hosted, Free)
**Pros:** Free, powerful, full control  
**Cons:** Need to host, more setup

**Pick this if:** You want control and have DevOps support

---

## Phase 2: Implement Metrics Collection (1 hour)

### A. Add SW Metrics (service-worker.js)

```javascript
// At TOP of service-worker.js, add:
const METRICS_URL = '/api/metrics'; // or your Datadog endpoint
const metricsQueue = [];

/**
 * Queue a metric to be sent to monitoring backend
 */
function recordMetric(name, value, tags = {}) {
  metricsQueue.push({
    timestamp: Date.now(),
    metric: name,
    value: value,
    tags: {
      service: 'suplilist-pwa',
      env: 'production',
      ...tags,
    },
  });

  // Flush every 10 metrics or 60 seconds
  if (metricsQueue.length >= 10) {
    flushMetrics();
  }
}

/**
 * Send queued metrics to backend
 */
async function flushMetrics() {
  if (metricsQueue.length === 0) return;

  const batch = metricsQueue.splice(0);
  
  try {
    await fetch(METRICS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metrics: batch }),
      keepalive: true, // Important: survives page navigation
    });
  } catch (err) {
    // Silent fail - don't break app if metrics down
    console.debug('[Metrics] Failed to send:', err);
  }
}

// Flush periodically (every 60s)
setInterval(flushMetrics, 60 * 1000);

// Flush on page unload (important!)
addEventListener('beforeunload', flushMetrics);

// ─────────────────────────────────────────────────────────────

// In activate event, add:
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // ... existing cleanup code ...
      
      // NEW: Record activation metric
      recordMetric('sw.activated', 1, {
        version: CACHE_VERSION,
      });
    })
  );
});

// In fetch event, add after cache hit:
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (event.request.method === 'GET' && isUserDataRequest(requestUrl)) {
    // SWR strategy...
    const cachedResponse = caches.match(event.request);
    const networkPromise = fetch(event.request).then((response) => {
      if (response.ok) {
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(event.request, response.clone());
          // NEW: Record cache write
          recordMetric('cache.write', 1, {
            url: requestUrl.pathname,
            status: response.status,
          });
        });
      }
      return response;
    }).catch((err) => {
      // NEW: Record network failure
      recordMetric('network.error', 1, {
        url: requestUrl.pathname,
        error: err.message,
      });
      throw err;
    });

    Promise.resolve(cachedResponse).then((cached) => {
      if (cached) {
        // NEW: Record cache hit
        recordMetric('cache.hit', 1, {
          url: requestUrl.pathname,
        });
      }
    });

    return cachedResponse || networkPromise;
  }

  // ... rest of fetch handler ...
});
```

### B. Add Sync Queue Metrics (sync-queue.js)

In the `sync()` method, add telemetry:

```javascript
/**
 * Sync offline checkins with server
 */
async sync() {
  if (this.isSyncing) {
    logger.debug('[SyncQueue] Already syncing, skipping');
    return { synced: 0, failed: 0 };
  }

  this.isSyncing = true;
  const startTime = Date.now();

  try {
    const pending = await this._getPendingItems();
    
    if (pending.length === 0) {
      logger.debug('[SyncQueue] No items to sync');
      return { synced: 0, failed: 0 };
    }

    // NEW: Record queue size
    fetch('/api/metrics', {
      method: 'POST',
      body: JSON.stringify({
        metrics: [{
          timestamp: Date.now(),
          metric: 'sync.queue.size',
          value: pending.length,
          tags: { service: 'suplilist-pwa' },
        }],
      }),
      keepalive: true,
    }).catch(() => {}); // Silent fail

    let synced = 0;
    let failed = 0;

    for (let i = 0; i < pending.length; i += this.batchSize) {
      const batch = pending.slice(i, i + this.batchSize);

      try {
        const response = await this._syncBatch(batch);
        
        if (response.ok) {
          synced += batch.length;
          for (const item of batch) {
            await this._updateItemStatus(item.id, 'synced');
          }
        }
      } catch (err) {
        failed += batch.length;
        
        // NEW: Record sync error
        fetch('/api/metrics', {
          method: 'POST',
          body: JSON.stringify({
            metrics: [{
              timestamp: Date.now(),
              metric: 'sync.error',
              value: 1,
              tags: {
                service: 'suplilist-pwa',
                error: err.message,
              },
            }],
          }),
          keepalive: true,
        }).catch(() => {});
      }
    }

    // NEW: Record sync success
    const duration = Date.now() - startTime;
    fetch('/api/metrics', {
      method: 'POST',
      body: JSON.stringify({
        metrics: [
          {
            timestamp: Date.now(),
            metric: 'sync.success',
            value: synced,
            tags: { service: 'suplilist-pwa' },
          },
          {
            timestamp: Date.now(),
            metric: 'sync.failed',
            value: failed,
            tags: { service: 'suplilist-pwa' },
          },
          {
            timestamp: Date.now(),
            metric: 'sync.duration_ms',
            value: duration,
            tags: { service: 'suplilist-pwa' },
          },
        ],
      }),
      keepalive: true,
    }).catch(() => {});

    logger.debug('[SyncQueue] Sync complete. Synced:', synced, 'Failed:', failed);
    return { synced, failed };

  } finally {
    this.isSyncing = false;
  }
}
```

### C. Add Offline Handler Metrics (offline-handler.js)

```javascript
/**
 * Handle offline event
 */
handleOffline() {
  this.isOfflineNow = true;

  // NEW: Record offline event
  fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify({
      metrics: [{
        timestamp: Date.now(),
        metric: 'app.offline',
        value: 1,
        tags: { service: 'suplilist-pwa' },
      }],
    }),
    keepalive: true,
  }).catch(() => {});

  // ... rest of handleOffline ...
}

/**
 * Handle online event
 */
async handleOnline() {
  this.isOfflineNow = false;

  // NEW: Record online event
  fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify({
      metrics: [{
        timestamp: Date.now(),
        metric: 'app.online',
        value: 1,
        tags: { service: 'suplilist-pwa' },
      }],
    }),
    keepalive: true,
  }).catch(() => {});

  // ... rest of handleOnline ...
}
```

---

## Phase 3: Create Metrics Endpoint (30 min - if using custom backend)

### Backend Endpoint (Node.js + Express example)

```javascript
// backend/routes/metrics.js
const express = require('express');
const router = express.Router();

/**
 * POST /api/metrics
 * Receives metrics from client
 */
router.post('/metrics', (req, res) => {
  const { metrics } = req.body;

  if (!Array.isArray(metrics)) {
    return res.status(400).json({ error: 'metrics must be array' });
  }

  // Store in database or logging service
  try {
    for (const metric of metrics) {
      // Option 1: Store in database
      database.insertMetric({
        timestamp: new Date(metric.timestamp),
        metric_name: metric.metric,
        metric_value: metric.value,
        tags: metric.tags,
      });

      // Option 2: Log to file (for analysis later)
      logger.info(`METRIC: ${metric.metric}=${metric.value}`, metric.tags);

      // Option 3: Send to external service (e.g., Datadog)
      // datadog.gauge(metric.metric, metric.value, { tags: metric.tags });
    }

    res.json({ ok: true });
  } catch (err) {
    logger.error('[Metrics] Failed to store:', err);
    res.status(500).json({ error: 'Storage failed' });
  }
});

module.exports = router;
```

### Database schema (if using SQL):

```sql
CREATE TABLE metrics (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  timestamp DATETIME NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value FLOAT NOT NULL,
  tags JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_timestamp (timestamp),
  INDEX idx_metric (metric_name)
);
```

### Query examples:

```sql
-- SW activation rate (last hour)
SELECT 
  COUNT(CASE WHEN metric_name='sw.activated' THEN 1 END) as activations,
  COUNT(DISTINCT JSON_EXTRACT(tags, '$.user_id')) as unique_users
FROM metrics
WHERE timestamp > NOW() - INTERVAL 1 HOUR;

-- Sync success rate
SELECT 
  SUM(metric_value) as synced,
  (SELECT SUM(metric_value) FROM metrics 
   WHERE metric_name='sync.failed' 
   AND timestamp > NOW() - INTERVAL 1 HOUR) as failed
FROM metrics
WHERE metric_name='sync.success'
  AND timestamp > NOW() - INTERVAL 1 HOUR;

-- Average cache hit rate
SELECT 
  (COUNT(CASE WHEN metric_name='cache.hit' THEN 1 END) * 100.0 / 
   (COUNT(CASE WHEN metric_name='cache.hit' THEN 1 END) + 
    COUNT(CASE WHEN metric_name='cache.miss' THEN 1 END))) as hit_rate
FROM metrics
WHERE timestamp > NOW() - INTERVAL 1 HOUR;
```

---

## Phase 4: Create Dashboard (15 min)

### Option A: Simple HTML Dashboard

```html
<!-- dashboard.html -->
<!DOCTYPE html>
<html>
<head>
  <title>SupliList Offline Monitoring</title>
  <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
</head>
<body>
  <h1>SupliList Offline-First Monitoring</h1>
  
  <div id="sw-activation" style="width: 100%; height: 400px;"></div>
  <div id="sync-rate" style="width: 100%; height: 400px;"></div>
  <div id="cache-hits" style="width: 100%; height: 400px;"></div>

  <script>
    const API = '/api/metrics/stats';

    // Fetch metrics from last 24h
    fetch(API + '?hours=24')
      .then(r => r.json())
      .then(data => {
        // Plot SW activation
        Plotly.newPlot('sw-activation', 
          [{ x: data.timestamps, y: data.sw_activation_rate, type: 'scatter' }],
          { title: 'Service Worker Activation Rate (%)' }
        );

        // Plot sync success
        Plotly.newPlot('sync-rate',
          [{ x: data.timestamps, y: data.sync_success_rate, type: 'scatter' }],
          { title: 'Sync Queue Success Rate (%)' }
        );

        // Plot cache hits
        Plotly.newPlot('cache-hits',
          [{ x: data.timestamps, y: data.cache_hit_rate, type: 'scatter' }],
          { title: 'Cache Hit Rate (%)' }
        );
      });
  </script>
</body>
</html>
```

### Option B: Use Datadog Dashboard (if using Datadog)

1. Go to Datadog → Dashboards → New Dashboard
2. Add widgets:
   ```
   - Widget 1: sw.activated count
   - Widget 2: sync.success / sync.failed ratio
   - Widget 3: cache.hit / total cache requests
   - Widget 4: Error alerts (sw.error + sync.error)
   ```
3. Set update interval to 1 minute
4. Share with team

---

## Phase 5: Set Up Alerts (15 min)

### Option A: Slack Webhooks

```javascript
// backend/utils/alerts.js
const axios = require('axios');

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;
const CRITICAL_WEBHOOK = process.env.SLACK_CRITICAL_WEBHOOK_URL;

/**
 * Send alert to Slack
 */
async function sendAlert(level, message, data = {}) {
  const webhook = level === 'critical' ? CRITICAL_WEBHOOK : SLACK_WEBHOOK;

  const color = {
    critical: '#FF0000',
    warning: '#FFA500',
    info: '#0099FF',
  }[level] || '#999999';

  try {
    await axios.post(webhook, {
      attachments: [{
        color,
        title: `[${level.toUpperCase()}] ${message}`,
        text: JSON.stringify(data, null, 2),
        ts: Math.floor(Date.now() / 1000),
      }],
    });
  } catch (err) {
    console.error('[Alerts] Failed to send Slack:', err);
  }
}

module.exports = { sendAlert };
```

### Query to check metrics and trigger alerts (run every minute via cron):

```javascript
// backend/jobs/check-metrics.js
const { sendAlert } = require('../utils/alerts');

async function checkMetrics() {
  // Check SW activation rate
  const swRate = await db.query(`
    SELECT 
      (COUNT(CASE WHEN metric_name='sw.activated' THEN 1 END) * 100.0 /
       COUNT(*)) as rate
    FROM metrics
    WHERE timestamp > NOW() - INTERVAL 10 MINUTE
  `);

  if (swRate[0].rate < 90) {
    await sendAlert('critical', 'SW activation rate <90%', {
      current_rate: swRate[0].rate,
      threshold: 90,
    });
  }

  // Check sync success rate
  const syncRate = await db.query(`
    SELECT 
      (COUNT(CASE WHEN metric_name='sync.success' THEN 1 END) * 100.0 /
       (COUNT(CASE WHEN metric_name='sync.success' THEN 1 END) +
        COUNT(CASE WHEN metric_name='sync.failed' THEN 1 END))) as rate
    FROM metrics
    WHERE timestamp > NOW() - INTERVAL 15 MINUTE
  `);

  if (syncRate[0].rate < 95) {
    await sendAlert('critical', 'Sync success rate <95%', {
      current_rate: syncRate[0].rate,
      threshold: 95,
    });
  }

  // ... similar checks for other metrics ...
}

// Run every minute
setInterval(checkMetrics, 60 * 1000);
```

---

## Phase 6: Deploy & Verify (15 min)

### Deployment Checklist

- [ ] Metrics code added to service-worker.js
- [ ] Metrics code added to sync-queue.js
- [ ] Metrics code added to offline-handler.js
- [ ] Backend endpoint created (/api/metrics)
- [ ] Database schema created (if needed)
- [ ] Dashboard created and accessible
- [ ] Alerts configured and tested
- [ ] All changes committed to git
- [ ] Deployed to production

### Verification

```bash
# Test 1: Verify metrics endpoint exists
curl -X POST https://suplilist.com/api/metrics \
  -H "Content-Type: application/json" \
  -d '{"metrics":[{"timestamp":1234567890,"metric":"test.metric","value":1}]}'
# Should return 200 OK

# Test 2: Check dashboard
# Open https://suplilist.com/monitoring
# Should show metrics from last hour

# Test 3: Test alert
# Manually insert bad metric into DB to trigger alert
# Should see Slack message in #platform-alerts within 1 minute

# Test 4: Simulate offline
# In browser DevTools, go online → offline → online
# Check dashboard for new metrics
```

---

## Phase 7: Documentation (10 min)

- [ ] Runbook created: [ON_CALL_RUNBOOK.md](./ON_CALL_RUNBOOK.md)
- [ ] User docs created: [OFFLINE_FEATURE_DOCS.md](./OFFLINE_FEATURE_DOCS.md)
- [ ] Monitoring guide created: [MONITORING_GUIDE.md](./MONITORING_GUIDE.md)
- [ ] Team trained on dashboard
- [ ] On-call rotation updated

---

## 🎉 You're Done!

Total time invested: **2 hours**

You now have:
- ✅ Metrics collection from frontend
- ✅ Backend metrics storage
- ✅ Dashboard showing real-time health
- ✅ Alerts for critical issues
- ✅ Runbooks for on-call team
- ✅ User documentation

**Next step:** Monitor for first 24 hours, then adjust thresholds based on baseline data.

---

## 📞 Support

Having trouble?
- Backend issues: Check backend logs
- Frontend metrics not sending: Check Network tab in DevTools
- Alerts not firing: Check database has metrics being inserted
- Dashboard not updating: Check query syntax matches your DB

---

**Setup Date:** 2026-06-03  
**Last Updated:** 2026-06-03
