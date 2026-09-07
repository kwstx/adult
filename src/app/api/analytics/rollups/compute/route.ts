import { NextRequest, NextResponse } from "next/server";
import { jobDispatcher } from "@/modules/workers";
import { AnalyticsTimeframe } from "@/modules/analytics/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedTimeframe = body.timeframe || "LAST_7_DAYS";
    let workerTimeframe: "DAILY" | "WEEKLY" | "MONTHLY" | "HOURLY" = "WEEKLY";

    if (requestedTimeframe === "LAST_24_HOURS" || requestedTimeframe === "HOURLY") {
      workerTimeframe = "DAILY";
    } else if (requestedTimeframe === "LAST_30_DAYS" || requestedTimeframe === "MONTHLY") {
      workerTimeframe = "MONTHLY";
    } else {
      workerTimeframe = "WEEKLY";
    }

    const creatorId = body.creatorId || undefined;
    const livestreamId = body.livestreamId || undefined;

    const dispatchResult = await jobDispatcher.dispatchAnalyticsCalculation({
      timeframe: workerTimeframe,
      creatorId,
      livestreamId,
    });

    return NextResponse.json({
      success: true,
      jobId: dispatchResult.jobId,
      message: `Analytics calculation job dispatched for timeframe: ${requestedTimeframe}`,
      dispatchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Analytics Rollup Trigger API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger analytics calculation." },
      { status: 500 }
    );
  }
}
