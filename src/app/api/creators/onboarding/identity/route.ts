import { NextRequest, NextResponse } from "next/server";
import { CreatorOnboardingService } from "@/modules/creator-verification";

/**
 * POST /api/creators/onboarding/identity
 * Step 3: Identity verification (KYC, Gov ID front/back, biometric selfie, age assurance >= 18).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { creatorProfileId, identity } = body;

    if (!creatorProfileId || !identity) {
      return NextResponse.json(
        { error: "Missing required parameters: creatorProfileId, identity." },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await CreatorOnboardingService.submitIdentityVerification(
      creatorProfileId,
      identity,
      { actorId: creatorProfileId, actorRole: "CREATOR", ipAddress, userAgent }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Identity Verification Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to complete identity verification." },
      { status: 400 }
    );
  }
}
