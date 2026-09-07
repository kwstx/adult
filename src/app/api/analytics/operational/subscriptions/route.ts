import { NextRequest, NextResponse } from "next/server";
import { OperationalDataService } from "@/modules/analytics/operational-data.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;
    const creatorProfileId = searchParams.get("creatorProfileId") || undefined;

    const subscriptionsView = await OperationalDataService.getActiveSubscriptions({
      userId,
      creatorProfileId,
    });

    return NextResponse.json(subscriptionsView);
  } catch (error: any) {
    console.error("[Operational Subscriptions API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch active subscriptions." },
      { status: 500 }
    );
  }
}
