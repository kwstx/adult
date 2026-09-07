import { NextRequest, NextResponse } from "next/server";
import { AgeEntitlementService } from "@/modules/trust-safety/age-verification";

/**
 * GET /api/safety/age-verify/entitlements
 * 
 * Returns full breakdown of all age-based feature entitlements for a user.
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

    const summary = await AgeEntitlementService.getUserEntitlementsSummary(userId, jurisdiction);

    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (error: any) {
    console.error("Age entitlements query error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to query entitlements." },
      { status: 500 }
    );
  }
}
