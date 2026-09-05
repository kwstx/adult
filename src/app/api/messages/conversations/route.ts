import { NextRequest, NextResponse } from "next/server";
import { PaidMessagingService } from "@/modules/messaging/paid-messaging.service";

/**
 * GET /api/messages/conversations
 * Fetch conversation threads with attention prioritization badges & filters.
 *
 * Query params:
 * - userId: Current authenticated user ID
 * - role: 'FAN' | 'CREATOR'
 * - filter: 'all' | 'unread' | 'paid' | 'priority' | 'subscribers' | 'vip'
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "fan_alex";
    const role = (searchParams.get("role")?.toUpperCase() as "FAN" | "CREATOR") || "FAN";
    const filter = (searchParams.get("filter") as any) || "all";

    const conversations = await PaidMessagingService.getConversationsForUser(
      userId,
      role,
      filter
    );

    return NextResponse.json({
      success: true,
      conversations,
      count: conversations.length,
      role,
      filter,
    });
  } catch (error: any) {
    console.error("Fetch conversations error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch conversations." },
      { status: 500 }
    );
  }
}
