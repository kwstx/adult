// ============================================================================
// AUTHORITATIVE DAILY GAME SERVICE
// Coordinates Daily Cooldowns, Streaks, Server RNG, Isolation Guards & Realtime Events
// ============================================================================

import { prisma } from "@/lib/db";
import {
  DailyGameStatus,
  FreeGameOutcome,
  FreeGameType,
  RewardFulfillmentResult,
} from "./types";
import { GameEngineService } from "./game-engine.service";
import { FinancialIsolationGuard } from "./guards/financial-isolation.guard";
import { RewardFulfillmentService } from "./reward-fulfillment.service";
import { eventBus } from "../realtime/event-bus";

interface UserDailyRecord {
  userId: string;
  lastPlayedAt: Date;
  streakDays: number;
  longestStreakDays: number;
}

export interface PlayDailyGameResult {
  isSuccess: boolean;
  outcome: FreeGameOutcome;
  fulfillment: RewardFulfillmentResult;
  statusAfter: DailyGameStatus;
}

export class DailyGameService {
  private static userDailyRecords: Map<string, UserDailyRecord> = new Map();
  private static sessionHistoryStore: Map<string, FreeGameOutcome[]> = new Map();

  // Cooldown duration: 24 hours (86,400,000 ms)
  private static readonly DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

  /**
   * 1. GET USER DAILY STATUS & ODDS
   * Authoritative server check on whether the user is eligible for their free daily game.
   */
  public static async getUserDailyStatus(
    userId: string,
    gameType: FreeGameType = "DAILY_SPIN_WHEEL"
  ): Promise<DailyGameStatus> {
    const record = this.userDailyRecords.get(userId);
    const now = Date.now();

    let canPlay = true;
    let cooldownRemainingSeconds = 0;
    let nextAvailableAt: string | null = null;
    let currentStreakDays = record ? record.streakDays : 0;
    let longestStreakDays = record ? record.longestStreakDays : 0;
    const lastPlayedAt = record ? record.lastPlayedAt.toISOString() : null;

    if (record) {
      const elapsedMs = now - record.lastPlayedAt.getTime();
      if (elapsedMs < this.DAILY_COOLDOWN_MS) {
        canPlay = false;
        cooldownRemainingSeconds = Math.ceil((this.DAILY_COOLDOWN_MS - elapsedMs) / 1000);
        nextAvailableAt = new Date(record.lastPlayedAt.getTime() + this.DAILY_COOLDOWN_MS).toISOString();
      }
    }

    const availablePrizes = [...GameEngineService.getPrizeTable(gameType)];
    const complianceDisclaimer = FinancialIsolationGuard.getComplianceNotice();

    // Calculate streak bonus multiplier: 1.0x at 0 days up to 1.5x at 7+ days
    const streakBonusMultiplier = Math.min(1.5, 1.0 + currentStreakDays * 0.05);

    return {
      userId,
      canPlay,
      cooldownRemainingSeconds,
      nextAvailableAt,
      currentStreakDays,
      longestStreakDays,
      streakBonusMultiplier: Number(streakBonusMultiplier.toFixed(2)),
      lastPlayedAt,
      availablePrizes,
      complianceDisclaimer,
    };
  }

