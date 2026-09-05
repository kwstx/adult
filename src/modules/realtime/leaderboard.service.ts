import prisma from "@/lib/db";
import { LeaderboardEntry, LeaderboardUpdatedPayload } from "./types";
import { eventBus } from "./event-bus";

/**
 * Live Room Leaderboard Service
 * Maintains high-performance real-time contributor rankings for live streams.
 * In a multi-server setup, this can seamlessly bind to Redis Sorted Sets (ZADD, ZREVRANGE).
 */
export class LeaderboardService {
  // In-memory cache for ultra-fast read/write in single-instance or worker node
  // creatorId -> Map<userId, { totalCredits, displayName, username, avatarUrl, badge }>
  private static roomLeaderboards: Map<
    string,
    Map<
      string,
      {
        userId: string;
        username: string;
        displayName: string;
        avatarUrl?: string | null;
        totalCredits: number;
        badge?: string | null;
      }
    >
  > = new Map();

  /**
   * Record a contribution and calculate updated top contributors.
   */
  public static async recordContribution(params: {
    creatorId: string;
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    badge?: string | null;
    credits: number;
  }): Promise<LeaderboardEntry[]> {
    const { creatorId, userId, username, displayName, avatarUrl, badge, credits } = params;

    if (!this.roomLeaderboards.has(creatorId)) {
      this.roomLeaderboards.set(creatorId, new Map());
      // Seed from recent ledger transactions if cold cache
      await this.hydrateFromLedger(creatorId);
    }

    const board = this.roomLeaderboards.get(creatorId)!;
    const existing = board.get(userId);

    const updatedTotal = (existing?.totalCredits || 0) + credits;
    board.set(userId, {
      userId,
      username,
      displayName,
      avatarUrl: avatarUrl ?? existing?.avatarUrl,
      badge: badge ?? existing?.badge,
      totalCredits: updatedTotal,
    });

    const topList = this.getTopContributors(creatorId, 10);

    // Broadcast LEADERBOARD_UPDATED event
    const payload: LeaderboardUpdatedPayload = {
      creatorId,
      topContributors: topList,
      totalRoomContributors: board.size,
      updatedAt: new Date().toISOString(),
    };

    eventBus.publish(`room:${creatorId}`, {
      type: "LEADERBOARD_UPDATED",
      payload,
    });

    return topList;
  }

  /**
   * Get top N contributors formatted with ranks.
   */
  public static getTopContributors(creatorId: string, limit = 10): LeaderboardEntry[] {
    const board = this.roomLeaderboards.get(creatorId);
    if (!board || board.size === 0) return [];

    const sorted = Array.from(board.values()).sort(
      (a, b) => b.totalCredits - a.totalCredits
    );

    return sorted.slice(0, limit).map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      username: entry.username,
      displayName: entry.displayName,
      avatarUrl: entry.avatarUrl,
      totalCredits: entry.totalCredits,
      badge:
        entry.badge ||
        (index === 0
          ? "🥇 Top Tipper"
          : index === 1
          ? "🥈 Top Supporter"
          : index === 2
          ? "🥉 VIP Supporter"
          : null),
      isTopTipper: index === 0,
    }));
  }

  /**
   * Hydrate in-memory standings from database transactions for cold-start rooms.
   */
  private static async hydrateFromLedger(creatorId: string): Promise<void> {
    try {
      const creator = await prisma.creatorProfile.findUnique({
        where: { id: creatorId },
        include: { user: { include: { wallet: true } } },
      });

      if (!creator?.user?.wallet) return;

      const recentTips = await prisma.ledgerEntry.findMany({
        where: {
          destinationWalletId: creator.user.wallet.id,
          transactionType: "LIVE_TIP",
          status: "COMPLETED",
        },
        include: {
          sourceWallet: {
            include: { user: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      const board = this.roomLeaderboards.get(creatorId)!;

      for (const entry of recentTips) {
        const user = entry.sourceWallet?.user;
        if (!user) continue;

        const current = board.get(user.id);
        const currentTotal = (current?.totalCredits || 0) + entry.amount;

        board.set(user.id, {
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          totalCredits: currentTotal,
          badge: currentTotal >= 500 ? "TOP_TIPPER" : "VIP",
        });
      }
    } catch (err) {
      console.error(`Failed to hydrate leaderboard for creator ${creatorId}:`, err);
    }
  }

  /**
   * Reset leaderboard for new live broadcast session.
   */
  public static resetLeaderboard(creatorId: string): void {
    this.roomLeaderboards.delete(creatorId);
  }
}
