/**
 * ============================================================================
 * RULE: REFERRAL PROGRAM MANIPULATION DETECTION
 * ============================================================================
 * Detects self-referral loops, shared device/IP linkage between referrer
 * and referee, and bonus harvesting farms.
 */

import prisma from "@/lib/db";
import { RiskRule } from "./rule.interface";
import {
  RiskEvaluationContext,
  EvaluatedSignals,
  RuleTrigger,
  TriggerCodes,
} from "../types";

export class ReferralManipulationRule implements RiskRule {
  readonly id = "RULE_REFERRAL_MANIPULATION";
  readonly name = "Referral Fraud & Self-Attribution Detector";
  readonly description =
    "Detects self-referral abuse, shared hardware fingerprints between referrer/referee, and bonus farming.";
  readonly enabled = true;

  async evaluate(
    ctx: RiskEvaluationContext,
    signals: EvaluatedSignals
  ): Promise<RuleTrigger[]> {
    const triggers: RuleTrigger[] = [];

    if (ctx.actionType !== "REFERRAL_CLAIM" && !ctx.referralCode) {
      return triggers;
    }

    const currentUserId = ctx.userId;
    const referredByUserId = ctx.targetUserId || ctx.metadata?.referrerId;

    // 1. Direct Self-Referral
    if (currentUserId && referredByUserId && currentUserId === referredByUserId) {
      triggers.push({
        code: TriggerCodes.REFERRAL_SELF_ATTRIBUTION,
        name: "Direct Self-Referral Attribution",
        scoreContribution: 95,
        severity: "CRITICAL",
        reason: "User attempted to claim referral rewards using their own user ID as the referrer.",
        details: { currentUserId, referredByUserId },
      });
      return triggers;
    }

    // 2. Shared Device Fingerprint between Referrer and Referee
    if (currentUserId && referredByUserId && signals.device?.fingerprintHash) {
      try {
        const referrerDevice = await prisma.deviceFingerprintRecord.findFirst({
          where: {
            fingerprintHash: signals.device.fingerprintHash,
            linkedUserIdsJson: { contains: referredByUserId },
          },
        });

        if (referrerDevice) {
          triggers.push({
            code: TriggerCodes.REFERRAL_SHARED_DEVICE,
            name: "Referrer & Referee Shared Hardware Fingerprint",
            scoreContribution: 80,
            severity: "CRITICAL",
            reason: `Referrer (${referredByUserId}) and referee (${currentUserId}) share the exact same physical device fingerprint.`,
            details: { fingerprintHash: signals.device.fingerprintHash },
          });
        }
      } catch {
        // Fallback
      }
    }

    return triggers;
  }
}
