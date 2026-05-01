# 16 — Infrastructure, Multi-Region Deployment & DevOps

---

## Multi-Region AWS Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLOUDFLARE GLOBAL NETWORK                          │
│          (WAF + DDoS + Smart Routing + Workers + R2 + Images)                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
┌───────▼────────┐           ┌────────▼────────┐           ┌────────▼────────┐
│  ap-south-1    │           │  eu-central-1   │           │  us-east-1      │
│  (Mumbai)      │           │  (Frankfurt)    │           │  (N. Virginia)  │
│  India         │           │  Germany (DE)   │           │  USA + Global   │
│  Primary       │           │  EU compliance  │           │  Control Plane  │
│                │           │                 │           │                 │
│ EKS cluster    │           │ EKS cluster     │           │ EKS cluster     │
│ RDS Postgres   │           │ RDS Postgres    │           │ RDS Postgres    │
│ ElastiCache    │           │ ElastiCache     │           │ ElastiCache     │
│ MSK (Kafka)    │           │ MSK (Kafka)     │           │ MSK (Kafka)     │
│ S3 (IN data)   │           │ S3 (DE data)   │           │ S3 (US data)   │
└────────────────┘           └─────────────────┘           └─────────────────┘
        │                                                         │
┌───────▼────────┐                                      ┌────────▼────────┐
│  me-central-1  │                                      │  ap-southeast-2 │
│  (UAE)         │                                      │  (Sydney)       │
│  UAE market    │                                      │  Australia      │
│                │                                      │                 │
│ EKS cluster    │                                      │ EKS cluster     │
│ RDS Postgres   │                                      │ RDS Postgres    │
│ ElastiCache    │                                      │ ElastiCache     │
│ S3 (AE data)   │                                      │ S3 (AU data)   │
└────────────────┘                                      └─────────────────┘
```

---

## AWS Services Used Per Region

| Service | Purpose | Config |
|---|---|---|
| **EKS (Kubernetes)** | Container orchestration | 1 cluster per region, node groups auto-scaling |
| **RDS PostgreSQL** | Primary database | Multi-AZ, automated backups 35 days, encryption at rest |
| **ElastiCache Redis** | Sessions, cache, queues | Cluster mode, 2 replicas per shard |
| **MSK (Managed Kafka)** | Event streaming | 3 brokers, 7-day retention |
| **S3** | Media, invoices, backups | Versioning + lifecycle policies, cross-region replication for backups |
| **CloudFront** | Origin shield in front of EKS | Reduces origin load, caches API responses |
| **ACM** | SSL/TLS certificates | Wildcard `*.platform.com` |
| **Route 53** | DNS with health checks | Geo-routing + failover |
| **AWS Secrets Manager** | All secrets | Auto-rotation for DB passwords |
| **KMS** | Encryption keys | Per-region keys, separate key per data classification |
| **CloudWatch** | Logs, metrics, alarms | Centralized in us-east-1 |
| **X-Ray** | Distributed tracing | Across all microservices |
| **SQS** | Async job queues | FIFO queues for critical paths |
| **SES** | Transactional email | Per-region SES (GDPR: DE email via EU region only) |
| **SNS** | Push notifications | Topic per country |
| **WAF** | Web application firewall | OWASP rule group + custom rules |
| **Shield Advanced** | DDoS protection | Enterprise-grade, dedicated support |

---

## Kubernetes (EKS) Setup

### Namespace Structure

```
platform/
├── namespace: platform-core
│   ├── user-service          (HPA: 2-20 pods, CPU 70%)
│   ├── booking-service       (HPA: 2-20 pods)
│   ├── payment-service       (HPA: 2-10 pods, memory 80%)
│   ├── content-service       (HPA: 3-30 pods)  ← Highest traffic
│   ├── search-service        (HPA: 2-15 pods)
│   ├── notification-service  (HPA: 2-10 pods)
│   ├── geo-service           (HPA: 2-8 pods)
│   ├── legal-service         (HPA: 2-5 pods)
│   ├── translation-service   (HPA: 2-8 pods)
│   ├── ai-service            (HPA: 1-5 pods, GPU nodes)
│   └── audit-service         (HPA: 1-5 pods)
├── namespace: platform-infra
│   ├── kong-gateway          (4 pods, no auto-scale during peak)
│   ├── redis-operator
│   └── kafka-connect
├── namespace: platform-monitoring
│   ├── prometheus
│   ├── grafana
│   ├── jaeger (distributed tracing)
│   └── alertmanager
└── namespace: platform-jobs
    ├── invoice-worker        (HPA: 1-10 pods)
    ├── email-worker          (HPA: 1-20 pods)
    └── lifecycle-worker      (1 pod, singleton via lock)
```

### Resource Quotas (per service, starting config)

```yaml
# user-service deployment
resources:
  requests:
    cpu: "250m"
    memory: "256Mi"
  limits:
    cpu: "1000m"
    memory: "512Mi"

# content-service (higher traffic)
resources:
  requests:
    cpu: "500m"
    memory: "512Mi"
  limits:
    cpu: "2000m"
    memory: "1Gi"
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml

