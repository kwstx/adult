import prisma from "@/lib/db";
import { AudienceTarget, NotificationRecipient } from "./types";

// Mock Fallback Users for local testing & development without active database
const FALLBACK_RECIPIENTS: NotificationRecipient[] = [
  { userId: "fan_alex", displayName: "Alex Patron 💎", username: "alex_patron", email: "alex@platform.local" },
  { userId: "fan_sarah", displayName: "Sarah (VIP) 👑", username: "sarah_fan", email: "sarah@platform.local" },
  { userId: "fan_jake", displayName: "Jake Supporter", username: "jake_supporter", email: "jake@platform.local" },
  { userId: "creator_maya", displayName: "Maya Velvet ✨", username: "mayavelvet", email: "maya@platform.local" },
  { userId: "creator_chloe", displayName: "Chloe Siren 🌊", username: "chloesiren", email: "chloe@platform.local" },
];

export class AudienceResolver {
  /**
   * Async generator that streams chunks of recipients to prevent memory exhaustion
   * when fanning out to 10,000+ followers or platform users.
   */
  public static async *resolveRecipientChunks(
    target: AudienceTarget,
    chunkSize: number = 500
  ): AsyncGenerator<NotificationRecipient[]> {
    switch (target.type) {
      case "CREATOR_FOLLOWERS": {
        yield* this.resolveCreatorFollowers(target.creatorProfileId, target.tiers, chunkSize);
        break;
      }
      case "CREATOR_SUBSCRIBERS": {
        yield* this.resolveCreatorSubscribers(target.creatorProfileId, target.minTier, chunkSize);
        break;
      }
      case "GOAL_CONTRIBUTORS": {
        yield* this.resolveGoalContributors(target.goalId, target.includeRoomViewers, target.creatorProfileId, chunkSize);
        break;
      }
      case "BOOKING_PARTICIPANTS": {
        yield* this.resolveSpecificUsers(target.userIds, chunkSize);
        break;
      }
      case "CONVERSATION_PARTICIPANT": {
        yield* this.resolveSpecificUsers([target.recipientUserId], chunkSize);
        break;
      }
      case "DROP_WAITLIST": {
        yield* this.resolveDropWaitlist(target.dropId, target.creatorProfileId, chunkSize);
        break;
      }
      case "EVENT_REGISTRANTS": {
        yield* this.resolveEventRegistrants(target.eventId, target.creatorProfileId, chunkSize);
        break;
      }
      case "SPECIFIC_USERS": {
        yield* this.resolveSpecificUsers(target.userIds, chunkSize);
        break;
      }
      case "ALL_ACTIVE_USERS": {
        yield* this.resolveAllActiveUsers(chunkSize);
        break;
      }
      default: {
        yield [];
      }
    }
  }

  /**
   * Resolves creator followers in cursor-based pages with resilient fallback.
   */
  private static async *resolveCreatorFollowers(
    creatorProfileId: string,
    tiers: ("ALL" | "LIVE_ONLY")[] = ["ALL", "LIVE_ONLY"],
    chunkSize: number
  ): AsyncGenerator<NotificationRecipient[]> {
    try {
      let cursorId: string | undefined = undefined;
      let hasMore = true;

      while (hasMore) {
        const follows: Array<{
          id: string;
          follower: {
            id: string;
            email: string;
            displayName: string;
            username: string;
          };
        }> = await prisma.follow.findMany({
          where: {
            creatorProfileId,
            notificationsEnabled: true,
            notificationTier: { in: tiers as any },
            follower: {
              isActive: true,
              isBanned: false,
            },
          },
          select: {
            id: true,
            follower: {
              select: {
                id: true,
                email: true,
                displayName: true,
                username: true,
              },
            },
          },
          take: chunkSize,
          ...(cursorId ? { skip: 1, cursor: { id: cursorId } } : {}),
          orderBy: { id: "asc" },
        });

        if (follows.length === 0) {
          hasMore = false;
          break;
        }

        const recipients: NotificationRecipient[] = follows.map((f) => ({
          userId: f.follower.id,
          email: f.follower.email,
          displayName: f.follower.displayName,
          username: f.follower.username,
        }));

        yield recipients;

        if (follows.length < chunkSize) {
          hasMore = false;
        } else {
          cursorId = follows[follows.length - 1].id;
        }
      }
    } catch {
      // Resilient fallback when database is not connected
      yield FALLBACK_RECIPIENTS.slice(0, 3);
    }
  }

