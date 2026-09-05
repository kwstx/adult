import { NextRequest } from "next/server";
import { eventBus } from "@/modules/realtime/event-bus";
import { presenceService } from "@/modules/realtime/presence.service";
import { LeaderboardService } from "@/modules/realtime/leaderboard.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/realtime/[creatorId]/sse
 * High-performance Server-Sent Events (SSE) stream for real-time live rooms.
 * Designed for 2,000+ concurrent spectators per creator with sub-5ms event fan-out.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  const { creatorId } = await context.params;
  const searchParams = req.nextUrl.searchParams;
  const userId = searchParams.get("userId") || undefined;
  const displayName = searchParams.get("displayName") || undefined;
  const badge = searchParams.get("badge") || undefined;

  const socketId = `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // 1. Register presence & optionally broadcast VIEWER_JOINED
  const viewerCount = presenceService.joinRoom(
    creatorId,
    socketId,
    userId && displayName ? { userId, displayName, badge } : undefined
  );

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (data: Record<string, unknown>) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      // Stream closed by client
    }
  };

  // 2. Send initial handshake with complete room state
  const initialLeaderboard = LeaderboardService.getTopContributors(creatorId, 5);
  await sendEvent({
    type: "CONNECTED",
    payload: {
      creatorId,
      socketId,
      viewerCount,
      leaderboard: initialLeaderboard,
      connectedAt: new Date().toISOString(),
    },
  });

  // 3. Subscribe to the creator's real-time channel
  const unsubscribe = eventBus.subscribe(`room:${creatorId}`, async (event) => {
    await sendEvent(event as unknown as Record<string, unknown>);
  });

  // 4. Heartbeat keep-alive (every 15s)
  const heartbeatInterval = setInterval(() => {
    sendEvent({
      type: "HEARTBEAT",
      payload: {
        creatorId,
        viewerCount: presenceService.getViewerCount(creatorId),
        timestamp: Date.now(),
      },
    });
  }, 15000);

  // 5. Cleanup on disconnect
  req.signal.addEventListener("abort", () => {
    clearInterval(heartbeatInterval);
    unsubscribe();
    presenceService.leaveRoom(creatorId, socketId, userId);
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
