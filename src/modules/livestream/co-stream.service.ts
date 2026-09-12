// ============================================================================
// AUTHORITATIVE CO-STREAM DOMAIN SERVICE
// Multi-Creator Broadcast Coordination, Permission Verification & SFU Orchestration
// ============================================================================

import prisma from "@/lib/db";
import { ApiError } from "@/lib/api-handler";
import { eventBus } from "@/modules/realtime/event-bus";
import { sfuMediaAdapter, StageLayoutMode, PublisherAuthToken, MultiStreamViewerToken } from "./sfu-media.adapter";
import { CoStreamStateMachine, CoStreamSessionState } from "./co-stream.state-machine";
import { CreatorPermissionsGuard } from "@/modules/creator-verification/creator-permissions.guard";
import { NotificationService } from "@/modules/notifications/notification.service";

export interface InviteCoHostInput {
  primaryCreatorId: string;
  guestCreatorId: string;
  hostSplitPercentage?: number; // default 0.50 (50%)
  guestSplitPercentage?: number; // default 0.50 (50%)
  title?: string;
  layoutMode?: StageLayoutMode;
  scheduledStartAt?: Date;
}

export interface RespondInvitationInput {
  guestCreatorId: string;
  sessionId: string;
  accept: boolean;
  rejectionReason?: string;
}

export interface CoStreamSessionDossier {
  session: any;
  participants: any[];
  primaryHost: any;
  viewerPlayback?: MultiStreamViewerToken;
  publisherTokens?: Record<string, PublisherAuthToken>;
}

export class CoStreamService {
  /**
   * 1. Invite a Verified Creator to a Co-Livestream
   */
  public static async inviteCoHost(input: InviteCoHostInput) {
    const {
      primaryCreatorId,
      guestCreatorId,
      hostSplitPercentage = 0.50,
      guestSplitPercentage = 0.50,
      title = "Joint Co-Livestream Broadcast",
      layoutMode = "SIDE_BY_SIDE",
      scheduledStartAt,
    } = input;

    if (primaryCreatorId === guestCreatorId) {
      throw new ApiError(400, "Primary host cannot invite themselves as co-host.", "SELF_INVITE_NOT_ALLOWED");
    }

    // Verify split percentages sum to exactly 1.0 (100%)
    const sum = Number((hostSplitPercentage + guestSplitPercentage).toFixed(2));
    if (Math.abs(sum - 1.0) > 0.001) {
      throw new ApiError(400, `Split percentages must sum to exactly 100%. Received: ${(sum * 100).toFixed(1)}%`, "INVALID_SPLIT_PERCENTAGE");
    }

    // Authoritative Guard: Both creators must have monetization & 2257 verification
    await CreatorPermissionsGuard.assertCanReceiveEarnings(primaryCreatorId, "LIVE_TIP");
    await CreatorPermissionsGuard.assertCanReceiveEarnings(guestCreatorId, "LIVE_TIP");

    const hostProfile = await prisma.creatorProfile.findUnique({
      where: { id: primaryCreatorId },
      include: { user: true },
    });
    const guestProfile = await prisma.creatorProfile.findUnique({
      where: { id: guestCreatorId },
      include: { user: true },
    });

    if (!hostProfile || !guestProfile) {
      throw new ApiError(404, "One or both creator profiles not found.", "CREATOR_NOT_FOUND");
    }

    // Create session & participants in PostgreSQL transaction
    const session = await prisma.$transaction(async (tx: any) => {
      const newSession = await tx.coStreamSession.create({
        data: {
          primaryHostId: primaryCreatorId,
          title,
          status: "INVITED",
          layoutMode,
          totalSplitPercentage: 1.00,
          platformRakePercentage: 0.20,
          scheduledStartAt,
        },
      });

      // Add Primary Host participant
      await tx.coStreamParticipant.create({
        data: {
          coStreamSessionId: newSession.id,
          creatorProfileId: primaryCreatorId,
          role: "PRIMARY_HOST",
          splitPercentage: hostSplitPercentage,
          status: "ACCEPTED",
        },
      });

      // Add Guest Co-Host participant
      await tx.coStreamParticipant.create({
        data: {
          coStreamSessionId: newSession.id,
          creatorProfileId: guestCreatorId,
          role: "CO_HOST",
          splitPercentage: guestSplitPercentage,
          status: "INVITED",
        },
      });

      return newSession;
    });

    // Real-time WebSocket invitation dispatch
    eventBus.publish(`creator:${guestCreatorId}`, {
      type: "CO_STREAM_INVITATION",
      payload: {
        sessionId: session.id,
        hostCreatorId: primaryCreatorId,
        hostStageName: hostProfile.stageName || hostProfile.user.displayName,
        hostAvatarUrl: hostProfile.user.avatarUrl,
        title,
        offeredSplitPercentage: guestSplitPercentage,
        layoutMode,
      },
    });

    return session;
  }