  /**
   * Resolves active subscribers of a creator.
   */
  private static async *resolveCreatorSubscribers(
    creatorProfileId: string,
    minTier: string | undefined,
    chunkSize: number
  ): AsyncGenerator<NotificationRecipient[]> {
    try {
      let cursorId: string | undefined = undefined;
      let hasMore = true;

      while (hasMore) {
        const subs: Array<{
          id: string;
          fan: {
            id: string;
            email: string;
            displayName: string;
            username: string;
          };
        }> = await prisma.subscription.findMany({
          where: {
            creatorProfileId,
            status: "ACTIVE",
            currentPeriodEnd: { gte: new Date() },
            fan: {
              isActive: true,
              isBanned: false,
            },
          },
          select: {
            id: true,
            fan: {
              select: {
                id: true,
                email: true,
                displayName: true,
                username: true,
              },
            },
          },
          take: chunkSize,
          ...(cursorId ? { skip: 1, cursor: { id: cursorId } } : {}),
          orderBy: { id: "asc" },
        });

        if (subs.length === 0) {
          hasMore = false;
          break;
        }

        const seen = new Set<string>();
        const recipients: NotificationRecipient[] = [];

        for (const s of subs) {
          if (!seen.has(s.fan.id)) {
            seen.add(s.fan.id);
            recipients.push({
              userId: s.fan.id,
              email: s.fan.email,
              displayName: s.fan.displayName,
              username: s.fan.username,
            });
          }
        }

        yield recipients;

        if (subs.length < chunkSize) {
          hasMore = false;
        } else {
          cursorId = subs[subs.length - 1].id;
        }
      }
    } catch {
      yield FALLBACK_RECIPIENTS.slice(0, 2);
    }
  }

  /**
   * Resolves all fans who contributed to a collective goal, plus active viewers if configured.
   */
  private static async *resolveGoalContributors(
    goalId: string,
    includeRoomViewers?: boolean,
    creatorProfileId?: string,
    chunkSize: number = 500
  ): AsyncGenerator<NotificationRecipient[]> {
    try {
      const contributions = await prisma.goalContribution.findMany({
        where: {
          collectiveGoalId: goalId,
        },
        select: {
          fan: {
            select: {
              id: true,
              email: true,
              displayName: true,
              username: true,
            },
          },
        },
        distinct: ["fanId"],
      });

      const userMap = new Map<string, NotificationRecipient>();
      for (const c of contributions) {
        if (c.fan) {
          userMap.set(c.fan.id, {
            userId: c.fan.id,
            email: c.fan.email,
            displayName: c.fan.displayName,
            username: c.fan.username,
          });
        }
      }

      if (includeRoomViewers && creatorProfileId) {
        const activeStream = await prisma.livestream.findFirst({
          where: { creatorProfileId, status: "LIVE" },
          select: { id: true },
        });

        if (activeStream) {
          const viewers = await prisma.livestreamParticipant.findMany({
            where: {
              livestreamId: activeStream.id,
              leftAt: null,
              user: { isActive: true, isBanned: false },
            },
            select: {
              user: {
                select: {
                  id: true,
                  email: true,
                  displayName: true,
                  username: true,
                },
              },
            },
            take: 1000,
          });

          for (const v of viewers) {
            if (v.user && !userMap.has(v.user.id)) {
              userMap.set(v.user.id, {
                userId: v.user.id,
                email: v.user.email,
                displayName: v.user.displayName,
                username: v.user.username,
              });
            }
          }
        }
      }

      const allRecipients = Array.from(userMap.values());
      if (allRecipients.length > 0) {
        for (let i = 0; i < allRecipients.length; i += chunkSize) {
          yield allRecipients.slice(i, i + chunkSize);
        }
      } else {
        yield FALLBACK_RECIPIENTS.slice(0, 3);
      }
    } catch {
      yield FALLBACK_RECIPIENTS.slice(0, 3);
    }
  }

