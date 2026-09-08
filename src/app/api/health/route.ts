/**
 * ============================================================================
 * DEEP HEALTH CHECK & READINESS PROBE API (/api/health)
 * ============================================================================
 * Production readiness probe used by load balancers, Kubernetes liveness/readiness
 * probes, and deployment orchestrators.
 */

import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { redis } from "../../../lib/redis";
import { env } from "../../../core/config/environment";
import { migrationGuard } from "../../../core/infra/migrations/migration-guard";

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, { status: "UP" | "DOWN" | "DEGRADED"; latencyMs?: number; details?: string }> = {};

  let isHealthy = true;

  // 1. Authoritative Datastore Check (PostgreSQL)
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1 as health_check`;
    checks.database = {
      status: "UP",
      latencyMs: Date.now() - dbStart,
    };
  } catch (err: any) {
    isHealthy = false;
    checks.database = {
      status: "DOWN",
      details: err.message,
    };
  }

  // 2. Redis Cache & Realtime Bus Check
  try {
    const redisStart = Date.now();
    const pingRes = await redis.ping();
    checks.redis = {
      status: pingRes === "PONG" ? "UP" : "DEGRADED",
      latencyMs: Date.now() - redisStart,
    };
  } catch (err: any) {
    if (env.isDevelopment()) {
      checks.redis = {
        status: "DEGRADED",
        details: "Local in-memory fallback active in development.",
      };
    } else {
      isHealthy = false;
      checks.redis = {
        status: "DOWN",
        details: err.message,
      };
    }
  }

  // 3. Database Migration Integrity Status
  try {
    const migrations = migrationGuard.scanMigrationFiles();
    checks.migrations = {
      status: migrations.length > 0 ? "UP" : "DEGRADED",
      details: `${migrations.length} version-controlled migration(s) registered`,
    };
  } catch (err: any) {
    checks.migrations = {
      status: "DEGRADED",
      details: err.message,
    };
  }

  const responsePayload = {
    status: isHealthy ? "HEALTHY" : "UNHEALTHY",
    environment: env.getEnvironmentName(),
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    latencyMs: Date.now() - startTime,
    metadata: env.getSanitizedMetadata(),
    checks,
  };

  return NextResponse.json(responsePayload, {
    status: isHealthy ? 200 : 503,
  });
}
