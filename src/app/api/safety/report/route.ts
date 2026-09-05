import { NextRequest, NextResponse } from "next/server";
import { ModerationService } from "@/modules/trust-safety/moderation.service";
import prisma from "@/lib/db";

/**
 * POST /api/safety/report
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reporterId, targetUserId, targetStreamId, category, notes } = body;

    if (!reporterId || !category || !notes) {
      return NextResponse.json(
        { error: "reporterId, category, and notes are required." },
        { status: 400 }
      );
    }

    const report = await ModerationService.submitReport({
      reporterId,
      targetUserId,
      targetStreamId,
      category,
      notes,
    });

    return NextResponse.json({
      success: true,
      report,
      message: "Report filed successfully. Trust & Safety team has been alerted.",
    });
  } catch (error: any) {
    console.error("Report filing error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit report." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/safety/report
 * Retrieve moderation queue
 */
export async function GET() {
  const reports = await prisma.moderationReport.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      reporter: { select: { username: true, displayName: true } },
      targetUser: { select: { username: true, displayName: true } },
    },
    take: 50,
  });

  return NextResponse.json({ reports });
}
