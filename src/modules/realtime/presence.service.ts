import prisma from "@/lib/db";
import { eventBus } from "./event-bus";
import { ViewerPresenceEventPayload } from "./types";

interface ViewerSession {
  userId?: string;
  displayName?: string;
  socketId: string;
  lastHeartbeat: number;
}

class PresenceService {
  // creatorId -> Map<socketId, ViewerSession>
  private roomViewers: Map<string, Map<string, ViewerSession>> = new Map();
  // Debounce timers for batch presence broadcasts per room
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Register or refresh a viewer in a live room.
   */
  public joinRoom(
    creatorId: string,
    socketId: string,
    userMeta?: { userId: string; displayName: string; badge?: string | null }
  ): number {
    if (!this.roomViewers.has(creatorId)) {
      this.roomViewers.set(creatorId, new Map());
    }

    const room = this.roomViewers.get(creatorId)!;
    room.set(socketId, {
      userId: userMeta?.userId,
      displayName: userMeta?.displayName,
      socketId,
      lastHeartbeat: Date.now(),
    });

    const count = room.size;

    // Dispatch individual VIEWER_JOINED event if authenticated user
    if (userMeta?.userId) {
      const payload: ViewerPresenceEventPayload = {
        creatorId,
        viewerCount: count,
        joinedUser: {
          userId: userMeta.userId,
          displayName: userMeta.displayName,
          badge: userMeta.badge,
        },
        action: "JOIN",
        timestamp: Date.now(),
      };

      eventBus.publish(`room:${creatorId}`, {
        type: "VIEWER_JOINED",
        payload,
      });
    }

    this.schedulePresenceBroadcast(creatorId, count);
    return count;
  }

  /**
   * Remove a viewer on disconnect.
   */
  public leaveRoom(creatorId: string, socketId: string, userId?: string): number {
    const room = this.roomViewers.get(creatorId);
    if (!room) return 0;

    room.delete(socketId);
    const count = room.size;

    if (userId) {
      const payload: ViewerPresenceEventPayload = {
        creatorId,
        viewerCount: count,
        leftUserId: userId,
        action: "LEAVE",
        timestamp: Date.now(),
      };

      eventBus.publish(`room:${creatorId}`, {
        type: "VIEWER_LEFT",
        payload,
      });
    }

    this.schedulePresenceBroadcast(creatorId, count);
    return count;
  }

  /**
   * High-fanout presence debouncer: prevents thundering herd event floods
   * when hundreds of viewers join or leave in short bursts.
   */
  private schedulePresenceBroadcast(creatorId: string, count: number): void {
    if (this.debounceTimers.has(creatorId)) return;

    const timer = setTimeout(() => {
      this.debounceTimers.delete(creatorId);
      const currentCount = this.getViewerCount(creatorId);

      eventBus.publish(`room:${creatorId}`, {
        type: "PRESENCE_COUNT",
        payload: { creatorId, viewerCount: currentCount },
      });

      // Update DB asynchronously without blocking realtime loop
      prisma.creatorProfile
        .update({
          where: { id: creatorId },
          data: { viewerCount: currentCount },
        })
        .catch(() => {});
    }, 1000); // Debounce interval: 1s

    this.debounceTimers.set(creatorId, timer);
  }

  /**
   * Periodic garbage collection for dead client connections (heartbeat > 45s).
   */
  public cleanupStaleSessions(creatorId: string): number {
    const room = this.roomViewers.get(creatorId);
    if (!room) return 0;

    const cutoff = Date.now() - 45000;
    for (const [socketId, session] of room.entries()) {
      if (session.lastHeartbeat < cutoff) {
        room.delete(socketId);
      }
    }

    const count = room.size;
    this.schedulePresenceBroadcast(creatorId, count);
    return count;
  }

  public getViewerCount(creatorId: string): number {
    return this.roomViewers.get(creatorId)?.size || 0;
  }
}

const globalPresence = globalThis as unknown as {
  __presenceService?: PresenceService;
};

export const presenceService = globalPresence.__presenceService ?? new PresenceService();

if (process.env.NODE_ENV !== "production") {
  globalPresence.__presenceService = presenceService;
}
