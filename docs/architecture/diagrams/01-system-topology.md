# System Topology Diagram

```mermaid
graph TB
    subgraph INTERNET["Internet"]
        CUSTOMER["Customer Browser"]
        STAFFBROWSER["Staff / Admin Browser"]
        MOBILE["Mobile (FCM push)"]
    end

    subgraph VERCEL["Vercel — CDN + SSR"]
        NEXTJS["Next.js 16 App Router\nPort 3000\nEdge Middleware (geo)"]
    end

    subgraph RENDER["Render — Docker Container"]
        EXPRESS["Express 4.21 API\nNode.js 20 ESM\nPort 4000"]
        SOCKETIO["Socket.io 4.8\nPath: /api/socket.io\nWebSocket + Polling"]
        BULLMQ["BullMQ Workers\n• notifications (concur 10)\n• lifecycle (concur 1)"]
    end

    subgraph MONGODB["MongoDB Atlas / Self-hosted"]
        DB[("MongoDB 6.9\nDB: quickhire\n20 collections")]
    end

    subgraph REDIS["Redis (Render / Upstash)"]
        REDISDATA["Key Store\n• OTP hashes\n• Sessions\n• Blocklist\n• Idempotency\n• Scorecards"]
        BULLQUEUE["BullMQ Queues\n• notifications\n• lifecycle\n• emails\n• analytics"]
        SOCKETADAPTER["Socket.io\nRedis Adapter\n(pub/sub)"]
    end

    subgraph MEILI["Meilisearch (Cloud / Self)"]
        SEARCH[("Indexes\n• bookings\n• resources\n• articles")]
    end

    subgraph AWS["AWS"]
        S3["S3\n• chat files\n• invoices"]
        SES["SES\nTransactional email"]
        SNS["SNS\nPush notifications"]
        SQS["SQS\n• invoice queue\n• notification queue\n• email queue"]
    end

    subgraph EXTERNAL["External Services"]
        RAZORPAY["Razorpay\nPayment Gateway"]
        MSG91["MSG91 / SNS\nOTP SMS"]
        SENTRY["Sentry\nError Tracking"]
        ANTHROPIC["Anthropic Claude API\nAI Chatbot (RAG)"]
        PROMETHEUS["Prometheus\n/metrics endpoint"]
    end

    CUSTOMER -->|HTTPS| NEXTJS
    STAFFBROWSER -->|HTTPS| NEXTJS
    NEXTJS -->|REST /api/*| EXPRESS
    NEXTJS -->|WebSocket| SOCKETIO
    MOBILE -->|FCM| SNS

    EXPRESS -->|queries| DB
    EXPRESS -->|cache / OTP / locks| REDISDATA
    EXPRESS -->|enqueue| BULLQUEUE
    EXPRESS -->|search| MEILI
    EXPRESS -->|presigned URLs / upload| S3
    EXPRESS -->|send email| SES
    EXPRESS -->|push| SNS
    EXPRESS -->|enqueue invoice| SQS
    EXPRESS -->|create order / verify| RAZORPAY
    EXPRESS -->|send OTP| MSG91
    EXPRESS -->|capture errors| SENTRY
    EXPRESS -->|RAG search + LLM| ANTHROPIC

    SOCKETIO -->|pub/sub| SOCKETADAPTER
    BULLMQ -->|dequeue| BULLQUEUE
    BULLMQ -->|update DB| DB
    BULLMQ -->|push| SNS

    RAZORPAY -->|webhook POST /payments/webhook| EXPRESS

    PROMETHEUS -->|scrape| EXPRESS
```

---

## Component Responsibilities

| Component | Responsibility |
|---|---|
| **Vercel / Next.js** | SSR, CDN, Edge geo-detection, 28 page routes |
| **Express API** | All business logic, REST endpoints, auth, booking, payments |
| **Socket.io** | Real-time chat + notifications (WS + polling, Redis adapter for multi-pod) |
| **BullMQ** | Async job processing — notifications, lifecycle ticks, emails, analytics |
| **MongoDB** | Source of truth — all persistent data (20 collections) |
| **Redis** | Speed layer — OTP, sessions, blocklist, locks, caches, queues |
| **Meilisearch** | Full-text search; degrades gracefully to MongoDB on unavailability |
| **S3** | Chat file uploads (25MB), invoice PDFs |
| **SES** | Transactional emails via SQS worker |
| **SNS** | Mobile push notifications via FCM endpoint ARNs |
| **SQS** | Secondary queue path for invoices/email/notifications |
| **Razorpay** | INR payment processing; webhook dedup via `rawWebhookEvents[]` |
| **MSG91** | OTP SMS delivery; falls back to console log on failure |
| **Sentry** | Unhandled error capture with user context |
| **Anthropic** | AI chatbot — RAG over Meilisearch `articles` index |
| **Prometheus** | Metrics scrape — HTTP durations, socket gauges, Node.js process |

---

## Network Ports & Paths

| Service | Port | Key Paths |
|---|---|---|
| Frontend (Vercel/local) | 3000 | All page routes |
| Backend API | 4000 | `/api/*`, `/healthz`, `/readyz`, `/metrics` |
| Socket.io | 4000 (shared) | `/api/socket.io` |
| MongoDB | 27017 | — |
| Redis | 6379 | — |
| Meilisearch | 7700 | — |
| Bull-Board | 4000 (admin) | `/admin/queues` |
