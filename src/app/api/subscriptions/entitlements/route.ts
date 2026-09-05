import { NextRequest, NextResponse } from "next/server";
import { EntitlementService } from "@/modules/subscription";

/**
 * Entitlement Authorization Endpoint
 * "Does this fan currently possess entitlement X?"
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fanId = searchParams.get("fanId");
    const creatorProfileId = searchParams.get("creatorProfileId");
    const entitlement = searchParams.get("entitlement");
    const contentId = searchParams.get("contentId");
    const livestreamId = searchParams.get("livestreamId");

    if (!creatorProfileId) {
      return NextResponse.json(
        { error: "creatorProfileId query parameter is required" },
        { status: 400 }
      );
    }

    // If no specific entitlement query, return all entitlements for this fan + creator pair
    if (!entitlement && !contentId) {
      if (!fanId) {
        return NextResponse.json(
          { error: "fanId is required to retrieve entitlement summary" },
          { status: 400 }
        );
      }
      const summary = await EntitlementService.getFanEntitlements(fanId, creatorProfileId);
      return NextResponse.json({
        success: true,
        summary,
      });
    }

    // Specific Content Gate query
    if (contentId) {
      const contentCheck = await EntitlementService.authorizeContentAccess({
        fanId,
        contentId,
      });
      return NextResponse.json({
        success: true,
        ...contentCheck,
      });
    }

    // Specific Entitlement check: "Does this fan currently possess entitlement X?"
    const result = await EntitlementService.hasEntitlement({
      fanId,
      creatorProfileId,
      entitlement: entitlement!,
      context: { livestreamId: livestreamId || undefined },
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to evaluate entitlement" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fanId, creatorProfileId, entitlement, context } = body;

    if (!creatorProfileId || !entitlement) {
      return NextResponse.json(
        { error: "creatorProfileId and entitlement are required" },
        { status: 400 }
      );
    }

    const result = await EntitlementService.hasEntitlement({
      fanId,
      creatorProfileId,
      entitlement,
      context,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to evaluate entitlement" },
      { status: 500 }
    );
  }
}