name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Unit tests
        run: npm run test:unit
      - name: Integration tests
        run: npm run test:integration
      - name: E2E tests (Playwright)
        run: npm run test:e2e
      - name: Security scan (Snyk)
        run: snyk test
      - name: SAST scan (Semgrep)
        run: semgrep --config=p/typescript

  build:
    needs: test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [user, booking, payment, content, search, notification, geo, legal, translation]
    steps:
      - name: Build Docker image
        run: |
          docker build -f services/${{ matrix.service }}/Dockerfile \
            -t $ECR_REGISTRY/platform-${{ matrix.service }}:${{ github.sha }} .
      - name: Push to ECR
        run: docker push $ECR_REGISTRY/platform-${{ matrix.service }}:${{ github.sha }}

  lighthouse:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Lighthouse CI
        run: lhci autorun
        # Fails if LCP > 2.5s or CWV fail

  deploy-staging:
    needs: [build, lighthouse]
    environment: staging
    steps:
      - name: Deploy to staging cluster
        run: |
          helm upgrade --install platform-${{ matrix.service }} \
            ./helm/charts/microservice \
            --set image.tag=${{ github.sha }} \
            --namespace platform-core \
            --values ./helm/values/staging.yaml

  integration-test-staging:
    needs: deploy-staging
    steps:
      - name: Run API integration tests against staging
        run: npm run test:staging

  deploy-production:
    needs: integration-test-staging
    environment: production          # Requires manual approval in GitHub
    strategy:
      matrix:
        region: [ap-south-1, eu-central-1, us-east-1, me-central-1, ap-southeast-2]
    steps:
      - name: Blue/green deploy to ${{ matrix.region }}
        run: |
          kubectl set image deployment/platform-${{ matrix.service }} \
            ${{ matrix.service }}=$ECR_REGISTRY/platform-${{ matrix.service }}:${{ github.sha }} \
            --namespace platform-core \
            --context ${{ matrix.region }}
      - name: Verify rollout
        run: kubectl rollout status deployment/platform-${{ matrix.service }}
      - name: Run smoke tests
        run: npm run test:smoke -- --region ${{ matrix.region }}
```

---

## Infrastructure as Code (Terraform)

```
infra/
├── modules/
│   ├── eks/                    ← EKS cluster per region
│   ├── rds/                    ← PostgreSQL per region
│   ├── elasticache/            ← Redis per region
│   ├── msk/                    ← Kafka per region
│   ├── s3/                     ← Buckets per region with policies
│   ├── cloudfront/             ← CDN distribution
│   └── networking/             ← VPC, subnets, security groups
├── environments/
│   ├── production/
│   │   ├── ap-south-1.tf       ← India production
│   │   ├── eu-central-1.tf     ← Germany production
│   │   ├── us-east-1.tf        ← USA + Global production
│   │   ├── me-central-1.tf     ← UAE production
│   │   └── ap-southeast-2.tf   ← Australia production
│   └── staging/
│       └── us-east-1.tf        ← Single region for staging
└── global/
    ├── route53.tf              ← DNS
    ├── acm.tf                  ← Certificates
    └── cloudwatch.tf           ← Centralized monitoring
```

---

## Monitoring & Observability Stack

```
Metrics:       Prometheus (per cluster) → Grafana (centralized)
Logs:          Fluentd → CloudWatch Logs (per region) → OpenSearch (search)
Tracing:       OpenTelemetry → AWS X-Ray
Errors:        Sentry (per service, per environment)
Uptime:        Checkly (synthetic monitoring — checks all 5 countries every 60s)
Alerts:        PagerDuty (P1/P2 incidents) → On-call rotation
Dashboards:    Grafana with country-specific dashboards:
               - Active users per country
               - Booking conversion per country
               - Payment success rate per country
               - P99 latency per service per region
               - Error rate per service
```

### Critical Alerts

| Alert | Threshold | Action |
|---|---|---|
| Payment failure rate | > 2% in 5 min | Page on-call immediately |
| API error rate | > 1% in 5 min | Alert on-call |
| P99 latency | > 2s for 5 min | Alert on-call |
| Database connections | > 80% pool | Alert + auto-scale |
| Redis memory | > 85% | Alert + scale up |
| Kafka consumer lag | > 10K messages | Alert on-call |
| Certificate expiry | < 30 days | Automated renewal warning |
| Data residency violation | Any cross-region user data | Immediate page + auto-block |

---

## Disaster Recovery

| Component | RPO | RTO | Strategy |
|---|---|---|---|
| PostgreSQL | 1 minute | 15 minutes | Multi-AZ + automated failover; PITR backups 35 days |
| Redis | 5 minutes | 5 minutes | Cluster mode with replicas; AOF persistence |
| Kafka | 0 (replicated) | 5 minutes | 3-replica factor, auto-recovery |
| Application | 0 (multi-pod) | 2 minutes | Kubernetes rolling updates; HPA |
| S3 | 0 (replicated) | immediate | Cross-region replication to backup region |
| DNS | — | 60 seconds | Route 53 health checks + failover records |

**Backup testing:** Automated restore test every Sunday 02:00 UTC per region.

---

## Security Hardening

```
Network:
  - VPC per region (no public subnets for databases)
  - Security groups: least-privilege, no 0.0.0.0/0 ingress
  - AWS Network Firewall on egress
  - VPN for admin access (no bastion exposed to internet)

Containers:
  - Non-root user in all Dockerfiles
  - Read-only root filesystem
  - No privileged containers
  - Seccomp profiles
  - Pod Security Standards: Restricted

Secrets:
  - All secrets in AWS Secrets Manager (no .env files in production)
  - IAM roles for service accounts (IRSA) — no long-lived credentials
  - Secrets rotation: DB passwords every 30 days (automated)

Data:
  - Encryption at rest: AES-256 (RDS, S3, EBS)
  - Encryption in transit: TLS 1.3 minimum
  - Column-level encryption for PII (PAN, Aadhaar, Emirates ID)
  - Data masking in logs (PII scrubber middleware)
```
