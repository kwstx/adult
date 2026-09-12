/**
 * ============================================================================
 * MULTI-TOUCH REFERRAL ATTRIBUTION SERVICE
 * ============================================================================
 * Manages first-party touchpoint tracking, last-touch attribution resolution,
 * and 30-day active referral window lifecycle.
 */

import prisma from "@/lib/db";
import {
  RecordTouchpointInput,
  TouchpointRecordResult,
  AttributeUserRegistrationInput,
  AttributionRecordResult,
} from "./types";
import { ReferralTokenService } from "./referral-token.service";
import { ReferralFraudGuard } from "./referral-fraud-guard.service";

export class ReferralAttributionService {
  /**
   * Records an external touchpoint when a visitor hits a creator's referral link.
   * Generates a signed first-party attribution token.
   */
  static async recordTouchpoint(
    input: RecordTouchpointInput
  ): Promise<TouchpointRecordResult> {
    const {
      referralCode,
      anonymousSessionId,
      deviceFingerprintHash,
      ipAddress,
      userAgent,
      landingPage,
      utmSource,
      utmMedium,
      utmCampaign,
      targetUserId,
    } = input;

    const normalizedCode = ReferralTokenService.normalizeCode(referralCode);

    // 1. Locate referral code entity
    const refCodeRecord = await prisma.creatorReferralCode.findUnique({
      where: { code: normalizedCode },
      include: { creatorProfile: true },
    });

    if (!refCodeRecord || !refCodeRecord.isActive) {
      throw new Error(`Referral code "${normalizedCode}" is invalid or inactive.`);
    }

    // 2. Persist touchpoint record in PostgreSQL
    const touchpoint = await prisma.referralTouchpoint.create({
      data: {
        referralCodeId: refCodeRecord.id,
        creatorProfileId: refCodeRecord.creatorProfileId,
        userId: targetUserId || null,
        anonymousSessionId,
        deviceFingerprintHash,
        ipAddress,
        userAgent,
        landingPage,
        utmSource,
        utmMedium,
        utmCampaign: utmCampaign || refCodeRecord.campaignName || undefined,
      },
    });

    // 3. Increment total clicks on referral code atomically
    await prisma.creatorReferralCode.update({
      where: { id: refCodeRecord.id },
      data: { totalClicks: { increment: 1 } },
    });

    // 4. Generate signed first-party attribution token
    const tokenResult = ReferralTokenService.generateSignedToken({
      creatorProfileId: refCodeRecord.creatorProfileId,
      code: normalizedCode,
      campaignName: refCodeRecord.campaignName || undefined,
      commissionRatePercent: refCodeRecord.commissionRatePercent,
      spendWindowDays: refCodeRecord.spendWindowDays,
      validDays: refCodeRecord.cookieWindowDays,
    });

    return {
      touchpointId: touchpoint.id,
      referralCode: normalizedCode,
      creatorProfileId: refCodeRecord.creatorProfileId,
      signedAttributionCookie: tokenResult.token,
      cookieExpiresAt: tokenResult.expiresAt,
    };
  }

  /**
   * Evaluates and attributes a newly registered fan to a referring creator.
   * Uses 30-day Last-Touch Attribution.
   */
  static async attributeUserOnRegistration(
    input: AttributeUserRegistrationInput,
    tx?: any
  ): Promise<AttributionRecordResult | null> {
    const db = tx || prisma;
    const {
      newUserId,
      referralCode,
      signedToken,
      anonymousSessionId,
      deviceFingerprintHash,
      ipAddress,
      userAgent,
      userEmail,
    } = input;

    let targetCode: string | null = null;
    let targetCreatorProfileId: string | null = null;
    let commissionRate = 10.0;
    let spendWindowDays = 30;

    // 1. Direct signed token inspection
    if (signedToken) {
      const verified = ReferralTokenService.verifySignedToken(signedToken);
      if (verified) {
        targetCode = verified.code;
        targetCreatorProfileId = verified.creatorProfileId;
        commissionRate = verified.commissionRatePercent;
        spendWindowDays = verified.spendWindowDays;
      }
    }

    // 2. Direct referral code input fallback
    if (!targetCreatorProfileId && referralCode) {
      const normalized = ReferralTokenService.normalizeCode(referralCode);
      const codeRecord = await db.creatorReferralCode.findUnique({
        where: { code: normalized },
      });
      if (codeRecord && codeRecord.isActive) {
        targetCode = codeRecord.code;
        targetCreatorProfileId = codeRecord.creatorProfileId;
        commissionRate = codeRecord.commissionRatePercent;
        spendWindowDays = codeRecord.spendWindowDays;
      }
    }

    // 3. Multi-Touch Fallback: Query recent touchpoint by anonymous session or device fingerprint within 30 days
    if (!targetCreatorProfileId && (anonymousSessionId || deviceFingerprintHash)) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const lastTouchpoint = await db.referralTouchpoint.findFirst({
        where: {
          OR: [
            ...(anonymousSessionId ? [{ anonymousSessionId }] : []),
            ...(deviceFingerprintHash ? [{ deviceFingerprintHash }] : []),
          ],
          createdAt: { gte: thirtyDaysAgo },
        },
        orderBy: { createdAt: "desc" },
        include: { referralCode: true },
      });

      if (lastTouchpoint) {
        targetCreatorProfileId = lastTouchpoint.creatorProfileId;
        targetCode = lastTouchpoint.referralCode?.code || null;
        commissionRate = lastTouchpoint.referralCode?.commissionRatePercent || 10.0;
        spendWindowDays = lastTouchpoint.referralCode?.spendWindowDays || 30;
      }
    }

