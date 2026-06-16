# SupliList Deployment Automation & Infrastructure Setup

Complete setup guide for deployment automation and infrastructure.

## Quick Start

### For Immediate Deployment

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your values

# 3. Deploy using provided script
./scripts/deploy.sh prod v1.0.0
```

## Complete Setup Guide

### Phase 1: Prerequisites (30 minutes)

#### 1.1 Install Required Tools

**macOS:**
```bash
# Kubernetes tools
brew install kubectl helm

# AWS tools
brew install awscli

# Infrastructure as Code
brew install terraform

# Container tools
brew install docker

# Version control
brew install git

# Verification
kubectl version --client
helm version
aws --version
terraform --version
docker --version
git --version
```

**Linux (Ubuntu):**
```bash
# Update package manager
sudo apt-get update

# Kubernetes tools
sudo snap install kubectl --classic
sudo snap install helm --classic

# AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Terraform
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Verification
kubectl version --client
helm version
aws --version
terraform version
```

**Windows (PowerShell):**
```powershell
# Using Chocolatey
choco install kubectl helm awscli terraform docker-desktop git -y

# Or manual installation:
# - kubectl: https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/
# - helm: https://helm.sh/docs/intro/install/
# - aws-cli: https://aws.amazon.com/cli/
# - terraform: https://www.terraform.io/downloads.html
# - docker: https://www.docker.com/products/docker-desktop
# - git: https://git-scm.com/download/win

# Verification
kubectl version --client
helm version
aws --version
terraform version
```

#### 1.2 Configure AWS Credentials

```bash
# Configure AWS CLI
aws configure

# You'll be prompted for:
# AWS Access Key ID
# AWS Secret Access Key
# Default region: us-east-1
# Default output format: json

# Verify configuration
aws sts get-caller-identity
# Should output your AWS account info
```

#### 1.3 Clone Repository

```bash
git clone https://github.com/suplilist/suplilist.git
cd suplilist

# Install Node.js dependencies
npm install
```

### Phase 2: Infrastructure Setup (1-2 hours)

#### 2.1 AWS Infrastructure with Terraform

```bash
cd terraform

# 1. Initialize Terraform
terraform init

# 2. Create tfvars file
cp terraform.tfvars.example terraform.tfvars

# 3. Edit tfvars with your settings
nano terraform.tfvars
# Key settings:
# - environment: prod (or staging, dev)
# - aws_region: us-east-1
# - db_password: strong password
# - node_count_desired: 3
# - db_allocated_storage: 50

# 4. Validate configuration
terraform validate
terraform plan -out=tfplan

# 5. Apply infrastructure (takes 10-15 minutes)
terraform apply tfplan

# 6. Note the outputs
terraform output

# Store outputs in a safe place:
# - eks_cluster_name
# - eks_cluster_endpoint
# - rds_endpoint
# - redis_endpoint
# - s3_bucket_name
```

#### 2.2 Configure Kubernetes Context

```bash
# After Terraform completes, add cluster to kubeconfig
aws eks update-kubeconfig \
  --region us-east-1 \
  --name suplilist-prod

# Verify connection
kubectl get nodes
# Should list your cluster nodes

# Create namespaces
kubectl apply -f k8s/namespace.yml

# Verify namespaces
kubectl get namespaces
# Should show: suplilist-prod, suplilist-staging
```

### Phase 3: Kubernetes Deployment (30 minutes)

#### 3.1 Create Secrets and ConfigMaps

```bash
# 1. Create secrets (edit with your values)
# Edit k8s/secrets.yml with actual secrets

# 2. Apply secrets
kubectl apply -f k8s/secrets.yml

# 3. Verify
kubectl get secrets -n suplilist-prod

# 4. Apply config
kubectl apply -f k8s/configmap.yml

# 5. Verify
kubectl get configmap -n suplilist-prod
```

#### 3.2 Apply RBAC and Policies

```bash
# Apply RBAC rules
kubectl apply -f k8s/rbac.yml

# Verify
kubectl get serviceaccount -n suplilist-prod
kubectl get role -n suplilist-prod
kubectl get rolebinding -n suplilist-prod
```

#### 3.3 Deploy Application

```bash
# 1. Build and push Docker image
docker build -f server/Dockerfile \
  -t ghcr.io/suplilist/suplilist:v1.0.0 .

# 2. Push to registry (if using GitHub)
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
docker push ghcr.io/suplilist/suplilist:v1.0.0

# 3. Apply deployment manifests
kubectl apply -f k8s/deployment.yml
kubectl apply -f k8s/service.yml
kubectl apply -f k8s/ingress.yml

# 4. Monitor rollout
kubectl rollout status deployment/suplilist-api \
  -n suplilist-prod --timeout=10m

# 5. Verify pods are running
kubectl get pods -n suplilist-prod

