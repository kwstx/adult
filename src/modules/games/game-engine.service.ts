// ============================================================================
// AUTHORITATIVE GAME ENGINE & RNG SERVICE
// Server-side Outcome Generation, Transparent Odds Tables & Animation Synchronization
// ============================================================================

import crypto from "crypto";
import {
  FreeGameOutcome,
  FreeGamePrizeWedge,
  FreeGameType,
} from "./types";
import { FinancialIsolationGuard } from "./guards/financial-isolation.guard";

export class GameEngineService {
  /**
   * 1. STANDARD PRIZE TABLE FOR DAILY SPIN WHEEL
   * 8 Wedges covering the full spectrum of authorized non-monetary perks.
   * Total Weight = 10,000 basis points (100.0%)
   */
  public static readonly DAILY_WHEEL_WEDGES: readonly FreeGamePrizeWedge[] = [
    {
      id: "wedge_fan_xp_100",
      label: "+100 Fan XP",
      shortLabel: "100 XP",
      description: "Boost your global platform level and reputation tier.",
      rewardType: "FAN_XP",
      colorClass: "from-blue-600 to-cyan-500",
      accentColor: "#06b6d4",
      icon: "⚡",
      weight: 2500, // 25.0%
      probabilityPercentage: 25.0,
      rewardTemplate: {
        rewardType: "FAN_XP",
        xpAmount: 100,
        reason: "Daily Free Game Reward: +100 Fan XP",
      },
    },
    {
      id: "wedge_creator_xp_50",
      label: "+50 Creator XP",
      shortLabel: "50 Creator XP",
      description: "Deepen your relationship bond with your favorite creator.",
      rewardType: "CREATOR_RELATIONSHIP_XP",
      colorClass: "from-rose-600 to-pink-500",
      accentColor: "#f43f5e",
      icon: "💖",
      weight: 2500, // 25.0%
      probabilityPercentage: 25.0,
      rewardTemplate: {
        rewardType: "CREATOR_RELATIONSHIP_XP",
        xpAmount: 50,
        reason: "Daily Free Game Reward: +50 Creator Relationship XP",
      },
    },
    {
      id: "wedge_temp_badge",
      label: "⚡ Daily Champion",
      shortLabel: "Champ Badge",
      description: "Exclusive 24-hour illuminated chat badge and glow.",
      rewardType: "TEMPORARY_BADGE",
      colorClass: "from-amber-500 to-yellow-400",
      accentColor: "#f59e0b",
      icon: "👑",
      weight: 1500, // 15.0%
      probabilityPercentage: 15.0,
      rewardTemplate: {
        rewardType: "TEMPORARY_BADGE",
        badgeCode: "DAILY_CHAMPION",
        badgeName: "⚡ Daily Champion",
        badgeIcon: "👑",
        durationHours: 24,
        glowColor: "#f59e0b",
        description: "24-Hour VIP Chat Badge for active daily game winners.",
      },
    },
    {
      id: "wedge_front_row",
      label: "🔥 Front-Row Seat",
      shortLabel: "Front Row",
      description: "Guaranteed front-row bleacher seat entitlement for upcoming livestreams.",
      rewardType: "FRONT_ROW_SEAT",
      colorClass: "from-orange-500 to-amber-600",
      accentColor: "#f97316",
      icon: "🔥",
      weight: 1200, // 12.0%
      probabilityPercentage: 12.0,
      rewardTemplate: {
        rewardType: "FRONT_ROW_SEAT",
        seatTier: "FRONT_ROW",
        validLivestreamsCount: 1,
        priorityScore: 40,
        durationHours: 48,
        description: "Front-Row Livestream Seat Pass valid for 48 hours.",
      },
    },
    {
      id: "wedge_priority_interaction",
      label: "🚀 Priority Queue Pass",
      shortLabel: "Priority Pass",
      description: "Jump the queue on your next creator interaction request.",
      rewardType: "PRIORITY_INTERACTION",
      colorClass: "from-purple-600 to-indigo-500",
      accentColor: "#a855f7",
      icon: "🚀",
      weight: 1000, // 10.0%
      probabilityPercentage: 10.0,
      rewardTemplate: {
        rewardType: "PRIORITY_INTERACTION",
        voucherCode: "PRIORITY_Q_PASS",
        queuePriorityMultiplier: 2.0,
        expiresInDays: 7,
        description: "Priority queue placement voucher valid for 7 days.",
      },
    },
    {
      id: "wedge_content_unlock",
      label: "🎁 Bonus Content Unlock",
      shortLabel: "Content Unlock",
      description: "Instant complimentary unlock of featured creator showcase media.",
      rewardType: "CONTENT_UNLOCK",
      colorClass: "from-emerald-500 to-teal-400",
      accentColor: "#10b981",
      icon: "🎁",
      weight: 500, // 5.0%
      probabilityPercentage: 5.0,
      rewardTemplate: {
        rewardType: "CONTENT_UNLOCK",
        contentId: "promo_daily_gift_pack",
        contentTitle: "Exclusive Daily Vault Showcase Clip",
        contentType: "VIDEO",
        description: "Complimentary promotional content unlock.",
      },
    },
    {
      id: "wedge_fan_xp_super",
      label: "+250 Fan XP Boost",
      shortLabel: "250 XP Boost",
      description: "Massive XP boost for rapid tier elevation.",
      rewardType: "FAN_XP",
      colorClass: "from-cyan-400 to-blue-700",
      accentColor: "#0ea5e9",
      icon: "🌟",
      weight: 500, // 5.0%
      probabilityPercentage: 5.0,
      rewardTemplate: {
        rewardType: "FAN_XP",
        xpAmount: 250,
        reason: "Daily Free Game Jackpot: +250 Fan XP Boost",
      },
    },
    {
      id: "wedge_creator_xp_super",
      label: "+150 Creator XP",
      shortLabel: "150 Creator XP",
      description: "Supercharged loyalty boost with your chosen creator.",
      rewardType: "CREATOR_RELATIONSHIP_XP",
      colorClass: "from-fuchsia-600 to-rose-600",
      accentColor: "#d946ef",
      icon: "💎",
      weight: 300, // 3.0%
      probabilityPercentage: 3.0,
      rewardTemplate: {
        rewardType: "CREATOR_RELATIONSHIP_XP",
        xpAmount: 150,
        reason: "Daily Free Game Jackpot: +150 Creator Relationship XP",
      },
    },
  ];

