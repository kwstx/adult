/**
 * ============================================================================
 * REAL-TIME SLIDING WINDOW VELOCITY TRACKER
 * ============================================================================
 * Tracks high-velocity abuse using Redis Sorted Sets (ZADD / ZREMRANGEBYSCORE)
 * with robust in-memory sliding window fallback for resilient local development.
 */

import redis from "@/lib/redis";
import { VelocitySnapshot } from "../types";

export class VelocityTracker {
  private static readonly IN_MEMORY_FALLBACK = new Map<string, number[]>();
  private static readonly FALLBACK_CLEANUP_INTERVAL = 60 * 1000;

  static {
    // Periodically clean up in-memory timestamps older than 24 hours
    if (typeof setInterval !== "undefined") {
      setInterval(() => {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        for (const [key, timestamps] of VelocityTracker.IN_MEMORY_FALLBACK.entries()) {
          const filtered = timestamps.filter((t) => t >= cutoff);
          if (filtered.length === 0) {
            VelocityTracker.IN_MEMORY_FALLBACK.delete(key);
          } else {
            VelocityTracker.IN_MEMORY_FALLBACK.set(key, filtered);
          }
        }
      }, VelocityTracker.FALLBACK_CLEANUP_INTERVAL);
    }
  }

  /**
   * Records a timestamped event into the sliding window.
   */
  static async recordEvent(key: string, scoreValue: number = 1): Promise<void> {
    const now = Date.now();
    const redisKey = `risk:velocity:${key}`;

    try {
      if (redis.status === "ready" || redis.status === "connect") {
        const multi = redis.multi();
        const member = `${now}:${Math.random().toString(36).substring(2, 8)}:${scoreValue}`;
        multi.zadd(redisKey, now, member);
        // Expire key after 48 hours to prevent unbounded memory growth
        multi.expire(redisKey, 48 * 3600);
        await multi.exec();
        return;
      }
    } catch (e) {
      // Fallback below
    }

    // In-memory fallback
    const list = this.IN_MEMORY_FALLBACK.get(redisKey) || [];
    list.push(now);
    this.IN_MEMORY_FALLBACK.set(redisKey, list);
  }

  /**
   * Retrieves count of events occurred within `windowSeconds` from now.
   */
  static async getCount(key: string, windowSeconds: number): Promise<number> {
    const now = Date.now();
    const minTime = now - windowSeconds * 1000;
    const redisKey = `risk:velocity:${key}`;

    try {
      if (redis.status === "ready" || redis.status === "connect") {
        // Remove stale members before counting
        await redis.zremrangebyscore(redisKey, "-inf", minTime - 1);
        const count = await redis.zcount(redisKey, minTime, "+inf");
        return count;
      }
    } catch (e) {
      // Fallback below
    }

    const list = this.IN_MEMORY_FALLBACK.get(redisKey) || [];
    return list.filter((t) => t >= minTime).length;
  }

  /**
   * Sums numeric score values (e.g. credits spent) within `windowSeconds`.
   */
  static async getSum(key: string, windowSeconds: number): Promise<number> {
    const now = Date.now();
    const minTime = now - windowSeconds * 1000;
    const redisKey = `risk:velocity:${key}`;

    try {
      if (redis.status === "ready" || redis.status === "connect") {
        await redis.zremrangebyscore(redisKey, "-inf", minTime - 1);
        const members = await redis.zrangebyscore(redisKey, minTime, "+inf");
        let sum = 0;
        for (const m of members) {
          const parts = m.split(":");
          if (parts.length >= 3) {
            sum += parseFloat(parts[2]) || 0;
          } else {
            sum += 1;
          }
        }
        return sum;
      }
    } catch (e) {
      // Fallback
    }

    const list = this.IN_MEMORY_FALLBACK.get(redisKey) || [];
    return list.filter((t) => t >= minTime).length;
  }

  /**
   * Tracks deposit-to-spend elapsed latency.
   * Stores the latest deposit epoch timestamp for the user.
   */
  static async recordLatestDeposit(userId: string): Promise<void> {
    const now = Date.now();
    const key = `risk:last_deposit:${userId}`;
    try {
      if (redis.status === "ready" || redis.status === "connect") {
        await redis.set(key, now.toString(), "EX", 86400 * 7);
        return;
      }
    } catch (e) {
      // Fallback
    }
    const memKey = `risk:last_deposit:${userId}`;
    this.IN_MEMORY_FALLBACK.set(memKey, [now]);
  }

