/**
 * ============================================================================
 * RULE: VELOCITY & RAPID SPEND DRAIN DETECTION
 * ============================================================================
 * Identifies the classic "buy and drain" money laundering/stolen card pattern:
 * an attacker purchases credits using a stolen card, then dumps all credits
 * into tips, PPV, or transfers within minutes before the cardholder can notice.
 */

import { RiskRule } from "./rule.interface";
import {
  RiskEvaluationContext,
  EvaluatedSignals,
  RuleTrigger,
  TriggerCodes,
} from "../types";
import { VelocityTracker } from "../signals/velocity-tracker";

export class VelocitySpendDrainRule implements RiskRule {
  readonly id = "RULE_VELOCITY_SPEND_DRAIN";
  readonly name = "Deposit & Rapid Spend Drain Velocity Detector";
  readonly description =
    "Detects rapid credit depletion immediately following deposit, and high-velocity credit burn spikes.";
  readonly enabled = true;

  async evaluate(
    ctx: RiskEvaluationContext,
    signals: EvaluatedSignals
  ): Promise<RuleTrigger[]> {
    const triggers: RuleTrigger[] = [];
    const userId = ctx.userId;

    // Applicable to spending actions (TIP, PPV_UNLOCK, MESSAGE, PAYOUT, etc.)
    const isSpendingAction =
      ctx.actionType === "TIP" ||
      ctx.actionType === "PPV_UNLOCK" ||
      ctx.actionType === "PAYOUT" ||
      ctx.actionType === "SUBSCRIPTION";

    if (isSpendingAction && userId) {
      // 1. Rapid Deposit-to-Spend Latency Analysis
      const secondsSinceDeposit = await VelocityTracker.getSecondsSinceLastDeposit(userId);

      if (secondsSinceDeposit !== null && secondsSinceDeposit <= 180) {
        // Less than 3 minutes between deposit and large spend
        const spendAmount = ctx.amountCredits || 0;
        const totalPurchased = signals.account?.totalCreditsPurchased || 0;

        if (spendAmount >= 500 || (totalPurchased > 0 && spendAmount >= totalPurchased * 0.5)) {
          triggers.push({
            code: TriggerCodes.VELOCITY_DEPOSIT_TO_SPEND_LATENCY,
            name: "Immediate Deposit-to-Spend Drain Latency",
            scoreContribution: 50,
            severity: "HIGH",
            reason: `User initiated large credit spend of ${spendAmount} credits only ${secondsSinceDeposit}s after deposit. Characteristic of stolen card drain attack.`,
            details: { secondsSinceDeposit, spendAmount },
          });
        }
      }

      // 2. High-Velocity Spend Burst (credits spent within 5 minutes)
      const creditsSpent5m = (signals.velocity?.creditsSpentLast5m || 0) + (ctx.amountCredits || 0);
      const isYoungAccount = signals.account?.isNewAccount ?? true;

      if (isYoungAccount && creditsSpent5m >= 5000) {
        triggers.push({
          code: TriggerCodes.VELOCITY_SPEND_DRAIN_BURST,
          name: "High-Velocity Credit Spend Burst",
          scoreContribution: 40,
          severity: "HIGH",
          reason: `Young account (<72h) spent ${creditsSpent5m} credits within a 5-minute rolling window.`,
          details: { creditsSpent5m },
        });
      }
    }

    // 3. High-Frequency Transaction Spikes
    const tx1m = signals.velocity?.transactionsLast1m || 0;
    if (tx1m >= 8) {
      triggers.push({
        code: TriggerCodes.VELOCITY_CREDIT_TRANSFER_SPIKE,
        name: "Extreme Transaction Frequency (Per Minute)",
        scoreContribution: 35,
        severity: "MEDIUM",
        reason: `User attempted ${tx1m} transactions within 60 seconds. Indicates automated script or bot activity.`,
        details: { txLast1m: tx1m },
      });
    }

    // 4. Fiat Deposit Velocity Spikes
    if (ctx.actionType === "CREDIT_PURCHASE") {
      const deposit1h = (signals.velocity?.fiatDepositedLast1h || 0) + ((ctx.amountFiatCents || 0) / 100);
      const kycUnverified = signals.account?.kycStatus !== "AGE_VERIFIED" && signals.account?.kycStatus !== "COMPLIANCE_2257_APPROVED";

      if (deposit1h >= 500 && kycUnverified) {
        triggers.push({
          code: TriggerCodes.VELOCITY_FIAT_DEPOSIT_SPIKE,
          name: "Deposit Velocity Spike on Unverified Account",
          scoreContribution: 45,
          severity: "HIGH",
          reason: `Unverified account attempted $${deposit1h.toFixed(2)} in deposits within 1 hour.`,
          details: { depositLast1h: deposit1h },
        });
      }
    }

    return triggers;
  }
}
