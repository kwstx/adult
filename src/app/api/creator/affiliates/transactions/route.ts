import { NextRequest, NextResponse } from "next/server";
import { apiHandler, ApiError } from "@/lib/api-handler";
import { CreatorAffiliateAnalyticsService } from "@/modules/affiliate/creator-affiliate-analytics.service";

export const GET = apiHandler(
  async (req: NextRequest, ctx) => {
    const creatorProfileId = ctx.user?.creatorProfileId;

    if (!creatorProfileId) {
      throw new ApiError(
        403,
        "Only creators can view affiliate commission transactions.",
        "FORBIDDEN"
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await CreatorAffiliateAnalyticsService.getCreatorCommissionLedger(
      creatorProfileId,
      page,
      limit
    );

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  },
  { requiredRoles: ["CREATOR", "ADMIN"] }
);
