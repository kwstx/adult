import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { FraudEnforcementService } from "@/modules/fraud-prevention/enforcement/fraud-enforcement.service";

/**
 * GET /api/risk/reviews
 * Retrieves active delayed fulfillment holds and pending fraud cases for analyst review.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "HELD";

    const [holds, highRiskAssessments] = await Promise.all([
      prisma.walletHold.findMany({
        where: { status },
        include: {
          user: {
            select: { id: true, username: true, email: true, kycStatus: true, createdAt: true },
          },
          wallet: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.riskAssessmentRecord.findMany({
        where: {
          riskScore: { gte: 70 },
        },
        include: {
          user: {
            select: { id: true, username: true, email: true, moderationState: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        activeHolds: holds,
        highRiskAssessments,
      },
    });
  } catch (error: any) {
    console.error("[API:RiskReviews:GET] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch risk reviews." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/risk/reviews
 * Analyst decision execution: RELEASE hold, SEIZE hold, or DISMISS case.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, holdId, analystId, notes } = body;

    if (!action || !holdId || !analystId) {
      return NextResponse.json(
        { error: "Missing required fields: action (RELEASE | SEIZE), holdId, analystId" },
        { status: 400 }
      );
    }

    if (action === "RELEASE") {
      const result = await FraudEnforcementService.releaseHold(holdId, analystId, notes);
      return NextResponse.json(result);
    } else if (action === "SEIZE") {
      const result = await FraudEnforcementService.seizeHold(
        holdId,
        analystId,
        notes || "Fraudulent transaction confirmed by analyst"
      );
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: `Unsupported review action: ${action}` },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("[API:RiskReviews:POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process review action." },
      { status: 500 }
    );
  }
}
