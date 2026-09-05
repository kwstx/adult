import { NextRequest, NextResponse } from "next/server";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";

/**
 * POST /api/economic/wallet/chargeback
 * Webhook endpoint for payment processor chargeback and dispute events.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      gatewayTransactionId,
      paymentTransactionId,
      disputeReferenceId,
      disputeFeeCents,
      reason,
      rawGatewayPayload,
    } = body;

    if (!disputeReferenceId || (!gatewayTransactionId && !paymentTransactionId)) {
      return NextResponse.json(
        { error: "Missing required fields: disputeReferenceId, gatewayTransactionId or paymentTransactionId." },
        { status: 400 }
      );
    }

    const idempotencyKey = req.headers.get("x-idempotency-key") || undefined;

    const result = await WalletLedgerService.processChargebackDispute({
      gatewayTransactionId,
      paymentTransactionId,
      disputeReferenceId,
      disputeFeeCents,
      reason: reason || "Payment disputed by cardholder",
      rawGatewayPayload: typeof rawGatewayPayload === "object" ? JSON.stringify(rawGatewayPayload) : rawGatewayPayload,
      idempotencyKey,
    });

    return NextResponse.json({
      success: true,
      result,
      message: "Chargeback dispute processed; user wallet suspended and credits clawed back.",
    });
  } catch (error: any) {
    console.error("Chargeback handling error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process chargeback." },
      { status: 500 }
    );
  }
}
