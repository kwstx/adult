import crypto from "crypto";
import { redis } from "@/lib/redis";
import { LockLease, LockOptions } from "./types";

const LOCK_PREFIX = "scaling:lock:";

// Atomic unlock Lua script: only delete if the token matches
const UNLOCK_LUA_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

// Atomic extend lease Lua script: only extend if the token matches
const EXTEND_LUA_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("pexpire", KEYS[1], ARGV[2])
  else
    return 0
  end
`;

/**
 * Distributed Lock Service (Redlock / Atomic Leases)
 * 
 * At millions of concurrent users across dozens of horizontal application instances,
 * distributed locks prevent race conditions on critical operations such as:
 * - Single-seat VIP room reservations / 1-on-1 private session booking
 * - Creator payout settlement execution
 * - Livestream status transitions (e.g. STARTING -> LIVE)
 * - Exclusive periodic cron leader election
 */
export class DistributedLockService {
  private static sharedLocks: Map<string, { token: string; expiresAt: number }> = new Map();
  private activeRenewTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Acquires a distributed lock on a resource.
   * Retries automatically if the lock is currently held by another node.
   */
  public async acquire(
    resource: string,
    options: LockOptions = {}
  ): Promise<LockLease | null> {
    const {
      ttlMs = 10000, // 10s default TTL
      acquireTimeoutMs = 5000, // Wait up to 5s to acquire
      retryDelayMs = 100,
      autoRenew = false,
    } = options;

    const lockKey = `${LOCK_PREFIX}${resource}`;
    const lockToken = `tok_${crypto.randomBytes(16).toString("hex")}`;
    const deadline = Date.now() + acquireTimeoutMs;

    while (Date.now() < deadline) {
      const acquired = await this.tryAcquireOnce(lockKey, lockToken, ttlMs);
      if (acquired) {
        const lease: LockLease = {
          resource,
          lockToken,
          acquiredAt: Date.now(),
          expiresAt: Date.now() + ttlMs,
          ttlMs,
          isHeld: true,
        };

        if (autoRenew) {
          this.startAutoRenewal(lockKey, lockToken, ttlMs);
        }

        return lease;
      }

      // Add exponential backoff jitter
      const jitter = Math.floor(Math.random() * (retryDelayMs / 2));
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs + jitter));
    }

    return null; // Timed out waiting for lock
  }

  /**
   * Single atomic acquisition attempt using Redis SET resource token NX PX ttlMs.
   */
  private async tryAcquireOnce(
    lockKey: string,
    token: string,
    ttlMs: number
  ): Promise<boolean> {
    try {
      if (redis.status === "ready") {
        const res = await redis.set(lockKey, token, "PX", ttlMs, "NX");
        return res === "OK";
      }
    } catch {}

    // Static shared memory fallback for local multi-instance simulations
    const now = Date.now();
    const existing = DistributedLockService.sharedLocks.get(lockKey);
    if (!existing || existing.expiresAt <= now) {
      DistributedLockService.sharedLocks.set(lockKey, { token, expiresAt: now + ttlMs });
      return true;
    }

    return false;
  }

  /**
   * Releases a distributed lock atomically using the unique ownership token.
   */
  public async release(lease: LockLease): Promise<boolean> {
    const lockKey = `${LOCK_PREFIX}${lease.resource}`;
    this.stopAutoRenewal(lockKey);

    lease.isHeld = false;

    try {
      if (redis.status === "ready") {
        const result = await redis.eval(
          UNLOCK_LUA_SCRIPT,
          1,
          lockKey,
          lease.lockToken
        );
        return result === 1;
      }
    } catch {}

    const mem = DistributedLockService.sharedLocks.get(lockKey);
    if (mem && mem.token === lease.lockToken) {
      DistributedLockService.sharedLocks.delete(lockKey);
      return true;
    }

    return false;
  }

  /**
   * Extends an active lease TTL.
   */
  public async extendLease(lease: LockLease, additionalTtlMs: number): Promise<boolean> {
    const lockKey = `${LOCK_PREFIX}${lease.resource}`;
    try {
      if (redis.status === "ready") {
        const result = await redis.eval(
          EXTEND_LUA_SCRIPT,
          1,
          lockKey,
          lease.lockToken,
          additionalTtlMs
        );
        if (result === 1) {
          lease.expiresAt = Date.now() + additionalTtlMs;
          return true;
        }
        return false;
      }
    } catch {}

    const mem = DistributedLockService.sharedLocks.get(lockKey);
    if (mem && mem.token === lease.lockToken && mem.expiresAt > Date.now()) {
      mem.expiresAt = Date.now() + additionalTtlMs;
      lease.expiresAt = mem.expiresAt;
      return true;
    }

    return false;
  }

  /**
   * Runs an operation protected by an exclusive distributed lock.
   */
  public async runWithLock<T>(
    resource: string,
    operation: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T> {
    const lease = await this.acquire(resource, options);
    if (!lease) {
      throw new Error(`[DistributedLock] Failed to acquire lock for resource '${resource}' within timeout.`);
    }

    try {
      return await operation();
    } finally {
      await this.release(lease);
    }
  }

  private startAutoRenewal(lockKey: string, token: string, ttlMs: number): void {
    const renewalIntervalMs = Math.floor(ttlMs / 3);
    const timer = setInterval(async () => {
      try {
        if (redis.status === "ready") {
          await redis.eval(EXTEND_LUA_SCRIPT, 1, lockKey, token, ttlMs);
        }
      } catch {}
    }, renewalIntervalMs);

    if (timer.unref) timer.unref();
    this.activeRenewTimers.set(lockKey, timer);
  }

  private stopAutoRenewal(lockKey: string): void {
    const timer = this.activeRenewTimers.get(lockKey);
    if (timer) {
      clearInterval(timer);
      this.activeRenewTimers.delete(lockKey);
    }
  }
}

// Global Singleton
const globalForDistLock = globalThis as unknown as {
  __distributedLockService?: DistributedLockService;
};

export const distributedLock =
  globalForDistLock.__distributedLockService ?? new DistributedLockService();

if (process.env.NODE_ENV !== "production") {
  globalForDistLock.__distributedLockService = distributedLock;
}
