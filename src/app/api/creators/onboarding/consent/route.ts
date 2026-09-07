import { NextRequest, NextResponse } from "next/server";
import { CreatorOnboardingService } from "@/modules/creator-verification";

/**
 * POST /api/creators/onboarding/consent
 * Step 4: 18 U.S.C. § 2257 statutory statement, performer release, and content provenance declaration.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { creatorProfileId, consent } = body;

    if (!creatorProfileId || !consent) {
      return NextResponse.json(
        { error: "Missing required parameters: creatorProfileId, consent." },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await CreatorOnboardingService.satisfyConsentAndProvenance(
      creatorProfileId,
      consent,
      { actorId: creatorProfileId, actorRole: "CREATOR", ipAddress, userAgent }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Consent & Provenance Submission Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process consent and provenance records." },
      { status: 400 }
    );
  }
}
