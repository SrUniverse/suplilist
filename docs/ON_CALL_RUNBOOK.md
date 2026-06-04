# On-Call Runbook: SupliList Offline-First Issues
## Quick Reference Guide

**Effective:** 2026-06-03  
**Severity Levels:** Critical 🔴 | Warning 🟡 | Info 🟢

---

## 🚨 Critical Alerts (Page On-Call)

### Alert: "Service Worker Activation Rate <90%"

**What's happening:** Users can't load the app offline. This is a P1.

**Response Time:** < 5 min

**Steps:**
1. Check dashboard: Go to [Monitoring Dashboard](link-to-your-dashboard)
2. Click into "Service Worker Activation Rate" graph
3. Look at the last 10 minutes — is it trending down?

**If trending down (getting worse):**
- **Check browser console:** Open any user's browser DevTools → Console
  - Look for errors like `Failed to install SW` or `fetch failed`
  - If you see `[Service Worker] Error: ...` — this is the bug
- **Check SW file:** Was service-worker.js deployed in last 10 min?
  - If yes: Compare to previous version (check git diff)
  - If it looks bad: **ROLLBACK immediately**
    ```bash
    git log --oneline | head -5
    git revert <commit-hash>  # hash of bad commit
    npm run build && npm run deploy
    # Alert team: "Rolled back SW due to [error reason]"
    ```

