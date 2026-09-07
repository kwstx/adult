import { NextRequest, NextResponse } from "next/server";
import { PaymentAdapter } from "@/modules/economic/payment.adapter";
import { eventBus } from "@/modules/realtime/event-bus";

/**
 * POST /api/payments/webhook
 * Authoritative provider webhook fulfillment endpoint.
 * Validates HMAC-SHA256 signature, asserts idempotency, and credits wallet ledger atomically.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") || req.headers.get("stripe-signature") || "";
    const timestampHeader = req.headers.get("x-timestamp") || "";
    const timestamp = parseInt(timestampHeader, 10) || Date.now();

    if (!rawBody) {
      return NextResponse.json({ success: false, error: "Missing webhook payload." }, { status: 400 });
    }

    if (!signature) {
      return NextResponse.json(
        { success: false, error: "Missing required cryptographic signature header (X-Signature)." },
        { status: 401 }
      );
    }

    const settlement = await PaymentAdapter.handlePaymentWebhook({
      rawPayload: rawBody,
      signature,
      timestamp,
    });

    try {
      const parsedPayload = JSON.parse(rawBody);
      if (settlement.success && parsedPayload.userId) {
        eventBus.publish(`wallet:${parsedPayload.userId}`, {
          type: "ROOM_STATUS" as any,
          payload: {
            eventType: "WALLET_DEPOSIT_SETTLED",
            userId: parsedPayload.userId,
            newBalance: settlement.newWalletBalance,
            creditsMinted: settlement.creditsMinted,
            transactionId: settlement.transactionId,
            timestamp: settlement.settledAt,
          },
        });
      }
    } catch {
      // Ignore JSON parse error on notification
    }

    return NextResponse.json({
      success: true,
      verified: true,
      settlement,
      message: "Webhook verified successfully. Ledger credited atomically.",
    });
  } catch (error: any) {
    console.error("[PaymentWebhookError]", error.message);
    const isAuthError = error.message.includes("signature") || error.message.includes("Unauthorized");
    return NextResponse.json(
      { success: false, error: error.message || "Webhook processing failed." },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
