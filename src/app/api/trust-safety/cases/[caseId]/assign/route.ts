import { NextRequest, NextResponse } from "next/server";
import { CaseService } from "@/modules/trust-safety/case.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const { caseId } = await params;
    const body = await req.json();
    const { reviewerId } = body;

    if (!reviewerId) {
      return NextResponse.json(
        { success: false, error: "reviewerId is required." },
        { status: 400 }
      );
    }

    const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const updatedCase = await CaseService.assignReviewer(caseId, reviewerId, {
      actorId: reviewerId,
      actorType: "MODERATOR",
      ipAddress: clientIp,
      userAgent,
    });

    return NextResponse.json({ success: true, case: updatedCase });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to assign case reviewer." },
      { status: 500 }
    );
  }
}
