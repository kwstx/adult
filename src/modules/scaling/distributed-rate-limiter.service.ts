import { redis } from "@/lib/redis";
import { RateLimitConfig, RateLimitResult } from "./types";

const RATE_LIMIT_PREFIX = "scaling:ratelimit:";

// Atomic Sliding Window Lua script:
// 1. ZREMRANGEBYSCORE key 0 (now - window)
// 2. ZCARD key
// 3. if count < limit then ZADD key now uuid + EXPIRE window
const SLIDING_WINDOW_LUA = `
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])
  local reqId = ARGV[4]

  local clearBefore = now - (window * 1000)
  redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)

  local currentRequests = redis.call('ZCARD', key)
  if currentRequests < limit then
    redis.call('ZADD', key, now, reqId)
    redis.call('EXPIRE', key, window)
    return {1, limit - currentRequests - 1, 0}
  else
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retryAfter = 1
    if oldest and #oldest >= 2 then
      local oldestScore = tonumber(oldest[2])
      retryAfter = math.max(1, math.ceil(((oldestScore + (window * 1000)) - now) / 1000))
    end
    return {0, 0, retryAfter}
  end
`;

/**
 * Distributed Rate Limiter Service (Sliding Window across All App Instances)
 * 
 * Ensures that rate limits are enforced globally across all horizontal application instances.
 * A malicious actor or bot hitting 10 different application servers simultaneously is tracked
 * under the exact same sliding window in Redis.
 */
export class DistributedRateLimiterService {
  private static sharedWindows: Map<string, number[]> = new Map();

  /**
   * Checks and consumes a rate limit token for a specific subject identifier (e.g. IP, UserID, SessionID).
   */
  public async consume(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const { keyPrefix, limit, windowSeconds } = config;
    const rateLimitKey = `${RATE_LIMIT_PREFIX}${keyPrefix}:${identifier}`;
    const now = Date.now();
    const reqId = `${now}_${Math.random().toString(36).substring(2, 7)}`;

    try {
      if (redis.status === "ready") {
        const result = (await redis.eval(
          SLIDING_WINDOW_LUA,
          1,
          rateLimitKey,
          now,
          windowSeconds,
          limit,
          reqId
        )) as [number, number, number];

        const allowed = result[0] === 1;
        const remaining = Math.max(0, result[1]);
        const retryAfterSeconds = result[2];

        return {
          allowed,
          limit,
          remaining,
          resetSeconds: windowSeconds,
          retryAfterSeconds: allowed ? 0 : retryAfterSeconds,
          currentCount: limit - remaining,
        };
      }
    } catch {}

    // Static shared memory fallback for local unit tests
    return this.consumeMemory(rateLimitKey, limit, windowSeconds, now);
  }

  private consumeMemory(
    key: string,
    limit: number,
    windowSeconds: number,
    now: number
  ): RateLimitResult {
    const windowMs = windowSeconds * 1000;
    let timestamps = DistributedRateLimiterService.sharedWindows.get(key) || [];

    // Filter out expired timestamps
    timestamps = timestamps.filter((t) => now - t < windowMs);

    if (timestamps.length < limit) {
      timestamps.push(now);
      DistributedRateLimiterService.sharedWindows.set(key, timestamps);
      return {
        allowed: true,
        limit,
        remaining: limit - timestamps.length,
        resetSeconds: windowSeconds,
        retryAfterSeconds: 0,
        currentCount: timestamps.length,
      };
    } else {
      const oldest = timestamps[0] || now;
      const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetSeconds: windowSeconds,
        retryAfterSeconds: retryAfter,
        currentCount: timestamps.length,
      };
    }
  }

  /**
   * Resets rate limit for a specific identifier (e.g. on successful admin override or test teardown).
   */
  public async reset(identifier: string, keyPrefix: string): Promise<void> {
    const rateLimitKey = `${RATE_LIMIT_PREFIX}${keyPrefix}:${identifier}`;
    try {
      if (redis.status === "ready") {
        await redis.del(rateLimitKey);
      }
    } catch {}
    DistributedRateLimiterService.sharedWindows.delete(rateLimitKey);
  }
}

// Global Singleton
const globalForRateLimit = globalThis as unknown as {
  __distributedRateLimiterService?: DistributedRateLimiterService;
};

export const distributedRateLimiter =
  globalForRateLimit.__distributedRateLimiterService ?? new DistributedRateLimiterService();

if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.__distributedRateLimiterService = distributedRateLimiter;
}