  /**
   * Retrieves the authoritative prize table for a given game type.
   */
  public static getPrizeTable(gameType: FreeGameType): readonly FreeGamePrizeWedge[] {
    switch (gameType) {
      case "DAILY_SPIN_WHEEL":
      case "DAILY_MYSTERY_BOX":
      case "LUCKY_CYBER_DROP":
      default:
        return this.DAILY_WHEEL_WEDGES;
    }
  }

  /**
   * 2. SERVER-AUTHORITATIVE OUTCOME GENERATION (CRYPTOGRAPHIC RNG)
   * The server independently chooses the winning index using cryptographically secure randomness.
   * Client-supplied outcomes or desired prizes are ignored.
   */
  public static generateOutcome(params: {
    userId: string;
    gameType: FreeGameType;
    creatorProfileId?: string;
    creatorStageName?: string;
  }): FreeGameOutcome {
    const { userId, gameType, creatorProfileId, creatorStageName } = params;
    const wedges = this.getPrizeTable(gameType);
    const totalWeight = wedges.reduce((acc, w) => acc + w.weight, 0);

    // Cryptographically secure random integer between 0 and totalWeight - 1
    const randomBasisPoint = crypto.randomInt(0, totalWeight);

    let cumulativeWeight = 0;
    let winningIndex = 0;

    for (let i = 0; i < wedges.length; i++) {
      cumulativeWeight += wedges[i].weight;
      if (randomBasisPoint < cumulativeWeight) {
        winningIndex = i;
        break;
      }
    }

    const winningWedge = wedges[winningIndex];
    const rawReward = JSON.parse(JSON.stringify(winningWedge.rewardTemplate));

    // Hydrate dynamic creator info if applicable
    if (rawReward.rewardType === "CREATOR_RELATIONSHIP_XP") {
      if (creatorProfileId) {
        rawReward.creatorProfileId = creatorProfileId;
      }
      if (creatorStageName) {
        rawReward.creatorStageName = creatorStageName;
      }
    }

    // Pass through Financial Isolation Guard: assert strict non-monetary purity
    FinancialIsolationGuard.validateRewardPurity(rawReward);

    // Compute animation synchronization parameters
    // Wedge angle in an 8-wedge wheel = 360 / 8 = 45 degrees
    const wedgeAngleDegrees = 360 / wedges.length;
    // Calculate center angle of the winning slice with a slight random jitter within the wedge (-15 to +15 deg)
    const jitter = (crypto.randomInt(0, 20) - 10);
    const targetSliceCenter = winningIndex * wedgeAngleDegrees + wedgeAngleDegrees / 2 + jitter;

    // Total spins before stopping (e.g. 5 to 7 full rotations)
    const totalSpins = crypto.randomInt(5, 8);
    const targetAngleDegrees = totalSpins * 360 + (360 - targetSliceCenter);

    const sessionId = `game_sess_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    const serverTimestamp = new Date().toISOString();

    const signaturePayload = `${sessionId}:${userId}:${gameType}:${winningIndex}:${serverTimestamp}`;
    const cryptographicSignature = crypto
      .createHash("sha256")
      .update(signaturePayload)
      .digest("hex");

    return {
      sessionId,
      gameType,
      userId,
      winningWedgeIndex: winningIndex,
      winningWedge,
      reward: rawReward,
      animationSeed: {
        targetAngleDegrees,
        totalSpins,
        spinDurationMs: 4500, // 4.5s smooth deceleration
        easing: "cubic-bezier(0.15, 0.9, 0.2, 1.0)",
      },
      serverTimestamp,
      cryptographicSignature,
    };
  }
}
