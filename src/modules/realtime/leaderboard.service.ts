import prisma from "@/lib/db";
import redis from "@/lib/redis";
import { LeaderboardEntry, LeaderboardUpdatedPayload } from "./types";
import { eventBus } from "./event-bus";

export type LeaderboardTimeframeOption =
  | "stream"
  | "daily"
  | "weekly"
  | "monthly"
  | "all_time";

export interface RecordContributionParams {
  creatorId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  badge?: string | null;
  credits: number;
  livestreamId?: string;
}

export interface UserRankPosition {
  rank: number | null;
  totalCredits: number;
  isTopThree: boolean;
  creditsToNextRank: number | null;
  creditsToFirst: number | null;
}

/**
 * Production-Grade Real-Time Leaderboard Service
 *
 * Architecture:
 * - Redis Sorted Sets (ZSET) provide O(log N) aggregate counter increments and O(M) top-N rank retrieval.
 * - Zero expensive SQL aggregate scans on live tipping traffic.
 * - Cached user metadata hashes avoid relational joins on hot read paths.
 * - PostgreSQL Ledger and LeaderboardRecord serve as the authoritative durable system of record.
 * - Automatic cold-cache hydration from PostgreSQL & periodic snapshot write-back.
 */
export class LeaderboardService {
  // TTL for stream-scoped temporary leaderboards (24 hours)
  private static STREAM_ZSET_TTL = 86400;

  // In-memory fallback if Redis is temporarily unreachable
  private static memoryStore: Map<string, Map<string, number>> = new Map();
  private static memoryUserProfiles: Map<
    string,
    { username: string; displayName: string; avatarUrl?: string | null; badge?: string | null }
  > = new Map();

  // Helper to format Redis ZSET keys
  public static getZSetKey(creatorId: string, timeframe: LeaderboardTimeframeOption = "stream"): string {
    const now = new Date();
    switch (timeframe) {
      case "daily": {
        const dateKey = now.toISOString().slice(0, 10); // YYYY-MM-DD
        return `room:leaderboard:${creatorId}:daily:${dateKey}`;
      }
      case "weekly": {
        // ISO week string YYYY-Www
        const year = now.getFullYear();
        const firstDayOfYear = new Date(year, 0, 1);
        const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        return `room:leaderboard:${creatorId}:weekly:${year}-W${weekNum}`;
      }
      case "monthly": {
        const monthKey = now.toISOString().slice(0, 7); // YYYY-MM
        return `room:leaderboard:${creatorId}:monthly:${monthKey}`;
      }
      case "all_time":
        return `room:leaderboard:${creatorId}:all_time`;
      case "stream":
      default:
        return `room:leaderboard:${creatorId}:stream`;
    }
  }

  private static getUserProfileKey(userId: string): string {
    return `user:profile:${userId}`;
  }

  /**
   * Record a contribution (tip/gift/interaction) and update real-time rankings.
   * Executes in sub-millisecond time via Redis ZINCRBY without hitting SQL.
   */
  public static async recordContribution(
    params: RecordContributionParams
  ): Promise<LeaderboardEntry[]> {
    const { creatorId, userId, username, displayName, avatarUrl, badge, credits } = params;

    if (credits <= 0) return this.getTopContributors(creatorId, 10);

    const streamKey = this.getZSetKey(creatorId, "stream");
    const allTimeKey = this.getZSetKey(creatorId, "all_time");
    const profileKey = this.getUserProfileKey(userId);

    let topList: LeaderboardEntry[] = [];

    try {
      // 1. Pipeline Redis commands: ZINCRBY (stream + all_time) + HSET user profile + TTL
      const pipeline = redis.pipeline();

      pipeline.zincrby(streamKey, credits, userId);
      pipeline.expire(streamKey, this.STREAM_ZSET_TTL);

      pipeline.zincrby(allTimeKey, credits, userId);

      // Cache user profile metadata in Redis Hash
      pipeline.hset(profileKey, {
        userId,
        username,
        displayName,
        avatarUrl: avatarUrl || "",
        badge: badge || "",
        updatedAt: Date.now().toString(),
      });
      pipeline.expire(profileKey, 604800); // 7 days TTL

      // Fetch Top 10 with scores in the same round-trip
      pipeline.zrevrange(streamKey, 0, 9, "WITHSCORES");

      const results = await pipeline.exec();
      const zrevrangeResult = results?.[4]?.[1] as string[] | undefined;

      if (Array.isArray(zrevrangeResult) && zrevrangeResult.length > 0) {
        topList = await this.formatZSetEntries(zrevrangeResult);
      } else {
        topList = await this.getTopContributors(creatorId, 10, "stream");
      }
    } catch (redisError) {
      console.warn("[LeaderboardService] Redis unavailable, using memory fallback:", redisError);
      topList = this.recordInMemory(creatorId, params);
    }

    // 2. Broadcast authoritative LEADERBOARD_UPDATED event to live room viewers
    const payload: LeaderboardUpdatedPayload = {
      creatorId,
      topContributors: topList,
      totalRoomContributors: topList.length,
      updatedAt: new Date().toISOString(),
    };

    eventBus.publish(`room:${creatorId}`, {
      type: "LEADERBOARD_UPDATED",
      payload,
    });

    return topList;
  }

