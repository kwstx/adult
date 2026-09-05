# AuraLive — Next-Gen Adult Creator & Real-Time Streaming Platform

A production-grade, end-to-end full-stack platform built in TypeScript with Next.js (App Router), React, Tailwind CSS, Prisma (PostgreSQL / SQLite), and Redis/SSE real-time pub/sub.

---

## 🏛️ System Architecture

The platform connects five core systems together under a strict **backend-authoritative** security model:

1. **Consumer Application**: Discovery feed, live video player, real-time chat, animated stream goal progress, interactive tip menu, and Pay-Per-View media vault.
2. **Creator Operating System**: Live studio dashboard, RTMP/WHIP ingest key management, real-time incoming Paid Interaction Queue, and room moderation controls.
3. **Economic Engine**: Double-entry ACID credit ledger (`prisma.$transaction`), negative balance prevention, platform rake splitting (80% creator / 20% platform), discrete payment gateway integration, and immutable transaction audit log.
4. **Real-Time Engine**: High-performance Server-Sent Events (SSE) and Redis-backed Pub/Sub for room presence, live chat, tip toasts, and goal updates.
5. **Trust & Safety Engine**: 18+ Age assurance KYC verification, 18 U.S.C. § 2257 record-keeping custodian vault, and 24/7 moderation report queue.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database & Seed
```bash
npm run prisma:push
npm run prisma:seed
```

### 3. Run Automated Economic & Security Test Suite
```bash
npx tsx scripts/verify-economic-engine.ts
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🔒 Security Principle: Backend as the Single Source of Truth

The frontend is never the authority:
- The browser can say: *"I want to tip 100 tokens."* -> The backend verifies the wallet balance, locks rows in a transaction, applies the 80/20 rake split, creates ledger entries, and broadcasts the event.
- The browser can say: *"I want to enter this VIP room."* -> The backend validates the user's active subscription before signing time-limited playback tokens.
