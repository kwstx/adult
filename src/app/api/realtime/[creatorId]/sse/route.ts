import { NextRequest } from "next/server";
import { eventBus } from "@/modules/realtime/event-bus";
import { presenceService } from "@/modules/realtime/presence.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/realtime/[creatorId]/sse
 * High-performance Server-Sent Events (SSE) stream for real-time live events.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  const { creatorId } = await context.params;
  const socketId = `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Register presence
  presenceService.joinRoom(creatorId, socketId);

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial connected handshake
  const sendEvent = async (data: Record<string, unknown>) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      // Stream closed
    }
  };

  await sendEvent({
    type: "CONNECTED",
    payload: {
      creatorId,
      socketId,
      viewerCount: presenceService.getViewerCount(creatorId),
      connectedAt: new Date().toISOString(),
    },
  });

  // Subscribe to room events on the EventBus
  const unsubscribe = eventBus.subscribe(`room:${creatorId}`, async (event) => {
    await sendEvent(event as unknown as Record<string, unknown>);
  });

  // Keep-alive heartbeat interval
  const heartbeatInterval = setInterval(() => {
    sendEvent({
      type: "HEARTBEAT",
      payload: {
        viewerCount: presenceService.getViewerCount(creatorId),
        timestamp: Date.now(),
      },
    });
  }, 15000);

  // Clean up on disconnect
  req.signal.addEventListener("abort", () => {
    clearInterval(heartbeatInterval);
    unsubscribe();
    presenceService.leaveRoom(creatorId, socketId);
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