  /**
   * Get top N contributors formatted with ranks, names, and aggregated scores.
   * Resolves in microseconds from Redis ZSET.
   */
  public static async getTopContributors(
    creatorId: string,
    limit = 10,
    timeframe: LeaderboardTimeframeOption = "stream"
  ): Promise<LeaderboardEntry[]> {
    const key = this.getZSetKey(creatorId, timeframe);

    try {
      // ZREVRANGE key 0 (limit - 1) WITHSCORES returns [userId1, score1, userId2, score2, ...]
      const rawEntries = await redis.zrevrange(key, 0, limit - 1, "WITHSCORES");

      if (!rawEntries || rawEntries.length === 0) {
        // Cold cache hydration from Postgres
        return await this.hydrateFromPostgres(creatorId, timeframe, limit);
      }

      return await this.formatZSetEntries(rawEntries);
    } catch (redisError) {
      console.warn("[LeaderboardService] Redis read failed, falling back to memory/DB:", redisError);
      return this.getTopContributorsFromMemory(creatorId, limit);
    }
  }

  /**
   * Get an individual user's current rank, total contributed score,
   * and distance needed to surpass the next position.
   */
  public static async getUserRankPosition(
    creatorId: string,
    userId: string,
    timeframe: LeaderboardTimeframeOption = "stream"
  ): Promise<UserRankPosition> {
    const key = this.getZSetKey(creatorId, timeframe);

    try {
      const pipeline = redis.pipeline();
      pipeline.zrevrank(key, userId); // 0-indexed rank
      pipeline.zscore(key, userId);    // Current score
      pipeline.zrevrange(key, 0, 2, "WITHSCORES"); // Top 3 to calculate gap

      const results = await pipeline.exec();
      const rawRank = results?.[0]?.[1] as number | null;
      const rawScore = results?.[1]?.[1] as string | null;
      const topThreeRaw = (results?.[2]?.[1] as string[]) || [];

      if (rawRank === null || rawScore === null) {
        return {
          rank: null,
          totalCredits: 0,
          isTopThree: false,
          creditsToNextRank: null,
          creditsToFirst: null,
        };
      }

      const rank = rawRank + 1; // 1-indexed rank
      const totalCredits = parseFloat(rawScore) || 0;
      const firstScore = topThreeRaw.length >= 2 ? parseFloat(topThreeRaw[1]) : totalCredits;

      let creditsToNextRank: number | null = null;
      if (rank > 1) {
        // Fetch the user ahead
        const userAhead = await redis.zrevrange(key, rank - 2, rank - 2, "WITHSCORES");
        if (userAhead && userAhead.length >= 2) {
          const aheadScore = parseFloat(userAhead[1]);
          creditsToNextRank = Math.max(1, aheadScore - totalCredits + 1);
        }
      }

      const creditsToFirst = rank > 1 ? Math.max(1, firstScore - totalCredits + 1) : 0;

      return {
        rank,
        totalCredits,
        isTopThree: rank <= 3,
        creditsToNextRank,
        creditsToFirst,
      };
    } catch (err) {
      console.error("[LeaderboardService] Failed to get user rank position:", err);
      return {
        rank: null,
        totalCredits: 0,
        isTopThree: false,
        creditsToNextRank: null,
        creditsToFirst: null,
      };
    }
  }

