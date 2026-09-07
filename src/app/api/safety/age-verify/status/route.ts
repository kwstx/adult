import { NextRequest, NextResponse } from "next/server";
import { AgeEntitlementService, AgeEntitlement } from "@/modules/trust-safety/age-verification";

/**
 * GET /api/safety/age-verify/status
 * 
 * Query current age verification status, provider reference, and assurance level.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || req.headers.get("x-user-id");
    const jurisdiction =
      searchParams.get("jurisdiction") ||
      req.headers.get("x-jurisdiction-code") ||
      "DEFAULT";

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required parameter: userId" },
        { status: 400 }
      );
    }

    const evaluation = await AgeEntitlementService.evaluateEntitlement(
      userId,
      AgeEntitlement.ADULT_MEDIA_PLAYBACK,
      { jurisdictionCode: jurisdiction }
    );

    return NextResponse.json({
      success: true,
      userId,
      isVerified: evaluation.hasEntitlement,
      status: evaluation.status,
      assuranceLevel: evaluation.assuranceLevel,
      requiredLevel: evaluation.requiredLevel,
      jurisdiction: evaluation.jurisdiction,
      provider: evaluation.provider,
      providerReference: evaluation.providerReference,
      verifiedAt: evaluation.verifiedAt,
      expiresAt: evaluation.expiresAt,
      isExpired: evaluation.isExpired,
      rejectionReason: evaluation.rejectionReason,
    });
  } catch (error: any) {
    console.error("Age verification status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to query age status." },
      { status: 500 }
    );
  }
}
