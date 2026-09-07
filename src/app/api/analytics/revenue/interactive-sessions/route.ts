import { NextRequest, NextResponse } from "next/server";
import { AnalyticalDataService } from "@/modules/analytics/analytical-data.service";
import { AnalyticsTimeframe } from "@/modules/analytics/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeframe = (searchParams.get("timeframe") as AnalyticsTimeframe) || "LAST_7_DAYS";
    const creatorProfileId = searchParams.get("creatorProfileId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const result = await AnalyticalDataService.getInteractiveSessionRevenue({
      timeframe,
      creatorProfileId,
      dateRange: startDate && endDate ? { startDate, endDate } : undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Analytical Interactive Session Revenue API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch interactive session revenue analytics." },
      { status: 500 }
    );
  }
}
