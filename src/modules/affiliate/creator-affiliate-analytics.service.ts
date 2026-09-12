/**
 * ============================================================================
 * CREATOR AFFILIATE ANALYTICS & DASHBOARD SERVICE
 * ============================================================================
 * Aggregates real-time statistics, conversion funnels, vanity link management,
 * and ledger transaction history for creator dashboards.
 */

import prisma from "@/lib/db";
import {
  CreatorAffiliateStats,
  CreatorReferralLinkSummary,
  CreateReferralLinkInput,
} from "./types";
import { ReferralTokenService } from "./referral-token.service";

export class CreatorAffiliateAnalyticsService {
  /**
   * Fetches aggregate affiliate performance metrics for a creator.
   */
  static async getCreatorStats(
    creatorProfileId: string
  ): Promise<CreatorAffiliateStats> {
    // 1. Fetch total clicks and total earnings from referral codes
    const codes = await prisma.creatorReferralCode.findMany({
      where: { creatorProfileId },
      select: {
        totalClicks: true,
        totalSignups: true,
        totalEarningsCredits: true,
        isActive: true,
      },
    });

    const totalClicks = codes.reduce((sum, c) => sum + c.totalClicks, 0);
    const totalSignups = codes.reduce((sum, c) => sum + c.totalSignups, 0);
    const activeLinksCount = codes.filter((c) => c.isActive).length;

    // 2. Fetch total commissions and distinct active spenders from attributions
    const attributions = await prisma.referralAttribution.findMany({
      where: { referringCreatorProfileId: creatorProfileId },
      select: {
        id: true,
        totalCommissionEarnedCredits: true,
        totalReferredSpendCredits: true,
        status: true,
        windowExpiresAt: true,
      },
    });

    const totalCommissionEarnedCredits = attributions.reduce(
      (sum, a) => sum + a.totalCommissionEarnedCredits,
      0
    );

    const now = new Date();
    const activeSpendersCount = attributions.filter(
      (a) =>
        a.status === "ACTIVE" &&
        a.windowExpiresAt > now &&
        a.totalReferredSpendCredits > 0
    ).length;

    // 3. Blocked fraud attempts count
    const fraudBlockedAttempts = await prisma.riskAssessmentRecord.count({
      where: {
        actionType: "REFERRAL_CLAIM",
        finalAction: "BLOCK_TRANSACTION",
        signalsJson: { contains: creatorProfileId },
      },
    });

    const conversionRatePercent =
      totalClicks > 0
        ? Math.round((totalSignups / totalClicks) * 10000) / 100
        : 0;

    const totalCommissionEarnedFiat = totalCommissionEarnedCredits * 0.01; // 1 credit = $0.01

    return {
      creatorProfileId,
      totalClicks,
      totalSignups,
      conversionRatePercent,
      activeSpendersCount,
      totalCommissionEarnedCredits,
      totalCommissionEarnedFiat,
      currency: "USD",
      activeLinksCount,
      fraudBlockedAttempts,
    };
  }

  /**
   * Lists all referral campaign links for a creator.
   */
  static async getCreatorLinks(
    creatorProfileId: string
  ): Promise<CreatorReferralLinkSummary[]> {
    const codes = await prisma.creatorReferralCode.findMany({
      where: { creatorProfileId },
      orderBy: { createdAt: "desc" },
    });

    return codes.map((c) => {
      const conversionRatePercent =
        c.totalClicks > 0
          ? Math.round((c.totalSignups / c.totalClicks) * 10000) / 100
          : 0;

      return {
        id: c.id,
        code: c.code,
        campaignName: c.campaignName,
        vanityUrl: ReferralTokenService.buildVanityUrl(c.code, c.campaignName || undefined),
        commissionRatePercent: c.commissionRatePercent,
        cookieWindowDays: c.cookieWindowDays,
        spendWindowDays: c.spendWindowDays,
        isActive: c.isActive,
        totalClicks: c.totalClicks,
        totalSignups: c.totalSignups,
        totalEarningsCredits: Number(c.totalEarningsCredits),
        conversionRatePercent,
        createdAt: c.createdAt,
      };
    });
  }

  /**
   * Creates a new vanity referral link or campaign code.
   */
  static async createReferralLink(
    input: CreateReferralLinkInput
  ): Promise<CreatorReferralLinkSummary> {
    const {
      creatorProfileId,
      vanityCode,
      campaignName,
      commissionRatePercent = 10.0,
      cookieWindowDays = 30,
      spendWindowDays = 30,
    } = input;

    if (!ReferralTokenService.isValidReferralCode(vanityCode)) {
      throw new Error(
        "Invalid referral code format. Must be 3-32 alphanumeric characters, dashes, or underscores."
      );
    }

    const normalizedCode = ReferralTokenService.normalizeCode(vanityCode);

    // Check if code is already taken
    const existing = await prisma.creatorReferralCode.findUnique({
      where: { code: normalizedCode },
    });

    if (existing) {
      if (existing.creatorProfileId === creatorProfileId) {
        throw new Error(`You have already created referral code "${normalizedCode}".`);
      }
      throw new Error(`Referral code "${normalizedCode}" is already in use by another creator.`);
    }

    const created = await prisma.creatorReferralCode.create({
      data: {
        creatorProfileId,
        code: normalizedCode,
        campaignName: campaignName || null,
        commissionRatePercent,
        cookieWindowDays,
        spendWindowDays,
        isActive: true,
      },
    });

    return {
      id: created.id,
      code: created.code,
      campaignName: created.campaignName,
      vanityUrl: ReferralTokenService.buildVanityUrl(created.code, created.campaignName || undefined),
      commissionRatePercent: created.commissionRatePercent,
      cookieWindowDays: created.cookieWindowDays,
      spendWindowDays: created.spendWindowDays,
      isActive: created.isActive,
      totalClicks: 0,
      totalSignups: 0,
      totalEarningsCredits: 0,
      conversionRatePercent: 0,
      createdAt: created.createdAt,
    };
  }

  /**
   * Lists chronological affiliate commission ledger entries for a creator.
   */
  static async getCreatorCommissionLedger(
    creatorProfileId: string,
    page = 1,
    limit = 20
  ) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.affiliateCommissionLedger.findMany({
        where: { referringCreatorProfileId: creatorProfileId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          referredUser: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          referralAttribution: {
            select: {
              commissionRatePercent: true,
              windowExpiresAt: true,
              status: true,
            },
          },
        },
      }),
      prisma.affiliateCommissionLedger.count({
        where: { referringCreatorProfileId: creatorProfileId },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
