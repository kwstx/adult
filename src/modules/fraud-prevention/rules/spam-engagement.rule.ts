/**
 * ============================================================================
 * RULE: SPAM & ENGAGEMENT MANIPULATION DETECTION
 * ============================================================================
 * Detects chat/DM spam floods, automated bot cadences, and circular tipping rings
 * where accounts cycle credits back and forth to artificially inflate XP,
 * creator rankings, or wash promo credits.
 */

import prisma from "@/lib/db";
import { RiskRule } from "./rule.interface";
import {
  RiskEvaluationContext,
  EvaluatedSignals,
  RuleTrigger,
  TriggerCodes,
} from "../types";

export class SpamEngagementRule implements RiskRule {
  readonly id = "RULE_SPAM_ENGAGEMENT";
  readonly name = "Spam & Circular Engagement Collusion Detector";
  readonly description =
    "Detects high-frequency messaging floods, bot cadences, and circular tipping collusion rings.";
  readonly enabled = true;

  async evaluate(
    ctx: RiskEvaluationContext,
    signals: EvaluatedSignals
  ): Promise<RuleTrigger[]> {
    const triggers: RuleTrigger[] = [];

    // 1. Message & Chat Spam Flood Check
    if (ctx.actionType === "MESSAGE" || ctx.actionType === "STREAM_CHAT") {
      const messages1m = signals.velocity?.messagesLast1m || 0;
      if (messages1m >= 15) {
        const score = messages1m >= 30 ? 60 : 35;
        triggers.push({
          code: TriggerCodes.SPAM_MESSAGE_VELOCITY,
          name: "High-Frequency Message Spam Flood",
          scoreContribution: score,
          severity: messages1m >= 30 ? "HIGH" : "MEDIUM",
          reason: `${messages1m} messages dispatched in under 60 seconds. Exceeds normal human interaction velocity.`,
          details: { messagesLast1m: messages1m },
        });
      }
    }

    // 2. Circular Tipping / Wash Trading Collusion (Account A -> B -> A)
    if (ctx.actionType === "TIP" && ctx.userId && ctx.targetUserId) {
      if (ctx.userId === ctx.targetUserId) {
        triggers.push({
          code: TriggerCodes.ENGAGEMENT_CIRCULAR_TIPPING,
          name: "Self-Tipping Anomaly",
          scoreContribution: 80,
          severity: "CRITICAL",
          reason: "User attempted to send a tip to their own account.",
        });
      } else {
        try {
          // Check if target user has tipped the sender in the last 24 hours
          const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000);
          const reverseTip = await prisma.walletTransaction.findFirst({
            where: {
              sourceWallet: { userId: ctx.targetUserId },
              destinationWallet: { userId: ctx.userId },
              transactionType: "LIVE_TIP",
              createdAt: { gte: oneDayAgo },
            },
          });

          if (reverseTip) {
            triggers.push({
              code: TriggerCodes.ENGAGEMENT_CIRCULAR_TIPPING,
              name: "Circular Tipping Collusion Ring",
              scoreContribution: 50,
              severity: "HIGH",
              reason: `Target user ${ctx.targetUserId} recently tipped sender ${ctx.userId} within the last 24 hours. Indicates circular credit washing or XP collusion.`,
              details: { reverseTransactionId: reverseTip.id },
            });
          }
        } catch {
          // Database lookup grace
        }
      }
    }

    return triggers;
  }
}
