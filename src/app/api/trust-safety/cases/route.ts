import { NextRequest, NextResponse } from "next/server";
import { CaseService } from "@/modules/trust-safety/case.service";
import { CreateCaseInput } from "@/modules/trust-safety/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const reportedObjectType = searchParams.get("reportedObjectType") || undefined;
    const appealStatus = searchParams.get("appealStatus") || undefined;
    const reviewerId = searchParams.get("reviewerId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await CaseService.listCases({
      status,
      priority,
      reportedObjectType,
      appealStatus,
      reviewerId,
      limit,
      offset,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve moderation cases." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      reportedObjectType,
      reportedObjectId,
      reasonCategory,
      reason,
      evidenceItems,
      reporterId,
      reporterType,
      priority,
      sourceReportId,
    } = body;

    if (!reportedObjectType || !reportedObjectId || !reason) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: reportedObjectType, reportedObjectId, reason." },
        { status: 400 }
      );
    }

    const input: CreateCaseInput = {
      reportedObjectType,
      reportedObjectId,
      reasonCategory: reasonCategory || "OTHER",
      reason,
      evidenceItems,
      reporterId,
      reporterType: reporterType || "USER",
      priority,
      sourceReportId,
    };

    const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const moderationCase = await CaseService.createCase(input, {
      actorId: reporterId,
      actorType: reporterType || "USER",
      ipAddress: clientIp,
      userAgent,
    });

    return NextResponse.json({ success: true, case: moderationCase }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create moderation case." },
      { status: 500 }
    );
  }
}
