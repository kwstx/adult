import { NextRequest, NextResponse } from "next/server";
import { AnalyticalDataService } from "@/modules/analytics/analytical-data.service";
import { AnalyticsTimeframe } from "@/modules/analytics/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeframe = (searchParams.get("timeframe") as AnalyticsTimeframe) || "LAST_7_DAYS";
    const livestreamId = searchParams.get("livestreamId") || undefined;
    const creatorProfileId = searchParams.get("creatorProfileId") || undefined;

    const result = await AnalyticalDataService.getLivePurchasingConversionRate({
      timeframe,
      livestreamId,
      creatorProfileId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Analytical Live Conversion Rate API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch live room conversion analytics." },
      { status: 500 }
    );
  }
}
