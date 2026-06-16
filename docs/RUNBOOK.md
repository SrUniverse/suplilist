# SupliList Operational Runbooks

Quick reference guides for common operational tasks.

## Table of Contents

1. [Incident Response](#incident-response)
2. [Deployment Issues](#deployment-issues)
3. [Database Issues](#database-issues)
4. [Performance Issues](#performance-issues)
5. [Security Issues](#security-issues)

## Incident Response

### Severity Levels

| Level | Impact | Response Time | Examples |
|-------|--------|---------------|----------|
| **P1** | Total Outage | Immediate | API completely down, database unreachable |
| **P2** | Major Degradation | < 30 min | Error rate > 5%, latency > 5s |
| **P3** | Minor Issues | < 2 hours | Single endpoint slow, non-critical feature broken |
| **P4** | Cosmetic | < 1 day | UI glitches, minor typos |

### P1 Incident (Total Outage)

#### 1. Immediate Actions (First 5 minutes)

```bash
# 1. Verify the issue
kubectl get pods -n suplilist-prod
kubectl get svc -n suplilist-prod

# 2. Check pod status
kubectl describe pod <pod-name> -n suplilist-prod

# 3. View recent logs
kubectl logs --tail=100 -n suplilist-prod deployment/suplilist-api

# 4. Notify team
# Send to #incidents Slack channel:
# "P1 INCIDENT: SupliList API is DOWN. Investigating..."
```

#### 2. Diagnosis (Next 10 minutes)

```bash
# Check health endpoints
kubectl port-forward -n suplilist-prod svc/suplilist-api 8080:80
curl http://localhost:8080/health
curl http://localhost:8080/ready

# Check database connectivity
kubectl exec -it deployment/suplilist-api -n suplilist-prod -- \
  psql -U suplilist -d suplilist -c "SELECT 1"

# Check Redis connectivity
kubectl exec -it deployment/suplilist-api -n suplilist-prod -- \
  redis-cli -h redis ping

# Check resource constraints
kubectl top pods -n suplilist-prod
kubectl top nodes
```

#### 3. Recovery Actions

```bash
# Option A: Restart pod(s)
kubectl rollout restart deployment/suplilist-api -n suplilist-prod

# Option B: Force restart (more aggressive)
kubectl delete pods -l app=suplilist -n suplilist-prod

# Option C: Rollback to previous version
kubectl rollout undo deployment/suplilist-api -n suplilist-prod
kubectl rollout status deployment/suplilist-api -n suplilist-prod

# Option D: Scale up if under-resourced
kubectl scale deployment/suplilist-api --replicas=5 -n suplilist-prod

# Monitor recovery
watch kubectl get pods -n suplilist-prod
```

#### 4. Communication

```
Post updates every 5 minutes:
- What we found
- Actions taken
- Current status
- ETA for recovery

Format:
"UPDATE [TIME]: [Issue] | [Action] | Status: [status] | ETA: [time]"
```

#### 5. Post-Incident

```bash
# Create incident report
# Title: "[INCIDENT] SupliList API Outage - [DATE]"
# Include:
# - Timeline of events
# - Root cause analysis
# - Actions taken
# - Follow-up items
# - Lessons learned

# Schedule post-mortem within 24 hours
# Include: eng team, product, and stakeholders
```

### P2 Incident (Major Degradation)

#### Alert Checklist

```bash
# 1. Confirm the issue
curl -v https://suplilist.app/api/health

# 2. Check metrics
# Open Grafana: http://localhost:3000/d/api-dashboard
# Look for:
#   - Error rate spike
#   - Latency increase
#   - Memory/CPU spike

# 3. Identify affected service
kubectl logs -n suplilist-prod deployment/suplilist-api | grep ERROR

# 4. Scale up if load-related
kubectl scale deployment/suplilist-api --replicas=5 -n suplilist-prod

# 5. Check database
kubectl exec -it deployment/suplilist-api -n suplilist-prod -- \
  psql -U suplilist -d suplilist \
  -c "SELECT count(*) FROM pg_stat_activity;"
```

## Deployment Issues

### Deployment Stuck in Pending

```bash
# Check events
kubectl describe deployment suplilist-api -n suplilist-prod

# Common causes and fixes:

# 1. Not enough resources
kubectl top nodes
# Solution: Scale up node group or reduce pod resources

# 2. Image not found
kubectl describe pod <pod-name> -n suplilist-prod
# Look for "ImagePullBackOff"
# Solution: Push image to registry, verify tag

# 3. Secrets/ConfigMap missing
kubectl get secrets -n suplilist-prod
kubectl get configmap -n suplilist-prod
# Solution: Create missing resources

# 4. Node disk pressure
kubectl describe nodes | grep -A 5 DiskPressure
# Solution: Clean up old container images

kubectl rmi $(docker images -f "dangling=true" -q)
```

### Pods Crashing

```bash
# 1. Check crash logs
kubectl logs --previous <pod-name> -n suplilist-prod

# 2. Common crash patterns:

# Database connection error
# Solution: Check DATABASE_URL secret, verify RDS is running

# Out of memory
# Solution: Increase memory limit or fix memory leak

# Permission denied
# Solution: Check file permissions, verify user running pod

# 3. Force debug pod
kubectl run -it --image=node:20 debug-pod -n suplilist-prod -- /bin/bash
# Test connectivity, run npm install, etc.
```

### Slow Deployment

```bash
# Monitor rollout
kubectl rollout status deployment/suplilist-api -n suplilist-prod

# Check what's holding it up
kubectl get events -n suplilist-prod --sort-by='.lastTimestamp'

# Common causes:

# 1. Health checks failing
kubectl exec <pod-name> -n suplilist-prod -- curl localhost:5000/health

# 2. Readiness check timeout
# Increase initialDelaySeconds in deployment.yml
# Default: 10 seconds → increase to 30

# 3. Resource constraints
kubectl describe pod <pod-name> -n suplilist-prod
# Check for Pending or CrashLoopBackOff
```

## Database Issues

### High Connection Count

```bash
# Check connections
kubectl exec -it deployment/suplilist-api -n suplilist-prod -- \
  psql -U suplilist -d suplilist \
  -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# Kill idle connections
kubectl exec -it deployment/suplilist-api -n suplilist-prod -- \
  psql -U suplilist -d suplilist \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
       WHERE state = 'idle' AND datname = 'suplilist';"

# Increase connection pool size
# Edit deployment.yml or environment variables
# DATABASE_CONNECTION_POOL_SIZE=20
```

### Slow Queries

```bash
# Enable query logging
kubectl exec -it deployment/suplilist-api -n suplilist-prod -- \
  psql -U suplilist -d suplilist \
  -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"

# Reload configuration
kubectl exec -it deployment/suplilist-api -n suplilist-prod -- \
  psql -U suplilist -d suplilist \
  -c "SELECT pg_reload_conf();"

# View slow queries
kubectl exec -it deployment/suplilist-api -n suplilist-prod -- \
  psql -U suplilist -d suplilist \
  -c "SELECT * FROM pg_stat_statements 
       ORDER BY mean_time DESC LIMIT 10;"

# Create indexes for slow queries
# Example:
# CREATE INDEX idx_supplements_category ON supplements(category);
```

### Database Backup/Restore

```bash
# Create emergency backup
./scripts/backup-database.sh prod

# Verify backup
ls -lh backups/

# Restore from backup (if needed)
./scripts/restore-database.sh prod ./backups/suplilist-prod-YYYYMMDD_HHMMSS.sql.gz
```

## Performance Issues

### High API Latency

```bash
# 1. Check where time is spent
kubectl port-forward -n suplilist-prod svc/suplilist-api 8080:80

# Use curl with timing info
curl -w "@curl-format.txt" -o /dev/null -s https://suplilist.app/api/supplements

# 2. Analyze slow endpoints
# Open Prometheus: http://localhost:9090
# Query: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# 3. Common causes and fixes:

# Database query slow
# → Add index
# → Optimize query
# → Cache result

# N+1 query problem
# → Use batch queries
# → Add eager loading

# External API call slow
# → Add timeout
# → Implement circuit breaker
# → Cache results

# Large payload
# → Implement pagination
# → Add compression
# → Reduce response size
```

### High Memory Usage

```bash
# Check memory per pod
kubectl top pods -n suplilist-prod

# If > 80% of limit:

# 1. Check for memory leaks
kubectl logs -n suplilist-prod deployment/suplilist-api | grep -i memory

# 2. Profile memory usage
kubectl exec -it <pod-name> -n suplilist-prod -- \
  node --prof app.js

# 3. Increase memory limit
kubectl set resources deployment/suplilist-api \
  --limits=memory=1Gi -n suplilist-prod

# 4. Restart pod to clear memory
kubectl rollout restart deployment/suplilist-api -n suplilist-prod
```

### High CPU Usage

```bash
# Check CPU per pod
kubectl top pods -n suplilist-prod

# If > 80% of limit:

# 1. Check what's running
kubectl exec <pod-name> -n suplilist-prod -- ps aux

# 2. Check for hot loops
kubectl logs -n suplilist-prod deployment/suplilist-api | grep CPU

# 3. Profile CPU
kubectl exec -it <pod-name> -n suplilist-prod -- \
  node --prof app.js

# 4. Scale up
kubectl scale deployment/suplilist-api --replicas=5 -n suplilist-prod

# 5. Or increase CPU limit
kubectl set resources deployment/suplilist-api \
  --limits=cpu=1 -n suplilist-prod
```

## Security Issues

### Unauthorized Access Attempts

```bash
# Check logs for 401/403
kubectl logs -n suplilist-prod deployment/suplilist-api | grep -E "401|403"

# Verify auth configuration
kubectl get secret suplilist-secrets -n suplilist-prod -o yaml | grep JWT

# Rotate JWT if compromised
kubectl create secret generic suplilist-secrets \
  --from-literal=JWT_SECRET="new-secret-value" \
  -n suplilist-prod --dry-run=client -o yaml | kubectl apply -f -

# Restart pods to pick up new secret
kubectl rollout restart deployment/suplilist-api -n suplilist-prod
```

### High Rate Limiting Alerts

```bash
# Check rate limit configuration
kubectl get ingress -n suplilist-prod -o yaml | grep rate-limit

# Increase rate limit if legitimate
# Edit ingress.yml:
# nginx.ingress.kubernetes.io/rate-limit: "100"  → "200"

# Or whitelist IP addresses
# nginx.ingress.kubernetes.io/limit-whitelist: "IP1,IP2"

# Apply changes
kubectl apply -f k8s/ingress.yml
```

### SSL/TLS Certificate Issues

```bash
# Check certificate status
kubectl get certificate -n suplilist-prod

# Check expiration date
kubectl get certificate -n suplilist-prod -o yaml | grep notAfter

# If expired or missing:
# 1. Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# 2. Manually trigger renewal
kubectl delete certificate suplilist-cert -n suplilist-prod

# 3. Monitor renewal
kubectl get certificate -n suplilist-prod -w
```

### Suspicious Network Activity

```bash
# Check for port scans or attacks
kubectl logs -n suplilist-prod deployment/suplilist-api | grep -i attack

# View network policies
kubectl get networkpolicies -n suplilist-prod

# Block suspicious IPs (if needed)
# Add to SecurityGroup or WAF rules

# For DDoS attacks:
# 1. Enable CloudFront caching
# 2. Implement rate limiting
# 3. Use AWS WAF
# 4. Contact AWS Support
```

## Common Commands Reference

```bash
# Status checks
kubectl get all -n suplilist-prod
kubectl get events -n suplilist-prod --sort-by='.lastTimestamp'
kubectl top pods -n suplilist-prod
kubectl top nodes

# Debugging
kubectl describe pod <pod-name> -n suplilist-prod
kubectl logs <pod-name> -n suplilist-prod
kubectl logs -f <pod-name> -n suplilist-prod  # tail
kubectl exec -it <pod-name> -n suplilist-prod -- /bin/bash

# Updates
kubectl set image deployment/suplilist-api api=<image> -n suplilist-prod
kubectl rollout status deployment/suplilist-api -n suplilist-prod
kubectl rollout undo deployment/suplilist-api -n suplilist-prod

# Scaling
kubectl scale deployment/suplilist-api --replicas=5 -n suplilist-prod
kubectl autoscale deployment/suplilist-api --min=2 --max=10 -n suplilist-prod

# Port forwarding
kubectl port-forward -n suplilist-prod svc/suplilist-api 8080:80
kubectl port-forward -n suplilist-prod svc/prometheus 9090:9090
kubectl port-forward -n suplilist-prod svc/grafana 3000:3000
```

## Escalation Path

If incident not resolved:

1. **15 minutes**: Page on-call engineer
2. **30 minutes**: Notify team lead
3. **45 minutes**: Notify engineering manager
4. **60 minutes**: Notify CTO

Escalation contacts in PagerDuty
