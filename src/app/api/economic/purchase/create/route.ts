import { NextRequest, NextResponse } from "next/server";
import { PaymentAdapter } from "@/modules/economic/payment.adapter";

/**
 * POST /api/economic/purchase/create
 * 
 * STEP 4 & 5:
 * The browser asks the backend to create a purchase.
 * The backend creates an internal purchase record (status: INITIALIZED / PENDING_WEBHOOK).
 * 
 * Request body:
 * {
 *   userId: string,
 *   packageId: string, // 'pkg_500' | 'pkg_1100' | 'pkg_6000'
 *   paymentMethod?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, packageId, paymentMethod = "CARD" } = body;

    if (!userId || !packageId) {
      return NextResponse.json(
        { error: "Missing required fields: userId and packageId are required." },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const countryCode = req.headers.get("cf-ipcountry") || "EU";

    const session = await PaymentAdapter.createInternalPurchaseRecord({
      userId,
      packageId,
      paymentMethod,
      ipAddress,
      countryCode,
    });

    return NextResponse.json({
      success: true,
      purchaseId: session.purchaseId,
      sessionId: session.sessionId,
      clientSecret: session.clientSecret,
      redirectUrl: session.redirectUrl,
      package: {
        id: session.packageId,
        totalCredits: session.creditsToGrant,
        baseCredits: session.baseCredits,
        bonusCredits: session.bonusCredits,
        priceFiat: session.priceFiat,
        currency: session.currency,
      },
      status: session.status,
      message: "Internal purchase record created. Awaiting payment provider confirmation.",
    });
  } catch (error: any) {
    console.error("[PurchaseCreateError]", error);
    return NextResponse.json(
      { error: error.message || "Failed to create purchase order." },
      { status: 500 }
    );
  }
}