    if (!targetCreatorProfileId) {
      return null;
    }

    // 4. Run Anti-Fraud & Self-Referral Guard
    const fraudCheck = await ReferralFraudGuard.evaluateReferralRisk({
      refereeUserId: newUserId,
      referrerCreatorProfileId: targetCreatorProfileId,
      deviceFingerprintHash,
      ipAddress,
      userEmail,
    });

    if (!fraudCheck.isAllowed) {
      return null;
    }

    // 5. Check if attribution already exists for this user
    const existing = await db.referralAttribution.findUnique({
      where: { referredUserId: newUserId },
    });

    if (existing) {
      return {
        attributionId: existing.id,
        referredUserId: existing.referredUserId,
        referringCreatorProfileId: existing.referringCreatorProfileId,
        referralCodeId: existing.referralCodeId,
        attributionModel: existing.attributionModel,
        status: existing.status,
        commissionRatePercent: existing.commissionRatePercent,
        spendWindowDays: existing.spendWindowDays,
        windowExpiresAt: existing.windowExpiresAt,
        fraudCheckStatus: existing.fraudCheckStatus,
      };
    }

    // 6. Look up referral code record ID if available
    let referralCodeId: string | null = null;
    if (targetCode) {
      const codeRec = await db.creatorReferralCode.findUnique({
        where: { code: targetCode },
        select: { id: true },
      });
      referralCodeId = codeRec?.id || null;
    }

    const windowExpiresAt = new Date(
      Date.now() + spendWindowDays * 24 * 60 * 60 * 1000
    );

    // 7. Atomically create ReferralAttribution record
    const attribution = await db.referralAttribution.create({
      data: {
        referredUserId: newUserId,
        referralCodeId,
        referringCreatorProfileId: targetCreatorProfileId,
        attributionModel: "LAST_TOUCH",
        status: "ACTIVE",
        commissionRatePercent: commissionRate,
        spendWindowDays,
        windowExpiresAt,
        fraudCheckStatus: fraudCheck.fraudStatus,
        fraudReason: fraudCheck.fraudReason,
      },
    });

    // 8. Increment signups on referral code
    if (referralCodeId) {
      await db.creatorReferralCode.update({
        where: { id: referralCodeId },
        data: { totalSignups: { increment: 1 } },
      });
    }

    return {
      attributionId: attribution.id,
      referredUserId: attribution.referredUserId,
      referringCreatorProfileId: attribution.referringCreatorProfileId,
      referralCodeId: attribution.referralCodeId,
      attributionModel: attribution.attributionModel,
      status: attribution.status,
      commissionRatePercent: attribution.commissionRatePercent,
      spendWindowDays: attribution.spendWindowDays,
      windowExpiresAt: attribution.windowExpiresAt,
      fraudCheckStatus: attribution.fraudCheckStatus,
    };
  }

  /**
   * Retrieves an active attribution for a user if still within valid spend window.
   */
  static async getActiveAttribution(
    userId: string,
    tx?: any
  ) {
    const db = tx || prisma;
    const attribution = await db.referralAttribution.findUnique({
      where: { referredUserId: userId },
      include: {
        referringCreatorProfile: {
          include: { user: { select: { id: true, username: true } } },
        },
      },
    });

    if (!attribution) return null;

    // Check if expired
    if (attribution.status === "ACTIVE" && new Date() > attribution.windowExpiresAt) {
      await db.referralAttribution.update({
        where: { id: attribution.id },
        data: { status: "EXPIRED" },
      });
      return null;
    }

    if (attribution.status !== "ACTIVE") return null;

    return attribution;
  }
}
