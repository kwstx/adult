import prisma from "@/lib/db";
import { eventBus } from "./event-bus";

interface ViewerSession {
  userId?: string;
  socketId: string;
  lastHeartbeat: number;
}

class PresenceService {
  // Map of creatorId -> Set of ViewerSessions
  private roomViewers: Map<string, Map<string, ViewerSession>> = new Map();

  /**
   * Register or refresh a viewer in a live room.
   */
  public joinRoom(creatorId: string, socketId: string, userId?: string): number {
    if (!this.roomViewers.has(creatorId)) {
      this.roomViewers.set(creatorId, new Map());
    }

    const room = this.roomViewers.get(creatorId)!;
    room.set(socketId, {
      userId,
      socketId,
      lastHeartbeat: Date.now(),
    });

    const count = room.size;
    this.broadcastPresence(creatorId, count);
    return count;
  }

  /**
   * Remove a viewer on disconnect.
   */
  public leaveRoom(creatorId: string, socketId: string): number {
    const room = this.roomViewers.get(creatorId);
    if (!room) return 0;

    room.delete(socketId);
    const count = room.size;
    this.broadcastPresence(creatorId, count);
    return count;
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
    this.broadcastPresence(creatorId, count);
    return count;
  }

  public getViewerCount(creatorId: string): number {
    return this.roomViewers.get(creatorId)?.size || 0;
  }

  private broadcastPresence(creatorId: string, count: number): void {
    // Dispatch presence update over event bus
    eventBus.publish(`room:${creatorId}`, {
      type: "PRESENCE_COUNT",
      payload: { creatorId, viewerCount: count },
    });

    // Optionally update database asynchronously
    prisma.creatorProfile
      .update({
        where: { id: creatorId },
        data: { viewerCount: count },
      })
      .catch(() => {});
  }
}

const globalPresence = globalThis as unknown as {
  __presenceService?: PresenceService;
};

export const presenceService = globalPresence.__presenceService ?? new PresenceService();

if (process.env.NODE_ENV !== "production") {
  globalPresence.__presenceService = presenceService;
}
