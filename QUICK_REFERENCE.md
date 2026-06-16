# SupliList Deployment - Quick Reference Card

Fast lookup for common commands and procedures.

## Emergency Commands

### API is Down

```bash
# Check status
kubectl get pods -n suplilist-prod

# View logs
kubectl logs -f deployment/suplilist-api -n suplilist-prod

# Restart pods
kubectl rollout restart deployment/suplilist-api -n suplilist-prod

# Rollback
kubectl rollout undo deployment/suplilist-api -n suplilist-prod
```

### High Error Rate

```bash
# Check metrics
kubectl port-forward svc/prometheus 9090:9090 -n suplilist-prod

# View error logs
kubectl logs deployment/suplilist-api -n suplilist-prod | grep ERROR

# Scale up
kubectl scale deployment/suplilist-api --replicas=5 -n suplilist-prod
```

### Database Connection Issues

```bash
# Test connection
kubectl exec -it deployment/suplilist-api -n suplilist-prod -- \
  psql -U suplilist -d suplilist -c "SELECT 1;"

# Check connections
kubectl exec -it deployment/suplilist-api -n suplilist-prod -- \
  psql -U suplilist -d suplilist -c "SELECT count(*) FROM pg_stat_activity;"

# Kill idle connections
kubectl exec -it deployment/suplilist-api -n suplilist-prod -- \
  psql -U suplilist -d suplilist -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle';"
```

### Redis Connection Issues

```bash
# Test connection
kubectl exec -it deployment/suplilist-api -n suplilist-prod -- \
  redis-cli -h redis ping

# Check memory
kubectl exec -it deployment/suplilist-api -n suplilist-prod -- \
  redis-cli INFO memory

# Clear cache (dangerous!)
kubectl exec -it deployment/suplilist-api -n suplilist-prod -- \
  redis-cli FLUSHDB
```

## Daily Commands

```bash
# Check cluster health
kubectl get all -n suplilist-prod

# Check pod status
kubectl get pods -n suplilist-prod

# Check resource usage
kubectl top pods -n suplilist-prod
kubectl top nodes

# View recent events
kubectl get events -n suplilist-prod --sort-by='.lastTimestamp'

# Check pod logs (last 100 lines)
kubectl logs --tail=100 deployment/suplilist-api -n suplilist-prod

# Port-forward for monitoring
kubectl port-forward svc/prometheus 9090:9090 -n suplilist-prod &
kubectl port-forward svc/grafana 3000:3000 -n suplilist-prod &
```

## Deployment Commands

```bash
# Deploy to staging
./scripts/deploy.sh staging latest

# Deploy to production
./scripts/deploy.sh prod v1.0.0

# Manual image update
kubectl set image deployment/suplilist-api \
  api=ghcr.io/suplilist/suplilist:v1.0.0 -n suplilist-prod

# Monitor rollout
kubectl rollout status deployment/suplilist-api -n suplilist-prod

# View rollout history
kubectl rollout history deployment/suplilist-api -n suplilist-prod

# Rollback to previous
kubectl rollout undo deployment/suplilist-api -n suplilist-prod

# Rollback to specific version
kubectl rollout undo deployment/suplilist-api --to-revision=2 -n suplilist-prod
```

## Database Commands

```bash
# Create backup
./scripts/backup-database.sh prod

# List backups
ls -lh backups/

# Restore from backup
./scripts/restore-database.sh prod ./backups/suplilist-prod-20240101_120000.sql.gz

# Run migrations
kubectl exec deployment/suplilist-api -n suplilist-prod -- npm run migrate:up

# Connect to database
kubectl exec -it deployment/suplilist-api -n suplilist-prod -- \
  psql -U suplilist -d suplilist

# Run SQL query
kubectl exec -it deployment/suplilist-api -n suplilist-prod -- \
  psql -U suplilist -d suplilist -c "SELECT * FROM supplements LIMIT 5;"
```

## Monitoring Commands

```bash
# Access Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n suplilist-prod &

# Access Grafana
kubectl port-forward svc/grafana 3000:3000 -n suplilist-prod &

# Check alerts
# Visit: http://localhost:9090/alerts

# Check metrics
# Query: http://localhost:9090/api/v1/query?query=up{job="suplilist-api"}
```

## Scaling Commands

```bash
# Scale deployment
kubectl scale deployment/suplilist-api --replicas=5 -n suplilist-prod

# Set autoscaling
kubectl autoscale deployment/suplilist-api \
  --min=2 --max=10 --cpu-percent=70 -n suplilist-prod

# Check HPA status
kubectl get hpa -n suplilist-prod

# Edit HPA
kubectl edit hpa suplilist-api -n suplilist-prod
```

## Troubleshooting Commands

