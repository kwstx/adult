import { NextRequest, NextResponse } from "next/server";
import { CreatorOnboardingService } from "@/modules/creator-verification";

/**
 * POST /api/creators/onboarding/apply
 * Step 1: Initiates a new creator application for an authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, stageName, category, bio } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required parameter: userId." },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await CreatorOnboardingService.startApplication(
      userId,
      { stageName, category, bio },
      { actorId: userId, actorRole: "FAN", ipAddress, userAgent }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Creator Onboarding Application Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initialize creator application." },
      { status: 500 }
    );
  }
}
