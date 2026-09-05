import { NextRequest, NextResponse } from "next/server";
import { PaymentAdapter } from "@/modules/economic/payment.adapter";
import prisma from "@/lib/db";

/**
 * POST /api/economic/checkout/mock-provider
 * Simulates creation of a payment gateway checkout session or immediate test payment execution.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, packageId } = body;

    if (!userId || !packageId) {
      return NextResponse.json(
        { error: "Missing required fields: userId, packageId" },
        { status: 400 }
      );
    }

    const session = await PaymentAdapter.createCheckoutSession(userId, packageId);

    // In a test/development environment, we can immediately settle the transaction
    const webhookPayload = {
      signature: "wh_valid_test_signature",
      transactionId: `txn_card_${Date.now()}`,
      userId,
      packageId,
      credits: session.creditsToGrant,
      currency: "USD",
      amountPaid: session.priceUsd,
    };

    const settlement = await PaymentAdapter.handlePaymentWebhook(webhookPayload);

    return NextResponse.json({
      success: true,
      session,
      settlement,
      message: `Successfully loaded ${session.creditsToGrant} tokens to your wallet!`,
    });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Checkout session generation failed." },
      { status: 500 }
    );
  }
}
