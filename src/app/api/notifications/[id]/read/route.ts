import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * PATCH /api/notifications/[id]/read
 * Marks a specific notification record as read.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      notification: {
        id: updated.id,
        isRead: updated.isRead,
        readAt: updated.readAt,
      },
    });
  } catch (error: any) {
    console.error("[PATCH /api/notifications/[id]/read] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark notification read." },
      { status: 500 }
    );
  }
}