  /**
   * 2. Guest Creator Responds to Invitation (Accept or Decline)
   */
  public static async respondToInvitation(input: RespondInvitationInput) {
    const { guestCreatorId, sessionId, accept, rejectionReason } = input;

    const session = await prisma.coStreamSession.findUnique({
      where: { id: sessionId },
      include: { participants: true, primaryHost: { include: { user: true } } },
    });

    if (!session) {
      throw new ApiError(404, "Co-Stream session not found.", "SESSION_NOT_FOUND");
    }

    const participant = session.participants.find((p: any) => p.creatorProfileId === guestCreatorId);
    if (!participant) {
      throw new ApiError(403, "You are not an invited participant in this co-stream session.", "NOT_A_PARTICIPANT");
    }

    const trigger = accept ? "GUEST_ACCEPTED" : "GUEST_DECLINED";
    const transition = CoStreamStateMachine.transition(
      session.status as CoStreamSessionState,
      trigger
    );

    const updated = await prisma.$transaction(async (tx: any) => {
      // Update participant record
      await tx.coStreamParticipant.update({
        where: { id: participant.id },
        data: {
          status: accept ? "ACCEPTED" : "DECLINED",
          joinedAt: accept ? new Date() : null,
        },
      });

      // Update session status
      return await tx.coStreamSession.update({
        where: { id: sessionId },
        data: {
          status: transition.nextState,
        },
        include: { participants: { include: { creatorProfile: { include: { user: true } } } } },
      });
    });

    // Publish event to host and guest
    eventBus.publish(`creator:${session.primaryHostId}`, {
      type: accept ? "CO_STREAM_ACCEPTED" : "CO_STREAM_DECLINED",
      payload: {
        sessionId,
        guestCreatorId,
        rejectionReason,
      },
    });

    return updated;
  }

