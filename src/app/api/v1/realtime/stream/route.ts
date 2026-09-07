import { NextRequest } from "next/server";
import { eventBus } from "@/modules/realtime/event-bus";
import { presenceService } from "@/modules/realtime/presence.service";
import { MobileRealtimeService } from "@/modules/mobile";
import { verifyUserToken } from "@/lib/api-handler";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/realtime/stream
 * Native mobile SSE streaming endpoint supporting token auth, sequence tracking, and heartbeats.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const creatorId = searchParams.get("creatorId");
  const rawLastSeq = searchParams.get("lastSeq") || "0";
  const lastKnownSeq = parseInt(rawLastSeq, 10) || 0;
  const token = searchParams.get("token") || req.headers.get("authorization")?.replace("Bearer ", "");

  if (!creatorId) {
    return new Response(JSON.stringify({ error: "creatorId is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let userId: string | undefined = undefined;
  let username: string | undefined = undefined;

  if (token) {
    try {
      const decoded = verifyUserToken(token);
      userId = decoded.userId;
      username = decoded.username;
    } catch {}
  }

  const socketId = `mob_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Register room presence
  const viewerCount = presenceService.joinRoom(
    creatorId,
    socketId,
    userId && username ? { userId, displayName: username } : undefined
  );

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (data: Record<string, unknown>) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      // Socket closed
    }
  };

  // 1. Send Handshake
  await sendEvent({
    type: "CONNECTED",
    payload: {
      creatorId,
      socketId,
      viewerCount,
      connectedAt: new Date().toISOString(),
    },
  });

  // 2. Catch up on missed events if lastKnownSeq was provided
  if (lastKnownSeq > 0) {
    const syncRes = await MobileRealtimeService.syncMissedEvents({
      channel: `room:${creatorId}`,
      lastKnownSeq,
    });
    for (const evt of syncRes.missedEvents) {
      await sendEvent({
        type: evt.type,
        payload: evt,
      });
    }
  }

  // 3. Subscribe to real-time events on channel
  const unsubscribe = eventBus.subscribe(`room:${creatorId}`, async (event) => {
    await sendEvent(event as unknown as Record<string, unknown>);
  });

  // 4. Heartbeat keep-alive (15s)
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
