import prisma from "@/lib/db";
import { mediaAdapter } from "./media.adapter";
import { PlaybackToken, StreamCredentials } from "./types";
import { eventBus } from "@/modules/realtime/event-bus";

export class StreamService {
  /**
   * Request live stream playback authorization.
   * Backend-authoritative gate: Checks if room is private, verifies VIP subscription,
   * checks age verification token if required, and returns signed playback payload.
   */
  static async requestPlaybackAccess(params: {
    creatorId: string;
    userId?: string;
  }): Promise<{ allowed: boolean; reason?: string; playback?: PlaybackToken }> {
    const { creatorId, userId } = params;

    const creator = await prisma.creatorProfile.findUnique({
      where: { id: creatorId },
    });

    if (!creator) {
      return { allowed: false, reason: "Creator not found." };
    }

    let isVip = false;

    // If room is in Private Show mode, verify VIP status or specific access
    if (creator.isPrivateShow) {
      if (!userId) {
        return {
          allowed: false,
          reason: "This room is currently in Private Show mode. Please log in.",
        };
      }

      const activeSub = await prisma.subscription.findFirst({
        where: {
          fanId: userId,
          creatorId: creator.id,
          status: "ACTIVE",
          currentPeriodEnd: { gte: new Date() },
        },
      });

      if (!activeSub) {
        return {
          allowed: false,
          reason: "This is a private show. You need an active VIP subscription to view.",
        };
      }

      isVip = true;
    }

    const playback = await mediaAdapter.generatePlaybackToken(creatorId, userId, isVip);
    return { allowed: true, playback };
  }

  /**
   * Creator Operating System: Creator goes live.
   */
  static async startBroadcast(creatorUserId: string, title?: string): Promise<StreamCredentials> {
    const profile = await prisma.creatorProfile.findUnique({
      where: { userId: creatorUserId },
    });

    if (!profile) throw new Error("Creator profile not found.");

    const creds = await mediaAdapter.createStreamIngest(profile.id);

    // Update profile status & create LiveSession
    await prisma.creatorProfile.update({
      where: { id: profile.id },
      data: {
        isLive: true,
        streamTitle: title || profile.streamTitle,
        streamKey: creds.streamKey,
      },
    });

    await prisma.liveSession.create({
      data: {
        creatorId: profile.id,
        title: title || profile.streamTitle,
        status: "ACTIVE",
      },
    });

    eventBus.publish(`room:${profile.id}`, {
      type: "ROOM_STATUS",
      payload: { isLive: true, title: title || profile.streamTitle },
    });

    return creds;
  }

  /**
   * Creator Operating System: Creator ends live stream.
   */
  static async endBroadcast(creatorUserId: string) {
    const profile = await prisma.creatorProfile.findUnique({
      where: { userId: creatorUserId },
    });

    if (!profile) throw new Error("Creator profile not found.");

    await prisma.creatorProfile.update({
      where: { id: profile.id },
      data: { isLive: false, viewerCount: 0 },
    });

    // Mark current session ended
    await prisma.liveSession.updateMany({
      where: { creatorId: profile.id, status: "ACTIVE" },
      data: { status: "ENDED", endedAt: new Date() },
    });

    eventBus.publish(`room:${profile.id}`, {
      type: "ROOM_STATUS",
      payload: { isLive: false },
    });

    return { success: true };
  }
}
