import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { mediaInfrastructure } from "@/modules/video/media-infrastructure.adapter";
import { eventBus } from "@/modules/realtime/event-bus";
import { MediaInfrastructureWebhookEvent } from "@/modules/video/types";

/**
 * POST /api/video/webhooks
 * 
 * Specialized Streaming Infrastructure Webhook Ingest:
 * The external media server (SRS, LiveKit, Cloudflare Stream, etc.) notifies
 * our application server when:
 * - Stream begins publishing (`stream.published`)
 * - Stream stops publishing (`stream.unpublished`)
 * - Transcode rendition is ready (`transcode.rendition_ready`)
 * - Health metrics arrive (`session.health_metrics`)
 * - Recording file is saved to object store (`recording.completed`)
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-media-signature") || "";

    // Validate webhook authenticity if secret is configured
    if (process.env.NODE_ENV === "production" && signature) {
      const isValid = mediaInfrastructure.validateWebhookSignature(rawBody, signature);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
      }
    }

    const payload: MediaInfrastructureWebhookEvent = JSON.parse(rawBody);

    switch (payload.event) {
      case "stream.published": {
        if (payload.streamKey) {
          const room = await prisma.mediaRoom.findFirst({
            where: { streamKey: payload.streamKey },
            include: { creator: true },
          });

          if (room) {
            await prisma.videoLivestream.updateMany({
              where: { mediaRoomId: room.id, status: "PROVISIONED" },
              data: { status: "BROADCASTING", startedAt: new Date() },
            });

            await prisma.creatorProfile.update({
              where: { id: room.creatorId },
              data: { isLive: true },
            });

            eventBus.publish(`room:${room.creatorId}`, {
              type: "STREAM_HEALTH",
              payload: { isPublishing: true, timestamp: payload.timestamp },
            });
          }
        }
        break;
      }

      case "stream.unpublished": {
        if (payload.streamKey) {
          const room = await prisma.mediaRoom.findFirst({
            where: { streamKey: payload.streamKey },
          });

          if (room) {
            await prisma.videoLivestream.updateMany({
              where: { mediaRoomId: room.id, status: "BROADCASTING" },
              data: { status: "ENDED", endedAt: new Date() },
            });

            await prisma.creatorProfile.update({
              where: { id: room.creatorId },
              data: { isLive: false },
            });

            eventBus.publish(`room:${room.creatorId}`, {
              type: "STREAM_HEALTH",
              payload: { isPublishing: false, timestamp: payload.timestamp },
            });
          }
        }
        break;
      }

      case "recording.completed": {
        if (payload.roomName && payload.recordingUrl) {
          const room = await prisma.mediaRoom.findFirst({
            where: { roomName: payload.roomName },
          });

          if (room) {
            await prisma.videoLivestream.updateMany({
              where: { mediaRoomId: room.id },
              data: { recordingUrl: payload.recordingUrl },
            });
          }
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true, event: payload.event });
  } catch (error: any) {
    console.error("Media webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process media webhook." },
      { status: 500 }
    );
  }
}