  /**
   * Parse Redis [userId, score, userId2, score2] array into fully hydrated LeaderboardEntry items.
   */
  private static async formatZSetEntries(rawEntries: string[]): Promise<LeaderboardEntry[]> {
    const userIds: string[] = [];
    const scores: number[] = [];

    for (let i = 0; i < rawEntries.length; i += 2) {
      userIds.push(rawEntries[i]);
      scores.push(parseFloat(rawEntries[i + 1]) || 0);
    }

    if (userIds.length === 0) return [];

    // Pipeline batch fetch user profile hashes from Redis
    const pipeline = redis.pipeline();
    for (const id of userIds) {
      pipeline.hgetall(this.getUserProfileKey(id));
    }
    const profileResults = await pipeline.exec();

    // Collect missing profiles that need database lookup
    const missingUserIds: string[] = [];
    const parsedProfiles: Map<string, { displayName: string; username: string; avatarUrl?: string | null; badge?: string | null }> = new Map();

    profileResults?.forEach((res, index) => {
      const uId = userIds[index];
      const data = res?.[1] as Record<string, string> | undefined;

      if (data && data.displayName) {
        parsedProfiles.set(uId, {
          displayName: data.displayName,
          username: data.username || data.displayName.toLowerCase().replace(/\s+/g, ""),
          avatarUrl: data.avatarUrl || null,
          badge: data.badge || null,
        });
      } else {
        missingUserIds.push(uId);
      }
    });

    // Database lookup for any profiles missing from Redis cache
    if (missingUserIds.length > 0) {
      try {
        const dbUsers = await prisma.user.findMany({
          where: { id: { in: missingUserIds } },
          select: { id: true, displayName: true, username: true, avatarUrl: true },
        });

        const cachePipeline = redis.pipeline();
        for (const u of dbUsers) {
          parsedProfiles.set(u.id, {
            displayName: u.displayName,
            username: u.username,
            avatarUrl: u.avatarUrl,
            badge: null,
          });

          cachePipeline.hset(this.getUserProfileKey(u.id), {
            userId: u.id,
            displayName: u.displayName,
            username: u.username,
            avatarUrl: u.avatarUrl || "",
            badge: "",
          });
          cachePipeline.expire(this.getUserProfileKey(u.id), 604800);
        }
        await cachePipeline.exec();
      } catch (dbErr) {
        console.error("[LeaderboardService] Error fetching missing profiles from DB:", dbErr);
      }
    }

    // Build the final response list
    return userIds.map((uId, index) => {
      const profile = parsedProfiles.get(uId) || {
        displayName: `Supporter #${uId.substring(0, 4)}`,
        username: `user_${uId.substring(0, 6)}`,
        avatarUrl: null,
        badge: null,
      };

      const rank = index + 1;
      const totalCredits = scores[index];

      return {
        rank,
        userId: uId,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        totalCredits,
        badge:
          profile.badge ||
          (rank === 1
            ? "🥇 Top Tipper"
            : rank === 2
            ? "🥈 Top Supporter"
            : rank === 3
            ? "🥉 VIP Supporter"
            : null),
        isTopTipper: rank === 1,
      };
    });
  }

  /**
   * Cold-start cache hydration:
   * Aggregates completed tip ledger entries from PostgreSQL into Redis ZSET with a single query.
   */
  public static async hydrateFromPostgres(
    creatorId: string,
    timeframe: LeaderboardTimeframeOption = "stream",
    limit = 10
  ): Promise<LeaderboardEntry[]> {
    try {
      const creator = await prisma.creatorProfile.findUnique({
        where: { id: creatorId },
        include: { user: { include: { wallet: true } } },
      });

      if (!creator?.user?.wallet) return [];

      // Query aggregated sums per source wallet from the immutable ledger
      const aggregatedTips = await prisma.ledgerEntry.groupBy({
        by: ["sourceWalletId"],
        where: {
          destinationWalletId: creator.user.wallet.id,
          transactionType: "LIVE_TIP",
          status: "COMPLETED",
        },
        _sum: {
          amount: true,
        },
        orderBy: {
          _sum: {
            amount: "desc",
          },
        },
        take: 50,
      });

      if (aggregatedTips.length === 0) return [];

      // Fetch the corresponding user IDs
      const walletIds = aggregatedTips.map((t) => t.sourceWalletId);
      const wallets = await prisma.wallet.findMany({
        where: { id: { in: walletIds } },
        include: { user: true },
      });

      const walletUserMap = new Map(wallets.map((w) => [w.id, w.user]));

      const key = this.getZSetKey(creatorId, timeframe);
      const pipeline = redis.pipeline();

      const entriesToReturn: LeaderboardEntry[] = [];

      aggregatedTips.forEach((item, index) => {
        const user = walletUserMap.get(item.sourceWalletId);
        if (!user) return;

        const totalCredits = item._sum.amount || 0;
        const rank = index + 1;

        // Populate Redis Sorted Set
        pipeline.zadd(key, totalCredits, user.id);

        // Populate User Cache Hash
        pipeline.hset(this.getUserProfileKey(user.id), {
          userId: user.id,
          displayName: user.displayName,
          username: user.username,
          avatarUrl: user.avatarUrl || "",
        });

        if (index < limit) {
          entriesToReturn.push({
            rank,
            userId: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            totalCredits,
            badge:
              rank === 1
                ? "🥇 Top Tipper"
                : rank === 2
                ? "🥈 Top Supporter"
                : rank === 3
                ? "🥉 VIP Supporter"
                : null,
            isTopTipper: rank === 1,
          });
        }
      });

      pipeline.expire(key, this.STREAM_ZSET_TTL);
      await pipeline.exec();

      return entriesToReturn;
    } catch (err) {
      console.error(`[LeaderboardService] Failed to hydrate leaderboard for ${creatorId}:`, err);
      return [];
    }
  }

