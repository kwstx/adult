import { NextRequest } from "next/server";
import { eventBus } from "@/modules/realtime/event-bus";

export const dynamic = "force-dynamic";

/**
 * GET /api/messages/realtime
 * Server-Sent Events (SSE) Real-Time Delivery Engine for Messaging & Conversations.
 * Delivers incoming messages, paid statuses, and inbox updates with zero polling.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const conversationId = searchParams.get("conversationId");
  const creatorId = searchParams.get("creatorId");

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (data: Record<string, unknown>) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      // Stream closed
    }
  };

  // Initial Connected Handshake
  await sendEvent({
    type: "CONNECTED",
    payload: {
      userId,
      conversationId,
      creatorId,
      connectedAt: new Date().toISOString(),
    },
  });

  const unsubscribers: Array<() => void> = [];

  // 1. Subscribe to conversation channel if provided
  if (conversationId) {
    const unsubConv = eventBus.subscribe(`conversation:${conversationId}`, async (event) => {
      await sendEvent(event as unknown as Record<string, unknown>);
    });
    unsubscribers.push(unsubConv);
  }

  // 2. Subscribe to user direct inbox channel
  if (userId) {
    const unsubUser = eventBus.subscribe(`user:${userId}`, async (event) => {
      await sendEvent(event as unknown as Record<string, unknown>);
    });
    unsubscribers.push(unsubUser);
  }

  // 3. Subscribe to creator channel if creator
  if (creatorId) {
    const unsubCreator = eventBus.subscribe(`creator:${creatorId}`, async (event) => {
      await sendEvent(event as unknown as Record<string, unknown>);
    });
    unsubscribers.push(unsubCreator);
  }

  // Heartbeat keep-alive (every 15 seconds)
  const heartbeatInterval = setInterval(() => {
    sendEvent({
      type: "HEARTBEAT",
      payload: { timestamp: Date.now() },
    });
  }, 15000);

  // Teardown on client disconnect
  req.signal.addEventListener("abort", () => {
    clearInterval(heartbeatInterval);
    unsubscribers.forEach((unsub) => unsub());
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
