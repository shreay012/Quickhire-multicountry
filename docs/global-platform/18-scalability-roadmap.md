# 18 — Scalability Roadmap

---

## Scale Assumptions

| Metric | Phase 1 (0–6mo) | Phase 2 (6–18mo) | Phase 3 (18–36mo) | Phase 4 (36mo+) |
|---|---|---|---|---|
| Registered Users | 0–50K | 50K–500K | 500K–5M | 5M–50M |
| Monthly Active Users | 0–10K | 10K–100K | 100K–1M | 1M–10M |
| Concurrent Users | 0–1K | 1K–10K | 10K–100K | 100K–500K |
| Bookings/Day | 0–500 | 500–5K | 5K–50K | 50K–500K |
| Countries Active | 1–2 | 2–5 | 5 | 5+ |
| Team Size | 3–8 | 8–25 | 25–80 | 80–200+ |

---

## Phase 1 — Foundation (Months 1–6)

**Goal:** Working product in India with correct architecture patterns. Do not over-engineer.

### Infrastructure
- Single AWS region: ap-south-1 (Mumbai)
- Single EKS cluster with all services
- RDS PostgreSQL (db.t3.large, Multi-AZ)
- ElastiCache Redis (cache.t3.medium, 1 shard)
- Vercel for frontend (free/pro tier)
- Cloudflare for DNS, CDN, WAF (Pro plan)

### Architecture
- Monorepo (NestJS workspace) with service boundaries — deploy as separate containers but share DB
- One PostgreSQL database (not yet per-region split)
- One Redis cluster
- No Kafka yet — use SQS + EventBridge for events
- Typesense on a single EC2 t3.medium

### Must-Have Features
```
✅ User auth (OTP for IN, email for others)
✅ Service listing + search
✅ Booking flow
✅ Razorpay payment (IN only)
✅ CMS-driven content
✅ Dynamic translations (en + hi at minimum)
✅ Country config engine
✅ Legal documents (IN)
✅ ISR-rendered pages
✅ Cloudflare geo-detection
✅ Basic admin panel
✅ Audit logging
```

### Skip in Phase 1
```
❌ Multi-region deployment (do IN only)
❌ Kafka (use SQS/EventBridge)
❌ GPU-backed AI matching
❌ SEPA payments
❌ KYC integrations (manual review)
❌ Mobile apps (web-first)
```

---

## Phase 2 — Multi-Country Expansion (Months 6–18)

**Goal:** Launch UAE + Germany. Validate payment and legal per country.

### Infrastructure Changes
- Add regions: me-central-1 (UAE), eu-central-1 (Germany)
- Per-region RDS clusters (data residency requirement)
- Cross-region read replicas for analytics queries
- Add Kafka (MSK) — replace SQS for high-volume events
- Typesense cluster (3 nodes) → indexes per country
- CDN budget: $2–5K/month

### Architecture Changes
- Introduce database router (per-country DB connections)
- Deploy Stripe (UAE, DE) alongside Razorpay (IN)
- GDPR consent management live (DE requirement)
- Impressum + DSGVO pages live (DE legal mandatory)
- Add Arabic (ar) locale with RTL frontend support
- GrowthBook feature flags for phased feature rollout
- Introduce AI matching (basic — Typesense vector search, no GPU)

### Scale Triggers
```
When to add more RDS read replicas:    → DB CPU > 70% for 1h
When to scale EKS node groups:        → Pod CPU > 80% for 15min
When to add Typesense nodes:           → Search P99 > 500ms
When to add Redis shards:              → Memory > 70%
When to introduce API response caching: → Origin hits > 10K/min for any endpoint
```

---

## Phase 3 — Hyper-Growth (Months 18–36)

**Goal:** Launch USA + Australia. Scale to 1M MAU.

### Infrastructure Changes
- Full 5-region deployment
- RDS Aurora PostgreSQL (better read scaling, global clusters)
- Redis Cluster mode per region (multi-shard)
- Kafka (MSK) fully replacing all SQS event paths
- Dedicated Elasticsearch cluster for analytics (alongside Typesense for search)
- CloudFront origin shield in front of all regional EKS clusters
- Multi-CDN strategy: Cloudflare (primary) + CloudFront (fallback)

### Architecture Changes
- Extract payment service to isolated namespace (PCI-DSS boundary)
- Introduce CQRS for booking/search read paths
- AI matching v2: OpenSearch k-NN or Pinecone vector DB
- Real-time features: WebSocket/SSE for booking status (Socket.io with Redis adapter)
- B2B multi-seat accounts (companies posting multiple jobs)
- US tax automation via TaxJar API (50 US states)
- 1099-NEC reporting automation for US freelancers
- SOC 2 Type II audit process begins

