import { NextRequest, NextResponse } from "next/server";
import { PaymentAdapter, CREDIT_PACKAGES } from "@/modules/economic/payment.adapter";
import crypto from "crypto";

/**
 * POST /api/economic/checkout/mock-provider
 * 
 * STEP 6:
 * The payment provider handles payment and fires an authoritative,
 * cryptographically signed server-side webhook back to the backend.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { purchaseId, userId, packageId, paymentMethod = "CARD" } = body;

    if (!userId || !packageId) {
      return NextResponse.json(
        { error: "Missing required parameters: userId and packageId are required." },
        { status: 400 }
      );
    }

    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId) || CREDIT_PACKAGES[0];
    const baseCredits = pkg.credits;
    const bonusCredits = pkg.bonusCredits;
    const amountFiatCents = Math.round(pkg.priceFiat * 100);

    const gatewayTransactionId = `ch_stripe_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const gatewayEventId = `evt_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    const timestamp = Date.now();

    // Construct authoritative server-side webhook payload
    const webhookPayload = {
      eventType: "payment.succeeded" as const,
      gatewayTransactionId,
      gatewayEventId,
      purchaseId: purchaseId || `pur_${Date.now()}`,
      userId,
      packageId: pkg.id,
      amountFiatCents,
      currency: pkg.currency,
      creditsPurchased: baseCredits,
      bonusCredits,
      paymentMethod,
      timestamp,
    };

    // Sign payload with HMAC-SHA256
    const signature = PaymentAdapter.signWebhookPayload(webhookPayload, timestamp);

    // STEP 7, 8, 9, 10: Dispatch and verify server-side webhook
    const settlement = await PaymentAdapter.handlePaymentWebhook({
      rawPayload: webhookPayload,
      signature,
      timestamp,
    });

    return NextResponse.json({
      success: true,
      providerMessage: "Payment processed successfully by provider and confirmed via signed server webhook.",
      transactionId: gatewayTransactionId,
      signature,
      settlement,
      package: {
        id: pkg.id,
        name: pkg.name,
        totalCredits: baseCredits + bonusCredits,
        priceFiat: pkg.priceFiat,
        currency: pkg.currency,
      },
    });
  } catch (error: any) {
    console.error("[MockProviderError]", error);
    return NextResponse.json(
      { error: error.message || "Provider payment execution failed." },
      { status: 500 }
    );
  }
}