  /**
   * Persist Redis rankings to PostgreSQL LeaderboardRecord table for durable auditing & historical records.
   * Call this when a live stream session ends or during a periodic cron job.
   */
  public static async flushSnapshotToPostgres(params: {
    creatorId: string;
    livestreamId?: string;
    timeframe?: LeaderboardTimeframeOption;
  }): Promise<number> {
    const { creatorId, livestreamId, timeframe = "stream" } = params;
    const key = this.getZSetKey(creatorId, timeframe);

    try {
      const rawEntries = await redis.zrevrange(key, 0, 99, "WITHSCORES");
      if (!rawEntries || rawEntries.length === 0) return 0;

      const dateKey = new Date().toISOString().slice(0, 10);
      let recordsPersisted = 0;

      for (let i = 0; i < rawEntries.length; i += 2) {
        const userId = rawEntries[i];
        const credits = parseFloat(rawEntries[i + 1]) || 0;
        const rank = Math.floor(i / 2) + 1;

        await prisma.leaderboardRecord.upsert({
          where: {
            scope_timeframe_periodKey_creatorProfileId_livestreamId_userId: {
              scope: livestreamId ? "LIVESTREAM_SESSION" : "CREATOR_ROOM",
              timeframe: timeframe === "stream" ? "STREAM_SESSION" : "ALL_TIME",
              periodKey: livestreamId || dateKey,
              creatorProfileId: creatorId,
              livestreamId: livestreamId || null,
              userId,
            },
          },
          update: {
            rank,
            totalCreditsContributed: BigInt(credits),
            updatedAt: new Date(),
          },
          create: {
            scope: livestreamId ? "LIVESTREAM_SESSION" : "CREATOR_ROOM",
            timeframe: timeframe === "stream" ? "STREAM_SESSION" : "ALL_TIME",
            periodKey: livestreamId || dateKey,
            creatorProfileId: creatorId,
            livestreamId: livestreamId || null,
            userId,
            rank,
            totalCreditsContributed: BigInt(credits),
          },
        });
        recordsPersisted++;
      }

      return recordsPersisted;
    } catch (err) {
      console.error(`[LeaderboardService] Failed to flush snapshot to Postgres for ${creatorId}:`, err);
      return 0;
    }
  }

  /**
   * Reset leaderboard for new live broadcast session.
   */
  public static async resetLeaderboard(creatorId: string): Promise<void> {
    const streamKey = this.getZSetKey(creatorId, "stream");
    try {
      await redis.del(streamKey);
    } catch (e) {
      console.warn("Failed to delete Redis stream key:", e);
    }
    this.memoryStore.delete(creatorId);
  }

  // --------------------------------------------------------------------------
  // IN-MEMORY FALLBACK (For offline dev or testing when Redis daemon is not running)
  // --------------------------------------------------------------------------
  private static recordInMemory(
    creatorId: string,
    params: RecordContributionParams
  ): LeaderboardEntry[] {
    if (!this.memoryStore.has(creatorId)) {
      this.memoryStore.set(creatorId, new Map());
    }

    const board = this.memoryStore.get(creatorId)!;
    const current = board.get(params.userId) || 0;
    const updated = current + params.credits;
    board.set(params.userId, updated);

    this.memoryUserProfiles.set(params.userId, {
      username: params.username,
      displayName: params.displayName,
      avatarUrl: params.avatarUrl,
      badge: params.badge,
    });

    return this.getTopContributorsFromMemory(creatorId, 10);
  }

  private static getTopContributorsFromMemory(creatorId: string, limit = 10): LeaderboardEntry[] {
    const board = this.memoryStore.get(creatorId);
    if (!board || board.size === 0) return [];

    const sorted = Array.from(board.entries()).sort((a, b) => b[1] - a[1]);

    return sorted.slice(0, limit).map(([userId, totalCredits], index) => {
      const profile = this.memoryUserProfiles.get(userId) || {
        username: `user_${userId.substring(0, 6)}`,
        displayName: `Supporter #${userId.substring(0, 4)}`,
      };

      const rank = index + 1;
      return {
        rank,
        userId,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        totalCredits,
        badge:
          profile.badge ||
          (rank === 1
            ? "🥇 Top Tipper"
            : rank === 2
            ? "🥈 Top Supporter"
            : rank === 3
            ? "🥉 VIP Supporter"
            : null),
        isTopTipper: rank === 1,
      };
    });
  }
}
