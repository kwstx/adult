// ============================================================================
// AUTHORITATIVE GAME ENGINE & RNG SERVICE
// Server-side Outcome Generation, Transparent Odds Tables & Animation Synchronization
// ============================================================================

import crypto from "crypto";
import {
  FreeGameOutcome,
  FreeGamePrizeWedge,
  FreeGameType,
  DAILY_WHEEL_WEDGES,
} from "./types";
import { FinancialIsolationGuard } from "./guards/financial-isolation.guard";

export class GameEngineService {
  /**
   * 1. STANDARD PRIZE TABLE FOR DAILY SPIN WHEEL
   * 8 Wedges covering the full spectrum of authorized non-monetary perks.
   * Total Weight = 10,000 basis points (100.0%)
   */
  public static readonly DAILY_WHEEL_WEDGES = DAILY_WHEEL_WEDGES;

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
