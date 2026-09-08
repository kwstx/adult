# ADR-001: Modular Monolith to Selective Service Extraction

## Status
**ACCEPTED** (2026-09-08)

## Context & Problem Statement

The platform is a web-first creator livestream and monetization platform with high requirements for real-time responsiveness, double-entry financial integrity, sub-second video interaction, and trust & safety compliance.

A common pitfall in system design is premature microservice decomposition ("distributed monolith"), which creates:
- High network latency on critical user paths.
- Complex distributed transaction failure modes (2PC / saga overhead for atomic wallet debits).
- Devops and operational overhead before traffic patterns justify it.
- Slower feature velocity.

Conversely, a pure unorganized monolith can cause scaling bottlenecks when distinct workloads have vastly different resource requirements (e.g., GPU-bound video transcoding competing for CPU with OLTP database connections).

## Decision Drivers

1. **Load and Hardware Profile Diversity**: Workloads like media transcoding (CPU/GPU-bound) and video streaming egress (network I/O bound) have fundamentally different scaling profiles than transactional database queries.
2. **Organizational and Compliance Boundaries**: Financial ledgers and payment integrations may require strict PCI-DSS Level 1 isolated VPCs, while Trust & Safety / 2257 compliance may require isolated audit enclaves.
3. **Failure Blast Radius**: Non-critical asynchronous workloads (e.g., recommendation batch computation, full-text search indexing, analytical rollups) must not degrade critical live stream transactions or viewer presence.
4. **Development Velocity**: Initially, single-process in-memory calls and ACID transactions provide the highest velocity and lowest operational complexity.

## Decision: The 9 Candidate Services Extraction Matrix

The platform starts as a **Modular Monolith** with strict domain boundaries enforced via TypeScript service interfaces and runtime service proxies. Each domain can run in one of three modes, controlled by environment variables (`SERVICE_MODE_<DOMAIN>`):
- `IN_PROCESS`: Default mode. Direct in-memory method calls, shared PostgreSQL transactional context, zero network hop.
- `OUT_OF_PROCESS_RPC`: Independent microservice deployment communicating via HTTP/JSON-RPC/gRPC with circuit breakers and fallback.
- `ASYNC_WORKER`: Decoupled background queue processing via Redis/BullMQ/Postgres workers.

The 9 candidate services and their specific extraction triggers are:

| Candidate Service | Primary Scaling Bottleneck | Extraction Trigger Criteria | Target Extraction Architecture |
| :--- | :--- | :--- | :--- |
| **1. Media Orchestration** | GPU/CPU compute, WebRTC/SFU egress bandwidth | Transcoding queue latency > 5s or WebRTC egress saturating web tier NIC | Dedicated GPU/transcoder worker cluster + specialized SFU nodes (LiveKit/Cloudflare Stream) |
| **2. Payments & Wallet** | Strict ACID consistency, PCI-DSS compliance | PCI-DSS Level 1 scope reduction or bank/gateway integration segregation | Isolated secure VPC microservice with hardware security module (HSM) |
| **3. Messaging** | Concurrent open WebSocket connections, ephemeral fan-out | WebSocket concurrent connection count > 50,000 | Dedicated Go/Rust/Centrifugo real-time edge cluster |
| **4. Recommendation** | High-dimensional vector search, ML inference latency | Feed ranking CPU consumption > 25% of web servers | Standalone Python/Ray/Triton ML inference service with Redis feature store |
| **5. Notifications** | Burst I/O fan-out (e.g. 100k+ push notifications when creator goes live) | Notification queue delay > 10s during live start peaks | Dedicated asynchronous batch delivery worker fleet with multi-transport rate limiters |
| **6. Moderation (Trust & Safety)** | Computer vision / AI video frame analysis | Automated real-time safety inspection latency > 500ms | Dedicated GPU AI inference cluster + human review queue microservice |
| **7. Analytics** | High-cardinality OLAP queries competing with OLTP transactions | Analytical aggregations consuming database IOPS / locking tables | Dedicated ClickHouse / DuckDB / BigQuery ingestion pipeline |
| **8. Search** | Inverted index computation, fuzzy matching, faceted query load | Search query latency > 100ms on Postgres | Standalone OpenSearch / Meilisearch / Typesense cluster |
| **9. Creator Payouts** | External banking API rate limits, multi-day settlement reconciliation | Batch payout volume and tax/2257 compliance review overhead | Isolated background financial settlement service with multi-signature approvals |

## Consequences

### Positive
- **Zero Premature Complexity**: The core application runs as a unified full-stack application initially, maximizing developer velocity and maintaining simple deployment.
- **Zero-Downtime Extraction**: When a domain hits its extraction threshold, it can be spun up as an out-of-process service and toggled via environment variables without rewriting consuming business logic.
- **Resilience**: The service boundary layer includes circuit breakers and fallback mechanisms so that remote microservice failures do not take down the main web application.
- **Full Type Safety**: All 9 services share explicit TypeScript contracts across both in-process and remote modes.

### Negative / Trade-offs
- Requires maintaining clean abstraction interfaces and avoiding leaking internal database entities directly across domain boundaries.
- Out-of-process RPC calls introduce potential network latency and serialization overhead once extracted, requiring caching and batching strategies.
