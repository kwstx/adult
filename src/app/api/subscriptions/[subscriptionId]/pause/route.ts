import { NextRequest, NextResponse } from "next/server";
import { SubscriptionService } from "@/modules/subscription";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const { subscriptionId } = await params;
    const body = await req.json();
    const { fanId, resumeDate, reason } = body;

    const parsedResumeDate = resumeDate ? new Date(resumeDate) : undefined;

    const subscription = await SubscriptionService.pause({
      subscriptionId,
      fanId,
      resumeDate: parsedResumeDate,
      reason,
    });

    return NextResponse.json({
      success: true,
      message: "Subscription successfully paused.",
      subscription,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to pause subscription" },
      { status: 500 }
    );
  }
}