# 6. Check logs
kubectl logs -f deployment/suplilist-api -n suplilist-prod
```

### Phase 4: Monitoring Setup (20 minutes)

#### 4.1 Install Prometheus & Grafana

```bash
# Add Prometheus Helm chart
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  -n suplilist-prod \
  --values monitoring/prometheus-values.yml

# Verify installation
kubectl get all -n suplilist-prod | grep prometheus

# Port-forward to Prometheus
kubectl port-forward -n suplilist-prod \
  svc/prometheus-operated 9090:9090 &

# Access Prometheus: http://localhost:9090
```

#### 4.2 Configure Grafana

```bash
# Port-forward to Grafana
kubectl port-forward -n suplilist-prod \
  svc/prometheus-grafana 3000:3000 &

# Access: http://localhost:3000
# Default credentials: admin/prom-operator

# 1. Change admin password immediately
# 2. Add Prometheus data source
# 3. Import dashboard: dashboards/grafana-dashboard.json
# 4. Configure alerts
```

#### 4.3 Setup Alerting

```bash
# Edit monitoring/rules.yml with your alert rules

# Apply rules
kubectl apply -f monitoring/rules.yml

# Setup AlertManager (optional)
# For Slack notifications, PagerDuty integration, etc.
```

### Phase 5: CI/CD Pipeline Setup (15 minutes)

#### 5.1 GitHub Actions

```bash
# 1. Push code to GitHub (if not already)
git remote add origin https://github.com/your-org/suplilist.git
git push -u origin main

# 2. Create GitHub secrets
# Go to: Settings → Secrets and variables → Actions

# Add secrets:
# - DOCKER_REGISTRY_TOKEN: Your GitHub token
# - KUBE_CONFIG_STAGING: kubectl config (base64)
# - KUBE_CONFIG_PRODUCTION: kubectl config (base64)
# - JWT_SECRET: JWT signing key
# - DATABASE_URL: Postgres connection string
# - REDIS_URL: Redis connection string
# - SLACK_WEBHOOK_STAGING: Slack webhook URL
# - SLACK_WEBHOOK_PRODUCTION: Slack webhook URL

# 3. Workflows are automatically enabled
# Check: Actions tab in GitHub

# 4. Trigger first CI run
git push origin main

# 5. Monitor workflow
# Go to: Actions tab
```

#### 5.2 Test Workflow

```bash
# Create a test branch
git checkout -b test/deployment

# Make a change
echo "# Deployment test" >> README.md

# Commit and push
git add README.md
git commit -m "test: trigger CI/CD"
git push origin test/deployment

# Create pull request and monitor CI

# Merge when CI passes
# This triggers automatic deployment
```

### Phase 6: Database Setup (15 minutes)

#### 6.1 Initialize Database

```bash
# 1. Port-forward to database
kubectl port-forward -n suplilist-prod \
  svc/postgres 5432:5432 &

# 2. Connect to database
psql -h localhost -U suplilist -d suplilist

# 3. Run migrations
# If using Flyway or Liquibase:
npm run migrate:up

# 4. Seed initial data (optional)
npm run seed
```

#### 6.2 Backup Configuration

```bash
# 1. Test backup script
./scripts/backup-database.sh prod

# 2. Verify backup
ls -lh backups/

# 3. Schedule automated backups
# Add to crontab or AWS EventBridge:
# 0 2 * * * /path/to/suplilist/scripts/backup-database.sh prod

# 4. Test restore
./scripts/restore-database.sh prod ./backups/suplilist-prod-YYYYMMDD.sql.gz
```

### Phase 7: Verification (15 minutes)

#### 7.1 Health Checks

```bash
# 1. Check all pods running
kubectl get pods -n suplilist-prod
# All should be Running/Ready

# 2. Check services
kubectl get svc -n suplilist-prod
# Should have ClusterIP assigned

# 3. Check endpoints
kubectl get endpoints -n suplilist-prod
# Should show pod IPs

# 4. Test API endpoint
kubectl port-forward -n suplilist-prod svc/suplilist-api 8080:80 &
curl http://localhost:8080/health
# Should return 200 OK

# 5. Check database connectivity
kubectl exec -it deployment/suplilist-api -n suplilist-prod -- \
  psql -U suplilist -d suplilist -c "SELECT 1;"

# 6. Check Redis connectivity
kubectl exec -it deployment/suplilist-api -n suplilist-prod -- \
  redis-cli -h redis ping
# Should return PONG
```

#### 7.2 Load Testing

```bash
# Install Apache Bench
brew install httpd  # macOS
# or
sudo apt-get install apache2-utils  # Ubuntu

# Run load test
ab -n 1000 -c 10 http://localhost:8080/api/supplements

# Monitor metrics in Grafana while test runs
```

#### 7.3 Smoke Tests

```bash
# Run provided smoke tests
npm run test:e2e

