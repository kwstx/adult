import { NextRequest, NextResponse } from "next/server";
import { PaymentAdapter } from "@/modules/economic/payment.adapter";
import { eventBus } from "@/modules/realtime/event-bus";

/**
 * POST /api/economic/webhooks/payment
 * 
 * STEP 7, 8, 9, 10:
 * 7. The provider sends a server-side confirmation to your backend.
 * 8. The backend verifies the webhook signature (HMAC-SHA256) & replay window.
 * 9. The backend marks the payment successful.
 * 10. The wallet ledger receives the credit transaction atomically.
 * 
 * This is safer than trusting the browser's payment-success screen!
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") || req.headers.get("stripe-signature") || "";
    const timestampHeader = req.headers.get("x-timestamp") || "";
    const timestamp = parseInt(timestampHeader, 10) || Date.now();

    if (!rawBody) {
      return NextResponse.json(
        { error: "Missing webhook payload." },
        { status: 400 }
      );
    }

    if (!signature) {
      return NextResponse.json(
        { error: "Missing required cryptographic signature header (X-Signature)." },
        { status: 401 }
      );
    }

    // Authoritative settlement via PaymentAdapter & WalletLedgerService
    const settlement = await PaymentAdapter.handlePaymentWebhook({
      rawPayload: rawBody,
      signature,
      timestamp,
    });

    // Broadcast authoritative wallet update to connected frontend clients
    const parsedPayload = JSON.parse(rawBody);
    if (settlement.success && parsedPayload.userId) {
      eventBus.publish(`wallet:${parsedPayload.userId}`, {
        type: "ROOM_STATUS" as any, // fallback standard type with wallet metadata
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

    return NextResponse.json({
      received: true,
      verified: true,
      settlement,
      message: "Webhook verified successfully. Ledger credited atomically.",
    });
  } catch (error: any) {
    console.error("[PaymentWebhookError]", error.message);

    const isAuthError = error.message.includes("signature") || error.message.includes("Unauthorized");
    return NextResponse.json(
      { error: error.message || "Webhook verification and processing failed." },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
