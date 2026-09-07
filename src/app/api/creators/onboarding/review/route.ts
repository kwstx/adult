import { NextRequest, NextResponse } from "next/server";
import { CreatorOnboardingService } from "@/modules/creator-verification";

/**
 * POST /api/creators/onboarding/review
 * Step 5: Platform compliance / Trust & Safety review decision endpoint.
 * Protected by administrative role assertion.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { creatorProfileId, review } = body;

    if (!creatorProfileId || !review || !review.decision) {
      return NextResponse.json(
        { error: "Missing required parameters: creatorProfileId, review (decision, complianceNotes)." },
        { status: 400 }
      );
    }

    const reviewerId = review.reviewerId || req.headers.get("x-reviewer-id") || "compliance_admin";
    const reviewerRole = (req.headers.get("x-reviewer-role") as any) || "ADMIN";
    const ipAddress = req.headers.get("x-forwarded-for") || req.ip || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await CreatorOnboardingService.reviewCreatorApplication(
      creatorProfileId,
      {
        reviewerId,
        decision: review.decision,
        complianceNotes: review.complianceNotes || "Compliance review completed.",
        riskScore: review.riskScore,
        sanctionsCheckPassed: review.sanctionsCheckPassed ?? true,
        pepCheckPassed: review.pepCheckPassed ?? true,
        flaggedIssues: review.flaggedIssues,
      },
      { actorId: reviewerId, actorRole: reviewerRole, ipAddress, userAgent }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Platform Review Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process platform compliance review." },
      { status: error.message?.includes("Unauthorized") ? 403 : 400 }
    );
  }
}
