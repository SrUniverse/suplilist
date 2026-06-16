# SupliList Deployment Guide

Complete guide for deploying SupliList to production and staging environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Infrastructure Setup](#infrastructure-setup)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Manual Deployment](#manual-deployment)
6. [Database Management](#database-management)
7. [Monitoring & Observability](#monitoring--observability)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Procedures](#rollback-procedures)
10. [Security Considerations](#security-considerations)

## Prerequisites

### Required Tools

- `kubectl` >= 1.20 (Kubernetes client)
- `helm` >= 3.0 (Kubernetes package manager)
- `docker` >= 20.0 (Container runtime)
- `aws-cli` >= 2.0 (AWS CLI tools)
- `terraform` >= 1.0 (Infrastructure as Code)
- `git` >= 2.30 (Version control)

### AWS Credentials

```bash
aws configure
# Enter your AWS access key and secret
```

### Kubernetes Context

```bash
# List available contexts
kubectl config get-contexts

# Switch to desired context
kubectl config use-context staging-cluster
# or
kubectl config use-context prod-cluster
```

## Architecture Overview

### Infrastructure Stack

```
┌─────────────────────────────────────────────────────┐
│                    AWS Region                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │        EKS Kubernetes Cluster               │   │
│  │  ┌──────────────────────────────────────┐   │   │
│  │  │    Pods (API, Workers)               │   │   │
│  │  │  ┌──────────────┐ ┌──────────────┐   │   │   │
│  │  │  │ suplilist-api│ │ suplilist-api│   │   │   │
│  │  │  └──────────────┘ └──────────────┘   │   │   │
│  │  └──────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────┘   │
│                     │                              │
│         ┌───────────┼───────────┐                 │
│         │           │           │                 │
│  ┌──────────────┐ ┌──────┐ ┌───────┐             │
│  │  RDS         │ │Redis │ │  S3   │             │
│  │  PostgreSQL  │ │Cache │ │Upload │             │
│  └──────────────┘ └──────┘ └───────┘             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Infrastructure Setup

### 1. Using Terraform

#### Initialize Terraform

```bash
cd terraform
terraform init
```

#### Create tfvars file

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

#### Plan and Apply

```bash
# Production
terraform plan -var-file=terraform.tfvars -out=tfplan

# Review the plan carefully
terraform apply tfplan

# Staging
terraform workspace new staging
terraform plan -var-file=terraform-staging.tfvars
terraform apply -var-file=terraform-staging.tfvars
```

### 2. Manual Kubernetes Setup

If using existing Kubernetes cluster:

```bash
# Create namespaces
kubectl apply -f k8s/namespace.yml

# Create RBAC
kubectl apply -f k8s/rbac.yml

# Create ConfigMaps and Secrets
kubectl apply -f k8s/configmap.yml
kubectl apply -f k8s/secrets.yml

# Deploy application
kubectl apply -f k8s/deployment.yml
kubectl apply -f k8s/service.yml
kubectl apply -f k8s/ingress.yml
```

## CI/CD Pipeline

### GitHub Actions Workflows

The project includes automated CI/CD workflows:

#### 1. CI Workflow (.github/workflows/ci.yml)

Runs on every push and pull request:

- Linting (JavaScript & CSS)
- Unit tests
- Code coverage
- Security scanning (Trivy)
- Docker image build
- E2E tests (Playwright)
- Accessibility audit (axe)

#### 2. Deploy Workflow (.github/workflows/deploy-prod.yml)

Triggered by push to main or manual workflow dispatch:

- Pre-deployment verification
- Database backup creation
- Image deployment
- Migration execution
- Health checks
- Smoke tests
- Slack notifications
- Automatic rollback on failure

### Triggering Deployments

#### Automatic Deployment

Push to main branch:
```bash
git push origin main
```

#### Manual Deployment

Dispatch workflow from GitHub UI or CLI:
```bash
gh workflow run deploy-prod.yml -f environment=production
```

## Manual Deployment

### Step 1: Build Docker Image

```bash
# Build API image
docker build -f server/Dockerfile -t ghcr.io/suplilist/suplilist:v1.0.0 .

# Build frontend (if needed)
npm run build -w @suplilist/frontend
```

### Step 2: Push to Registry

```bash
# Authenticate
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Push image
docker push ghcr.io/suplilist/suplilist:v1.0.0
```

### Step 3: Update Deployment

```bash
# Using deployment script
./scripts/deploy.sh prod v1.0.0

# Or manually
kubectl set image deployment/suplilist-api \
  api=ghcr.io/suplilist/suplilist:v1.0.0 \
  -n suplilist-prod

# Monitor rollout
kubectl rollout status deployment/suplilist-api -n suplilist-prod
```

## Database Management

### Create Backups

```bash
# Automated backup
./scripts/backup-database.sh prod

# Backup is saved to ./backups/ and S3
```

### Restore from Backup

```bash
# Interactive restore with confirmation
./scripts/restore-database.sh prod ./backups/suplilist-prod-20240101_120000.sql.gz
```

### Run Migrations

```bash
# Automatically via deployment script
./scripts/deploy.sh prod v1.0.0

# Manual migration
kubectl exec -n suplilist-prod deployment/suplilist-api -- npm run migrate:up

# Rollback migrations
kubectl exec -n suplilist-prod deployment/suplilist-api -- npm run migrate:down
```

## Monitoring & Observability

### Access Grafana Dashboard

```bash
# Port-forward to Grafana
kubectl port-forward -n suplilist-prod svc/grafana 3000:3000

# Open browser: http://localhost:3000
# Default credentials: admin/admin (change immediately)
```

### Access Prometheus

```bash
# Port-forward to Prometheus
kubectl port-forward -n suplilist-prod svc/prometheus 9090:9090

# Open browser: http://localhost:9090
```

### Key Metrics to Monitor

- API error rate: `rate(http_requests_total{status=~"5.."}[5m])`
- P95 latency: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
- Database connection pool: `pg_stat_activity_count`
- Redis memory usage: `redis_memory_used_bytes / redis_memory_max_bytes`
- Pod restarts: `rate(kube_pod_container_status_restarts_total[15m])`

### Alerts

Alerts are configured in `monitoring/rules.yml`:

- API Down (CRITICAL)
- High Error Rate (WARNING)
- High Response Time (WARNING)
- Database Connection Pool Low (WARNING)
- Redis Memory High (WARNING)
- Pod Restart Loop (WARNING)
- Node Resource Pressure (WARNING)

## Troubleshooting

### Check Pod Status

```bash
# Get pods
kubectl get pods -n suplilist-prod

# Describe pod
kubectl describe pod <pod-name> -n suplilist-prod

# View logs
kubectl logs <pod-name> -n suplilist-prod

# Tail logs
kubectl logs -f <pod-name> -n suplilist-prod

# View previous logs (if crashed)
kubectl logs --previous <pod-name> -n suplilist-prod
```

### Database Issues

```bash
# Connect to database
kubectl exec -it -n suplilist-prod deployment/suplilist-api -- psql -U suplilist

# Check connection pool
SELECT * FROM pg_stat_activity;

# Kill stuck queries
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle';
```

### Memory Issues

```bash
# Check pod resource usage
kubectl top pods -n suplilist-prod

# Check node resource usage
kubectl top nodes

# Increase resources if needed
kubectl set resources deployment suplilist-api \
  --limits=cpu=1000m,memory=1Gi \
  -n suplilist-prod
```

### Network Issues

```bash
# Test DNS resolution
kubectl exec -it <pod> -n suplilist-prod -- nslookup suplilist-api

# Test connectivity to database
kubectl exec -it <pod> -n suplilist-prod -- nc -zv postgres 5432

# Test connectivity to Redis
kubectl exec -it <pod> -n suplilist-prod -- redis-cli -h redis ping
```

## Rollback Procedures

### Automatic Rollback

Rollback is triggered automatically if deployment health checks fail.

### Manual Rollback

```bash
# Rollback to previous revision
kubectl rollout undo deployment/suplilist-api -n suplilist-prod

# Rollback to specific revision
kubectl rollout history deployment/suplilist-api -n suplilist-prod
kubectl rollout undo deployment/suplilist-api --to-revision=2 -n suplilist-prod

# Monitor rollback
kubectl rollout status deployment/suplilist-api -n suplilist-prod
```

### Database Rollback

If database migration fails:

```bash
# Rollback migration
kubectl exec -n suplilist-prod deployment/suplilist-api -- npm run migrate:down

# Or restore from backup
./scripts/restore-database.sh prod ./backups/suplilist-prod-backup.sql.gz
```

## Security Considerations

### Secrets Management

1. **Never commit secrets to Git**
   - Use `.env` files (added to `.gitignore`)
   - Use Kubernetes Secrets
   - Use sealed-secrets or external-secrets operator

2. **Rotate secrets regularly**
   ```bash
   kubectl create secret generic suplilist-secrets \
     --from-literal=JWT_SECRET=new-secret \
     -n suplilist-prod --dry-run=client -o yaml | kubectl apply -f -
   ```

3. **Use strong passwords**
   - Minimum 32 characters for JWT_SECRET
   - Use password generator for database passwords

### Network Security

1. **Network Policies**
   - Restrict traffic between pods
   - Implement ingress/egress rules

2. **TLS/SSL**
   - All endpoints served over HTTPS
   - Certificate managed by cert-manager
   - Automatic renewal 30 days before expiration

3. **CORS Configuration**
   - Whitelist only trusted domains
   - Restrict methods and headers

### Access Control

1. **RBAC Configuration**
   - Service accounts with minimal permissions
   - Role-based access control
   - Regular audit of permissions

2. **Pod Security**
   - Run as non-root user
   - Read-only filesystem where possible
   - Network policies

### Compliance

- Data retention policies
- Audit logging enabled
- Encryption at rest and in transit
- Regular security scanning (Trivy, npm audit)

## Deployment Checklist

Before deploying to production:

- [ ] All tests passing
- [ ] Code review completed
- [ ] Security scan cleared
- [ ] Database migration tested
- [ ] Backup taken
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Runbooks prepared
- [ ] Team notified
- [ ] Maintenance window scheduled (if needed)

## Support & Escalation

### On-Call Process

1. Alert triggered in Slack
2. On-call engineer investigates
3. If critical: initiate incident response
4. Document in incident log
5. Post-mortem after resolution

### Emergency Contacts

- Platform Team: platform@suplilist.com.br
- On-Call: See PagerDuty
- Executive Escalation: cto@suplilist.com.br

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
