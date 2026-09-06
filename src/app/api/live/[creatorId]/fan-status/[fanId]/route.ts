import { NextRequest, NextResponse } from "next/server";
import { FanStatusService } from "@/modules/relationship/fan-status.service";
import { prisma } from "@/lib/db";

/**
 * GET /api/live/[creatorId]/fan-status/[fanId]
 * Retrieve authoritative, role-asymmetric fan status.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string; fanId: string }> }
) {
  try {
    const { creatorId, fanId } = await context.params;
    const url = new URL(req.url);
    const requestingUserId = url.searchParams.get("requestingUserId");

    const result = await FanStatusService.getFanStatus(
      fanId,
      creatorId,
      requestingUserId
    );

    return NextResponse.json({
      success: true,
      roleView: result.roleView,
      data: result.data,
    });
  } catch (error: any) {
    console.error("Failed to retrieve fan status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to retrieve fan status",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/live/[creatorId]/fan-status/[fanId]
 * Update creator private relationship notes.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string; fanId: string }> }
) {
  try {
    const { creatorId, fanId } = await context.params;
    const body = await req.json();
    const { note } = body;

    // Resolve creator profile
    const creator = await prisma.creatorProfile.findFirst({
      where: {
        OR: [{ id: creatorId }, { userId: creatorId }],
      },
    }).catch(() => null);

    if (creator) {
      await prisma.creatorRelationship.updateMany({
        where: {
          fanId,
          creatorProfileId: creator.id,
        },
        data: {
          customNickname: note,
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: "Note saved successfully.",
    });
  } catch (error: any) {
    console.error("Failed to save fan note:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to save note",
      },
      { status: 500 }
    );
  }
}
