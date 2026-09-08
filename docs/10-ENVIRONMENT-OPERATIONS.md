# 10. Infrastructure Environments & Operations Manual

## 1. Overview & Operating Principles

This document specifies the authoritative infrastructure architecture, environment separation, database migration protocol, and repeatable deployment workflows for the platform.

```text
[Developer Workstation] ──(PR)──> [CI: Typecheck / Lint / Migration Check]
                                                │
                                                ▼ (Merge to main)
                                      [STAGING ENVIRONMENT]
                                      - Mirrored cloud topology
                                      - Sandbox payment gateways
                                      - Persona KYC Sandbox
                                      - Automated smoke test probe
                                                │
                                                ▼ (Gated Manual Approval)
                                     [PRODUCTION ENVIRONMENT]
                                     - Real users & financial data
                                     - Zero mock adapters allowed
                                     - Multi-AZ RDS / ElastiCache
                                     - Read-only container rootfs
```

---

## 2. Environment Matrix

| Dimension | Development (`development`) | Staging (`staging`) | Production (`production`) |
| :--- | :--- | :--- | :--- |
| **Purpose** | Local feature implementation & tests | Pre-production validation & smoke tests | Real creators, real fans, real financial ledger |
| **Database** | Local PostgreSQL (`localhost:5432`) | Isolated Staging RDS Cluster (`SSL: required`) | Multi-AZ Production RDS Cluster (`SSL: required`) |
| **Redis** | Local Redis / In-memory fallback | Dedicated Staging Redis Cluster | High-availability AWS ElastiCache Cluster |
| **Payment Gateway** | `ccbill_mock` (Zero charge) | CCBill Sandbox Merchant | Real CCBill / SegPay Merchant API |
| **KYC / 2257 Compliance**| `persona_mock` + local bucket | Persona Sandbox + Staging S3 Bucket | Real Persona API + Multi-Region Encrypted Vault |
| **Video Transport** | Local Mock SFU / Ingest | LiveKit / Cloudflare Stream Staging | Production Low-Latency WebRTC / SFU |
| **Migrations** | `npx prisma migrate dev` | `npx prisma migrate deploy` | `npx prisma migrate deploy` |
| **Mock Gateway Allowed** | **YES** | **YES (Sandbox only)** | **STRICTLY FORBIDDEN (Fatal Error)** |
| **Debug Endpoints** | Enabled | Disabled | Disabled |
| **Data Mutation Scripts**| Allowed | Allowed | **STRICTLY FORBIDDEN** |

---

## 3. Core Operational Rules

1. **Developers Work Against Development**:
   - Never develop directly against staging or production databases.
   - Use `.env.development` and `docker-compose.dev.yml` for fully self-contained local stacks.

2. **Every Meaningful Change Goes Through Staging**:
   - No code or database schema change is deployed to production without first verifying against staging.
   - Staging mirrors production configuration, network policies, and service boundaries.

3. **Production Contains Real Users and Financial Data**:
   - Production operations are strictly audited.
   - All financial mutations must be atomic and executed through authoritative backend services.
   - Never experiment directly against production.

4. **Database Migrations are Version-Controlled**:
   - All migrations are tracked under `prisma/migrations/`.
   - `prisma db push` or raw destructive resets are blocked on staging and production.
   - Migrations are applied via `npx tsx scripts/migrate.ts --env=production`.

5. **Infrastructure Configuration is Version-Controlled**:
   - Environment variables are validated on startup via `src/core/config/env-schema.ts`.
   - Containers are declaratively specified via multi-stage `Dockerfile` and Kubernetes / Docker Compose manifests.

6. **Deployments are Repeatable & Gated**:
   - Deployments follow an automated multi-stage pipeline: Pre-flight validation → Migration execution → Rolling container restart → Deep health probe verification.
   - Health probes (`/api/health`) gate promotion and trigger automated rollbacks if degraded.

---

## 4. Staging Data Sanitization Protocol

When testing staging against realistic data volumes, all production clones MUST be sanitized immediately via:

```bash
npx tsx scripts/db-sanitize-staging.ts
```

The sanitization pipeline:
- Rewrites all email addresses to `staging_user_<id>@staging.platform.local`.
- Zeroes out real government IDs, passport numbers, selfies, and 2257 documentation.
- Replaces KYC verification records with synthetic placeholders.
- Resets wallet credit balances to safe, deterministic test balances (5,000 credits).
- Scrubs direct message content.
- Hardcoded failsafe prevents execution against any database containing production keywords.

---

## 5. Deployment Commands & Runbook

### Local Development
```bash
# Start local infrastructure (Postgres, Redis, MinIO)
docker-compose -f docker-compose.dev.yml up -d

# Run migrations
npx tsx scripts/migrate.ts --env=development

# Start Next.js development server
npm run dev
```

### Staging Deployment
```bash
# Check status and dry-run migrations
npx tsx scripts/migrate.ts --env=staging --status

# Deploy to Staging
npx tsx scripts/deploy.ts --env=staging --version=1.1.0 --sha=$(git rev-parse HEAD)
```

### Production Deployment
```bash
# Verify migration pre-flight checks
npx tsx scripts/migrate.ts --env=production --dry-run

# Execute production deployment (Gated)
npx tsx scripts/deploy.ts --env=production --version=1.1.0 --sha=$(git rev-parse HEAD) --staging-verified
```