```bash
# Get pod details
kubectl describe pod <pod-name> -n suplilist-prod

# Get deployment details
kubectl describe deployment suplilist-api -n suplilist-prod

# Get service details
kubectl describe svc suplilist-api -n suplilist-prod

# Get ingress details
kubectl describe ingress suplilist-ingress -n suplilist-prod

# Test connectivity
kubectl exec -it <pod> -n suplilist-prod -- nc -zv redis 6379
kubectl exec -it <pod> -n suplilist-prod -- nc -zv postgres 5432

# Get logs from all pods
kubectl logs -l app=suplilist -n suplilist-prod --all-containers=true

# Get logs with timestamps
kubectl logs deployment/suplilist-api -n suplilist-prod --timestamps=true

# Follow logs
kubectl logs -f deployment/suplilist-api -n suplilist-prod

# Get previous logs (if crashed)
kubectl logs --previous deployment/suplilist-api -n suplilist-prod
```

## Configuration Commands

```bash
# View ConfigMap
kubectl get configmap suplilist-api-config -n suplilist-prod -o yaml

# Edit ConfigMap
kubectl edit configmap suplilist-api-config -n suplilist-prod

# View Secret names
kubectl get secrets -n suplilist-prod

# View secret value (CAREFUL!)
kubectl get secret suplilist-secrets -n suplilist-prod -o yaml

# Update secret
kubectl create secret generic suplilist-secrets \
  --from-literal=KEY=value -n suplilist-prod --dry-run=client -o yaml | \
  kubectl apply -f -

# Restart pods to pick up changes
kubectl rollout restart deployment/suplilist-api -n suplilist-prod
```

## Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Pod stuck pending | `kubectl describe pod` and check events |
| Pod crashing | `kubectl logs --previous <pod>` to see error |
| High latency | Check DB: `kubectl top pods`, add indexes, scale |
| Out of memory | `kubectl top pods`, increase limits, restart |
| Connection refused | Check if service/pod exists: `kubectl get svc,pods` |
| DNS not working | Check core-dns: `kubectl get pods -n kube-system` |
| Image not found | Check registry push: `docker push <image>` |
| Secrets not loaded | Restart pod: `kubectl rollout restart deployment/<name>` |

## Useful Aliases

Add to `.bashrc` or `.zshrc`:

```bash
# Kubernetes shortcuts
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgs='kubectl get svc'
alias kgd='kubectl get deployment'
alias kdesc='kubectl describe'
alias klogs='kubectl logs -f'
alias kex='kubectl exec -it'

# Namespace shortcuts
alias kprod='kubectl -n suplilist-prod'
alias kstage='kubectl -n suplilist-staging'

# Common operations
alias kroll='kubectl rollout status'
alias kundo='kubectl rollout undo'
alias kscale='kubectl scale deployment'
```

Usage: `kprod kgp` = `kubectl get pods -n suplilist-prod`

## Important URLs

| Service | URL | Port |
|---------|-----|------|
| API | http://localhost:8080 | 8080 |
| Prometheus | http://localhost:9090 | 9090 |
| Grafana | http://localhost:3000 | 3000 |
| AlertManager | http://localhost:9093 | 9093 |
| Database | localhost | 5432 |
| Redis | localhost | 6379 |

## Port Forward Commands

```bash
# API
kubectl port-forward svc/suplilist-api 8080:80 -n suplilist-prod

# Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n suplilist-prod

# Grafana
kubectl port-forward svc/grafana 3000:3000 -n suplilist-prod

# Database
kubectl port-forward svc/postgres 5432:5432 -n suplilist-prod

# Redis
kubectl port-forward svc/redis 6379:6379 -n suplilist-prod
```

## Helm Commands (if using)

```bash
# List installed charts
helm list -n suplilist-prod

# Get chart values
helm get values <chart-name> -n suplilist-prod

# Upgrade chart
helm upgrade <chart-name> <repo/chart> -n suplilist-prod

# Rollback chart
helm rollback <chart-name> <revision> -n suplilist-prod

# View chart history
helm history <chart-name> -n suplilist-prod
```

## File Locations

| Item | Location |
|------|----------|
| Kubernetes manifests | `k8s/` |
| Deployment scripts | `scripts/` |
| Terraform config | `terraform/` |
| Monitoring config | `monitoring/` |
| Documentation | `docs/` |
| Environment file | `.env` |
| Docker config | `server/Dockerfile` |
| Docker compose | `docker-compose.yml` |

## Key Files to Know

```
.github/workflows/ci.yml         # GitHub Actions CI
.github/workflows/deploy-prod.yml # GitHub Actions CD
k8s/deployment.yml               # Kubernetes deployment
k8s/secrets.yml                  # Kubernetes secrets
terraform/main.tf                # AWS infrastructure
scripts/deploy.sh                # Main deployment script
monitoring/prometheus.yml        # Prometheus config
docs/RUNBOOK.md                  # Operational runbooks
```

## Key Contacts

```
Platform Team: platform@suplilist.com.br
On-Call: See PagerDuty schedule
CTO: cto@suplilist.com.br
Slack Channel: #platform-eng
Incident Channel: #incidents
```

## Emergency Contacts

1. **On-Call Engineer** (PagerDuty)
2. **Team Lead** (if > 30 min)
3. **Engineering Manager** (if > 1 hour)
4. **CTO** (if > 2 hours)

---

**Quick Reference Version**: 1.0
**Last Updated**: 2024

Save this file and refer to it often!
