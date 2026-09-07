import { NextRequest, NextResponse } from "next/server";
import { CreatorOnboardingService } from "@/modules/creator-verification";

/**
 * POST /api/creators/onboarding/information
 * Step 2: Collects required profile, contact, and legal information.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { creatorProfileId, information } = body;

    if (!creatorProfileId || !information) {
      return NextResponse.json(
        { error: "Missing required parameters: creatorProfileId, information." },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await CreatorOnboardingService.submitRequiredInformation(
      creatorProfileId,
      information,
      { actorId: creatorProfileId, actorRole: "CREATOR", ipAddress, userAgent }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Creator Information Submission Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit creator information." },
      { status: 400 }
    );
  }
}
