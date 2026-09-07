import prisma from "@/lib/db";
import { ApiError } from "@/lib/api-handler";
import { eventBus } from "@/modules/realtime/event-bus";

export interface UpdateCreatorSettingsInput {
  stageName?: string;
  bio?: string;
  category?: string;
  tags?: string;
  defaultMinTip?: number;
  paidMessagesEnabled?: boolean;
  messagePriceCredits?: number;
  subscriptionTier1Price?: number;
  subscriptionTier2Price?: number;
  subscriptionTier3Price?: number;
  customRules?: string;
  allowFreeSubscribers?: boolean;
  allowFreeVip?: boolean;
  customWelcomeMessage?: string;
}

export class CreatorService {
  /**
   * Authoritatively retrieves creator profile details including interactive menu, products, and active stream.
   */
  static async getCreator(identifier: string, viewerId?: string) {
    const creator = await prisma.creatorProfile.findFirst({
      where: {
        OR: [
          { id: identifier },
          { userId: identifier },
          { user: { username: identifier } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bannerUrl: true,
            bio: true,
            kycStatus: true,
            role: true,
            createdAt: true,
          },
        },
        interactionDefinitions: {
          where: { isEnabled: true },
          orderBy: { sortOrder: "asc" },
        },
        subscriptionProducts: {
          where: { isActive: true },
          orderBy: { tierLevel: "asc" },
        },
        livestreams: {
          where: { status: "LIVE" },
          take: 1,
          orderBy: { startedAt: "desc" },
        },
        _count: {
          select: {
            followers: true,
            contents: true,
            products: true,
          },
        },
      },
    });

    if (!creator) {
      throw new ApiError(404, "Creator profile not found.", "CREATOR_NOT_FOUND");
    }

    let isFollowing = false;
    let viewerRelationship = null;

    if (viewerId) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_creatorProfileId: {
            followerId: viewerId,
            creatorProfileId: creator.id,
          },
        },
      });
      isFollowing = !!follow;

      const rel = await prisma.creatorRelationship.findUnique({
        where: {
          fanId_creatorProfileId: {
            fanId: viewerId,
            creatorProfileId: creator.id,
          },
        },
      });
      if (rel) {
        viewerRelationship = {
          tier: rel.relationshipTier,
          totalXp: Number(rel.totalXp),
          lifetimeSpendCredits: Number(rel.totalCreditsSpent),
          streakDays: rel.currentStreakDays,
        };
      }
    }

    return {
      ...creator,
      followerCount: (creator as any)._count?.followers ?? 0,
      contentCount: (creator as any)._count?.contents ?? 0,
      productCount: (creator as any)._count?.products ?? 0,
      activeLivestream: (creator as any).livestreams?.[0] || null,
      viewerContext: viewerId ? { isFollowing, viewerRelationship } : null,
    };
  }

  /**
   * Updates creator profile settings and monetization configurations.
   */
  static async updateSettings(creatorProfileId: string, settings: UpdateCreatorSettingsInput) {
    const updated = await prisma.creatorProfile.update({
      where: { id: creatorProfileId },
      data: {
        stageName: settings.stageName !== undefined ? settings.stageName : undefined,
        bio: settings.bio !== undefined ? settings.bio : undefined,
        category: settings.category !== undefined ? settings.category : undefined,
        tags: settings.tags !== undefined ? settings.tags : undefined,
        defaultMinTip: settings.defaultMinTip !== undefined ? settings.defaultMinTip : undefined,
        paidMessagesEnabled: settings.paidMessagesEnabled !== undefined ? settings.paidMessagesEnabled : undefined,
        messagePriceCredits: settings.messagePriceCredits !== undefined ? settings.messagePriceCredits : undefined,
        subscriptionTier1Price: settings.subscriptionTier1Price !== undefined ? settings.subscriptionTier1Price : undefined,
        subscriptionTier2Price: settings.subscriptionTier2Price !== undefined ? settings.subscriptionTier2Price : undefined,
        subscriptionTier3Price: settings.subscriptionTier3Price !== undefined ? settings.subscriptionTier3Price : undefined,
        customRules: settings.customRules !== undefined ? settings.customRules : undefined,
        allowFreeSubscribers: settings.allowFreeSubscribers !== undefined ? settings.allowFreeSubscribers : undefined,
        allowFreeVip: settings.allowFreeVip !== undefined ? settings.allowFreeVip : undefined,
        customWelcomeMessage: settings.customWelcomeMessage !== undefined ? settings.customWelcomeMessage : undefined,
      },
    });

    return updated;
  }

  /**
   * Lists creators for discovery with filters.
   */
  static async listCreators(options: {
    category?: string;
    tags?: string;
    isLive?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
    const { category, tags, isLive, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      moderationState: { notIn: ["RESTRICTED", "SUSPENDED"] },
      user: { isBanned: false, isActive: true },
    };

    if (category) where.category = category;
    if (isLive !== undefined) where.isLive = isLive;
    if (tags) {
      where.tags = { contains: tags };
    }

    const [creators, total] = await Promise.all([
      prisma.creatorProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          livestreams: {
            where: { status: "LIVE" },
            take: 1,
            select: {
              id: true,
              title: true,
              streamMode: true,
              currentViewerCount: true,
              hlsPlaybackUrl: true,
              whepPlaybackUrl: true,
            },
          },
        },
        orderBy: [{ isLive: "desc" }, { totalFollowers: "desc" }],
        skip,
        take: limit,
      }),
      prisma.creatorProfile.count({ where }),
    ]);

    return {
      creators: creators.map((c) => ({
        id: c.id,
        userId: c.userId,
        stageName: c.stageName || c.user.displayName,
        username: c.user.username,
        avatarUrl: c.user.avatarUrl,
        bannerUrl: c.bannerUrl,
        bio: c.bio,
        category: c.category,
        tags: c.tags,
        isLive: c.isLive,
        totalFollowers: c.totalFollowers,
        totalViews: c.totalViews,
        activeLivestream: c.livestreams[0] || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Follows or unfollows a creator profile atomically and updates follower counters.
   */
  static async toggleFollow(followerId: string, creatorProfileId: string, notificationsEnabled: boolean = true) {
    const creator = await prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
    });

    if (!creator) {
      throw new ApiError(404, "Creator not found.", "CREATOR_NOT_FOUND");
    }

    if (creator.userId === followerId) {
      throw new ApiError(400, "You cannot follow your own creator profile.", "CANNOT_FOLLOW_SELF");
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_creatorProfileId: {
          followerId,
          creatorProfileId,
        },
      },
    });

    if (existingFollow) {
      // Unfollow
      await prisma.$transaction([
        prisma.follow.delete({
          where: { id: existingFollow.id },
        }),
        prisma.creatorProfile.update({
          where: { id: creatorProfileId },
          data: { totalFollowers: { decrement: 1 } },
        }),
      ]);

      eventBus.publish(`creator:${creatorProfileId}`, {
        type: "UNFOLLOW" as any,
        payload: { followerId, creatorProfileId },
      });

      return { isFollowing: false, totalFollowers: Math.max(0, creator.totalFollowers - 1) };
    } else {
      // Follow
      await prisma.$transaction([
        prisma.follow.create({
          data: {
            followerId,
            creatorProfileId,
            notificationsEnabled,
            notificationTier: "ALL",
          },
        }),
        prisma.creatorProfile.update({
          where: { id: creatorProfileId },
          data: { totalFollowers: { increment: 1 } },
        }),
      ]);

      eventBus.publish(`creator:${creatorProfileId}`, {
        type: "FOLLOW" as any,
        payload: { followerId, creatorProfileId },
      });

      return { isFollowing: true, totalFollowers: creator.totalFollowers + 1 };
    }
  }

  /**
   * Retrieves top fan supporters for a creator by relationship XP and lifetime spend.
   */
  static async getTopFans(creatorProfileId: string, limit: number = 20) {
    const relationships = await prisma.creatorRelationship.findMany({
      where: { creatorProfileId },
      include: {
        fan: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ totalXp: "desc" }, { totalCreditsSpent: "desc" }],
      take: limit,
    });

    return relationships.map((rel, index) => ({
      rank: index + 1,
      fanId: rel.fanId,
      username: rel.fan.username,
      displayName: rel.fan.displayName,
      avatarUrl: rel.fan.avatarUrl,
      tier: rel.relationshipTier,
      totalXp: Number(rel.totalXp),
      lifetimeSpendCredits: Number(rel.totalCreditsSpent),
      streakDays: rel.currentStreakDays,
    }));
  }
}
