import prisma from "@/lib/db";
import { mediaInfrastructure } from "./media-infrastructure.adapter";
import { EntitlementService } from "@/modules/subscription";
import {
  SignedMediaToken,
  AudienceRulesConfig,
} from "./types";

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  statusCode?: number;
  signedToken?: SignedMediaToken;
}

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

    // 1. Fetch Livestream
    const stream = await prisma.livestream.findFirst({
      where: {
        OR: [
          { id: mediaRoomIdOrName },
          { mediaRoomId: mediaRoomIdOrName },
          { creatorProfile: { user: { username: mediaRoomIdOrName } } },
        ],
      },
      include: {
        creatorProfile: {
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
      },
    });

    if (!stream) {
      return {
        allowed: false,
        reason: "Live broadcast not found.",
        statusCode: 404,
      };
    }

    const rules: AudienceRulesConfig = {
      minAge: 18,
      requireAgeAssurance: true,
      isSubscribersOnly: stream.streamMode === "SUBSCRIBERS_ONLY",
      minSubscriptionTier: null,
      ticketPriceCredits: stream.ticketPriceCredits || 0,
      isFollowerOnly: false,
      slowModeSeconds: 0,
      isChatDisabled: false,
      geoBlockedCountries: [],
    };

    // 2. Authenticate User if Required
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
              creatorProfileId: stream.creatorProfileId,
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
        isCreator = viewerUser.id === stream.creatorProfile.userId;
        isModerator = viewerUser.role === "MODERATOR" || viewerUser.role === "ADMIN" || isCreator;
        isVip = Boolean(viewerUser.subscriptionsFan && viewerUser.subscriptionsFan.length > 0) || isCreator || isModerator;
      }
    }

    // Creator & Moderator bypass viewer restrictions
    if (isCreator || isModerator) {
      const signedToken = await mediaInfrastructure.generateViewerPlaybackToken({
        mediaRoomId: stream.id,
        streamId: stream.id,
        roomName: stream.title,
        user: {
          id: viewerUser?.id || "moderator",
          username: viewerUser?.username || "mod",
          displayName: viewerUser?.displayName || "Moderator",
        },
        role: isCreator ? "PUBLISHER" : "MODERATOR",
        streamMode: (stream.streamMode as any) || "PUBLIC_BROADCAST",
        isVip: true,
        canChat: true,
        canInteract: true,
      });

      return { allowed: true, signedToken };
    }

    // 3. Subscribers-Only / VIP Gate Check
    if (rules.isSubscribersOnly && !isVip) {
      const entCheck = await EntitlementService.hasEntitlement({
        fanId: userId,
        creatorProfileId: stream.creatorProfileId,
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

    // 4. Generate Authoritative Playback Token
    const signedToken = await mediaInfrastructure.generateViewerPlaybackToken({
      mediaRoomId: stream.id,
      streamId: stream.id,
      roomName: stream.title,
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
      streamMode: (stream.streamMode as any) || "PUBLIC_BROADCAST",
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
        verifications: {
          where: { verificationStatus: "APPROVED" },
        },
      },
    });

    if (!creator) {
      return { allowed: false, reason: "Creator profile not found.", statusCode: 404 };
    }

    const credentials = await mediaInfrastructure.provisionIngestCredentials({
      mediaRoomId: creator.id,
      roomName: roomName || `room_${creator.id.substring(0, 8)}`,
      streamKey: creator.streamKey,
      creatorUserId,
    });

    return { allowed: true, creator, credentials };
  }
}
