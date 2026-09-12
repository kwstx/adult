import { NextRequest, NextResponse } from "next/server";
import { apiHandler, ApiError } from "@/lib/api-handler";
import { CreatorAffiliateAnalyticsService } from "@/modules/affiliate/creator-affiliate-analytics.service";

export const GET = apiHandler(
  async (req: NextRequest, ctx) => {
    const creatorProfileId = ctx.user?.creatorProfileId;

    if (!creatorProfileId) {
      throw new ApiError(
        403,
        "Only creators can access referral campaign links.",
        "FORBIDDEN"
      );
    }

    const links = await CreatorAffiliateAnalyticsService.getCreatorLinks(creatorProfileId);

    return NextResponse.json({
      success: true,
      data: links,
    });
  },
  { requiredRoles: ["CREATOR", "ADMIN"] }
);

export const POST = apiHandler(
  async (req: NextRequest, ctx) => {
    const creatorProfileId = ctx.user?.creatorProfileId;

    if (!creatorProfileId) {
      throw new ApiError(
        403,
        "Only creators can generate referral campaign links.",
        "FORBIDDEN"
      );
    }

    const body = await req.json();
    const {
      vanityCode,
      campaignName,
      commissionRatePercent,
      cookieWindowDays,
      spendWindowDays,
    } = body;

    if (!vanityCode || typeof vanityCode !== "string") {
      throw new ApiError(400, "vanityCode is required.", "INVALID_INPUT");
    }

    try {
      const link = await CreatorAffiliateAnalyticsService.createReferralLink({
        creatorProfileId,
        vanityCode,
        campaignName,
        commissionRatePercent,
        cookieWindowDays,
        spendWindowDays,
      });

      return NextResponse.json({
        success: true,
        data: link,
      });
    } catch (err: any) {
      throw new ApiError(400, err.message, "LINK_CREATION_FAILED");
    }
  },
  { requiredRoles: ["CREATOR", "ADMIN"] }
);
