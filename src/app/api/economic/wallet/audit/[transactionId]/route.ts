import { NextRequest, NextResponse } from "next/server";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";

/**
 * GET /api/economic/wallet/audit/[transactionId]
 * Forensic 360-degree audit endpoint answering "The 7 Questions" for any transaction.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params;

    if (!transactionId) {
      return NextResponse.json({ error: "transactionId parameter is required." }, { status: 400 });
    }

    const report = await WalletLedgerService.explainTransaction(transactionId);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error("Forensic audit error:", error);
    if (error.name === "TransactionNotFoundError") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to perform transaction audit." },
      { status: 500 }
    );
  }
}
