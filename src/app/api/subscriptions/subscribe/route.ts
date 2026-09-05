import { NextRequest, NextResponse } from "next/server";
import { SubscriptionService } from "@/modules/subscription";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fanId,
      creatorProfileId,
      productId,
      paymentGateway,
      paymentMethod,
      gatewayTransactionId,
      idempotencyKey,
    } = body;

    if (!fanId || !creatorProfileId || !productId) {
      return NextResponse.json(
        { error: "fanId, creatorProfileId, and productId are required" },
        { status: 400 }
      );
    }

    const result = await SubscriptionService.subscribe({
      fanId,
      creatorProfileId,
      productId,
      paymentGateway,
      paymentMethod,
      gatewayTransactionId,
      idempotencyKey,
    });

    return NextResponse.json(
      {
        success: true,
        message: result.isNewSubscription
          ? "Subscription successfully created."
          : "Subscription successfully reactivated.",
        ...result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process subscription" },
      { status: 500 }
    );
  }
}
