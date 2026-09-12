/**
 * ============================================================================
 * FRAUD & SELF-REFERRAL PREVENTION SERVICE
 * ============================================================================
 * Multi-layer anti-abuse engine protecting against self-attribution, device
 * farming, card sharing, and IP velocity manipulation.
 */

import prisma from "@/lib/db";
import { ReferralFraudCheckResult } from "./types";
import { TriggerCodes } from "@/modules/fraud-prevention/types";

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "guerrillamail.com",
  "10minutemail.com",
  "trashmail.com",
  "yopmail.com",
  "sharklasers.com",
]);

export class ReferralFraudGuard {
  /**
   * Evaluates a proposed referral attribution for fraud, sybil farming, and self-attribution.
   */
  static async evaluateReferralRisk(
    input: {
      refereeUserId: string;
      referrerCreatorProfileId: string;
      referrerUserId?: string;
      deviceFingerprintHash?: string;
      ipAddress?: string;
      userEmail?: string;
    },
    tx?: any
  ): Promise<ReferralFraudCheckResult> {
    const db = tx || prisma;
    const {
      refereeUserId,
      referrerCreatorProfileId,
      deviceFingerprintHash,
      ipAddress,
      userEmail,
    } = input;

    const matchedRules: string[] = [];
    let riskScore = 0;

    // 1. Fetch referring creator's primary user ID
    let referrerUserId: string | null = input.referrerUserId || null;
    if (!referrerUserId) {
      try {
        const creator = await db.creatorProfile.findUnique({
          where: { id: referrerCreatorProfileId },
          select: { userId: true },
        });
        referrerUserId = creator?.userId || null;
      } catch {
        // Fallback
      }
    }

    // 2. Direct Self-Referral Check
    if ((referrerUserId && refereeUserId === referrerUserId) || refereeUserId === referrerCreatorProfileId) {
      matchedRules.push(TriggerCodes.REFERRAL_SELF_ATTRIBUTION);
      riskScore += 95;
      return {
        isAllowed: false,
        fraudStatus: "BLOCKED",
        fraudReason: "Direct self-referral: User cannot attribute accounts to themselves.",
        riskScore,
        matchedRules,
      };
    }

    // 3. Hardware Device Fingerprint Overlap
    if (deviceFingerprintHash && referrerUserId) {
      try {
        const matchingDevice = await prisma.deviceFingerprintRecord.findFirst({
          where: {
            fingerprintHash: deviceFingerprintHash,
            OR: [
              { userId: referrerUserId },
              { linkedUserIdsJson: { contains: referrerUserId } },
            ],
          },
        });

        if (matchingDevice) {
          matchedRules.push(TriggerCodes.REFERRAL_SHARED_DEVICE);
          riskScore += 85;
        }
      } catch {
        // Fallback
      }
    }

    // 4. IP Subnet Burst Velocity Check (> 5 signups in last 60 minutes on same IP)
    if (ipAddress && ipAddress !== "127.0.0.1" && ipAddress !== "::1") {
      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const touchpointCount = await prisma.referralTouchpoint.count({
          where: {
            ipAddress,
            creatorProfileId: referrerCreatorProfileId,
            createdAt: { gte: oneHourAgo },
          },
        });

        if (touchpointCount >= 10) {
          matchedRules.push(TriggerCodes.REFERRAL_VELOCITY_SPIKE);
          riskScore += 40;
        }
      } catch {
        // Fallback
      }
    }

    // 5. Disposable Email & Sybil Check
    if (userEmail) {
      const domain = userEmail.split("@")[1]?.toLowerCase();
      if (domain && DISPOSABLE_DOMAINS.has(domain)) {
        matchedRules.push(TriggerCodes.SYBIL_DISPOSABLE_EMAIL);
        riskScore += 50;
      }
      if (userEmail.includes("+")) {
        matchedRules.push(TriggerCodes.SYBIL_PLUS_ALIASED_EMAIL);
        riskScore += 15;
      }
    }

    // 6. Determine final outcome
    let fraudStatus: "PASSED" | "FLAGGED_REVIEW" | "BLOCKED" = "PASSED";
    let isAllowed = true;
    let fraudReason: string | undefined;

    if (riskScore >= 75) {
      fraudStatus = "BLOCKED";
      isAllowed = false;
      fraudReason = `Blocked by anti-fraud policy: Score ${riskScore}. Matched: ${matchedRules.join(", ")}`;
    } else if (riskScore >= 40) {
      fraudStatus = "FLAGGED_REVIEW";
      isAllowed = true;
      fraudReason = `Flagged for review: Score ${riskScore}. Matched: ${matchedRules.join(", ")}`;
    }

    // Record forensic audit if flagged or blocked
    if (riskScore > 0) {
      try {
        await prisma.riskAssessmentRecord.create({
          data: {
            userId: refereeUserId,
            actionType: "REFERRAL_CLAIM",
            riskScore,
            riskLevel: riskScore >= 75 ? "CRITICAL" : riskScore >= 40 ? "HIGH" : "MEDIUM",
            recommendedAction: isAllowed ? "ALLOW" : "BLOCK_TRANSACTION",
            finalAction: isAllowed ? "ALLOW" : "BLOCK_TRANSACTION",
            ruleTriggersJson: JSON.stringify(matchedRules),
            signalsJson: JSON.stringify({
              refereeUserId,
              referrerCreatorProfileId,
              referrerUserId,
              deviceFingerprintHash,
              ipAddress,
            }),
            ipAddress,
            deviceFingerprintHash,
          },
        });
      } catch {
        // Non-blocking log
      }
    }

    return {
      isAllowed,
      fraudStatus,
      fraudReason,
      riskScore,
      matchedRules,
    };
  }

  /**
   * Validates if a payment card token is shared between referrer and referee.
   * If a match is detected, marks the attribution as REVOKED_FRAUD.
   */
  static async evaluatePaymentInstrumentCollision(
    cardHash: string,
    refereeUserId: string
  ): Promise<boolean> {
    try {
      // Find active attribution for this referee
      const attribution = await prisma.referralAttribution.findUnique({
        where: { referredUserId: refereeUserId },
        include: {
          referringCreatorProfile: { select: { userId: true } },
        },
      });

      if (!attribution || attribution.status !== "ACTIVE") return false;

      const referrerUserId = attribution.referringCreatorProfile.userId;

      // Check if card has been used by referrer
      const cardRecord = await prisma.paymentInstrumentFingerprint.findUnique({
        where: { cardHash },
      });

      if (cardRecord && cardRecord.linkedUserIdsJson.includes(referrerUserId)) {
        // Revoke attribution immediately
        await prisma.referralAttribution.update({
          where: { id: attribution.id },
          data: {
            status: "REVOKED_FRAUD",
            fraudCheckStatus: "BLOCKED",
            fraudReason: `Revoked: Shared payment instrument (${cardHash.slice(0, 8)}...) between referrer and referee.`,
          },
        });
        return true;
      }
    } catch {
      // Fallback
    }
    return false;
  }
}
