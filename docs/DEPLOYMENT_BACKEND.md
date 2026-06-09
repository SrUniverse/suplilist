# Backend Deployment Guide

**Table of Contents**
1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Database Setup](#database-setup)
4. [Redis Configuration](#redis-configuration)
5. [Rate Limiting](#rate-limiting)
6. [CSRF Protection](#csrf-protection)
7. [Graceful Shutdown](#graceful-shutdown)
8. [Health Checks](#health-checks)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)
11. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### System Requirements

- **Node.js**: 18.x or higher
- **NPM**: 8.x or higher
- **MongoDB**: 4.4+ (Atlas or self-hosted)
- **Redis**: 6.0+ (for rate limiting and caching)
- **Docker**: Optional, for containerized deployment

### Installation Check

```bash
node --version      # v18.x or higher
npm --version       # 8.x or higher
mongosh --version   # For MongoDB connection verification
redis-cli ping      # Should return PONG
```

---

## Environment Variables

Create a `.env` file in the server root directory with the following variables:

```bash
# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database (MongoDB)
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/suplilist?retryWrites=true&w=majority

# Redis (Cache & Rate Limiting)
REDIS_URL=redis://username:password@redis-host:6379/0

# JWT Secrets (generate with: openssl rand -hex 32)
JWT_SECRET=your-random-32-char-hex-string
JWT_REFRESH_SECRET=your-different-32-char-hex-string
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# CSRF Protection
CSRF_TOKEN_SECRET=your-csrf-secret-key
CSRF_TOKEN_ROTATION_INTERVAL=3600000  # 1 hour in milliseconds

# Frontend
FRONTEND_ORIGIN=https://suplilist.com

# AWS S3 (Avatar uploads)
AWS_REGION=sa-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=suplilist-avatars

# Email Service (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Monitoring & Observability
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
TRACE_ID_ENABLED=true
METRIC_EXPORT_ENABLED=true

# Cloudflare Edge Protection
CF_EDGE_TOKEN=your-cloudflare-edge-token

# Feature Flags
PRICE_CRAWL_ENABLED=true
EMAIL_NOTIFICATIONS_ENABLED=true
MFA_ENABLED=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000          # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100          # Per window
RATE_LIMIT_SKIP_HEALTH_CHECKS=true
```

### Environment Variable Validation

All variables are validated on startup using Zod schemas. If a required variable is missing or invalid:

```
❌ Error: MONGO_URI is required
Process will exit with code 1
```

To verify environment variables are loaded correctly:

```bash
node -e "console.log(process.env.MONGO_URI)"
```

---

## Database Setup

### MongoDB Connection

#### Atlas (Recommended for Production)

1. Create a cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user with strong password
3. Whitelist your server IP
4. Copy connection string to `MONGO_URI`:

```
mongodb+srv://username:password@cluster.mongodb.net/suplilist?retryWrites=true&w=majority
```

#### Self-Hosted

```bash
# Local development
MONGO_URI=mongodb://localhost:27017/suplilist

# With authentication
MONGO_URI=mongodb://user:pass@host:27017/suplilist?authSource=admin
```

### Database Initialization

Mongoose automatically creates collections on first insert. However, for performance, create indexes:

```bash
# Connect to MongoDB
mongosh "mongodb+srv://user:password@cluster.mongodb.net"

# Create essential indexes
use suplilist

# Users and auth
db.users.createIndex({ email: 1 }, { unique: true })
db.refresh_tokens.createIndex({ token: 1 }, { unique: true })
db.refresh_tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })

# Supplements and prices
db.supplements.createIndex({ id: 1 }, { unique: true })
db.price_history.createIndex({ supplementId: 1, date: 1 })

# User data
db.user_profiles.createIndex({ userId: 1 }, { unique: true })
db.user_settings.createIndex({ userId: 1 }, { unique: true })
db.favorites.createIndex({ userId: 1, supplementId: 1 })
db.stack_items.createIndex({ userId: 1 })

# Audit trail
db.audit_logs.createIndex({ userId: 1, createdAt: -1 })
db.audit_logs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }) # 30 days TTL

# Price alerts
db.price_alerts.createIndex({ userId: 1, supplementId: 1 })
db.price_alerts.createIndex({ userId: 1, active: 1 })
```

### Database Backup Strategy

```bash
# Daily backup to AWS S3 (run via cron)
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net" \
  --archive=backup-$(date +%Y%m%d).archive \
  --gzip

aws s3 cp backup-$(date +%Y%m%d).archive \
  s3://suplilist-backups/mongodb/
```

---

## Redis Configuration

### Connection String Format

```bash
# Basic
REDIS_URL=redis://localhost:6379/0

# With password
REDIS_URL=redis://password@redis-host:6379/0

# Sentinel (high availability)
REDIS_URL=redis-sentinel://sentinel-master:26379,sentinel-node2:26379/0?sentinelSet=mymaster

# TLS (production)
REDIS_URL=rediss://password@redis-host:6379/0
```

### Redis Memory Management

```bash
# Connect to Redis
redis-cli

# Configure memory policy (evict least recently used)
CONFIG SET maxmemory-policy allkeys-lru
CONFIG SET maxmemory 1gb

# Verify
CONFIG GET maxmemory
CONFIG GET maxmemory-policy

# Persist configuration
CONFIG REWRITE
```

### Cache Key Patterns

```javascript
// Price cache (1 hour TTL)
supplement:prices:{supplementId} -> expires in 3600s

// Rate limit counters (15 min)
rate-limit:{userId}:{endpoint} -> expires in 900s

// CSRF tokens (rotating hourly)
csrf:token:{userId} -> expires in 3600s
```

---

## Rate Limiting

### Global Configuration

```env
# Applied to all endpoints except /health/*
RATE_LIMIT_WINDOW_MS=900000       # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100        # 100 requests per window
RATE_LIMIT_SKIP_HEALTH_CHECKS=true # Don't count health checks
```

### Per-Endpoint Limits

```javascript
// In production, customize per endpoint:

// Authentication endpoints: stricter
POST /api/auth/login              -> 5 requests / 15 min
POST /api/auth/mfa/verify         -> 3 requests / 15 min

// Supplement search: moderate
GET /api/supplements/search        -> 30 requests / 15 min

// Write operations: moderate
POST /api/supplements/crawl-demand -> 10 requests / 1 hour

// Health checks: unlimited
GET /health/live                   -> unlimited
GET /health/ready                  -> unlimited
```

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1640000000
Retry-After: 453
```

### Testing Rate Limiting

```bash
# Simulate rate limit
for i in {1..101}; do
  curl -i https://api.suplilist.com/api/supplements/search?q=creatina
done

# Should receive 429 (Too Many Requests) after 100 requests
```

---

## CSRF Protection

### Token Rotation Setup

```bash
# CSRF token expires every hour and rotates
CSRF_TOKEN_ROTATION_INTERVAL=3600000  # milliseconds

# Token validation: client must send in X-CSRF-Token header
# (configured automatically on first login)
```

### Manual Token Refresh

```bash
# Client-side (JavaScript)
async function refreshCSRFToken() {
  const response = await fetch('/api/auth/csrf-token', {
    method: 'POST',
    credentials: 'include'
  });
  const { token } = await response.json();
  // Store and use in future requests
  localStorage.setItem('csrfToken', token);
}
```

### CSRF Validation Flow

1. Client receives token on login
2. Client includes token in `X-CSRF-Token` header
3. Server validates token against Redis store
4. Token automatically rotates hourly
5. Expired tokens are rejected with 403

---

## Graceful Shutdown

### Configuration

The server automatically handles graceful shutdown on SIGTERM/SIGINT:

```javascript
// server.ts - Automatic graceful shutdown
const shutdown = (signal: string) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  // 1. Stop accepting new requests
  server.close();
  
  // 2. Wait for pending requests (30s timeout)
  // 3. Close database connections
  // 4. Close cache connections
  // 5. Exit process
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

### Deployment Shutdown Sequence

```bash
# Send SIGTERM (graceful)
kill -TERM <pid>

# Monitor logs for:
# - "Received SIGTERM"
# - "HTTP server closed"
# - "MongoDB connection closed"

# Force shutdown if needed (10s timeout)
sleep 10 && kill -9 <pid>
```

### Docker Graceful Shutdown

```dockerfile
STOPSIGNAL SIGTERM

# In docker-compose.yml
services:
  api:
    stop_signal: SIGTERM
    stop_grace_period: 30s
```

---

## Health Checks

### Liveness Probe (/health/live)

Checks if server process is running (no database check):

```bash
curl https://api.suplilist.com/health/live
# Response (HTTP 200):
{
  "status": "ok",
  "timestamp": "2024-06-08T10:00:00Z",
  "uptime": 3600
}
```

**Use for**: Docker/Kubernetes container restart decisions

### Readiness Probe (/health/ready)

Checks if server is ready to handle requests (database + cache):

```bash
curl https://api.suplilist.com/health/ready
# Response (HTTP 200):
{
  "status": "ok",
  "database": "connected",
  "cache": "connected",
  "timestamp": "2024-06-08T10:00:00Z"
}
```

**Degraded Response** (HTTP 503):

```json
{
  "status": "degraded",
  "database": "disconnected",
  "cache": "connected",
  "timestamp": "2024-06-08T10:00:00Z"
}
```

### Kubernetes Configuration

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: suplilist-api
spec:
  containers:
  - name: api
    image: suplilist/api:latest
    livenessProbe:
      httpGet:
        path: /health/live
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 3000
      initialDelaySeconds: 10
      periodSeconds: 5
      timeoutSeconds: 3
```

---

## Monitoring

### Metrics to Track

```
// Performance
- Response time (target: < 500ms p95)
- Request throughput (requests/sec)
- Error rate (target: < 1%)
- Database query time (target: < 100ms)

// Cache
- Cache hit rate (target: > 80%)
- Cache miss rate (target: < 20%)
- Redis memory usage

// Availability
- Uptime percentage (target: 99.9%)
- Health check pass rate (100%)
```

### Log Aggregation

All logs include:
- `timestamp`: ISO 8601 format
- `level`: info, warn, error
- `traceId`: Unique request identifier
- `userId`: For authenticated requests
- `duration`: Request duration in ms

```javascript
// Example log entry
{
  "timestamp": "2024-06-08T10:00:00.123Z",
  "level": "info",
  "message": "User login successful",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user123",
  "email": "user@example.com",
  "duration": 245
}
```

### Distributed Tracing

Enable with `TRACE_ID_ENABLED=true`:

```bash
# All request/response logs include traceId
curl -i https://api.suplilist.com/api/supplements/search?q=creatina \
  -H "X-Request-ID: 550e8400-e29b-41d4-a716-446655440000"

# Response header
X-Trace-ID: 550e8400-e29b-41d4-a716-446655440000
```

### Dashboard Setup (Grafana)

```
1. Connect Grafana to logs (Loki, CloudWatch, etc.)
2. Create dashboard with:
   - HTTP Status Code distribution
   - Response time histogram (p50, p95, p99)
   - Error rate trend
   - Database connection pool status
   - Redis memory usage
   - Request throughput
```

### SLA Targets

```
Availability:      99.9% uptime (< 43 min downtime/month)
Response Time:     < 500ms (95th percentile)
Error Rate:        < 1% (HTTP 5xx)
Cache Hit Rate:    > 80%
```

---

## Troubleshooting

### MongoDB Connection Errors

**Error**: `Error: connect ECONNREFUSED 127.0.0.1:27017`

```bash
# Check MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# Verify MONGO_URI
echo $MONGO_URI

# Test connection
mongosh "$MONGO_URI"
```

**Error**: `MongoAuthenticationError: authentication failed`

```bash
# Verify credentials in MONGO_URI
# Check user exists: mongosh admin --eval "db.getUser('username')"
# Reset password if needed
```

### Redis Connection Errors

**Error**: `Error: ECONNREFUSED 127.0.0.1:6379`

```bash
# Check Redis is running
redis-cli ping  # Should return PONG

# Verify REDIS_URL
echo $REDIS_URL

# Test connection
redis-cli -u "$REDIS_URL" ping
```

### Rate Limiting Issues

**Problem**: All requests return 429 (Too Many Requests)

```bash
# Check Redis is working
redis-cli info memory

# Reset rate limit counters
redis-cli FLUSHDB  # WARNING: Clears all cache!

# Or delete specific counters
redis-cli KEYS "rate-limit:*" | xargs redis-cli DEL
```

### CSRF Token Errors

**Error**: `403 Forbidden: CSRF token invalid`

```bash
# Client should:
1. Request new CSRF token after login
2. Include token in X-CSRF-Token header
3. Token rotates every hour (auto-refresh on error)

# Server logs: check CSRF_TOKEN_SECRET is set
echo $CSRF_TOKEN_SECRET
```

### Memory Leaks

**Problem**: Server memory usage grows indefinitely

```bash
# Monitor memory usage
while true; do 
  ps aux | grep node | grep -v grep | awk '{print $6}'; 
  sleep 5; 
done

# Enable heap snapshots
NODE_OPTIONS=--enable-source-maps node dist/server.js

# Take heap snapshot
kill -USR2 <pid>  # Creates heap-snapshot-*.heapsnapshot
```

---

## Rollback Procedures

### Blue-Green Deployment

```bash
# 1. Deploy to green environment
git checkout v1.2.0  # Previous stable version
npm install
npm run build

# 2. Start green (on different port 3001)
PORT=3001 npm start

# 3. Test green
curl http://localhost:3001/health/ready

# 4. Switch load balancer to green
# (Update DNS/Nginx to route to port 3001)

# 5. Monitor green
# (Wait 5 minutes to confirm stability)

# 6. If stable: keep green, terminate blue
# If unstable: switch back to blue

# 7. After 24 hours: terminate old environment
kill -TERM <blue-pid>
```

### Database Rollback (MongoDB)

```bash
# 1. Take backup before upgrade
mongodump --uri="$MONGO_URI" --archive=pre-upgrade.archive

# 2. If migration fails, restore backup
mongorestore --uri="$MONGO_URI" --archive=pre-upgrade.archive --drop

# 3. Verify data integrity
mongosh "$MONGO_URI" -e "db.collection.find().count()"
```

### Redis Cache Invalidation

```bash
# On deployment, optionally flush cache
redis-cli -u "$REDIS_URL" FLUSHDB

# This is safe — cache will rebuild on first request
# Or selectively delete patterns:
redis-cli -u "$REDIS_URL" --scan --pattern "price-*" | xargs redis-cli DEL
```

### Rollback Checklist

- [ ] Verify previous version is stable
- [ ] Stop new version gracefully
- [ ] Verify database is still accessible
- [ ] Confirm health checks pass
- [ ] Test critical user flows
- [ ] Monitor error rates for 10 minutes
- [ ] Notify stakeholders of rollback

---

## Production Deployment Checklist

- [ ] All environment variables set correctly
- [ ] MongoDB backup automated (daily)
- [ ] Redis persistence enabled
- [ ] HTTPS enforced (HSTS headers enabled)
- [ ] Rate limiting configured per endpoint
- [ ] CSRF protection enabled
- [ ] Health checks passing
- [ ] Logs aggregated and monitored
- [ ] Error tracking (Sentry) configured
- [ ] Graceful shutdown tested
- [ ] Rollback procedure documented
- [ ] Team trained on incident response

---

**Last Updated**: June 2024  
**Maintainer**: Engineering Team  
**Related Docs**: [MONITORING.md](./MONITORING.md), [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md)