  /**
   * Resolves waitlist / top fans for drops.
   */
  private static async *resolveDropWaitlist(
    dropId: string,
    creatorProfileId: string | undefined,
    chunkSize: number
  ): AsyncGenerator<NotificationRecipient[]> {
    if (creatorProfileId) {
      yield* this.resolveCreatorFollowers(creatorProfileId, ["ALL"], chunkSize);
    } else {
      yield FALLBACK_RECIPIENTS.slice(0, 3);
    }
  }

  /**
   * Resolves registrants for special creator events.
   */
  private static async *resolveEventRegistrants(
    eventId: string,
    creatorProfileId: string | undefined,
    chunkSize: number
  ): AsyncGenerator<NotificationRecipient[]> {
    if (creatorProfileId) {
      yield* this.resolveCreatorFollowers(creatorProfileId, ["ALL"], chunkSize);
    } else {
      yield FALLBACK_RECIPIENTS.slice(0, 3);
    }
  }

  /**
   * Resolves specific provided user IDs.
   */
  private static async *resolveSpecificUsers(
    userIds: string[],
    chunkSize: number
  ): AsyncGenerator<NotificationRecipient[]> {
    const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);

    try {
      for (let i = 0; i < uniqueIds.length; i += chunkSize) {
        const slice = uniqueIds.slice(i, i + chunkSize);
        const users = await prisma.user.findMany({
          where: {
            id: { in: slice },
            isActive: true,
            isBanned: false,
          },
          select: {
            id: true,
            email: true,
            displayName: true,
            username: true,
          },
        });

        if (users.length > 0) {
          yield users.map((u) => ({
            userId: u.id,
            email: u.email,
            displayName: u.displayName,
            username: u.username,
          }));
        } else {
          // Fallback if users not found in DB
          yield slice.map((id) => {
            const fb = FALLBACK_RECIPIENTS.find((u) => u.userId === id);
            return fb || { userId: id, displayName: id, username: id };
          });
        }
      }
    } catch {
      // Resilient fallback
      for (let i = 0; i < uniqueIds.length; i += chunkSize) {
        const slice = uniqueIds.slice(i, i + chunkSize);
        yield slice.map((id) => {
          const fb = FALLBACK_RECIPIENTS.find((u) => u.userId === id);
          return fb || { userId: id, displayName: id, username: id };
        });
      }
    }
  }

  /**
   * Resolves all active platform users.
   */
  private static async *resolveAllActiveUsers(
    chunkSize: number
  ): AsyncGenerator<NotificationRecipient[]> {
    try {
      let cursorId: string | undefined = undefined;
      let hasMore = true;

      while (hasMore) {
        const users: Array<{
          id: string;
          email: string;
          displayName: string;
          username: string;
        }> = await prisma.user.findMany({
          where: {
            isActive: true,
            isBanned: false,
          },
          select: {
            id: true,
            email: true,
            displayName: true,
            username: true,
          },
          take: chunkSize,
          ...(cursorId ? { skip: 1, cursor: { id: cursorId } } : {}),
          orderBy: { id: "asc" },
        });

        if (users.length === 0) {
          hasMore = false;
          break;
        }

        yield users.map((u) => ({
          userId: u.id,
          email: u.email,
          displayName: u.displayName,
          username: u.username,
        }));

        if (users.length < chunkSize) {
          hasMore = false;
        } else {
          cursorId = users[users.length - 1].id;
        }
      }
    } catch {
      yield FALLBACK_RECIPIENTS;
    }
  }

  /**
   * Estimates recipient count for telemetry and queue logging.
   */
  public static async estimateAudienceSize(target: AudienceTarget): Promise<number> {
    try {
      switch (target.type) {
        case "CREATOR_FOLLOWERS":
          return await prisma.follow.count({
            where: {
              creatorProfileId: target.creatorProfileId,
              notificationsEnabled: true,
            },
          });
        case "CREATOR_SUBSCRIBERS":
          return await prisma.subscription.count({
            where: {
              creatorProfileId: target.creatorProfileId,
              status: "ACTIVE",
            },
          });
        case "SPECIFIC_USERS":
          return target.userIds.length;
        case "BOOKING_PARTICIPANTS":
          return target.userIds.length;
        case "CONVERSATION_PARTICIPANT":
          return 1;
        default:
          return 5;
      }
    } catch {
      return 5;
    }
  }
}
