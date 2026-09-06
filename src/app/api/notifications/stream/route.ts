import { NextRequest } from "next/server";
import { eventBus } from "@/modules/realtime/event-bus";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications/stream?userId=...
 * Server-Sent Events (SSE) real-time notification stream for connected clients.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return new Response(JSON.stringify({ error: "userId query parameter is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userChannel = `user:${userId}`;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Send initial connected event
      const initialPayload = JSON.stringify({
        event: "CONNECTED",
        userId,
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(encoder.encode(`event: connected\ndata: ${initialPayload}\n\n`));

      // 2. Subscribe to user-specific notification events
      const unsubscribe = eventBus.subscribe(userChannel, (event) => {
        if (event.type === ("NOTIFICATION" as any)) {
          const data = JSON.stringify(event.payload);
          controller.enqueue(encoder.encode(`event: notification\ndata: ${data}\n\n`));
        }
      });

      // 3. Heartbeat keepalive ping every 15 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      // 4. Handle client abort/close
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
