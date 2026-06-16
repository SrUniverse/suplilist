# SupliList Infrastructure Architecture

Complete infrastructure architecture diagram and specification.

## System Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Internet / CDN                                  │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  CloudFront     │
                    │  (DNS/CDN)      │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐          ┌────▼────┐         ┌────▼─────┐
   │ HTTPS   │          │ HTTPS   │         │  HTTPS   │
   │Ingress  │          │Ingress  │         │ Ingress  │
   │ (ALB)   │          │ (ALB)   │         │  (ALB)   │
   └────┬────┘          └────┬────┘         └────┬─────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
        ┌────────────────────▼────────────────────┐
        │     Kubernetes Cluster (EKS)            │
        │  ┌──────────────────────────────────┐   │
        │  │   Namespace: suplilist-prod      │   │
        │  │  ┌────────────────────────────┐  │   │
        │  │  │ Deployment: suplilist-api  │  │   │
        │  │  │ ┌──────┐ ┌──────┐ ┌──────┐ │  │   │
        │  │  │ │Pod 1 │ │Pod 2 │ │Pod 3 │ │  │   │
        │  │  │ └──────┘ └──────┘ └──────┘ │  │   │
        │  │  └────────────────────────────┘  │   │
        │  │  ┌────────────────────────────┐  │   │
        │  │  │  Service: suplilist-api    │  │   │
        │  │  └────────────────────────────┘  │   │
        │  └──────────────────────────────────┘   │
        │              │          │                │
        │              │          │                │
        └──────────────┼──────────┼────────────────┘
                       │          │
         ┌─────────────┴──┐  ┌────┴──────────────┐
         │                │  │                   │
    ┌────▼───────┐   ┌────▼──┴────┐      ┌──────▼──────┐
    │   RDS      │   │   Redis    │      │   S3        │
    │ PostgreSQL │   │  Cache     │      │  (Uploads)  │
    └────────────┘   └────────────┘      └─────────────┘
```

## Kubernetes Architecture

### Namespaces

```yaml
suplilist-prod:
  - Deployment: suplilist-api (3 replicas)
  - Service: suplilist-api (ClusterIP)
  - ConfigMap: suplilist-api-config
  - Secret: suplilist-secrets
  - ServiceAccount: suplilist
  - Role/RoleBinding: RBAC rules

suplilist-staging:
  - Deployment: suplilist-api (1 replica)
  - Service: suplilist-api (ClusterIP)
  - ConfigMap: suplilist-api-config
  - Secret: suplilist-secrets
  - ServiceAccount: suplilist
  - Role/RoleBinding: RBAC rules
```

### Pod Specifications

#### API Pod

```yaml
Resource Requests:
  CPU: 100m (100 millicores)
  Memory: 256Mi

Resource Limits:
  CPU: 500m (500 millicores)
  Memory: 512Mi

Probes:
  Liveness: GET /health (30s delay, 10s interval)
  Readiness: GET /ready (10s delay, 5s interval)
  Startup: GET /health (up to 150s)

Environment:
  - NODE_ENV: production
  - PORT: 5000
  - Secrets from: suplilist-secrets
  - ConfigMaps from: suplilist-api-config
```

## AWS Infrastructure

### VPC & Networking

- **VPC CIDR**: 10.0.0.0/16
- **Public Subnets**: 3 (one per AZ)
  - 10.0.0.0/19 (AZ-1)
  - 10.0.32.0/19 (AZ-2)
  - 10.0.64.0/19 (AZ-3)
- **Private Subnets**: 3 (one per AZ)
  - 10.0.96.0/19 (AZ-1)
  - 10.0.128.0/19 (AZ-2)
  - 10.0.160.0/19 (AZ-3)
- **NAT Gateways**: 3 (one per AZ)
- **Internet Gateway**: 1

### EKS Cluster

```yaml
Cluster:
  Name: suplilist-prod
  Kubernetes Version: 1.28
  Endpoint: public
  Logging: enabled

Node Groups:
  suplilist-nodes:
    Instance Type: t3.medium
    Min Size: 2
    Desired: 3
    Max Size: 10
    Storage: 30GB (gp3)
    AMI: EKS Optimized
