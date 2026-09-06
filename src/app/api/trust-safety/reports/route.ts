import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { CaseService } from "@/modules/trust-safety/case.service";
import { AuditService } from "@/modules/trust-safety/audit.service";
import { ReportedObjectType, ReportCategory } from "@/modules/trust-safety/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      reporterId,
      targetUserId,
      targetCreatorProfileId,
      targetContentId,
      targetLivestreamId,
      targetMessageId,
      category,
      description,
      evidenceUrls,
    } = body;

    if (!reporterId || !category || !description) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: reporterId, category, description." },
        { status: 400 }
      );
    }

    const evidenceUrlsJson = evidenceUrls ? JSON.stringify(evidenceUrls) : null;

    // 1. Create Report record
    const report = await prisma.report.create({
      data: {
        reporterId,
        reportedUserId: targetUserId || null,
        reportedCreatorProfileId: targetCreatorProfileId || null,
        reportedContentId: targetContentId || null,
        reportedLivestreamId: targetLivestreamId || null,
        reportedMessageId: targetMessageId || null,
        category: category as ReportCategory,
        description,
        evidenceUrls: evidenceUrlsJson,
        status: "OPEN",
      },
    });

    // 2. Determine target object type and ID for automated case generation
    let reportedObjectType: ReportedObjectType = "ACCOUNT";
    let reportedObjectId = targetUserId || reporterId;

    if (targetContentId) {
      reportedObjectType = "CONTENT";
      reportedObjectId = targetContentId;
    } else if (targetCreatorProfileId) {
      reportedObjectType = "CREATOR";
      reportedObjectId = targetCreatorProfileId;
    } else if (targetLivestreamId) {
      reportedObjectType = "LIVESTREAM";
      reportedObjectId = targetLivestreamId;
    } else if (targetMessageId) {
      reportedObjectType = "MESSAGE";
      reportedObjectId = targetMessageId;
    }

    const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    // 3. Automatically spawn a Moderation Case
    const moderationCase = await CaseService.createCase(
      {
        sourceReportId: report.id,
        reportedObjectType,
        reportedObjectId,
        reporterId,
        reporterType: "USER",
        reasonCategory: category as ReportCategory,
        reason: description,
        evidenceItems: evidenceUrls
          ? evidenceUrls.map((url: string, index: number) => ({
              id: `ev-${report.id}-${index}`,
              type: "URL_LINK",
              url,
              capturedAt: new Date().toISOString(),
            }))
          : undefined,
      },
      {
        actorId: reporterId,
        actorType: "USER",
        ipAddress: clientIp,
        userAgent,
      }
    );

    // 4. Audit event for report creation
    await AuditService.logEvent(
      {
        action: "SAFETY_REPORT_FILED",
        targetEntityType: "Report",
        targetEntityId: report.id,
        reason: description,
        actorId: reporterId,
        actorType: "USER",
        ipAddress: clientIp,
        userAgent,
        metadata: {
          category,
          caseId: moderationCase.id,
          caseNumber: moderationCase.caseNumber,
        },
      },
      {
        actorId: reporterId,
        actorType: "USER",
        ipAddress: clientIp,
        userAgent,
      }
    );

    return NextResponse.json(
      {
        success: true,
        report,
        case: moderationCase,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit safety report." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const reporterId = searchParams.get("reporterId") || undefined;
    const reportedUserId = searchParams.get("reportedUserId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where: any = {};
    if (status) where.status = status;
    if (reporterId) where.reporterId = reporterId;
    if (reportedUserId) where.reportedUserId = reportedUserId;

    const [total, reports] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          reporter: {
            select: { id: true, username: true, displayName: true },
          },
          moderationCases: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      total,
      limit,
      offset,
      reports,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch reports." },
      { status: 500 }
    );
  }
}
