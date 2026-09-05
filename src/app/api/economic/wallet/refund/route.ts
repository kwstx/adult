import { NextRequest, NextResponse } from "next/server";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";

/**
 * POST /api/economic/wallet/refund
 * Admin / System endpoint to atomically reverse/refund a financial transaction.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { originalTransactionId, reason, requestedByUserId, adminUserId } = body;

    if (!originalTransactionId || !reason || !requestedByUserId) {
      return NextResponse.json(
        { error: "Missing required fields: originalTransactionId, reason, requestedByUserId." },
        { status: 400 }
      );
    }

    const idempotencyKey = req.headers.get("x-idempotency-key") || undefined;

    const result = await WalletLedgerService.processRefund({
      originalTransactionId,
      reason,
      requestedByUserId,
      adminUserId,
      idempotencyKey,
    });

    return NextResponse.json({
      success: true,
      result,
      message: `Transaction ${originalTransactionId} successfully refunded.`,
    });
  } catch (error: any) {
    console.error("Refund processing error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process refund." },
      { status: 500 }
    );
  }
}