  /**
   * 3. Start Multi-Creator Broadcast (Launches SFU Multi-Publisher Room)
   */
  public static async startBroadcast(primaryCreatorId: string, sessionId: string) {
    const session = await prisma.coStreamSession.findUnique({
      where: { id: sessionId },
      include: {
        participants: { include: { creatorProfile: { include: { user: true } } } },
        primaryHost: { include: { user: true } },
      },
    });

    if (!session) {
      throw new ApiError(404, "Co-Stream session not found.", "SESSION_NOT_FOUND");
    }

    if (session.primaryHostId !== primaryCreatorId) {
      throw new ApiError(403, "Only the primary host can launch the broadcast.", "UNAUTHORIZED_HOST");
    }

    const acceptedParticipants = session.participants.filter((p: any) => p.status === "ACCEPTED");
    const totalSplit = acceptedParticipants.reduce((sum: number, p: any) => sum + Number(p.splitPercentage), 0);

    // Validate state transition & invariants via state machine
    CoStreamStateMachine.transition(
      session.status as CoStreamSessionState,
      "START_BROADCAST",
      {
        participantCount: acceptedParticipants.length,
        totalSplitPercentage: totalSplit,
      }
    );

    // Provision SFU Multi-Publisher Room
    const sfuRoom = await sfuMediaAdapter.createMultiPublisherRoom(
      session.id,
      session.layoutMode as StageLayoutMode,
      acceptedParticipants.length
    );

    // Issue publisher tokens for all accepted co-hosts
    const publisherTokens: Record<string, PublisherAuthToken> = {};
    for (const p of acceptedParticipants) {
      const pubToken = await sfuMediaAdapter.generatePublisherToken({
        sessionId: session.id,
        creatorProfileId: p.creatorProfileId,
        role: p.role,
        canControlLayout: p.role === "PRIMARY_HOST",
      });
      publisherTokens[p.creatorProfileId] = pubToken;
    }

    // Atomically create authoritative Livestream record and update CoStreamSession
    const updatedSession = await prisma.$transaction(async (tx: any) => {
      const liveRecord = await tx.livestream.create({
        data: {
          creatorProfileId: primaryCreatorId,
          title: session.title,
          status: "LIVE",
          streamMode: "PUBLIC_BROADCAST",
          mediaRoomId: sfuRoom.roomId,
          whipIngestUrl: sfuRoom.whipIngestUrl,
          whepPlaybackUrl: sfuRoom.whepPlaybackUrl,
          hlsPlaybackUrl: sfuRoom.hlsCompositeUrl,
          startedAt: new Date(),
        },
      });

      // Update primary host isLive state
      await tx.creatorProfile.update({
        where: { id: primaryCreatorId },
        data: { isLive: true },
      });

      // Update all co-host isLive states
      for (const p of acceptedParticipants) {
        await tx.creatorProfile.update({
          where: { id: p.creatorProfileId },
          data: { isLive: true },
        });

        await tx.coStreamParticipant.update({
          where: { id: p.id },
          data: {
            whipIngestUrl: publisherTokens[p.creatorProfileId].whipEndpoint,
            webrtcTrackId: publisherTokens[p.creatorProfileId].webrtcTrackId,
            isMediaPublished: true,
            status: "CONNECTED",
          },
        });
      }

      return await tx.coStreamSession.update({
        where: { id: sessionId },
        data: {
          status: "LIVE",
          livestreamId: liveRecord.id,
          mediaRoomId: sfuRoom.roomId,
          startedAt: new Date(),
        },
        include: {
          participants: { include: { creatorProfile: { include: { user: true } } } },
          primaryHost: { include: { user: true } },
          livestream: true,
        },
      });
    });

    // Real-time room broadcast
    eventBus.publish(`room:${primaryCreatorId}`, {
      type: "CO_STREAM_STARTED",
      payload: {
        sessionId,
        mediaRoomId: sfuRoom.roomId,
        layoutMode: session.layoutMode,
        participants: acceptedParticipants.map((p: any) => ({
          creatorProfileId: p.creatorProfileId,
          displayName: p.creatorProfile.user.displayName,
          avatarUrl: p.creatorProfile.user.avatarUrl,
          splitPercentage: Number(p.splitPercentage),
        })),
      },
    });

    // Asynchronously notify followers of all participating creators
    for (const p of acceptedParticipants) {
      NotificationService.notifyCreatorWentLive({
        creatorProfileId: p.creatorProfileId,
        streamTitle: `[Co-Stream] ${session.title}`,
        stageName: p.creatorProfile.stageName || p.creatorProfile.user.displayName,
        avatarUrl: p.creatorProfile.user.avatarUrl || undefined,
      }).catch((err) => console.error("[CoStreamService] Fanout error:", err));
    }

    return {
      session: updatedSession,
      publisherTokens,
      sfuRoom,
    };
  }

