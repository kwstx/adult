import prisma from "@/lib/db";
import { mediaInfrastructure } from "./media-infrastructure.adapter";
import { VideoAuthService } from "./video-auth.service";
import { eventBus } from "@/modules/realtime/event-bus";
import {
  StreamStatus,
  StreamMode,
  AudienceRulesConfig,
  LivestreamRelationGraph,
  Interactive1on1SessionPayload,
} from "./types";

export class VideoRoomService {
  /**
   * Start a Live Broadcast.
   */
  static async startBroadcast(params: {
    creatorUserId: string;
    title: string;
    category: string;
    tags?: string[];
    streamMode?: StreamMode;
    audienceRules?: Partial<AudienceRulesConfig>;
  }) {
    const {
      creatorUserId,
      title,
      category,
      tags = ["interactive", "live"],
      streamMode = "PUBLIC_BROADCAST",
      audienceRules,
    } = params;

    const auth = await VideoAuthService.authorizePublisher(creatorUserId);
    if (!auth.allowed || !auth.creator) {
      throw new Error(auth.reason || "Unauthorized to broadcast.");
    }

    const creator = auth.creator;

    // Create Livestream Record
    const stream = await prisma.livestream.create({
      data: {
        creatorProfileId: creator.id,
        title,
        category,
        tags: tags.join(","),
        streamMode: streamMode as any,
        status: "LIVE",
        ticketPriceCredits: audienceRules?.ticketPriceCredits ?? 0,
        mediaRoomId: `room_${creator.id.substring(0, 8)}`,
        rtmpIngestUrl: `rtmp://ingest.live.streamplatform.local/live/${creator.streamKey}`,
        whipIngestUrl: `${process.env.MEDIA_CDN_BASE_URL || "https://edge.live.streamplatform.local"}/api/whip/${creator.streamKey}`,
        hlsPlaybackUrl: `${process.env.MEDIA_CDN_BASE_URL || "https://cdn.platform.local"}/hls/stream_${creator.id}/index.m3u8`,
        whepPlaybackUrl: `${process.env.MEDIA_CDN_BASE_URL || "https://edge.live.streamplatform.local"}/api/whep/stream_${creator.id}`,
        startedAt: new Date(),
      },
    });

    // Mark Creator as LIVE
    await prisma.creatorProfile.update({
      where: { id: creator.id },
      data: {
        isLive: true,
      },
    });

    // Notify Real-Time Event Bus
    eventBus.publish(`room:${creator.id}`, {
      type: "ROOM_STATUS",
      payload: {
        action: "LIVESTREAM_STARTED",
        livestreamId: stream.id,
        title: stream.title,
        streamMode: stream.streamMode,
        startedAt: stream.startedAt,
      },
    });

    return { livestream: stream, credentials: auth.credentials };
  }

  /**
   * End a Live Broadcast.
   */
  static async endBroadcast(creatorUserId: string, livestreamId: string) {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId: creatorUserId },
    });

    if (!creator) throw new Error("Creator not found.");

    const stream = await prisma.livestream.update({
      where: { id: livestreamId },
      data: {
        status: "ENDED",
        endedAt: new Date(),
      },
    });

    await prisma.creatorProfile.update({
      where: { id: creator.id },
      data: {
        isLive: false,
      },
    });

    eventBus.publish(`room:${creator.id}`, {
      type: "ROOM_STATUS",
      payload: {
        action: "LIVESTREAM_ENDED",
        livestreamId: stream.id,
        endedAt: stream.endedAt,
      },
    });

    return { livestream: stream };
  }

  /**
   * Get Active Stream Graph for a creator.
   */
  static async getActiveStream(creatorId: string) {
    const stream = await prisma.livestream.findFirst({
      where: {
        OR: [{ creatorProfileId: creatorId }, { creatorProfile: { userId: creatorId } }],
        status: "LIVE",
      },
      include: {
        creatorProfile: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    return stream;
  }
}
