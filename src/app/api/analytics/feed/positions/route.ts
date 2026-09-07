import { NextRequest, NextResponse } from "next/server";
import { AnalyticalDataService } from "@/modules/analytics/analytical-data.service";
import { AnalyticsTimeframe } from "@/modules/analytics/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeframe = (searchParams.get("timeframe") as AnalyticsTimeframe) || "LAST_7_DAYS";
    const category = searchParams.get("category") || undefined;
    const maxPosition = parseInt(searchParams.get("maxPosition") || "20", 10);

    const result = await AnalyticalDataService.getFeedPositionPerformance({
      timeframe,
      category,
      maxPosition,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Analytical Feed Position Performance API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch feed position performance analytics." },
      { status: 500 }
    );
  }
}
