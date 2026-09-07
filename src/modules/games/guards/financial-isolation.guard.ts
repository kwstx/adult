// ============================================================================
// FINANCIAL ISOLATION & REGULATORY COMPLIANCE GUARD
// Hard Architectural & Runtime Firewall Isolating Free Games from the Wallet Engine
// ============================================================================

import {
  FreeGameReward,
  FreeGameRewardType,
  GreekEuComplianceDisclosure,
} from "../types";

export class FinancialIsolationViolationError extends Error {
  public readonly code = "FATAL_FINANCIAL_ISOLATION_VIOLATION";
  public readonly httpStatus = 500;

  constructor(message: string) {
    super(`[FINANCIAL ISOLATION GUARD] Security Violation: ${message}`);
    this.name = "FinancialIsolationViolationError";
  }
}

export class FinancialIsolationGuard {
  /**
   * Authoritative List of Permitted Non-Monetary Reward Types.
   */
  private static readonly PERMITTED_REWARD_TYPES: ReadonlySet<FreeGameRewardType> =
    new Set<FreeGameRewardType>([
      "FAN_XP",
      "CREATOR_RELATIONSHIP_XP",
      "TEMPORARY_BADGE",
      "FRONT_ROW_SEAT",
      "PRIORITY_INTERACTION",
      "CONTENT_UNLOCK",
    ]);

  /**
   * Blocklist of forbidden monetary/economic terminology.
   */
  private static readonly FORBIDDEN_FINANCIAL_KEYS: readonly string[] = [
    "credits",
    "credit",
    "creditsAwarded",
    "creditAmount",
    "walletCredit",
    "walletDebit",
    "cashValue",
    "payoutAmount",
    "tokenAmount",
    "currency",
    "priceCredits",
  ];

  /**
   * 1. VALIDATE REWARD OBJECT PURITY
   * Ensures that the reward strictly matches non-monetary types and contains zero financial fields.
   */
  public static validateRewardPurity(reward: FreeGameReward): void {
    if (!reward || typeof reward !== "object") {
      throw new FinancialIsolationViolationError("Invalid or empty reward payload.");
    }

    // A. Check reward type validity
    if (!this.PERMITTED_REWARD_TYPES.has(reward.rewardType)) {
      throw new FinancialIsolationViolationError(
        `Disallowed reward type: "${(reward as any).rewardType}". Free games may ONLY award progression, badges, seats, interactions, or promotional content.`
      );
    }

    // B. Check for forbidden property keys in the object
    const rewardKeys = Object.keys(reward);
    for (const key of rewardKeys) {
      if (this.FORBIDDEN_FINANCIAL_KEYS.includes(key)) {
        throw new FinancialIsolationViolationError(
          `Detected forbidden financial property "${key}" in Free Game reward payload. Monetary rewards are prohibited.`
        );
      }
    }

    // C. Guard against numerical string or deep injection of credits
    const serialized = JSON.stringify(reward).toLowerCase();
    if (
      serialized.includes("credits") ||
      serialized.includes("wallet_debit") ||
      serialized.includes("payout") ||
      serialized.includes("cash")
    ) {
      // Check if it's just in a safe text field like description or if it's a financial payload injection
      const containsSuspiciousKey = this.FORBIDDEN_FINANCIAL_KEYS.some((forbidden) =>
        serialized.includes(`"${forbidden.toLowerCase()}":`)
      );
      if (containsSuspiciousKey) {
        throw new FinancialIsolationViolationError(
          "Reward payload contains serialized financial key injection."
        );
      }
    }
  }

  /**
   * 2. VALIDATE FREE ENTRY INVARIANT
   * Asserts that entry cost is strictly zero.
   */
  public static validateFreeEntryCost(entryCostCredits: number): void {
    if (entryCostCredits !== 0) {
      throw new FinancialIsolationViolationError(
        `Free Game entry cost must be exactly 0 credits. Received: ${entryCostCredits}. Free games cannot charge or debit the wallet.`
      );
    }
  }

  /**
   * 3. VERIFY WALLET ISOLATION (ZERO BALANCE MUTATION CHECK)
   * Asserts that before and after balance of a user remains unchanged during game resolution.
   */
  public static assertZeroWalletMutation(
    balanceBefore: number | bigint,
    balanceAfter: number | bigint
  ): void {
    if (BigInt(balanceBefore) !== BigInt(balanceAfter)) {
      throw new FinancialIsolationViolationError(
        `Critical financial leak detected: User wallet balance mutated from ${balanceBefore} to ${balanceAfter} during free game execution.`
      );
    }
  }

  /**
   * 4. GREEK / EU COMPLIANCE STATUTORY NOTICE
   */
  public static getComplianceNotice(): GreekEuComplianceDisclosure {
    return {
      jurisdiction: "GREECE_EU_COMPLIANT",
      classification: "PROMOTIONAL_FREE_TO_PLAY_ENGAGEMENT",
      isWageringProhibited: true,
      isEconomicValueRedeemable: false,
      entryCostCredits: 0,
      financialIsolationGuaranteed: true,
      regulatoryNotice:
        "This promotional game is 100% free of charge. No purchase, wager, or paid credits are required or permitted to participate. All outcomes are server-generated and award strictly non-monetary digital perks (XP, badges, social proximity, and interaction entitlements). Digital rewards cannot be exchanged for credits, cash, or economic value under applicable Greek (HGC) and EU consumer protection regulations.",
    };
  }
}
