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

/**
 * AUTHORITATIVE VIDEO ROOM SERVICE
 * 
 * Manages the backend relational graph:
 * - Creator
 * - Livestream
 * - Media room
 * - Stream status
 * - Permissions
 * - Start time
 * - End time
 * - Category
 * - Title
 * - Audience rules
 */
export class VideoRoomService {
  /**
   * Get or initialize the Creator's persistent Media Room and default Audience Rules.
   */
  static async getOrCreateCreatorMediaRoom(creatorId: string) {
    const creator = await prisma.creatorProfile.findUnique({
      where: { id: creatorId },
      include: {
        mediaRooms: true,
        audienceRules: true,
        user: true,
      },
    });

    if (!creator) throw new Error("Creator not found.");

    let mediaRoom = creator.mediaRooms[0];
    if (!mediaRoom) {
      const roomName = `room_${creator.user.username.toLowerCase()}`;
      mediaRoom = await prisma.mediaRoom.create({
        data: {
          creatorId: creator.id,
          roomName,
          streamKey: creator.streamKey,
          mediaProvider: "SRS_LIVEKIT_EDGE",
          rtmpIngestUrl: `rtmp://ingest.live.streamplatform.local/live/${creator.streamKey}`,
          whipIngestUrl: `${process.env.MEDIA_CDN_BASE_URL || "https://edge.live.streamplatform.local"}/api/whip/${creator.streamKey}`,
          playbackHlsUrl: `${process.env.MEDIA_CDN_BASE_URL || "https://cdn.platform.local"}/hls/${roomName}/index.m3u8`,
          playbackWhepUrl: `${process.env.MEDIA_CDN_BASE_URL || "https://edge.live.streamplatform.local"}/api/whep/${roomName}`,
        },
      });
    }

    let audienceRule = creator.audienceRules[0];
    if (!audienceRule) {
      audienceRule = await prisma.audienceRule.create({
        data: {
          creatorId: creator.id,
          name: "Default Broadcast Audience Rules",
          minAge: 18,
          requireAgeAssurance: true,
          isSubscribersOnly: creator.isPrivateShow,
          ticketPriceCredits: 0,
          isFollowerOnly: false,
          slowModeSeconds: 0,
          isChatDisabled: false,
        },
      });
    }

    return { mediaRoom, audienceRule, creator };
  }

