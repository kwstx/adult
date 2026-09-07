import { NextRequest, NextResponse } from "next/server";
import { CreatorOnboardingService } from "@/modules/creator-verification";

/**
 * POST /api/creators/onboarding/activate
 * Step 7: Final monetization activation gate.
 * Validates all prerequisite stages and transitions creator to MONETIZATION_ENABLED.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { creatorProfileId, activation } = body;

    if (!creatorProfileId) {
      return NextResponse.json(
        { error: "Missing required parameter: creatorProfileId." },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await CreatorOnboardingService.enableMonetization(
      creatorProfileId,
      activation,
      { actorId: creatorProfileId, actorRole: "CREATOR", ipAddress, userAgent }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Monetization Activation Error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to enable monetization.",
        code: error.code || "MONETIZATION_ACTIVATION_FAILED",
      },
      { status: 400 }
    );
  }
}