# Or manual checks:
curl -f https://suplilist.app/health
curl -f https://suplilist.app/ready
curl -f https://suplilist.app/api/supplements?limit=1
```

### Phase 8: Security Hardening (20 minutes)

#### 8.1 Secrets Management

```bash
# 1. Install sealed-secrets (recommended)
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.18.0/controller.yaml

# 2. Seal sensitive data
echo -n "secret-value" | kubectl create secret generic my-secret \
  --dry-run=client --from-file=/dev/stdin | kubeseal -o yaml

# 3. Store sealed secrets in git
# Unsealed secrets never in version control
```

#### 8.2 Network Policies

```bash
# Create restrictive network policies
kubectl apply -f k8s/network-policies.yml  # (if exists)

# Verify policies
kubectl get networkpolicies -n suplilist-prod
```

#### 8.3 Pod Security

```bash
# Apply security context
# Edit k8s/deployment.yml:
# - runAsNonRoot: true
# - readOnlyRootFilesystem: true (where possible)
# - allowPrivilegeEscalation: false

kubectl apply -f k8s/deployment.yml
```

### Phase 9: Monitoring & Alerting (15 minutes)

#### 9.1 Configure Alerts

```bash
# 1. Setup AlertManager for Slack
# Edit monitoring/alertmanager.yml

# 2. Create Slack webhook
# Go to: Slack Workspace → Apps → Incoming Webhooks
# Add webhook URL to alertmanager.yml

# 3. Apply configuration
kubectl apply -f monitoring/alertmanager.yml

# 4. Test alert
kubectl port-forward -n suplilist-prod \
  svc/prometheus-operated 9090:9090 &

# Trigger a test alert manually
```

#### 9.2 Setup Dashboards

```bash
# 1. Access Grafana
# http://localhost:3000

# 2. Import pre-built dashboards:
# - monitoring/grafana-dashboard.json
# - Kubernetes cluster overview
# - API metrics

# 3. Create custom dashboards for:
# - Business metrics
# - Custom application metrics
# - Team-specific views
```

### Phase 10: Documentation & Handoff (10 minutes)

#### 10.1 Update Documentation

```bash
# 1. Update DNS records in docs
# - API endpoint
# - Frontend URL
# - Monitoring dashboard URLs

# 2. Create runbooks
# - Already provided in docs/RUNBOOK.md

# 3. Document team processes
# - On-call schedule
# - Escalation contacts
# - Deployment schedule
```

#### 10.2 Team Training

```bash
# 1. Share documentation
# - docs/DEPLOYMENT_GUIDE.md
# - docs/INFRASTRUCTURE.md
# - docs/RUNBOOK.md

# 2. Conduct training session
# - Walk through deployment process
# - Review monitoring dashboard
# - Practice incident response

# 3. Assign on-call rotations
# - Set up PagerDuty
# - Configure escalation policies
```

## Post-Deployment Checklist

- [ ] All pods running and healthy
- [ ] Database migrations completed
- [ ] API responding to requests
- [ ] Monitoring and alerting working
- [ ] Backups configured and tested
- [ ] CI/CD pipelines working
- [ ] Security scan passed
- [ ] Documentation updated
- [ ] Team trained on procedures
- [ ] On-call rotations assigned
- [ ] Status page created
- [ ] Incident response plan finalized

## Maintenance Schedule

### Daily
- Monitor error rates and latency
- Check pod restart counts
- Verify backups completed

### Weekly
- Review logs for patterns
- Check certificate expiration (>30 days)
- Perform security scan

### Monthly
- Database integrity check
- Backup restoration test
- Review and update runbooks
- Capacity planning

### Quarterly
- Disaster recovery drill
- Security audit
- Performance optimization review
- Cost analysis

## Support & Troubleshooting

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Pods not starting | Image not found | Push image to registry, verify tag |
| CrashLoopBackOff | App error | Check logs: `kubectl logs` |
| Pending forever | Resources unavailable | Scale up nodes or reduce requests |
| High latency | Database slow | Add indexes, optimize queries |
| Out of memory | Memory leak | Restart pod, increase limit |
| Certificate expiring | Not renewed | cert-manager should auto-renew |

### Getting Help

- **Documentation**: See docs/ directory
- **Runbooks**: See docs/RUNBOOK.md
- **Logs**: `kubectl logs <pod>`
- **Events**: `kubectl get events -n suplilist-prod`
- **Slack**: #platform-eng channel
- **Escalation**: See runbooks for contact info

## Next Steps

1. Complete all setup phases
2. Run through verification checklist
3. Conduct team training
4. Establish on-call rotation
5. Monitor closely for first week
6. Collect feedback and iterate
7. Document lessons learned
8. Plan automation improvements

## Support Contacts

- **Platform Team**: platform@suplilist.com.br
- **On-Call**: See PagerDuty schedule
- **CTO**: cto@suplilist.com.br
- **Incident Channel**: #incidents (Slack)

---

**Setup Date**: _______________
**Deployed By**: _______________
**Status**: ☐ Complete ☐ In Progress
