# Incident Response Playbook

**Table of Contents**
1. [Severity Levels](#severity-levels)
2. [Triage Procedure](#triage-procedure)
3. [Response Procedures](#response-procedures)
4. [Mitigation Strategies](#mitigation-strategies)
5. [Communication Templates](#communication-templates)
6. [Postmortem Process](#postmortem-process)
7. [On-Call Runbooks](#on-call-runbooks)

---

## Severity Levels

### CRITICAL (Page On-Call)

Service is down or severely degraded. Users cannot use the application.

**Indicators**:
- `/health/ready` returning 503 (database/cache disconnected)
- Error rate > 5%
- Response time > 2 seconds (p95)
- Complete API unavailability (503/504 on all endpoints)
- Data loss or corruption detected

**Response Time**: < 5 minutes  
**Duration Before Escalation**: 15 minutes

**Example**: "MongoDB cluster lost connection, all API requests failing"

---

### HIGH (Notify Team)

Significant performance degradation or partial service unavailability.

**Indicators**:
- Error rate 1-5%
- Response time 500ms-2s (p95)
- Specific endpoints timing out (e.g., `/supplements/search` slow)
- Cache system failing
- Memory leak or resource exhaustion

**Response Time**: < 15 minutes  
**Duration Before Escalation**: 30 minutes

**Example**: "Database query performance degraded, response times up to 1.5 seconds"

---

### MEDIUM (Log & Monitor)

Warnings or minor issues with potential user impact.

**Indicators**:
- Error rate < 1% (but increasing trend)
- Database query warnings
- Cache misses spiking
- Non-critical service unavailable
- Resource usage approaching limits

**Response Time**: < 1 hour  
**Duration Before Escalation**: 2 hours

**Example**: "Redis memory usage at 75%, monitoring for eviction"

---

### LOW (Informational)

Non-critical warnings, performance observations.

**Indicators**:
- Deprecation warnings
- Optional feature unavailable
- Non-critical dependency warning

**Response Time**: No urgency  
**Action**: Log and track for future optimization

---

## Triage Procedure

### Immediate Actions (First 2 Minutes)

```
1. Check /health/live
   └─ If HTTP 503/timeout → Server crash/network issue

2. Check /health/ready  
   └─ If database: disconnected → MongoDB issue
   └─ If cache: disconnected → Redis issue
   └─ If both: disconnected → Network/credentials

3. Check recent deployment
   └─ If deployment < 5 min ago → Likely cause

4. Check error logs (last 5 minutes)
   └─ Look for stack traces or error patterns

5. Check metrics dashboard
   └─ Error rate trend
   └─ Response time trend
   └─ Resource usage
```

### Health Check Checklist

```bash
#!/bin/bash
# Instant triage script

echo "=== Liveness Check ==="
curl -i https://api.suplilist.com/health/live

echo -e "\n=== Readiness Check ==="
curl -i https://api.suplilist.com/health/ready

echo -e "\n=== Recent Errors (last 5m) ==="
# Query logs: level: ERROR AND timestamp > now-5m

echo -e "\n=== Database Status ==="
mongosh "$MONGO_URI" --eval "db.adminCommand('ping')"

echo -e "\n=== Redis Status ==="
redis-cli -u "$REDIS_URL" ping

echo -e "\n=== Recent Deployments ==="
# Query deployment history (last 30 min)
```

### Root Cause Categories

| Category | Detection | Example |
|----------|-----------|---------|
| **Database** | /health/ready shows disconnected | MongoDB Atlas cluster down |
| **Cache** | /health/ready shows disconnected | Redis memory exhausted |
| **Code** | Error logs with stack traces | Null pointer exception |
| **Deployment** | Timeline matches issue start | Broken release deployed |
| **Infrastructure** | CPU/Memory spike | Out of memory crash |
| **External** | Upstream API calls failing | Stripe API down |
| **Network** | Timeout errors, connection refused | Firewall rule misconfigured |

---

## Response Procedures

### CRITICAL Incident Response

**Duration**: Continuous until recovery

**Step 1: Declare Incident (Immediately)**
```
1. Open incident in incident management tool
2. Set severity: Critical
3. Notify on-call engineer (PagerDuty)
4. Notify incident commander
5. Create incident Slack channel: #incident-suplilist-20240608
6. Post initial status: "We're investigating API availability issue"
```

**Step 2: Stabilize (First 10 minutes)**
```
1. Gather team in incident channel
2. Each team member checks their domain:
   - Database: Is MongoDB responding? Can anyone connect?
   - Cache: Is Redis accessible? Memory status?
   - Code: Are there recent deployments? Any errors?
   - Infrastructure: CPU? Memory? Disk space?
3. Share findings in incident channel
4. Determine if incident is still ongoing
```

**Step 3: Investigate Root Cause (10-30 minutes)**

If **database disconnected**:
```
1. Check MongoDB cluster status (AWS console or mongosh)
2. Check network connectivity from server to DB
3. Check credentials in environment variables
4. Check firewall rules
5. Action: Failover if Atlas replica, restart client if needed
```

If **cache disconnected**:
```
1. Check Redis status (redis-cli info)
2. Check network connectivity
3. Check credentials
4. Action: Restart Redis or failover to backup
```

If **recent deployment**:
```
1. Identify what changed in latest deployment
2. Review deploy logs for build/startup errors
3. Decision: Rollback or fix forward
4. Execute rollback (if safer): git checkout v1.2.0 && npm run build
```

If **code error** (from logs):
```
1. Get stack trace from error logs
2. Identify affected code
3. Decision: Deploy fix or rollback
4. If rollback: git revert && deploy
```

**Step 4: Recovery (30-60 minutes)**
```
1. Verify /health/ready returns 200
2. Verify error rate drops < 1%
3. Verify response times return to normal (< 500ms)
4. Test critical user flows:
   - Can users login?
   - Can users search supplements?
   - Can users view details?
5. Monitor metrics for 10 minutes post-recovery
6. If stable: declare incident resolved
```

**Step 5: Communication**
```
Immediately:   "We're investigating an issue affecting API availability"
At 5 min:      "Root cause identified: [brief description]"
At 10 min:     "We're implementing a fix/rollback"
At 15 min:     "Fix deployed, verifying recovery"
At 20 min:     "Service recovered. We're monitoring closely"
Resolution:    "Incident resolved. Full postmortem coming within 48 hours"
```

---

### HIGH Incident Response

**Duration**: Up to 30 minutes

```
1. Open incident, set severity: High
2. Notify team (Slack #engineering)
3. Assign incident commander
4. Gather relevant logs and metrics
5. Identify affected endpoints
6. Implement fix or mitigation:
   - Scale up instances
   - Flush cache
   - Optimize database query
   - Disable non-critical feature
7. Verify fix with metrics
8. Post-incident: 24-hour review
```

---

### MEDIUM Incident Response

```
1. Create ticket in incident system
2. Assign to relevant engineer
3. Investigate root cause
4. Plan fix for next release or sprint
5. Track resolution in backlog
6. No immediate paging needed
```

---

## Mitigation Strategies

### Database Issues

**Problem**: MongoDB cluster connection lost

**Immediate Mitigation** (< 5 min):
```bash
# 1. Verify failover to secondary
mongosh "$MONGO_URI" --eval "rs.status()"

# 2. If primary down, manual failover:
mongosh --eval "rs.stepDown()"

# 3. If all down, check Atlas cluster health in AWS console
```

**Fallback** (if database unavailable for > 5 min):
```
1. Scale database connections from pool to 1
2. Disable features requiring database:
   - User login (fail gracefully)
   - Price alerts (defer to background job)
3. Serve cached supplement data for read-only endpoints
4. Return 503 Service Unavailable with retry-after header
```

---

### Cache Issues

**Problem**: Redis unreachable or memory exhausted

**Immediate Mitigation**:
```bash
# 1. Check Redis memory
redis-cli -u "$REDIS_URL" info memory

# 2. If memory exhausted, flush old data (non-user-critical)
redis-cli -u "$REDIS_URL" --scan --pattern "search:*" | xargs redis-cli DEL

# 3. If still exhausted, gracefully disable caching
# (app continues without cache, slightly slower)
CACHE_ENABLED=false npm start
```

**Fallback** (disable cache):
```
1. Set CACHE_ENABLED=false in environment
2. All queries hit database directly
3. Performance degrades but service stays up
4. Monitor database load
5. If database overloaded: scale database or scale API instances
```

---

### Performance Degradation

**Problem**: Response times > 500ms (p95)

**Diagnosis**:
```javascript
// 1. Check where time is spent
  [5ms] Middleware
  [50ms] Get supplement from DB
  [350ms] Call external API (slow!)
  [5ms] Serialize response
  Total: 410ms

// Culprit: External API call (Stripe, etc.)
```

**Mitigation**:
```
1. If external API slow: implement timeout
   - Default to cached value if timeout
   - Retry with exponential backoff

2. If database slow: check query logs
   - Add missing index
   - Optimize query

3. If overwhelmed: rate limit/queue requests
   - Implement request queue
   - Return 429 Too Many Requests gracefully
   - Queue processes in background

4. If instance CPU high: scale horizontally
   - Add another instance behind load balancer
```

---

### Deployment-Related Incident

**Problem**: Latest deploy introduced a bug

**Immediate Action** (< 5 minutes):
```bash
# 1. Identify the bad commit
git log -5 --oneline

# 2. Quick rollback
git checkout v1.2.0  # Previous stable version
npm install
npm run build
npm start

# 3. Verify health checks
curl https://api.suplilist.com/health/ready

# 4. Monitor metrics
# Wait 5 minutes to confirm stability
```

**Post-Incident**:
```
1. Fix the bug in code
2. Add automated test to prevent regression
3. Test thoroughly before next deploy
4. Deploy fixed version
```

---

## Communication Templates

### Initial Alert (First 2 Minutes)

**To**: On-call engineer (PagerDuty)  
**Subject**: Critical Incident: API Unavailable

```
We've detected API unavailability.

Severity: CRITICAL
Affected: All API endpoints
Status: Investigating

/health/live: HTTP 503
/health/ready: Database disconnected

Action: Check Slack #incident-channel for updates.
```

---

### Status Update (Every 10 Minutes)

**To**: #incident-suplilist Slack channel

```
[Update #1 - 10:05 AM]

Status: Ongoing investigation
Root cause: MongoDB Atlas cluster failover in progress
Impact: All API requests returning 503
Current action: Waiting for cluster to recover

Next update: 10:15 AM
```

```
[Update #2 - 10:15 AM]

Status: Partial recovery
Root cause: Identified - Atlas maintenance event
Impact: 40% of requests recovered
Current action: Restoring remaining replicas

Next update: 10:20 AM
```

---

### Resolution Announcement

**To**: #incident-suplilist + #general Slack channels

```
[RESOLVED]

Incident resolved at 10:28 AM

Duration: 28 minutes (10:00 AM - 10:28 AM)
Root cause: MongoDB Atlas maintenance window (unplanned)
Impact: All API endpoints unavailable for 28 minutes
Users affected: ~500 users during incident window

Postmortem: Full analysis and action items coming within 48 hours.
We apologize for the disruption.
```

---

### Status Page Update

**Publish immediately on incident.suplilist.com**:

```html
<incident>
  <status>Investigating</status>
  <time>2024-06-08 10:00 AM</time>
  <description>
    We are investigating elevated error rates on our API. 
    Some users may experience timeouts or errors.
  </description>
  <impact>
    Supplement search and price comparison may be slow.
  </impact>
  <next_update>10:10 AM</next_update>
</incident>
```

**Post-resolution**:
```html
<incident>
  <status>Resolved</status>
  <time_resolved>2024-06-08 10:28 AM</time_resolved>
  <duration>28 minutes</duration>
  <description>
    Our MongoDB database cluster underwent an unplanned maintenance 
    event, causing all API requests to fail. The cluster has now recovered.
  </description>
</incident>
```

---

## Postmortem Process

### Postmortem Template

Create a document within **24-48 hours** of incident resolution.

```markdown
# Postmortem: API Unavailability - June 8, 2024

## Executive Summary
28-minute API outage affecting all users. Root cause: 
MongoDB Atlas unplanned maintenance. No data loss.

## Timeline
10:00 AM - Monitoring detected /health/ready = 503
10:02 AM - On-call engineer paged
10:08 AM - Root cause identified: Atlas maintenance
10:15 AM - Partial recovery (failover in progress)
10:28 AM - Full recovery, all systems operational
10:35 AM - Status page updated, incident closed

## Root Cause
MongoDB Atlas performed an unplanned maintenance event, 
causing the primary replica to become temporarily unavailable.
Our cluster was configured with only one replica, 
leaving no secondary for failover.

## Contributing Factors
1. Insufficient replica configuration (needs minimum 3)
2. No alerts for maintenance events from MongoDB
3. No fallback cache layer for database unavailability

## Impact
- 28 minutes complete unavailability
- ~500 users affected during peak hours
- 2 user complaints received
- No data loss or corruption

## What Went Well
- Monitoring immediately detected the issue
- Team responded quickly
- Clear communication to users
- Service auto-recovered

## What Could Be Better
1. Database replica configuration inadequate
2. No fallback for database outages
3. Slow incident communication (8 min to first update)
4. No runbook for this specific scenario

## Action Items
1. [P0] Increase MongoDB replica count to 3
   Owner: DBA Team
   Due: June 15

2. [P0] Implement cache fallback for database outages
   Owner: Backend Team
   Due: June 20

3. [P1] Create runbook for MongoDB failover
   Owner: DevOps Team
   Due: June 15

4. [P2] Add alerts for Atlas maintenance events
   Owner: DevOps Team
   Due: June 22

## Prevention
- Monitoring: ✓ Already in place
- Alerting: ✓ Need alerts for maintenance events
- Redundancy: Need more replicas
- Graceful degradation: Need cache fallback
- Documentation: Need runbooks

## Follow-Up
- Review this postmortem in engineering meeting
- Assign owners for action items
- Track completion in project management system
- Share learning with team in slack
```

### Postmortem Review Meeting

**Attendees**: Engineering team, DevOps, Product  
**Duration**: 30 minutes  
**Facilitator**: Incident Commander

```
1. Read timeline (5 min)
2. Discuss root cause (5 min)
3. Review action items (10 min)
4. Assign owners and deadlines (5 min)
5. Close postmortem (5 min)
```

---

## On-Call Runbooks

### Runbook: API All Endpoints Returning 503

**Symptom**: All API requests return HTTP 503 Service Unavailable

**Diagnosis**:
```bash
# 1. Check server liveness
curl -i https://api.suplilist.com/health/live
# Expected: HTTP 200

# 2. Check readiness
curl -i https://api.suplilist.com/health/ready
# Expected: HTTP 200
# If 503: database or cache disconnected

# 3. Test each component
mongosh "$MONGO_URI" --eval "db.adminCommand('ping')"
redis-cli -u "$REDIS_URL" ping
```

**Possible Causes**:
- [ ] Database disconnected
- [ ] Cache disconnected  
- [ ] Server crashed
- [ ] Network outage

**Resolution**:
1. If database disconnected → Contact database team, check Atlas console
2. If cache disconnected → Restart Redis or failover
3. If server crashed → Check logs, restart service
4. If network outage → Check firewall, routing, DNS

---

### Runbook: Response Time > 500ms

**Symptom**: p95 response time > 500ms

**Diagnosis**:
```bash
# Check where time is spent
# 1. Database query time
mongosh "$MONGO_URI" --eval "db.setProfilingLevel(1)"
db.system.profile.find().pretty()

# 2. API response time per endpoint
# From monitoring dashboard: which endpoint is slow?

# 3. Resource usage
top  # CPU
free # Memory
```

**Possible Causes**:
- [ ] Slow database query (missing index)
- [ ] High load (need more instances)
- [ ] External API timeout
- [ ] Memory/CPU constrained

**Resolution**:
1. If query slow → Add index or optimize query
2. If load high → Scale instances horizontally
3. If external API slow → Implement timeout/caching
4. If resource constrained → Restart service or scale

---

### Runbook: Error Rate > 1%

**Symptom**: Error rate (HTTP 5xx) exceeding 1%

**Diagnosis**:
```bash
# Find error patterns
# Query logs: level: ERROR

# Group by error type:
SELECT errorType, COUNT(*) 
FROM logs 
WHERE level = 'ERROR' AND timestamp > now-5m
GROUP BY errorType

# Common errors:
# - DatabaseError: Database down or timeout
# - ValidationError: Bad input validation
# - ExternalAPIError: Stripe, Resend, etc.
# - CodeError: Bug in code
```

**Resolution**:
1. If DatabaseError → Check database connectivity
2. If ValidationError → Check client input, fix validation logic
3. If ExternalAPIError → Implement graceful fallback
4. If CodeError → Identify bug, rollback or deploy fix

---

## On-Call Checklist

Before starting on-call shift:

- [ ] PagerDuty configured to notify your phone
- [ ] VPN access working
- [ ] Can access all monitoring dashboards
- [ ] Have database admin contact info
- [ ] Have previous on-call handoff notes
- [ ] Familiar with recent deployments
- [ ] Know how to trigger incident response
- [ ] Know escalation path (manager/CTO)

---

**Last Updated**: June 2024  
**Maintainer**: Platform Engineering  
**Related Docs**: [MONITORING.md](./MONITORING.md), [DEPLOYMENT_BACKEND.md](./DEPLOYMENT_BACKEND.md)