  /**
   * 4. Update Dynamic Video Stage Layout at Runtime
   */
  public static async updateStageLayout(
    primaryCreatorId: string,
    sessionId: string,
    newLayout: StageLayoutMode
  ) {
    const session = await prisma.coStreamSession.findUnique({
      where: { id: sessionId },
      include: { participants: true },
    });

    if (!session) {
      throw new ApiError(404, "Co-Stream session not found.", "SESSION_NOT_FOUND");
    }

    if (session.primaryHostId !== primaryCreatorId) {
      throw new ApiError(403, "Only the primary host can modify stage layout.", "UNAUTHORIZED_HOST");
    }

    await sfuMediaAdapter.updateStageLayout(session.mediaRoomId || `room_sfu_${sessionId}`, newLayout);

    const updated = await prisma.coStreamSession.update({
      where: { id: sessionId },
      data: { layoutMode: newLayout },
    });

    eventBus.publish(`room:${session.primaryHostId}`, {
      type: "CO_STREAM_LAYOUT_CHANGED",
      payload: {
        sessionId,
        layoutMode: newLayout,
      },
    });

    return updated;
  }

  /**
   * 5. End Multi-Creator Broadcast
   */
  public static async endBroadcast(primaryCreatorId: string, sessionId: string) {
    const session = await prisma.coStreamSession.findUnique({
      where: { id: sessionId },
      include: { participants: true },
    });

    if (!session) {
      throw new ApiError(404, "Co-Stream session not found.", "SESSION_NOT_FOUND");
    }

    if (session.primaryHostId !== primaryCreatorId) {
      throw new ApiError(403, "Only the primary host can terminate the broadcast.", "UNAUTHORIZED_HOST");
    }

    CoStreamStateMachine.transition(session.status as CoStreamSessionState, "END_BROADCAST");

    const endedAt = new Date();

    const updated = await prisma.$transaction(async (tx: any) => {
      // Mark CoStreamSession as ENDED
      const s = await tx.coStreamSession.update({
        where: { id: sessionId },
        data: {
          status: "ENDED",
          endedAt,
        },
      });

      // Mark Livestream record as ENDED
      if (session.livestreamId) {
        await tx.livestream.update({
          where: { id: session.livestreamId },
          data: {
            status: "ENDED",
            endedAt,
          },
        });
      }

      // Reset isLive for all participants
      for (const p of session.participants) {
        await tx.creatorProfile.update({
          where: { id: p.creatorProfileId },
          data: { isLive: false },
        });

        await tx.coStreamParticipant.update({
          where: { id: p.id },
          data: {
            status: "DISCONNECTED",
            leftAt: endedAt,
          },
        });
      }

      return s;
    });

    eventBus.publish(`room:${session.primaryHostId}`, {
      type: "CO_STREAM_ENDED",
      payload: {
        sessionId,
        endedAt: endedAt.toISOString(),
      },
    });

    return updated;
  }

  /**
   * 6. Retrieve Full Authoritative Co-Stream Session Dossier
   */
  public static async getCoStreamSession(sessionId: string, viewerUserId?: string): Promise<CoStreamSessionDossier> {
    const session = await prisma.coStreamSession.findUnique({
      where: { id: sessionId },
      include: {
        primaryHost: { include: { user: true } },
        participants: {
          include: {
            creatorProfile: {
              include: {
                user: true,
              },
            },
          },
        },
        livestream: true,
      },
    });

    if (!session) {
      throw new ApiError(404, "Co-Stream session not found.", "SESSION_NOT_FOUND");
    }

    let viewerPlayback: MultiStreamViewerToken | undefined;

    if (session.status === "LIVE") {
      const activeCreators = session.participants.map((p: any, index: number) => ({
        creatorProfileId: p.creatorProfileId,
        stagePosition: index,
        webrtcTrackId: p.webrtcTrackId || undefined,
      }));

      viewerPlayback = await sfuMediaAdapter.generateMultiStreamViewerToken({
        sessionId: session.id,
        viewerUserId,
        isVip: false,
        layout: session.layoutMode as StageLayoutMode,
        activeCreators,
      });
    }

    return {
      session,
      participants: session.participants,
      primaryHost: session.primaryHost,
      viewerPlayback,
    };
  }
}