### Performance Targets at Phase 3
```
API P50 latency:  < 50ms  (served from edge or regional cache)
API P99 latency:  < 500ms
Page LCP:         < 1.5s  (ISR + CDN)
Search results:   < 100ms (Typesense)
Availability:     99.95%  (< 22 min downtime/month)
```

---

## Phase 4 — Enterprise Scale (Month 36+)

**Goal:** 10M+ users, enterprise clients, platform extensibility.

### Architecture Changes
- Service mesh (Istio or AWS App Mesh) for inter-service communication
- GraphQL federation gateway (replace REST for complex queries)
- Dedicated ML inference cluster (GPU) for AI matching + fraud scoring
- Event sourcing for booking domain (audit + replay capability)
- Multi-tenant SaaS offering (white-label for enterprise clients)
- Data warehouse: Snowflake or Redshift for analytics
- Real-time analytics: Apache Flink on Kafka streams
- Separate read/write databases per service (full CQRS)

---

## Bottleneck Matrix

| Component | Bottleneck Signal | Immediate Fix | Long-term Fix |
|---|---|---|---|
| Content API | High hit rate | Redis cache (TTL 5min) | CDN edge cache |
| Search | Slow results | Add Typesense nodes | Shard by country |
| PostgreSQL | High CPU | Add read replicas | Aurora auto-scaling |
| Payment webhook | Processing lag | Increase consumer pods | Kafka partitioning |
| ISR pages | Cache miss on new content | Reduce ISR TTL | On-demand revalidation |
| Translation API | Repeated fetches | Namespace-level cache | CDN cache translations |
| AI matching | High latency | Queue + async response | GPU cluster |
| Redis memory | OOM kills | Eviction policies | Add shards |
| Notification fan-out | Queue backup | Scale worker pods | Batch delivery |
| Admin dashboard queries | Slow aggregations | Materialized views | Dedicated analytics DB |

---

## Cost Estimation by Phase

### Phase 1 (India only, 10K MAU)
```
EKS (t3.xlarge × 3):           $300/mo
RDS PostgreSQL Multi-AZ:        $400/mo
ElastiCache Redis:              $150/mo
Typesense EC2:                  $100/mo
S3 + CloudFront:                $50/mo
Cloudflare Pro:                 $20/mo
Vercel Pro:                     $20/mo
SES + SNS:                      $50/mo
Total:                          ~$1,100/mo
```

### Phase 2 (5 countries, 100K MAU)
```
EKS (3 regions, m5.xlarge × 5 each): $2,000/mo
RDS PostgreSQL (3 regions):           $1,500/mo
ElastiCache Redis (3 regions):        $600/mo
MSK Kafka (3 regions):                $800/mo
Typesense cluster:                    $300/mo
S3 + CloudFront:                      $300/mo
Cloudflare Business:                  $200/mo
Monitoring (Datadog/Grafana):         $500/mo
Total:                                ~$6,200/mo
```

### Phase 3 (5 regions, 1M MAU)
```
EKS (5 regions, auto-scaling):        $8,000/mo
Aurora PostgreSQL (5 regions):        $5,000/mo
ElastiCache cluster mode:             $2,000/mo
MSK Kafka (5 regions):               $3,000/mo
Typesense + Elasticsearch:            $1,500/mo
CloudFront + S3:                      $2,000/mo
CDN + Cloudflare Enterprise:          $2,500/mo
Monitoring + Security:                $2,000/mo
Total:                                ~$26,000/mo
```

---

## Team Structure Recommendation

### Phase 1 Team (8 people)
```
1 × Tech Lead / Principal Engineer
1 × Backend Engineer (NestJS)
1 × Frontend Engineer (Next.js)
1 × DevOps / Platform Engineer
1 × Product Manager
1 × UI/UX Designer
1 × QA Engineer
1 × Part-time Legal Advisor (per country)
```

### Phase 2 Team (25 people)
```
Backend:   4 engineers (split: Core, Payments, Content, Search)
Frontend:  3 engineers
DevOps:    2 engineers
Mobile:    2 engineers (iOS + Android)
QA:        2 engineers (automated + manual)
AI/ML:     1 engineer
Security:  1 engineer
Product:   2 PMs (consumer + marketplace)
Design:    2 designers
Data:      1 analyst
Legal:     1 in-house counsel
Management: 2 (CTO + Engineering Manager)
```
