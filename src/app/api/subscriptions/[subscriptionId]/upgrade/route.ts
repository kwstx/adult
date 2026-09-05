import { NextRequest, NextResponse } from "next/server";
import { SubscriptionService } from "@/modules/subscription";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const { subscriptionId } = await params;
    const body = await req.json();
    const { fanId, newProductId, paymentGateway, paymentMethod, idempotencyKey } = body;

    if (!fanId || !newProductId) {
      return NextResponse.json(
        { error: "fanId and newProductId are required" },
        { status: 400 }
      );
    }

    const subscription = await SubscriptionService.upgradeOrDowngrade({
      subscriptionId,
      fanId,
      newProductId,
      paymentGateway,
      paymentMethod,
      idempotencyKey,
    });

    return NextResponse.json({
      success: true,
      message: "Subscription successfully changed to new tier.",
      subscription,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to upgrade subscription" },
      { status: 500 }
    );
  }
}
