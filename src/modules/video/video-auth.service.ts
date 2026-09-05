import prisma from "@/lib/db";
import { mediaInfrastructure } from "./media-infrastructure.adapter";
import { EntitlementService } from "@/modules/subscription";
import {
  SignedMediaToken,
  AudienceRulesConfig,
  ParticipantRole,
} from "./types";

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  statusCode?: number;
  signedToken?: SignedMediaToken;
}

/**
 * BACKEND VIDEO AUTHORIZATION SERVICE
 * 
 * Authoritative Gatekeeper:
 * Evaluates whether a user is entitled to view or broadcast a stream.
 * Validates Audience Rules, KYC/Age assurance, Subscriptions, VIP access, and Geo-restrictions.
 * Never handles media frames directly — only generates cryptographically signed authorization tokens.
 */
export class VideoAuthService {
  /**
   * Authorize a viewer to connect to a live broadcast or media room.
   */
  static async authorizeViewer(params: {
    mediaRoomIdOrName: string;
    userId?: string;
    clientIpCountry?: string;
  }): Promise<AuthorizationResult> {
    const { mediaRoomIdOrName, userId, clientIpCountry = "US" } = params;

    // 1. Fetch Media Room with its active livestream and audience rules
    const mediaRoom = await prisma.mediaRoom.findFirst({
      where: {
        OR: [{ id: mediaRoomIdOrName }, { roomName: mediaRoomIdOrName }],
      },
      include: {
        creator: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                kycStatus: true,
              },
            },
          },
        },
        livestreams: {
          where: {
            status: { in: ["BROADCASTING", "PROVISIONED", "PAUSED"] },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            audienceRule: true,
          },
        },
      },
    });

    if (!mediaRoom) {
      return {
        allowed: false,
        reason: "Media room not found.",
        statusCode: 404,
      };
    }

    const activeStream = mediaRoom.livestreams[0];
    const rules: AudienceRulesConfig = {
      minAge: activeStream?.audienceRule?.minAge ?? 18,
      requireAgeAssurance: activeStream?.audienceRule?.requireAgeAssurance ?? true,
      isSubscribersOnly: activeStream?.audienceRule?.isSubscribersOnly ?? false,
      minSubscriptionTier: activeStream?.audienceRule?.minSubscriptionTier ?? null,
      ticketPriceCredits: activeStream?.audienceRule?.ticketPriceCredits ?? 0,
      isFollowerOnly: activeStream?.audienceRule?.isFollowerOnly ?? false,
      slowModeSeconds: activeStream?.audienceRule?.slowModeSeconds ?? 0,
      isChatDisabled: activeStream?.audienceRule?.isChatDisabled ?? false,
      geoBlockedCountries: activeStream?.audienceRule?.geoBlockedCountries
        ? activeStream.audienceRule.geoBlockedCountries.split(",").map((c) => c.trim())
        : [],
    };

    // 2. Geo-Blocking Check
    if (clientIpCountry && rules.geoBlockedCountries.includes(clientIpCountry)) {
      return {
        allowed: false,
        reason: "This live broadcast is not available in your region.",
        statusCode: 403,
      };
    }

    // 3. Authenticate User if Required
    let viewerUser = null;
    let isVip = false;
    let isCreator = false;
    let isModerator = false;

    if (userId) {
      viewerUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptionsFan: {
            where: {
              creatorProfileId: mediaRoom.creatorId,
              status: "ACTIVE",
              currentPeriodEnd: { gte: new Date() },
            },
          },
          ageAssuranceRecords: {
            where: { status: "APPROVED" },
            take: 1,
          },
          contentPurchases: true,
        },
      });

      if (viewerUser) {
        isCreator = viewerUser.id === mediaRoom.creator.userId;
        isModerator = viewerUser.role === "MODERATOR" || viewerUser.role === "ADMIN" || isCreator;
        isVip = Boolean(viewerUser.subscriptionsFan && viewerUser.subscriptionsFan.length > 0) || isCreator || isModerator;
      }
    }

    // Creator & Moderator bypass viewer restrictions
    if (isCreator || isModerator) {
      const signedToken = await mediaInfrastructure.generateViewerPlaybackToken({
        mediaRoomId: mediaRoom.id,
        streamId: activeStream?.id || "default_stream",
        roomName: mediaRoom.roomName,
        user: {
          id: viewerUser?.id || "moderator",
          username: viewerUser?.username || "mod",
          displayName: viewerUser?.displayName || "Moderator",
        },
        role: isCreator ? "PUBLISHER" : "MODERATOR",
        streamMode: (activeStream?.streamMode as any) || "PUBLIC_BROADCAST",
        isVip: true,
        canChat: true,
        canInteract: true,
      });

      return { allowed: true, signedToken };
    }

    // 4. Age Assurance / KYC Validation
    if (rules.requireAgeAssurance) {
      const isAgeVerified =
        viewerUser?.kycStatus === "AGE_VERIFIED" ||
        viewerUser?.kycStatus === "COMPLIANCE_2257_APPROVED" ||
        (viewerUser?.ageAssuranceRecords?.length ?? 0) > 0;

      if (!isAgeVerified && process.env.AGE_GATE_ENFORCEMENT === "true") {
        return {
          allowed: false,
          reason: "Age assurance verification required to access adult live stream media.",
          statusCode: 403,
        };
      }
    }

    // 5. Subscribers-Only / VIP Gate Check using Authoritative Entitlement Service
    if (rules.isSubscribersOnly && !isVip) {
      const entCheck = await EntitlementService.hasEntitlement({
        fanId: userId,
        creatorProfileId: mediaRoom.creatorId,
        entitlement: "SUBSCRIBER_LIVE",
      });

      if (!entCheck.hasEntitlement) {
        return {
          allowed: false,
          reason: entCheck.reason || "This live broadcast is restricted to active subscribers.",
          statusCode: 403,
        };
      }
    }

    // 6. PPV Ticketed Stream Check
    if (rules.ticketPriceCredits > 0) {
      if (!viewerUser) {
        return {
          allowed: false,
          reason: "Login required to access ticketed broadcast.",
          statusCode: 401,
        };
      }

      // Check if user has purchased PPV access for this stream
      const hasTicket = viewerUser.ppvPurchases.some(
        (p) => p.ppvContentId === activeStream?.id
      );

      if (!hasTicket && !isVip) {
        return {
          allowed: false,
          reason: `Ticket required (${rules.ticketPriceCredits} credits). Please purchase admission to view.`,
          statusCode: 402, // Payment Required
        };
      }
    }

    // 7. Follower-Only Check
    if (rules.isFollowerOnly && !viewerUser) {
      return {
        allowed: false,
        reason: "Follower-only room. Please sign in and follow the creator.",
        statusCode: 403,
      };
    }

    // 8. Generate Authoritative Playback Token
    const signedToken = await mediaInfrastructure.generateViewerPlaybackToken({
      mediaRoomId: mediaRoom.id,
      streamId: activeStream?.id || "stream_active",
      roomName: mediaRoom.roomName,
      user: viewerUser
        ? {
            id: viewerUser.id,
            username: viewerUser.username,
            displayName: viewerUser.displayName,
          }
        : {
            id: `anon_${Math.random().toString(36).substring(2, 8)}`,
            username: "Guest Explorer",
            displayName: "Guest",
          },
      role: "SUBSCRIBER",
      streamMode: (activeStream?.streamMode as any) || "PUBLIC_BROADCAST",
      isVip,
      canChat: !rules.isChatDisabled && Boolean(viewerUser),
      canInteract: Boolean(viewerUser),
    });

    return { allowed: true, signedToken };
  }

  /**
   * Authorize a Creator to publish video/audio to specialized media infrastructure.
   */
  static async authorizePublisher(creatorUserId: string, roomName?: string) {
    const creator = await prisma.creatorProfile.findUnique({
      where: { userId: creatorUserId },
      include: {
        compliance2257: true,
        mediaRooms: true,
      },
    });

    if (!creator) {
      return { allowed: false, reason: "Creator profile not found.", statusCode: 404 };
    }

    // Compliance Check: Creator must be 2257 approved to go live
    if (creator.compliance2257?.verificationStatus !== "APPROVED") {
      return {
        allowed: false,
        reason: "18 U.S.C. § 2257 identity verification required before broadcasting.",
        statusCode: 403,
      };
    }

    // Ensure MediaRoom exists
    let mediaRoom = creator.mediaRooms[0];
    if (!mediaRoom) {
      const generatedRoomName = roomName || `room_${creator.id.substring(0, 8)}_${Date.now()}`;
      mediaRoom = await prisma.mediaRoom.create({
        data: {
          creatorId: creator.id,
          roomName: generatedRoomName,
          mediaProvider: process.env.LIVESTREAM_PROVIDER || "CUSTOM_SRS_LIVEKIT",
          rtmpIngestUrl: `rtmp://ingest.live.streamplatform.local/live/${creator.streamKey}`,
          whipIngestUrl: `${process.env.MEDIA_CDN_BASE_URL || "https://edge.live.streamplatform.local"}/api/whip/${creator.streamKey}`,
          playbackHlsUrl: `${process.env.MEDIA_CDN_BASE_URL || "https://cdn.platform.local"}/hls/${generatedRoomName}/index.m3u8`,
          playbackWhepUrl: `${process.env.MEDIA_CDN_BASE_URL || "https://edge.live.streamplatform.local"}/api/whep/${generatedRoomName}`,
        },
      });
    }

    const credentials = await mediaInfrastructure.provisionIngestCredentials({
      mediaRoomId: mediaRoom.id,
      roomName: mediaRoom.roomName,
      streamKey: creator.streamKey,
      creatorUserId,
    });

    return { allowed: true, mediaRoom, credentials };
  }
}