  /**
   * 2. AUTHORITATIVELY PLAY DAILY GAME (SERVER-SIDE RNG & REWARD GRANT)
   */
  public static async playDailyGame(params: {
    userId: string;
    gameType?: FreeGameType;
    creatorProfileId?: string;
    creatorStageName?: string;
    bypassCooldownForTest?: boolean;
  }): Promise<PlayDailyGameResult> {
    const {
      userId,
      gameType = "DAILY_SPIN_WHEEL",
      creatorProfileId,
      creatorStageName,
      bypassCooldownForTest = false,
    } = params;

    // A. Eligibility Check
    const currentStatus = await this.getUserDailyStatus(userId, gameType);
    if (!currentStatus.canPlay && !bypassCooldownForTest) {
      throw new Error(
        `Daily Game is currently on cooldown. Next available in ${Math.ceil(
          currentStatus.cooldownRemainingSeconds / 60
        )} minutes.`
      );
    }

    // B. Calculate streak progression
    const now = new Date();
    let newStreak = 1;
    let longestStreak = 1;

    const previousRecord = this.userDailyRecords.get(userId);
    if (previousRecord) {
      const hoursSinceLastPlay =
        (now.getTime() - previousRecord.lastPlayedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastPlay >= 20 && hoursSinceLastPlay <= 48) {
        // Consecutive daily play
        newStreak = previousRecord.streakDays + 1;
      } else if (hoursSinceLastPlay > 48) {
        // Streak broken
        newStreak = 1;
      } else {
        newStreak = previousRecord.streakDays;
      }
      longestStreak = Math.max(newStreak, previousRecord.longestStreakDays);
    }

    // Update daily play record
    this.userDailyRecords.set(userId, {
      userId,
      lastPlayedAt: now,
      streakDays: newStreak,
      longestStreakDays: longestStreak,
    });

    // C. Server generates authoritative outcome
    const outcome = GameEngineService.generateOutcome({
      userId,
      gameType,
      creatorProfileId,
      creatorStageName,
    });

    // D. Fulfill the non-monetary reward atomically
    const fulfillment = await RewardFulfillmentService.fulfillReward({
      userId,
      reward: outcome.reward,
      creatorProfileId,
    });

    // E. Record session history
    const userHistory = this.sessionHistoryStore.get(userId) || [];
    userHistory.unshift(outcome);
    this.sessionHistoryStore.set(userId, userHistory.slice(0, 50));

    // Optional Prisma session recording if DB is active
    try {
      if (creatorProfileId) {
        await prisma.gameSession.create({
          data: {
            creatorProfileId,
            gameType: "SPIN_THE_WHEEL" as any,
            title: `Daily Free Spin (${outcome.winningWedge.label})`,
            status: "COMPLETED" as any,
            entryCostCredits: 0,
            totalPrizePoolCredits: 0,
            winningUserId: userId,
            gameStateJson: JSON.stringify(outcome),
            endedAt: new Date(),
          },
        }).catch(() => null);
      }
    } catch {
      // Graceful fallback for mock/standalone modes
    }

    // F. Emit authoritative real-time event for UI and stream celebrations
    try {
      eventBus.publish({
        type: "XP_AWARDED",
        channel: `user:${userId}`,
        timestamp: Date.now(),
        actor: {
          userId,
          displayName: "Fan",
          role: "FAN",
        },
        payload: {
          source: "DAILY_FREE_GAME",
          gameType,
          outcome,
          fulfillment,
        },
        metadata: {
          source: "daily_game_service",
          version: "1.0.0",
        },
      });
    } catch {
      // Ignore bus errors in isolated tests
    }

    // G. Compute status after play
    const statusAfter: DailyGameStatus = {
      userId,
      canPlay: false,
      cooldownRemainingSeconds: 24 * 3600,
      nextAvailableAt: new Date(now.getTime() + this.DAILY_COOLDOWN_MS).toISOString(),
      currentStreakDays: newStreak,
      longestStreakDays: longestStreak,
      streakBonusMultiplier: Number(Math.min(1.5, 1.0 + newStreak * 0.05).toFixed(2)),
      lastPlayedAt: now.toISOString(),
      availablePrizes: [...GameEngineService.getPrizeTable(gameType)],
      complianceDisclaimer: FinancialIsolationGuard.getComplianceNotice(),
    };

    return {
      isSuccess: true,
      outcome,
      fulfillment,
      statusAfter,
    };
  }

  /**
   * 3. GET SESSION HISTORY FOR USER
   */
  public static getSessionHistory(userId: string): FreeGameOutcome[] {
    return this.sessionHistoryStore.get(userId) || [];
  }

  /**
   * Reset helper for automated testing
   */
  public static resetForTesting(): void {
    this.userDailyRecords.clear();
    this.sessionHistoryStore.clear();
  }
}
