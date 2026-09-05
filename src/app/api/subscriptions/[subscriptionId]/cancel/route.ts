import { NextRequest, NextResponse } from "next/server";
import { SubscriptionService } from "@/modules/subscription";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const { subscriptionId } = await params;
    const body = await req.json();
    const { fanId, creatorProfileId, reason, cancelImmediately } = body;

    const subscription = await SubscriptionService.cancel({
      subscriptionId,
      fanId,
      creatorProfileId,
      reason,
      cancelImmediately: Boolean(cancelImmediately),
    });

    return NextResponse.json({
      success: true,
      message: cancelImmediately
        ? "Subscription cancelled immediately."
        : "Subscription will cancel at current period end.",
      subscription,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
