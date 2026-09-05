import { NextRequest, NextResponse } from "next/server";
import { PaidMessagingService } from "@/modules/messaging/paid-messaging.service";

/**
 * GET /api/messages/[conversationId]
 * Retrieve message history for a specific conversation thread and mark unread messages as read.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await context.params;
    const { searchParams } = new URL(req.url);
    const currentUserId = searchParams.get("userId") || undefined;

    const messages = await PaidMessagingService.getMessagesForConversation(
      conversationId,
      currentUserId
    );

    return NextResponse.json({
      success: true,
      conversationId,
      messages,
      count: messages.length,
    });
  } catch (error: any) {
    console.error("Fetch message thread error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load message thread." },
      { status: 500 }
    );
  }
}
