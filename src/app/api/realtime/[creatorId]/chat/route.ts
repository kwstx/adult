import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { eventBus } from "@/modules/realtime/event-bus";
import { ModerationService } from "@/modules/trust-safety/moderation.service";

/**
 * POST /api/realtime/[creatorId]/chat
 * Send a chat message in the live room.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const body = await req.json();
    const { senderId, text } = body;

    if (!senderId || !text || text.trim() === "") {
      return NextResponse.json({ error: "Missing senderId or text." }, { status: 400 });
    }

    // Fetch sender
    const user = await prisma.user.findUnique({
      where: { id: senderId },
      include: {
        subscriptionsFan: {
          where: { creatorProfileId: creatorId, status: "ACTIVE" },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Sender not found." }, { status: 404 });
    }

    // Moderation & profanity check
    const { cleanText } = ModerationService.sanitizeChatMessage(text);

    // Determine badge
    let badge: string | null = null;
    if (user.role === "CREATOR") badge = "CREATOR";
    else if (user.role === "ADMIN" || user.role === "MODERATOR") badge = "MOD";
    else if (user.subscriptionsFan && user.subscriptionsFan.length > 0) badge = "VIP";

    // Format chat message
    const chatMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      creatorId,
      senderId: user.id,
      senderName: user.displayName,
      senderRole: user.role,
      senderBadge: badge,
      text: cleanText,
      isTipNotice: false,
      createdAt: new Date().toISOString(),
    };

    // Broadcast over EventBus
    eventBus.publish(`room:${creatorId}`, {
      type: "CHAT_MESSAGE",
      payload: chatMsg,
    });

    return NextResponse.json(chatMsg);
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send chat message." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/realtime/[creatorId]/chat
 * Retrieve recent chat history for newly joined viewers.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  return NextResponse.json([]);
}
