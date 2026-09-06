import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { NotificationType } from "@prisma/client";

/**
 * GET /api/notifications
 * Retrieves paginated notifications for the requesting user with unread counters.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "fan_alex";
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const cursor = searchParams.get("cursor");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const type = searchParams.get("type") as NotificationType | undefined;

    const whereClause: any = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
      ...(type ? { type } : {}),
    };

    const [notifications, unreadCount, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        take: limit + 1,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { createdAt: "desc" },
        include: {
          senderUser: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
      prisma.notification.count({
        where: { userId },
      }),
    ]);

    let nextCursor: string | null = null;
    let items = notifications;

    if (notifications.length > limit) {
      const nextItem = notifications.pop();
      nextCursor = nextItem?.id || null;
      items = notifications;
    }

    return NextResponse.json({
      success: true,
      data: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        actionUrl: n.actionUrl,
        isRead: n.isRead,
        readAt: n.readAt,
        metadata: n.metadataJson ? JSON.parse(n.metadataJson) : null,
        createdAt: n.createdAt,
        sender: n.senderUser,
      })),
      pagination: {
        unreadCount,
        totalCount,
        nextCursor,
        hasMore: !!nextCursor,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/notifications] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch notifications." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Mark all notifications as read for a user.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      markedReadCount: result.count,
    });
  } catch (error: any) {
    console.error("[PATCH /api/notifications] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark notifications read." },
      { status: 500 }
    );
  }
}
