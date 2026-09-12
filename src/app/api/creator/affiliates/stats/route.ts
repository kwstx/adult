import { NextRequest, NextResponse } from "next/server";
import { apiHandler, ApiError } from "@/lib/api-handler";
import { CreatorAffiliateAnalyticsService } from "@/modules/affiliate/creator-affiliate-analytics.service";

export const GET = apiHandler(
  async (req: NextRequest, ctx) => {
    const creatorProfileId = ctx.user?.creatorProfileId;

    if (!creatorProfileId) {
      throw new ApiError(
        403,
        "Only verified creators can access affiliate program statistics.",
        "FORBIDDEN"
      );
    }

    const stats = await CreatorAffiliateAnalyticsService.getCreatorStats(creatorProfileId);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  },
  { requiredRoles: ["CREATOR", "ADMIN"] }
);
