import { NextRequest, NextResponse } from "next/server";
import { CaseService } from "@/modules/trust-safety/case.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const body = await req.json();
    const { action } = body; // "SUBMIT" or "REVIEW"

    const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    if (action === "SUBMIT" || !action) {
      const { appellantUserId, appealReason, appealEvidenceItems } = body;

      if (!appellantUserId || !appealReason) {
        return NextResponse.json(
          {
            success: false,
            error: "appellantUserId and appealReason are required to submit an appeal.",
          },
          { status: 400 }
        );
      }

      const appealedCase = await CaseService.submitAppeal(
        {
          caseId,
          appellantUserId,
          appealReason,
          appealEvidenceItems,
        },
        {
          actorId: appellantUserId,
          actorType: "USER",
          ipAddress: clientIp,
          userAgent,
        }
      );

      return NextResponse.json({ success: true, case: appealedCase });
    } else if (action === "REVIEW") {
      const { reviewerId, overturnDecision, decisionNotes } = body;

      if (!reviewerId || overturnDecision === undefined || !decisionNotes) {
        return NextResponse.json(
          {
            success: false,
            error: "reviewerId, overturnDecision (boolean), and decisionNotes are required.",
          },
          { status: 400 }
        );
      }

      const decidedAppealCase = await CaseService.reviewAppeal(
        {
          caseId,
          reviewerId,
          overturnDecision: Boolean(overturnDecision),
          decisionNotes,
        },
        {
          actorId: reviewerId,
          actorType: "ADMIN",
          ipAddress: clientIp,
          userAgent,
        }
      );

      return NextResponse.json({ success: true, case: decidedAppealCase });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be 'SUBMIT' or 'REVIEW'." },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process appeal action." },
      { status: 500 }
    );
  }
}
