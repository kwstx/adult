/**
 * ============================================================================
 * AUTHORITATIVE DISTRIBUTED RATE LIMITER (SLIDING WINDOW)
 * ============================================================================
 * Protects endpoints from credential stuffing, brute force, DDoS, and credit spam.
 * Uses Redis sliding window with automatic in-memory fallback.
 */

import { platformMetrics } from "@/core/observability/metrics-registry";

function getRedisClient(): any {
  if (typeof globalThis !== "undefined" && (globalThis as any).redisClient) {
    return (globalThis as any).redisClient;
  }
  return null;
}

export interface RateLimitPolicy {
  maxRequests: number;
  windowSeconds: number;
  name: string;
}

export const RATE_LIMIT_POLICIES: Record<string, RateLimitPolicy> = {
  AUTH: {
    name: "AUTH",
    maxRequests: 5,
    windowSeconds: 60, // 5 req/min (Brute-force protection)
  },
  PAYMENTS: {
    name: "PAYMENTS",
    maxRequests: 10,
    windowSeconds: 60, // 10 req/min (Checkout & Wallet transactions)
  },
  STREAM_INTERACTIONS: {
    name: "STREAM_INTERACTIONS",
    maxRequests: 30,
    windowSeconds: 60, // 30 req/min (Tips, Gifts, Live Queue)
  },
  SEARCH_DISCOVERY: {
    name: "SEARCH_DISCOVERY",
    maxRequests: 60,
    windowSeconds: 60, // 60 req/min (Feed queries)
  },
  API_GENERAL: {
    name: "API_GENERAL",
    maxRequests: 120,
    windowSeconds: 60, // 120 req/min (General read/write)
  },
};

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

// In-Memory Fallback Store (Sliding window log)
class MemoryRateLimiter {
  private static store = new Map<string, number[]>();

  public static check(key: string, limit: number, windowSeconds: number): RateLimitResult {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const timestamps = (MemoryRateLimiter.store.get(key) || []).filter((t) => t > windowStart);

    if (timestamps.length >= limit) {
      const oldest = timestamps[0];
      const resetSeconds = Math.max(1, Math.ceil((oldest + windowSeconds * 1000 - now) / 1000));
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetSeconds,
      };
    }

    timestamps.push(now);
    MemoryRateLimiter.store.set(key, timestamps);

    const resetSeconds = windowSeconds;
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - timestamps.length),
      resetSeconds,
    };
  }

  public static reset(): void {
    MemoryRateLimiter.store.clear();
  }
}

export class RateLimiter {
  /**
   * Evaluates rate limit for a given client key and policy.
   */
  public static async check(
    clientIdentifier: string,
    policyName: keyof typeof RATE_LIMIT_POLICIES | RateLimitPolicy = "API_GENERAL"
  ): Promise<RateLimitResult> {
    const policy: RateLimitPolicy =
      typeof policyName === "string" ? RATE_LIMIT_POLICIES[policyName] || RATE_LIMIT_POLICIES.API_GENERAL : policyName;

    const redisKey = `ratelimit:${policy.name}:${clientIdentifier}`;
    const t0 = performance.now();

    try {
      const redis = await getRedisClient();
      if (redis && redis.status === "ready" && typeof redis.pipeline === "function") {
        const now = Date.now();
        const windowStart = now - policy.windowSeconds * 1000;

        const multi = redis.pipeline();
        multi.zremrangebyscore(redisKey, 0, windowStart);
        multi.zadd(redisKey, now, `${now}-${Math.random()}`);
        multi.zcard(redisKey);
        multi.expire(redisKey, policy.windowSeconds);

        const results = await multi.exec();
        const latencyMs = performance.now() - t0;
        platformMetrics.recordRedisCommand(latencyMs, true);

        if (results && results[2] && results[2][1] !== undefined) {
          const currentCount = Number(results[2][1]);
          const allowed = currentCount <= policy.maxRequests;
          const remaining = Math.max(0, policy.maxRequests - currentCount);

          return {
            allowed,
            limit: policy.maxRequests,
            remaining,
            resetSeconds: policy.windowSeconds,
          };
        }
      }
    } catch {
      // Redis unavailable: seamlessly fall back to local in-memory sliding window
      platformMetrics.recordRedisCommand(performance.now() - t0, false);
    }

    return MemoryRateLimiter.check(redisKey, policy.maxRequests, policy.windowSeconds);
  }

  /**
   * Generates standard IETF / GitHub rate limit HTTP headers.
   */
  public static getHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      "X-RateLimit-Limit": String(result.limit),
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": String(result.resetSeconds),
    };

    if (!result.allowed) {
      headers["Retry-After"] = String(result.resetSeconds);
    }

    return headers;
  }

  public static resetMemoryStore(): void {
    MemoryRateLimiter.reset();
  }
}