```

### RDS PostgreSQL

```yaml
Instance:
  Engine: PostgreSQL
  Version: 15.3
  Instance Class: db.t3.small
  Storage: 50GB (gp3)
  Multi-AZ: yes (prod only)
  Backup Retention: 30 days
  
Credentials:
  Username: suplilist
  Password: (from Secrets Manager)
  Database: suplilist

Performance Insights: enabled
Enhanced Monitoring: enabled
```

### ElastiCache Redis

```yaml
Cluster:
  Engine: Redis
  Version: 7.0
  Node Type: cache.t3.small
  Cluster Mode: yes (prod only)
  Number of Nodes: 3 (prod), 1 (staging)
  
Security:
  Encryption at rest: enabled
  Encryption in transit: enabled
  Auth token: enabled
  
Automatic Failover: enabled (prod only)
Backup Window: 03:00-05:00 UTC
Maintenance Window: sun:04:00-06:00 UTC
```

### S3 Bucket

```yaml
Bucket:
  Name: suplilist-uploads-prod-<account-id>
  Region: us-east-1
  Versioning: enabled
  Encryption: AES256
  
Access:
  Block Public Access: all enabled
  Server-Side Encryption: required
  
Lifecycle Policies:
  - Transition to Glacier after 90 days
  - Delete incomplete multipart uploads after 7 days
```

## Load Balancing

### AWS Application Load Balancer (ALB)

```
┌─────────────────────────────────────┐
│     AWS Application Load Balancer    │
│     ┌─────────────────────────────┐ │
│     │  HTTP → HTTPS Redirect      │ │
│     └─────────────────────────────┘ │
│     ┌─────────────────────────────┐ │
│     │  SSL/TLS Termination        │ │
│     │  (ACM Certificate)          │ │
│     └─────────────────────────────┘ │
│     ┌─────────────────────────────┐ │
│     │  Path-based Routing         │ │
│     │  /api → API Service         │ │
│     │  /    → Frontend Service    │ │
│     └─────────────────────────────┘ │
│     ┌─────────────────────────────┐ │
│     │  Rate Limiting              │ │
│     │  100 req/min per IP         │ │
│     └─────────────────────────────┘ │
└─────────────────────────────────────┘
        │
        ▼
   Kubernetes Ingress
```

## DNS & CDN

### Route 53

```yaml
Records:
  suplilist.app:
    Type: A
    Target: ALB
    
  api.suplilist.app:
    Type: A
    Target: ALB
    
  *.suplilist.app:
    Type: A
    Target: CloudFront (CNAME)