  /**
   * Start a Live Broadcast (Public Low-Latency distribution or VIP Show).
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
    if (!auth.allowed || !auth.mediaRoom || !auth.credentials) {
      throw new Error(auth.reason || "Broadcast authorization failed.");
    }

    const { mediaRoom } = auth;

    // End any lingering active streams
    await prisma.videoLivestream.updateMany({
      where: {
        creatorId: mediaRoom.creatorId,
        status: { in: ["BROADCASTING", "PROVISIONED", "PAUSED"] },
      },
      data: {
        status: "ENDED",
        endedAt: new Date(),
      },
    });

    // Create or update Audience Rule
    const rule = await prisma.audienceRule.create({
      data: {
        creatorId: mediaRoom.creatorId,
        name: `${title} Policy`,
        minAge: audienceRules?.minAge ?? 18,
        requireAgeAssurance: audienceRules?.requireAgeAssurance ?? true,
        isSubscribersOnly: audienceRules?.isSubscribersOnly ?? false,
        minSubscriptionTier: audienceRules?.minSubscriptionTier,
        ticketPriceCredits: audienceRules?.ticketPriceCredits ?? 0,
        isFollowerOnly: audienceRules?.isFollowerOnly ?? false,
        slowModeSeconds: audienceRules?.slowModeSeconds ?? 0,
        isChatDisabled: audienceRules?.isChatDisabled ?? false,
        geoBlockedCountries: audienceRules?.geoBlockedCountries?.join(",") ?? "",
      },
    });

    // Create authoritative VideoLivestream record
    const livestream = await prisma.videoLivestream.create({
      data: {
        creatorId: mediaRoom.creatorId,
        mediaRoomId: mediaRoom.id,
        audienceRuleId: rule.id,
        title,
        category,
        tags: tags.join(","),
        streamMode,
        status: "BROADCASTING",
        startedAt: new Date(),
        hlsPlaybackUrl: mediaRoom.playbackHlsUrl,
        whepPlaybackUrl: mediaRoom.playbackWhepUrl,
      },
    });

    // Update Creator Profile isLive state
    await prisma.creatorProfile.update({
      where: { id: mediaRoom.creatorId },
      data: {
        isLive: true,
        streamTitle: title,
        tags: tags.join(","),
        isPrivateShow: audienceRules?.isSubscribersOnly || false,
      },
    });

    // Notify Real-Time Engine
    eventBus.publish(`room:${mediaRoom.creatorId}`, {
      type: "ROOM_STATUS",
      payload: {
        isLive: true,
        title,
        category,
        streamMode,
        streamId: livestream.id,
      },
    });

    return {
      livestream,
      mediaRoom,
      credentials: auth.credentials,
      audienceRule: rule,
    };
  }

  /**
   * End a Live Broadcast.
   */
  static async endBroadcast(creatorUserId: string) {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId: creatorUserId },
      include: { mediaRooms: true },
    });

    if (!creator) throw new Error("Creator not found.");

    const now = new Date();

    // Mark active VideoLivestreams ended
    await prisma.videoLivestream.updateMany({
      where: {
        creatorId: creator.id,
        status: { in: ["BROADCASTING", "PROVISIONED", "PAUSED"] },
      },
      data: {
        status: "ENDED",
        endedAt: now,
      },
    });

    // Legacy LiveSession sync
    await prisma.liveSession.updateMany({
      where: { creatorId: creator.id, status: "ACTIVE" },
      data: { status: "ENDED", endedAt: now },
    });

    // Update Creator Profile
    await prisma.creatorProfile.update({
      where: { id: creator.id },
      data: { isLive: false, viewerCount: 0 },
    });

    // Notify Real-Time Engine
    eventBus.publish(`room:${creator.id}`, {
      type: "ROOM_STATUS",
      payload: { isLive: false },
    });

    return { success: true };
  }

  /**
   * Get complete Livestream Relation Graph.
   */
  static async getLivestreamRelationGraph(params: {
    creatorIdOrRoom: string;
    viewerUserId?: string;
  }): Promise<LivestreamRelationGraph | null> {
    const { creatorIdOrRoom, viewerUserId } = params;

    const mediaRoom = await prisma.mediaRoom.findFirst({
      where: {
        OR: [
          { id: creatorIdOrRoom },
          { roomName: creatorIdOrRoom },
          { creatorId: creatorIdOrRoom },
          { creator: { user: { username: creatorIdOrRoom } } },
        ],
      },
      include: {
        creator: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                kycStatus: true,
              },
            },
            compliance2257: true,
          },
        },
        livestreams: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { audienceRule: true },
        },
      },
    });

    if (!mediaRoom) return null;

    const activeStream = mediaRoom.livestreams[0];
    const rule = activeStream?.audienceRule;

    const audienceRules: AudienceRulesConfig = {
      minAge: rule?.minAge ?? 18,
      requireAgeAssurance: rule?.requireAgeAssurance ?? true,
      isSubscribersOnly: rule?.isSubscribersOnly ?? false,
      minSubscriptionTier: rule?.minSubscriptionTier ?? null,
      ticketPriceCredits: rule?.ticketPriceCredits ?? 0,
      isFollowerOnly: rule?.isFollowerOnly ?? false,
      slowModeSeconds: rule?.slowModeSeconds ?? 0,
      isChatDisabled: rule?.isChatDisabled ?? false,
      geoBlockedCountries: rule?.geoBlockedCountries
        ? rule.geoBlockedCountries.split(",").map((c) => c.trim())
        : [],
    };

    // User permissions check
    let userPermissions = undefined;
    if (viewerUserId) {
      const auth = await VideoAuthService.authorizeViewer({
        mediaRoomIdOrName: mediaRoom.id,
        userId: viewerUserId,
      });

      userPermissions = {
        canView: auth.allowed,
        canChat: auth.allowed && !audienceRules.isChatDisabled,
        canInteract: auth.allowed,
        isVip: auth.signedToken?.permissions.isVip || false,
        restrictionReason: auth.reason,
      };
    }

    return {
      creator: {
        id: mediaRoom.creator.id,
        userId: mediaRoom.creator.userId,
        displayName: mediaRoom.creator.user.displayName,
        username: mediaRoom.creator.user.username,
        avatarUrl: mediaRoom.creator.user.avatarUrl,
        isVerified2257: mediaRoom.creator.compliance2257?.verificationStatus === "APPROVED",
      },
      livestream: {
        id: activeStream?.id || "default_stream",
        title: activeStream?.title || mediaRoom.creator.streamTitle,
        category: activeStream?.category || "Entertainment",
        tags: activeStream?.tags ? activeStream.tags.split(",") : ["live"],
        streamMode: (activeStream?.streamMode as StreamMode) || "PUBLIC_BROADCAST",
        status: (activeStream?.status as StreamStatus) || (mediaRoom.creator.isLive ? "BROADCASTING" : "IDLE"),
        startedAt: activeStream?.startedAt || null,
        endedAt: activeStream?.endedAt || null,
        peakViewers: activeStream?.peakViewers || mediaRoom.creator.viewerCount,
        totalCreditsEarned: activeStream?.totalCreditsEarned || 0,
      },
      mediaRoom: {
        id: mediaRoom.id,
        roomName: mediaRoom.roomName,
        mediaProvider: mediaRoom.mediaProvider,
        rtmpIngestUrl: mediaRoom.rtmpIngestUrl,
        whipIngestUrl: mediaRoom.whipIngestUrl,
        playbackHlsUrl: mediaRoom.playbackHlsUrl,
        playbackWhepUrl: mediaRoom.playbackWhepUrl,
      },
      audienceRules,
      userPermissions,
    };
  }

  /**
   * INITIATE INTERACTIVE 1-ON-1 TWO-WAY WEBRTC SESSION
   * 
   * Truly interactive real-time two-way media communication between Creator & Fan.
   */
  static async requestInteractive1on1Session(params: {
    creatorId: string;
    fanUserId: string;
    creditRatePerMinute?: number;
  }): Promise<Interactive1on1SessionPayload> {
    const { creatorId, fanUserId, creditRatePerMinute = 100 } = params;

    const creator = await prisma.creatorProfile.findUnique({
      where: { id: creatorId },
      include: { mediaRooms: true, user: true },
    });

    if (!creator) throw new Error("Creator not found.");

    const fan = await prisma.user.findUnique({
      where: { id: fanUserId },
      include: { wallet: true },
    });

    if (!fan) throw new Error("Fan account not found.");

    // Validate wallet balance (must have at least 1 minute of credits)
    if ((fan.wallet?.balance ?? 0) < creditRatePerMinute) {
      throw new Error(
        `Insufficient credit balance. You need at least ${creditRatePerMinute} tokens to start a 1-on-1 session.`
      );
    }

    let mediaRoom = creator.mediaRooms[0];
    if (!mediaRoom) {
      const roomRes = await this.getOrCreateCreatorMediaRoom(creator.id);
      mediaRoom = roomRes.mediaRoom;
    }

    const session = await prisma.private1on1Session.create({
      data: {
        mediaRoomId: mediaRoom.id,
        creatorUserId: creator.userId,
        fanUserId: fan.id,
        status: "REQUESTED",
        creditRatePerMinute,
        totalCreditsCharged: 0,
      },
    });

    const mediaSession = await mediaInfrastructure.provisionInteractive1on1MediaRoom({
      sessionId: session.id,
      mediaRoomId: mediaRoom.id,
      creatorUserId: creator.userId,
      fanUserId: fan.id,
    });

    // Update tokens on session record
    await prisma.private1on1Session.update({
      where: { id: session.id },
      data: {
        creatorSignalingToken: mediaSession.creatorToken,
        fanSignalingToken: mediaSession.fanToken,
      },
    });

    // Notify Creator via Real-Time Engine
    eventBus.publish(`room:${creator.id}`, {
      type: "1ON1_REQUEST",
      payload: {
        sessionId: session.id,
        fanUserId: fan.id,
        fanDisplayName: fan.displayName,
        creditRatePerMinute,
      },
    });

    return {
      sessionId: session.id,
      mediaRoomId: mediaRoom.id,
      creatorUserId: creator.userId,
      creatorDisplayName: creator.user.displayName,
      fanUserId: fan.id,
      fanDisplayName: fan.displayName,
      status: "REQUESTED",
      creditRatePerMinute,
      totalCreditsCharged: 0,
      startedAt: null,
      durationSeconds: 0,
      iceServers: mediaSession.iceServers,
      mediaToken: mediaSession.fanToken,
      signalingEndpoint: mediaSession.signalingEndpoint,
    };
  }

  /**
   * Accept or Join a 1-on-1 Interactive Two-Way WebRTC Session.
   */
  static async joinInteractive1on1Session(params: {
    sessionId: string;
    userId: string;
  }) {
    const { sessionId, userId } = params;

    const session = await prisma.private1on1Session.findUnique({
      where: { id: sessionId },
      include: {
        mediaRoom: { include: { creator: { include: { user: true } } } },
        fanUser: true,
        creatorUser: true,
      },
    });

    if (!session) throw new Error("1-on-1 session not found.");

    const isCreator = session.creatorUserId === userId;
    const isFan = session.fanUserId === userId;

    if (!isCreator && !isFan) {
      throw new Error("Unauthorized: You are not a participant in this 1-on-1 session.");
    }

    if (session.status === "REQUESTED" && isCreator) {
      await prisma.private1on1Session.update({
        where: { id: session.id },
        data: {
          status: "CONNECTED",
          startedAt: new Date(),
        },
      });
    }

    const token = isCreator ? session.creatorSignalingToken : session.fanSignalingToken;

    return {
      sessionId: session.id,
      status: session.status,
      creditRatePerMinute: session.creditRatePerMinute,
      mediaToken: token,
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
      signalingEndpoint: `${process.env.MEDIA_CDN_BASE_URL || "https://edge.live.streamplatform.local"}/webrtc/1on1/${session.id}`,
      participantRole: "CO_HOST",
      counterpart: isCreator
        ? { id: session.fanUser.id, displayName: session.fanUser.displayName }
        : { id: session.creatorUser.id, displayName: session.creatorUser.displayName },
    };
  }

  /**
   * End an interactive 1-on-1 session and settle credits.
   */
  static async endInteractive1on1Session(params: {
    sessionId: string;
    endedByUserId: string;
  }) {
    const { sessionId } = params;

    const session = await prisma.private1on1Session.findUnique({
      where: { id: sessionId },
      include: {
        fanUser: { include: { wallet: true } },
        creatorUser: { include: { wallet: true } },
      },
    });

    if (!session || session.status === "COMPLETED") {
      return { success: true };
    }

    const now = new Date();
    const startTime = session.startedAt || session.createdAt;
    const durationSeconds = Math.max(1, Math.round((now.getTime() - startTime.getTime()) / 1000));
    const billableMinutes = Math.ceil(durationSeconds / 60);
    const totalCredits = billableMinutes * session.creditRatePerMinute;

    await prisma.private1on1Session.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        endedAt: now,
        durationSeconds,
        totalCreditsCharged: totalCredits,
      },
    });

    return {
      success: true,
      durationSeconds,
      billableMinutes,
      totalCredits,
    };
  }
}
