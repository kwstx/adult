import { NextRequest, NextResponse } from "next/server";
import { SubscriptionService } from "@/modules/subscription";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fanId = searchParams.get("fanId");

    if (!fanId) {
      return NextResponse.json(
        { error: "fanId query parameter is required" },
        { status: 400 }
      );
    }

    const subscriptions = await SubscriptionService.getSubscriptionsForFan(fanId);

    return NextResponse.json({
      success: true,
      fanId,
      count: subscriptions.length,
      subscriptions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve fan subscriptions" },
      { status: 500 }
    );
  }
}
