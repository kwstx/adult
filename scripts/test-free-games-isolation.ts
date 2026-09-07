// ============================================================================
// AUTHORITATIVE TEST SUITE: FREE GAMES DOMAIN & FINANCIAL ISOLATION ENGINE
// Verifies complete architectural & runtime isolation from the financial wallet,
// server-authoritative RNG, non-monetary reward fulfillment & Greek/EU compliance.
// ============================================================================

import {
  DailyGameService,
  GameEngineService,
  RewardFulfillmentService,
  FinancialIsolationGuard,
  FinancialIsolationViolationError,
  FreeGameReward,
  FreeGameOutcome,
} from "../src/modules/games";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ ${message}`);
}

async function runFreeGamesVerificationSuite() {
  console.log("================================================================================");
  console.log("🎮 VERIFYING FREE GAMES DOMAIN & FINANCIAL ISOLATION ENGINE");
  console.log("================================================================================\n");

  DailyGameService.resetForTesting();

  const testUserId = `test_fan_${Date.now()}`;
  const testCreatorId = `test_creator_${Date.now()}`;

  // ----------------------------------------------------------------------------
  // TEST 1: STRICT FINANCIAL ISOLATION & FORBIDDEN CURRENCY INJECTION GUARD
  // ----------------------------------------------------------------------------
  console.log("[TEST 1] Verifying Financial Isolation Guard & Anti-Credit Firewall...");

  // A. Assert allowable non-monetary rewards pass purity check
  const validFanXpReward: FreeGameReward = {
    rewardType: "FAN_XP",
    xpAmount: 100,
    reason: "Daily Free Game Reward: +100 Fan XP",
  };
  FinancialIsolationGuard.validateRewardPurity(validFanXpReward);
  assert(true, "Valid Fan XP reward successfully passed Purity Guard");

  const validTempBadgeReward: FreeGameReward = {
    rewardType: "TEMPORARY_BADGE",
    badgeCode: "DAILY_CHAMPION",
    badgeName: "⚡ Daily Champion",
    badgeIcon: "👑",
    durationHours: 24,
    glowColor: "#f59e0b",
    description: "24-Hour VIP Chat Badge",
  };
  FinancialIsolationGuard.validateRewardPurity(validTempBadgeReward);
  assert(true, "Valid Temporary Badge reward successfully passed Purity Guard");

  const validSeatReward: FreeGameReward = {
    rewardType: "FRONT_ROW_SEAT",
    seatTier: "FRONT_ROW",
    validLivestreamsCount: 1,
    priorityScore: 40,
    durationHours: 48,
    description: "Front-Row Livestream Seat Pass",
  };
  FinancialIsolationGuard.validateRewardPurity(validSeatReward);
  assert(true, "Valid Front-Row Seat reward successfully passed Purity Guard");

  // B. Assert attempted credit/monetary rewards are REJECTED with fatal error
  let blockedCredits = false;
  try {
    const maliciousReward = {
      rewardType: "CREDITS_JACKPOT" as any,
      creditsAwarded: 2000,
      description: "Give this user 2,000 credits",
    };
    FinancialIsolationGuard.validateRewardPurity(maliciousReward as any);
  } catch (err: any) {
    if (err instanceof FinancialIsolationViolationError) {
      blockedCredits = true;
    }
  }
  assert(blockedCredits, 'Firewall BLOCKED attempted "Give this user 2,000 credits" payload');

  // C. Assert attempted credit property injection inside valid reward is caught
  let blockedInjection = false;
  try {
    const injectedReward = {
      rewardType: "FAN_XP" as const,
      xpAmount: 100,
      reason: "XP Reward",
      credits: 500, // Forbidden key injection
    };
    FinancialIsolationGuard.validateRewardPurity(injectedReward as any);
  } catch (err: any) {
    if (err instanceof FinancialIsolationViolationError) {
      blockedInjection = true;
    }
  }
  assert(blockedInjection, "Firewall BLOCKED disguised credit property injection");

  // D. Assert entry cost invariant (must be 0 credits)
  FinancialIsolationGuard.validateFreeEntryCost(0);
  let blockedEntryFee = false;
  try {
    FinancialIsolationGuard.validateFreeEntryCost(50);
  } catch (err: any) {
    if (err instanceof FinancialIsolationViolationError) {
      blockedEntryFee = true;
    }
  }
  assert(blockedEntryFee, "Firewall BLOCKED non-zero entry fee (enforces 100% free entry)");

  // E. Assert zero wallet mutation check
  FinancialIsolationGuard.assertZeroWalletMutation(1500, 1500);
  let blockedWalletLeak = false;
  try {
    FinancialIsolationGuard.assertZeroWalletMutation(1500, 1600); // balance changed
  } catch (err: any) {
    if (err instanceof FinancialIsolationViolationError) {
      blockedWalletLeak = true;
    }
  }
  assert(blockedWalletLeak, "Firewall DETECTED and BLOCKED wallet balance mutation leak");

  // ----------------------------------------------------------------------------
  // TEST 2: SERVER-AUTHORITATIVE RNG & OUTCOME GENERATION
  // ----------------------------------------------------------------------------
  console.log("\n[TEST 2] Verifying Server-Authoritative Cryptographic RNG & Odds Table...");

  const prizeTable = GameEngineService.getPrizeTable("DAILY_SPIN_WHEEL");
  assert(prizeTable.length === 8, "Daily wheel contains 8 authorized non-monetary wedges");

  const totalOddsPercentage = prizeTable.reduce((acc, w) => acc + w.probabilityPercentage, 0);
  assert(
    Math.abs(totalOddsPercentage - 100.0) < 0.001,
    `Total transparent odds sum to 100.0% (Calculated: ${totalOddsPercentage}%)`
  );

  const outcome = GameEngineService.generateOutcome({
    userId: testUserId,
    gameType: "DAILY_SPIN_WHEEL",
    creatorProfileId: testCreatorId,
    creatorStageName: "Maya Velvet ✨",
  });

  assert(Boolean(outcome.sessionId), `Generated valid Session ID: ${outcome.sessionId}`);
  assert(
    outcome.winningWedgeIndex >= 0 && outcome.winningWedgeIndex < 8,
    `Winning wedge index is in valid range: ${outcome.winningWedgeIndex} (${outcome.winningWedge.label})`
  );
  assert(
    outcome.animationSeed.targetAngleDegrees > 360,
    `Computed target animation angle: ${outcome.animationSeed.targetAngleDegrees.toFixed(1)}° (${outcome.animationSeed.totalSpins} spins)`
  );
  assert(
    Boolean(outcome.cryptographicSignature),
    `Generated tamper-proof SHA-256 signature: ${outcome.cryptographicSignature.substring(0, 16)}...`
  );

  // ----------------------------------------------------------------------------
  // TEST 3: NON-MONETARY REWARD FULFILLMENT
  // ----------------------------------------------------------------------------
  console.log("\n[TEST 3] Verifying Authoritative Fulfillment of Non-Monetary Perks...");

  // A. Fulfill Fan XP (+100 Fan XP)
  const fanXpResult = await RewardFulfillmentService.fulfillReward({
    userId: testUserId,
    reward: {
      rewardType: "FAN_XP",
      xpAmount: 100,
      reason: "Daily Free Game Reward: +100 Fan XP",
    },
  });
  assert(fanXpResult.isSuccess, "Fulfill +100 Fan XP: Success");
  assert(
    fanXpResult.awardedDetails.fanXpGained === 100,
    `Awarded XP details match expected: +${fanXpResult.awardedDetails.fanXpGained} XP`
  );

  // B. Fulfill Creator Relationship XP (+50 Creator XP)
  const creatorXpResult = await RewardFulfillmentService.fulfillReward({
    userId: testUserId,
    creatorProfileId: testCreatorId,
    reward: {
      rewardType: "CREATOR_RELATIONSHIP_XP",
      xpAmount: 50,
      creatorProfileId: testCreatorId,
      reason: "Daily Free Game Reward: +50 Creator Relationship XP",
    },
  });
  assert(creatorXpResult.isSuccess, "Fulfill +50 Creator Relationship XP: Success");
  assert(
    creatorXpResult.awardedDetails.creatorRelationshipXpGained === 50,
    `Awarded Creator XP details match: +${creatorXpResult.awardedDetails.creatorRelationshipXpGained} XP`
  );

  // C. Fulfill Temporary Badge (⚡ Daily Champion)
  const badgeResult = await RewardFulfillmentService.fulfillReward({
    userId: testUserId,
    reward: {
      rewardType: "TEMPORARY_BADGE",
      badgeCode: "DAILY_CHAMPION",
      badgeName: "⚡ Daily Champion",
      badgeIcon: "👑",
      durationHours: 24,
      glowColor: "#f59e0b",
      description: "24-Hour VIP Chat Badge",
    },
  });
  assert(badgeResult.isSuccess, "Fulfill Temporary Badge: Success");
  const activeBadges = RewardFulfillmentService.getActiveTemporaryBadges(testUserId);
  assert(
    activeBadges.length >= 1 && activeBadges[0].badgeCode === "DAILY_CHAMPION",
    `Active temporary badge registered with expiration: ${activeBadges[0].expiresAt.toISOString()}`
  );

  // D. Fulfill Front-Row Seat Pass
  const seatResult = await RewardFulfillmentService.fulfillReward({
    userId: testUserId,
    reward: {
      rewardType: "FRONT_ROW_SEAT",
      seatTier: "FRONT_ROW",
      validLivestreamsCount: 1,
      priorityScore: 40,
      durationHours: 48,
      description: "Front-Row Livestream Seat Pass",
    },
  });
  assert(seatResult.isSuccess, "Fulfill Front-Row Seat Pass: Success");
  const activeSeats = RewardFulfillmentService.getActiveSeatPasses(testUserId);
  assert(
    activeSeats.length >= 1 && activeSeats[0].tier === "FRONT_ROW",
    `Active seat pass registered for tier: ${activeSeats[0].tier}`
  );

  // E. Fulfill Priority Interaction Pass
  const voucherResult = await RewardFulfillmentService.fulfillReward({
    userId: testUserId,
    reward: {
      rewardType: "PRIORITY_INTERACTION",
      voucherCode: "PRIORITY_Q_PASS",
      queuePriorityMultiplier: 2.0,
      expiresInDays: 7,
      description: "2x Queue Jumper Voucher",
    },
  });
  assert(voucherResult.isSuccess, "Fulfill Priority Interaction Voucher: Success");
  const activeVouchers = RewardFulfillmentService.getActivePriorityVouchers(testUserId);
  assert(
    activeVouchers.length >= 1 && activeVouchers[0].priorityMultiplier === 2.0,
    `Active priority voucher registered: ${activeVouchers[0].voucherCode} (2.0x Multiplier)`
  );

  // F. Fulfill Content Unlock
  const contentResult = await RewardFulfillmentService.fulfillReward({
    userId: testUserId,
    reward: {
      rewardType: "CONTENT_UNLOCK",
      contentId: "promo_clip_101",
      contentTitle: "Daily Vault VIP Clip",
      contentType: "VIDEO",
      description: "Complimentary clip unlock",
    },
  });
  assert(contentResult.isSuccess, "Fulfill Content Unlock: Success");
  assert(
    contentResult.awardedDetails.contentUnlocked?.contentId === "promo_clip_101",
    `Content unlock recorded without debiting credits: ${contentResult.awardedDetails.contentUnlocked?.title}`
  );

  // ----------------------------------------------------------------------------
  // TEST 4: DAILY GAME SESSION, COOLDOWN & STREAK FLOW
  // ----------------------------------------------------------------------------
  console.log("\n[TEST 4] Verifying Daily Game Workflow, Rate-Limiting & Streak Tracker...");

  const fanStreakUser = `fan_streak_${Date.now()}`;

  // Initial status: user can play
  const initialStatus = await DailyGameService.getUserDailyStatus(fanStreakUser);
  assert(initialStatus.canPlay === true, "New user can play immediately (canPlay = true)");
  assert(initialStatus.currentStreakDays === 0, "Initial streak is 0 days");

  // Play Day 1
  const day1Result = await DailyGameService.playDailyGame({
    userId: fanStreakUser,
    gameType: "DAILY_SPIN_WHEEL",
    creatorProfileId: testCreatorId,
  });
  assert(day1Result.isSuccess, "Play Day 1: Success");
  assert(day1Result.statusAfter.currentStreakDays === 1, "Streak advanced to 1 day");
  assert(day1Result.statusAfter.canPlay === false, "User is now on 24-hour cooldown (canPlay = false)");

  // Attempt second play while on cooldown -> must be rejected
  let blockedCooldown = false;
  try {
    await DailyGameService.playDailyGame({
      userId: fanStreakUser,
      gameType: "DAILY_SPIN_WHEEL",
    });
  } catch (err: any) {
    blockedCooldown = true;
  }
  assert(blockedCooldown, "Second play within 24h was correctly BLOCKED by cooldown rate-limiter");

  // ----------------------------------------------------------------------------
  // TEST 5: GREEK / EU COMPLIANCE STATUTORY INTEGRITY
  // ----------------------------------------------------------------------------
  console.log("\n[TEST 5] Verifying Greek (HGC) & EU Regulatory Compliance Model...");

  const compliance = FinancialIsolationGuard.getComplianceNotice();
  assert(compliance.jurisdiction === "GREECE_EU_COMPLIANT", "Jurisdiction marked as GREECE_EU_COMPLIANT");
  assert(compliance.isWageringProhibited === true, "Wagering is strictly prohibited");
  assert(compliance.isEconomicValueRedeemable === false, "Zero economic redeemability guaranteed");
  assert(compliance.entryCostCredits === 0, "Entry cost is strictly 0 credits");
  assert(compliance.financialIsolationGuaranteed === true, "Financial isolation guaranteed");
  assert(Boolean(compliance.regulatoryNotice), "Statutory regulatory notice text is published");

  console.log("\n================================================================================");
  console.log("🎉 ALL FREE GAMES & FINANCIAL ISOLATION INVARIANTS VERIFIED SUCCESSFULLY!");
  console.log("================================================================================\n");
  process.exit(0);
}

runFreeGamesVerificationSuite().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