```

### CloudFront Distribution

```yaml
Distribution:
  Origins:
    - S3 bucket (static assets)
    - ALB (API responses)
    
  Behaviors:
    - /static/* → S3 (caching)
    - /api/* → ALB (no cache)
    - / → ALB (cache HTML)
    
  Caching:
    Query String: yes
    Cookies: yes
    Headers: Authorization, Accept-Encoding
    
  Security:
    Viewer Protocol: HTTPS only
    Min TLS Version: 1.2
```

## Data Flow

### Request Path

```
User Browser
    │
    ▼
  CloudFront (CDN Cache)
    │
    ▼
AWS Route 53 (DNS)
    │
    ▼
Application Load Balancer (HTTPS)
    │
    ▼
Kubernetes Ingress
    │
    ▼
Service: suplilist-api
    │
    ├─▶ Pod 1 (suplilist-api)
    ├─▶ Pod 2 (suplilist-api)
    └─▶ Pod 3 (suplilist-api)
    │
    ├─▶ RDS PostgreSQL (data)
    ├─▶ ElastiCache Redis (cache)
    └─▶ S3 (file uploads)
```

## Network Policies

### Egress Rules (Outbound)

```yaml
API Pods:
  - DNS (port 53): everywhere
  - HTTPS (port 443): everywhere (external APIs)
  - PostgreSQL (port 5432): RDS only
  - Redis (port 6379): ElastiCache only
```

### Ingress Rules (Inbound)

```yaml
API Pods:
  - HTTP (port 5000): from Ingress only
  - Metrics (port 9090): from Prometheus only
```

## Auto-Scaling

### Horizontal Pod Autoscaling (HPA)

```yaml
Deployment: suplilist-api
  Min Replicas: 2
  Max Replicas: 10
  
  Metrics:
    - CPU: 70% target utilization
    - Memory: 80% target utilization
    
  Scale-Up: within 1 minute
  Scale-Down: after 5 minutes idle
```

### Node Auto-Scaling

```yaml
Node Group: suplilist-nodes
  Min Nodes: 2
  Desired: 3
  Max Nodes: 10
  
  Scales based on:
    - Pod resource requests
    - Node memory/CPU utilization
    - Custom metrics (optional)
```

## Disaster Recovery

### RTO (Recovery Time Objective)
- **Critical Services**: < 1 hour
- **Database**: < 2 hours
- **Full System**: < 4 hours

### RPO (Recovery Point Objective)
- **Database**: < 1 hour (hourly backups)
- **Application State**: < 15 minutes (auto-snapshots)
- **Static Content**: < 1 day (daily backups)

### Backup Strategy

```
Database Backups:
  - Automated daily backups (30-day retention)
  - Manual backup before major changes
  - Cross-region replication
  - Test restore monthly

EBS Snapshots:
  - Daily snapshots (7-day retention)
  - Stored in multiple regions

S3 Bucket Backups:
  - Versioning enabled
  - Cross-region replication
  - Glacier archival for old versions
```

## Cost Optimization

### Resource Sizing

```yaml
Development:
  - Single node (t3.micro)
  - db.t3.micro
  - 1 replica (Redis)
  
Staging:
  - Single node (t3.small)
  - db.t3.small
  - 1 replica (Redis)
  
Production:
  - 3 nodes (t3.medium)
  - db.t3.small
  - 3 replicas (Redis)
```

### Cost Controls

- Reserved Instances (RI) for baseline capacity
- Spot Instances for non-critical workloads
- Auto-scaling to match demand
- S3 Lifecycle policies (transition to Glacier)
- CloudFront caching reduces origin load

## Compliance & Security

### Data Protection

- Encryption at rest (S3, RDS, Redis)
- Encryption in transit (TLS 1.2+)
- VPC isolation
- Security groups and NACLs
- Pod Security Policies

### Audit & Logging

- CloudTrail (AWS API calls)
- VPC Flow Logs (network traffic)
- CloudWatch Logs (application logs)
- Prometheus/Grafana (metrics)
- Pod logs (kubectl logs)

### Compliance Standards

- SOC 2 Type II
- GDPR (data privacy)
- HIPAA (if health data stored)
- PCI DSS (if payment processing)

## Performance Targets

### API Performance

- **Latency (P95)**: < 500ms
- **Latency (P99)**: < 2s
- **Error Rate**: < 0.1%
- **Availability**: 99.95%

### Database Performance

- **Connection Pool Utilization**: < 80%
- **Slow Queries**: < 5%
- **Replication Lag**: < 1s

### Cache Performance

- **Hit Ratio**: > 85%
- **Eviction Rate**: < 5%
- **Memory Utilization**: < 80%

## Monitoring Dashboards

Key dashboards in Grafana:

1. **System Overview**
   - Node CPU/Memory usage
   - Pod count and restarts
   - Network I/O

2. **API Metrics**
   - Request rate and latency
   - Error rate by endpoint
   - Top slow endpoints

3. **Database Metrics**
   - Connection pool usage
   - Query latency distribution
   - Cache hit ratio

4. **Infrastructure**
   - Disk utilization
   - Network bandwidth
   - Cost tracking

## Maintenance Windows

### Regular Maintenance

- **Database**: Sunday 04:00-05:00 UTC
- **Redis**: Sunday 04:00-06:00 UTC
- **Kubernetes**: 1st Sunday of month 02:00-04:00 UTC
- **Security Patches**: As needed (within 24 hours)

### Notification

- Notifications sent 48 hours before maintenance
- Maintenance window updates in status page
- Post-maintenance verification and reporting
