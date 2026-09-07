import { NextRequest, NextResponse } from "next/server";
import { AnalyticalDataService } from "@/modules/analytics/analytical-data.service";
import { AnalyticsTimeframe } from "@/modules/analytics/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeframe = (searchParams.get("timeframe") as AnalyticsTimeframe) || "LAST_30_DAYS";
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const minFansThreshold = parseInt(searchParams.get("minFans") || "0", 10);
    const sortBy = (searchParams.get("sortBy") as any) || "AVERAGE_LIFESPAN_DAYS";

    const result = await AnalyticalDataService.getCreatorFanRetentionRankings({
      timeframe,
      limit,
      minFansThreshold,
      sortBy,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Analytical Creator Retention API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch creator retention analytics." },
      { status: 500 }
    );
  }
}
