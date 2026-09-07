/**
 * ============================================================================
 * RULE: CHARGEBACK & REFUND FRAUD DETECTION
 * ============================================================================
 * Flags accounts and payment instruments with a history of disputes,
 * high chargeback ratios, or friendly-fraud chargeback cycles.
 */

import { RiskRule } from "./rule.interface";
import {
  RiskEvaluationContext,
  EvaluatedSignals,
  RuleTrigger,
  TriggerCodes,
} from "../types";

export class ChargebackRefundRule implements RiskRule {
  readonly id = "RULE_CHARGEBACK_REFUND";
  readonly name = "Historical Chargeback & Dispute Abuse Detector";
  readonly description =
    "Detects prior chargeback incidents, elevated dispute ratios, and linked payment instruments with chargeback history.";
  readonly enabled = true;

  async evaluate(
    ctx: RiskEvaluationContext,
    signals: EvaluatedSignals
  ): Promise<RuleTrigger[]> {
    const triggers: RuleTrigger[] = [];
    const account = signals.account;

    if (!account) return triggers;

    // 1. Prior Confirmed Chargebacks on Account
    if (account.historicalChargebackCount > 0) {
      triggers.push({
        code: TriggerCodes.CHARGEBACK_PRIOR_DISPUTES,
        name: "Prior Chargeback History on Account",
        scoreContribution: 75,
        severity: "CRITICAL",
        reason: `User account has ${account.historicalChargebackCount} previous confirmed chargeback(s).`,
        details: { chargebackCount: account.historicalChargebackCount },
      });
    } else if (account.historicalDisputeCount > 0) {
      // 2. Prior Failed / Disputed Payments
      triggers.push({
        code: TriggerCodes.CHARGEBACK_PRIOR_DISPUTES,
        name: "Elevated Payment Dispute History",
        scoreContribution: 45,
        severity: "HIGH",
        reason: `User account has ${account.historicalDisputeCount} previous disputed/failed transaction(s).`,
        details: { disputeCount: account.historicalDisputeCount },
      });
    }

    // 3. Elevated Chargeback Rate (>10% of lifetime transactions)
    if (account.chargebackRate > 0.1 && (account.totalDepositsFiatCents > 0 || account.totalCreditsPurchased > 0)) {
      triggers.push({
        code: TriggerCodes.CHARGEBACK_HIGH_REFUND_RATIO,
        name: "Abnormal Dispute-to-Transaction Ratio",
        scoreContribution: 35,
        severity: "HIGH",
        reason: `Dispute rate is ${(account.chargebackRate * 100).toFixed(1)}%, exceeding the safe threshold (10%).`,
        details: { chargebackRate: account.chargebackRate },
      });
    }

    return triggers;
  }
}
