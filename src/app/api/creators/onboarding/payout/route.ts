import { NextRequest, NextResponse } from "next/server";
import { CreatorOnboardingService } from "@/modules/creator-verification";

/**
 * POST /api/creators/onboarding/payout
 * Step 6: Configures beneficiary payout method and certifies W-9/W-8BEN tax form.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { creatorProfileId, payout } = body;

    if (!creatorProfileId || !payout) {
      return NextResponse.json(
        { error: "Missing required parameters: creatorProfileId, payout." },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await CreatorOnboardingService.setupPayoutAndTax(
      creatorProfileId,
      payout,
      { actorId: creatorProfileId, actorRole: "CREATOR", ipAddress, userAgent }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Payout Setup Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to configure payout destination." },
      { status: 400 }
    );
  }
}