**If NOT trending down (it's just noise):**
- It's probably a few users with old browser caches
- Monitor for next 30 min
- If rate recovers to >95%, close alert
- If rate stays <90%, escalate to engineering (deeper issue)

**Escalation:** If you can't figure out why, page the platform team

---

### Alert: "Sync Queue Success Rate <95%"

**What's happening:** Users' offline checkins aren't syncing. This is a P1.

**Response Time:** < 5 min

**Steps:**
1. Check dashboard: Look at "Sync Queue Success Rate" graph
2. Is `/api/checkin/bulk` endpoint having issues?
   - Check API logs: `error_rate` on `/api/checkin/bulk` endpoint
   - If error rate is high (>5%): **Backend issue** → notify backend oncall
   - If error rate is normal (<1%): **Sync queue issue** → continue below

3. Check indexedDB metrics: Are items stuck pending?
   - Query: `SELECT COUNT(*) FROM offline-checkins WHERE status='pending' AND created_at < NOW() - INTERVAL 5 MINUTES`
   - If >100 items stuck: Data accumulated, sync can't keep up
   - If <10 items: Random transient failures, monitor for trend

4. Check sync retry count:
   - Query: `SELECT AVG(retries) FROM offline-checkins WHERE status='synced'`
   - If avg >3: Something is flaky (network? backend?)
   - If avg ~1: Normal behavior

**What to do:**
- If backend is down: Wait for backend team to fix
- If sync queue just stuck: Manually trigger sync (have users toggle WiFi)
- If error persistent >15 min: **ROLLBACK** (could be sync-queue.js bug)

**Escalation:** If backend looks OK but sync still failing, page platform engineer

---

### Alert: "API /checkin/bulk Error Rate >5%"

**What's happening:** Users' sync is failing because the API is erroring out.

**Response Time:** < 5 min

**Steps:**
1. Check API error logs: What's the actual error?
   ```sql
   SELECT error_message, COUNT(*) as count
   FROM api_logs
   WHERE endpoint = '/api/checkin/bulk'
     AND status_code >= 400
     AND timestamp > NOW() - INTERVAL 10 MINUTES
   GROUP BY error_message
   ORDER BY count DESC
   ```

2. Common errors:
   - **`400 Bad Request`** → Payload format wrong (frontend sent bad data)
   - **`401 Unauthorized`** → Auth broken, users can't sync
   - **`500 Internal Server Error`** → Backend bug
   - **`503 Service Unavailable`** → Backend overloaded or down

**What to do:**
| Error | Action |
|-------|--------|
| 400 Bad Request | Check if frontend code changed (look at git commits last 30 min). If yes: ROLLBACK. If no: backend is being strict about validation (shouldn't happen) |
| 401 Unauthorized | Check if auth service is down. Page backend oncall. |
| 500 Server Error | Page backend oncall immediately (backend issue) |
| 503 Unavailable | Page backend oncall immediately (backend down) |

**Escalation:** All of the above require backend team

---

## 🟡 Warning Alerts (Notify in Slack)

### Alert: "SW Activation Rate <95% for 5 min"

**Not critical yet, but trending wrong.**

**Action:**
1. Post in #platform-alerts: `"⚠️ SW activation rate dropping (93% last 5 min)"`
2. Monitor for next 10 min
3. If goes below 90%, escalate to critical response above
4. If recovers to >95%, you're done

---

### Alert: "Sync Queue >100 Pending Items for 5 min"

**Items accumulating, sync can't keep up.**

**Action:**
1. Check `/api/checkin/bulk` latency: Is it slow?
   - If p95 > 1s: API is slow, sync falls behind → OK to wait
   - If p95 < 200ms: API is fast, so why accumulating?
2. Check for recent deployment: Was anything deployed last 30 min?
   - If yes to frontend: Could be sync-queue.js bug (check if commits look OK)
   - If yes to backend: Backend may have degraded (check backend metrics)
3. Post in #platform-alerts: `"⚠️ Sync queue backing up (150 pending items)"`
4. Monitor for trend:
   - If items decreasing: sync is catching up, issue resolving
   - If items increasing: escalate to critical (sync broken)

---

### Alert: "API Latency p95 >1s"

**Sync is slow, users will notice.**

**Action:**
1. Check API database performance: Is query slow?
2. Check infrastructure: CPU/memory/connections OK?
3. Page backend oncall if you don't know

---

## 🟢 Info Alerts (Log & Monitor)

These are expected variations. Just watch them.

- **"Cache Hit Rate <80%"** — Normal on first day. Should stabilize after 24h.
- **"Average Retry Count >2"** — Some network instability. Keep an eye on it.
- **"Sync Processing Time >10s"** — Just slow, not broken. User will experience slight delay coming online.

---

## 🔍 Debugging Checklist

### User Says: "My checkin didn't sync"

1. Ask them:
   - "Did you see a green toast saying 'Synced X check-ins' when you came online?"
   - If YES → it synced successfully (they're confused, not a real issue)
   - If NO → go to step 2

2. Check server logs:
   ```sql
   SELECT * FROM api_logs 
   WHERE user_id = 'THEIR_ID'
     AND endpoint = '/api/checkin/bulk'
   ORDER BY timestamp DESC LIMIT 10
   ```
   - Did we receive the sync request?
   - If YES → it made it to server (UI bug or data display issue)
   - If NO → sync never sent (client-side issue)

3. If sync never sent:
   - Have them check: Were they actually online when syncing?
   - Have them try again (toggle WiFi)
   - If still fails: Have them clear browser cache and try

4. If sync sent but didn't appear:
   - This is a data issue, not offline issue
   - Page backend to check if `/api/checkin/bulk` payload was correct

---

### User Says: "App won't load offline"

1. Ask them:
   - "Have you used the app online before?" (needed to cache data)
   - If NO → have them go online first, wait 30 sec, then go offline
   - If YES → continue

2. Check if Service Worker is installed:
   - Have them open DevTools (F12) → Application → Service Workers
   - Is there a service worker listed? Status should be "activated and running"
   - If NO → SW didn't install (could be old browser, or deployment issue)

3. If SW is there but app still won't load:
   - Have them clear browser cache (Ctrl+Shift+Delete) and refresh
   - Then go offline again
   - If works → it was a caching issue

4. If still broken → escalate to engineering (browser compatibility issue)

---

### Sync is Very Slow (>30s)

1. Check API latency: Is backend slow?
   ```sql
   SELECT AVG(response_time_ms), MAX(response_time_ms)
   FROM api_logs
   WHERE endpoint = '/api/checkin/bulk'
     AND timestamp > NOW() - INTERVAL 10 MINUTES
   ```
   - If >1000ms: Backend issue, page them
   - If <500ms: Frontend is fine, something else is slow

2. Check browser network conditions:
   - Ask user: Are you on WiFi or mobile data?
   - If mobile: Network just slow (3G is slow)
   - If WiFi: But still slow? Could be browser lag

3. Check sync queue size:
   - Is user syncing 1000+ items?
   - If yes: That's expected to take time
   - If no (just 5-10 items): Should be <5s (contact engineering)

---

## 📋 Escalation Contacts

| System | Owner | Slack | On-Call |
|--------|-------|-------|---------|
| Frontend/SW/IndexedDB | Platform (@cassio) | #platform-alerts | Page on-call in PagerDuty |
| Backend API | Backend (@backend-lead) | #backend-alerts | Page on-call in PagerDuty |
| Deployment/Infra | DevOps (@devops-lead) | #devops-alerts | Page on-call in PagerDuty |
| Monitoring | Platform (@cassio) | #monitoring | Self-resolve or page platform |

---

## 🔄 Incident Response Flow

1. **Alert fires** → You get paged
2. **Check severity** → Use guide above to figure out Critical/Warning/Info
3. **Investigate** → Follow debugging steps above
4. **Communicate** → Post in #platform-alerts or #incidents (for critical)
5. **Escalate** → Page appropriate team
6. **Monitor** → Watch metrics until resolved
7. **Document** → Post-incident: What broke? How to prevent?

---

## 🧪 Testing Alerts (Do This Before Going On-Call)

Make sure alerts actually notify you:

```bash
# Simulate SW error by unregistering:
# Open DevTools console and run:
navigator.serviceWorker.getRegistrations()
  .then(r => r[0].unregister())

# Wait 2 min — you should get a Slack alert

# Simulate sync error by clearing IndexedDB:
# Open DevTools console and run:
indexedDB.deleteDatabase('suplilist')

# Try to sync — should fire an error
```

---

## 📞 Quick Links

- **Monitoring Dashboard:** [link-here]
- **API Logs:** [link-here]
- **Git Deployments:** [link-here]
- **PagerDuty:** [link-here]
- **Slack:** #platform-alerts

---

## 📝 Post-Incident Checklist

When incident is resolved:

- [ ] Slack thread summarizing: What broke? How was it fixed?
- [ ] Root cause: Why did it happen?
- [ ] Preventive measure: How to stop it happening again?
- [ ] Update this runbook if needed
- [ ] Update monitoring if threshold was wrong
- [ ] Retrospective scheduled (if serious incident)

---

**Version:** 1.0  
**Last Updated:** 2026-06-03  
**Next Review:** 2026-06-10
