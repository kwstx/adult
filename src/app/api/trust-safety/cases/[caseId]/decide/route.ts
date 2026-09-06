import { NextRequest, NextResponse } from "next/server";
import { CaseService } from "@/modules/trust-safety/case.service";
import { RenderDecisionInput } from "@/modules/trust-safety/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const body = await req.json();
    const {
      reviewerId,
      decision,
      decisionAction,
      decisionNotes,
      policyViolations,
      actionDurationHours,
    } = body;

    if (!reviewerId || !decision || !decisionNotes) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: reviewerId, decision, decisionNotes.",
        },
        { status: 400 }
      );
    }

    const input: RenderDecisionInput = {
      caseId,
      reviewerId,
      decision,
      decisionAction: decisionAction || "NONE",
      decisionNotes,
      policyViolations,
      actionDurationHours,
    };

    const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const resolvedCase = await CaseService.renderDecision(input, {
      actorId: reviewerId,
      actorType: "MODERATOR",
      ipAddress: clientIp,
      userAgent,
    });

    return NextResponse.json({ success: true, case: resolvedCase });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to render decision on case." },
      { status: 500 }
    );
  }
}
