import { NextRequest, NextResponse } from "next/server";
import { SubscriptionService } from "@/modules/subscription";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const { subscriptionId } = await params;
    const body = await req.json();
    const { fanId } = body;

    const subscription = await SubscriptionService.resume({
      subscriptionId,
      fanId,
    });

    return NextResponse.json({
      success: true,
      message: "Subscription successfully resumed.",
      subscription,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to resume subscription" },
      { status: 500 }
    );
  }
}
