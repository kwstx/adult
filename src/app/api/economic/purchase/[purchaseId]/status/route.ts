import { NextRequest, NextResponse } from "next/server";
import { PaymentAdapter } from "@/modules/economic/payment.adapter";

/**
 * GET /api/economic/purchase/[purchaseId]/status
 * 
 * STEP 11:
 * The frontend checks the authoritative purchase and wallet state.
 * The frontend never relies on the browser's payment-success screen;
 * it only trusts the backend after the webhook has been verified and ledger updated.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ purchaseId: string }> }
) {
  try {
    const { purchaseId } = await params;

    if (!purchaseId) {
      return NextResponse.json(
        { error: "Missing purchaseId route parameter." },
        { status: 400 }
      );
    }

    const statusReport = await PaymentAdapter.getPurchaseStatus(purchaseId);

    return NextResponse.json({
      success: true,
      purchase: statusReport,
    });
  } catch (error: any) {
    console.error("[PurchaseStatusError]", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve purchase status." },
      { status: error.message?.includes("not found") ? 404 : 500 }
    );
  }
}
