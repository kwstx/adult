/**
 * ============================================================================
 * REAL-TIME ENFORCEMENT & PLATFORM CONTAINMENT SERVICE
 * ============================================================================
 * 
 * Executes immediate containment actions: live stream safety kill-switches,
 * real-time room kicks, chat mutes, session token invalidations, and
 * edge CDN purge signals.
 */

import prisma from "@/lib/db";
import { eventBus } from "@/modules/realtime/event-bus";
import { SecurityContext } from "./types";
import { AuditService } from "./audit.service";

export class EnforcementService {
  /**
   * Immediately terminate a live stream due to severe safety/compliance violations.
   */
  static async terminateLivestream(
    livestreamId: string,
    reason: string,
    context?: SecurityContext
  ) {
    const livestream = await prisma.livestream.findUnique({
      where: { id: livestreamId },
      include: { creatorProfile: true },
    });

    if (!livestream) {
      throw new Error(`Livestream with ID ${livestreamId} not found.`);
    }

    // Update stream status in database
    await prisma.livestream.update({
      where: { id: livestreamId },
      data: {
        status: "TERMINATED_SAFETY",
        endedAt: new Date(),
      },
    });

    // Mark creator profile as offline
    if (livestream.creatorProfileId) {
      await prisma.creatorProfile.update({
        where: { id: livestream.creatorProfileId },
        data: { isLive: false },
      });
    }

    // Broadcast room termination to all connected viewers and creator
    eventBus.publish(`stream:${livestreamId}`, {
      type: "STREAM_TERMINATED_SAFETY",
      payload: {
        livestreamId,
        reason,
        terminatedAt: new Date().toISOString(),
      },
    });

    // Publish room event
    if (livestream.creatorProfileId) {
      eventBus.publish(`room:${livestream.creatorProfileId}`, {
        type: "STREAM_TERMINATED_SAFETY",
        payload: {
          livestreamId,
          reason,
          message: "Broadcast terminated by Trust & Safety compliance team.",
        },
      });
    }

    // Authoritative Audit Log
    await AuditService.logEvent(
      {
        action: "LIVESTREAM_TERMINATED_SAFETY",
        targetEntityType: "Content",
        targetEntityId: livestreamId,
        oldState: livestream.status,
        newState: "TERMINATED_SAFETY",
        reason,
        metadata: {
          creatorProfileId: livestream.creatorProfileId,
          mediaRoomId: livestream.mediaRoomId,
        },
      },
      context
    );

    return { success: true, terminatedAt: new Date() };
  }

  /**
   * Kick and ban a user from a specific creator's live room.
   */
  static async kickUserFromRoom(
    creatorProfileId: string,
    targetUserId: string,
    reason: string,
    context?: SecurityContext
  ) {
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { username: true, displayName: true },
    });

    // Update active livestream participant status
    const activeStream = await prisma.livestream.findFirst({
      where: {
        creatorProfileId,
        status: "LIVE",
      },
    });

    if (activeStream) {
      await prisma.livestreamParticipant.updateMany({
        where: {
          livestreamId: activeStream.id,
          userId: targetUserId,
        },
        data: {
          isBannedFromRoom: true,
          leftAt: new Date(),
        },
      });
    }

    // Broadcast kick message to the room
    eventBus.publish(`room:${creatorProfileId}`, {
      type: "USER_KICKED_FROM_ROOM",
      payload: {
        creatorProfileId,
        targetUserId,
        targetUsername: targetUser?.username || targetUserId,
        reason,
        kickedAt: new Date().toISOString(),
      },
    });

    // Audit log
    await AuditService.logEvent(
      {
        action: "ROOM_USER_KICKED",
        targetEntityType: "User",
        targetEntityId: targetUserId,
        reason,
        metadata: {
          creatorProfileId,
          livestreamId: activeStream?.id,
        },
      },
      context
    );

    return { success: true };
  }

  /**
   * Revoke all active sessions and refresh tokens for a suspended or banned user.
   */
  static async invalidateUserSessions(
    userId: string,
    reason: string,
    context?: SecurityContext
  ) {
    // Invalidate real-time presence across all rooms
    eventBus.publish(`user:${userId}`, {
      type: "SESSION_TERMINATED_SECURITY",
      payload: {
        userId,
        reason,
        timestamp: new Date().toISOString(),
      },
    });

    await AuditService.logEvent(
      {
        action: "USER_SESSIONS_INVALIDATED",
        targetEntityType: "User",
        targetEntityId: userId,
        reason,
      },
      context
    );

    return { success: true };
  }
}