  /**
   * Gets the seconds elapsed since the user's most recent credit deposit.
   * Returns null if no prior deposit recorded in the active tracking window.
   */
  static async getSecondsSinceLastDeposit(userId: string): Promise<number | null> {
    const now = Date.now();
    const key = `risk:last_deposit:${userId}`;
    try {
      if (redis.status === "ready" || redis.status === "connect") {
        const val = await redis.get(key);
        if (val) {
          const timestamp = parseInt(val, 10);
          return Math.max(0, Math.floor((now - timestamp) / 1000));
        }
      }
    } catch (e) {
      // Fallback
    }

    const memKey = `risk:last_deposit:${userId}`;
    const list = this.IN_MEMORY_FALLBACK.get(memKey);
    if (list && list.length > 0) {
      const last = list[list.length - 1];
      return Math.max(0, Math.floor((now - last) / 1000));
    }
    return null;
  }

  /**
   * Assembles a comprehensive VelocitySnapshot for risk analysis.
   */
  static async getVelocitySnapshot(userId?: string, ipAddress?: string): Promise<VelocitySnapshot> {
    const defaultSnapshot: VelocitySnapshot = {
      transactionsLast1m: 0,
      transactionsLast1h: 0,
      transactionsLast24h: 0,
      creditsSpentLast5m: 0,
      creditsSpentLast1h: 0,
      fiatDepositedLast1h: 0,
      fiatDepositedLast24h: 0,
      failedLoginsLast15m: 0,
      cardDeclinesLast1h: 0,
      messagesLast1m: 0,
      accountCreationsFromIpLast1h: 0,
    };

    if (!userId && !ipAddress) return defaultSnapshot;

    const userKey = userId ? `user:${userId}` : null;
    const ipKey = ipAddress ? `ip:${ipAddress.replace(/[:.]/g, "_")}` : null;

    const [
      tx1m,
      tx1h,
      tx24h,
      spent5m,
      spent1h,
      deposit1h,
      deposit24h,
      failedLogins,
      cardDeclines,
      messages1m,
      ipSignups,
    ] = await Promise.all([
      userKey ? this.getCount(`${userKey}:tx`, 60) : 0,
      userKey ? this.getCount(`${userKey}:tx`, 3600) : 0,
      userKey ? this.getCount(`${userKey}:tx`, 86400) : 0,
      userKey ? this.getSum(`${userKey}:credits_spent`, 300) : 0,
      userKey ? this.getSum(`${userKey}:credits_spent`, 3600) : 0,
      userKey ? this.getSum(`${userKey}:fiat_deposited`, 3600) : 0,
      userKey ? this.getSum(`${userKey}:fiat_deposited`, 86400) : 0,
      userKey ? this.getCount(`${userKey}:login_failed`, 900) : (ipKey ? this.getCount(`${ipKey}:login_failed`, 900) : 0),
      userKey ? this.getCount(`${userKey}:card_decline`, 3600) : (ipKey ? this.getCount(`${ipKey}:card_decline`, 3600) : 0),
      userKey ? this.getCount(`${userKey}:messages`, 60) : 0,
      ipKey ? this.getCount(`${ipKey}:signup`, 3600) : 0,
    ]);

    return {
      transactionsLast1m: tx1m,
      transactionsLast1h: tx1h,
      transactionsLast24h: tx24h,
      creditsSpentLast5m: spent5m,
      creditsSpentLast1h: spent1h,
      fiatDepositedLast1h: deposit1h,
      fiatDepositedLast24h: deposit24h,
      failedLoginsLast15m: failedLogins,
      cardDeclinesLast1h: cardDeclines,
      messagesLast1m: messages1m,
      accountCreationsFromIpLast1h: ipSignups,
    };
  }

  /**
   * Helper recording helper functions for easy integration across the platform.
   */
  static async recordSpend(userId: string, credits: number): Promise<void> {
    await Promise.all([
      this.recordEvent(`user:${userId}:tx`, 1),
      this.recordEvent(`user:${userId}:credits_spent`, credits),
    ]);
  }

  static async recordDeposit(userId: string, fiatCents: number): Promise<void> {
    await Promise.all([
      this.recordEvent(`user:${userId}:tx`, 1),
      this.recordEvent(`user:${userId}:fiat_deposited`, fiatCents / 100),
      this.recordLatestDeposit(userId),
    ]);
  }

  static async recordFailedLogin(identifier: string): Promise<void> {
    await this.recordEvent(`user:${identifier}:login_failed`, 1);
  }

  static async recordCardDecline(userIdOrIp: string): Promise<void> {
    await this.recordEvent(`user:${userIdOrIp}:card_decline`, 1);
  }

  static async recordMessageSent(userId: string): Promise<void> {
    await this.recordEvent(`user:${userId}:messages`, 1);
  }

  static async recordAccountCreation(ip: string): Promise<void> {
    const ipKey = ip.replace(/[:.]/g, "_");
    await this.recordEvent(`ip:${ipKey}:signup`, 1);
  }
}
