import { NextRequest, NextResponse } from "next/server";
import { FunnelAnalyticsService } from "@/modules/analytics/event-funnel/funnel-analytics.service";

/**
 * GET /api/analytics/funnel
 * Returns multi-stage funnel conversion analysis, step-by-step drop-off %,
 * and bottleneck diagnosis across the 16 user journey stages.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeframe = (searchParams.get("timeframe") as any) || "LAST_7_DAYS";
    const creatorProfileId = searchParams.get("creatorProfileId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const result = await FunnelAnalyticsService.getFunnelAnalysis({
      timeframe,
      creatorProfileId,
      startDate,
      endDate,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Funnel Analytics API] Error calculating funnel analysis:", error);
    return NextResponse.json(
      { error: error.message || "Failed to calculate funnel analysis." },
      { status: 500 }
    );
  }
}
