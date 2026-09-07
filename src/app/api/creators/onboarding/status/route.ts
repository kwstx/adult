import { NextRequest, NextResponse } from "next/server";
import { CreatorOnboardingService } from "@/modules/creator-verification";

/**
 * GET /api/creators/onboarding/status?creatorId=...
 * Returns the transparent multi-step progress, completion matrix, blockers,
 * and current authorization permissions for the creator.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const creatorId = searchParams.get("creatorId") || searchParams.get("userId");

    if (!creatorId) {
      return NextResponse.json(
        { error: "Missing required query parameter: creatorId or userId." },
        { status: 400 }
      );
    }

    const progress = await CreatorOnboardingService.getOnboardingProgress(creatorId);

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error: any) {
    console.error("Onboarding Status Fetch Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve onboarding status." },
      { status: 404 }
    );
  }
}
