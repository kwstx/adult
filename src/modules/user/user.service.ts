import prisma from "@/lib/db";
import { UserRole } from "@prisma/client";
import { ApiError } from "@/lib/api-handler";

export interface UpdateProfileInput {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
}

export class UserService {
  /**
   * Retrieves user profile by ID or username with social stats.
   */
  static async getProfile(identifier: string, viewerId?: string) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: identifier }, { username: identifier }],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        role: true,
        kycStatus: true,
        createdAt: true,
        creatorProfile: {
          select: {
            id: true,
            stageName: true,
            isLive: true,
            totalFollowers: true,
            totalViews: true,
            category: true,
            tags: true,
          },
        },
        _count: {
          select: {
            followsGiven: true,
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(404, "User profile not found.", "USER_NOT_FOUND");
    }

    let isFollowing = false;
    let relationshipTier: string | null = null;

    if (viewerId && user.creatorProfile) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_creatorProfileId: {
            followerId: viewerId,
            creatorProfileId: user.creatorProfile.id,
          },
        },
      });
      isFollowing = !!follow;

      const rel = await prisma.creatorRelationship.findUnique({
        where: {
          fanId_creatorProfileId: {
            fanId: viewerId,
            creatorProfileId: user.creatorProfile.id,
          },
        },
      });
      if (rel) {
        relationshipTier = rel.relationshipTier;
      }
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      bio: user.bio,
      role: user.role,
      kycStatus: user.kycStatus,
      createdAt: user.createdAt,
      followingCount: user._count.followsGiven,
      creatorProfile: user.creatorProfile,
      viewerContext: viewerId
        ? {
            isFollowing,
            relationshipTier,
          }
        : null,
    };
  }

  /**
   * Updates an authenticated user's profile information.
   */
  static async updateProfile(userId: string, input: UpdateProfileInput) {
    const { displayName, bio, avatarUrl, bannerUrl } = input;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        displayName: displayName !== undefined ? displayName : undefined,
        bio: bio !== undefined ? bio : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
        bannerUrl: bannerUrl !== undefined ? bannerUrl : undefined,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        role: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  /**
   * Searches for users across platform with pagination.
   */
  static async searchUsers(query: string, options: { role?: UserRole; limit?: number; page?: number } = {}) {
    const { role, limit = 20, page = 1 } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      isBanned: false,
      isActive: true,
      OR: [
        { username: { contains: query.toLowerCase() } },
        { displayName: { contains: query } },
      ],
    };

    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          role: true,
          creatorProfile: {
            select: {
              id: true,
              isLive: true,
              category: true,
              totalFollowers: true,
            },
          },
        },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves creators followed by a specific user.
   */
  static async getUserFollows(userId: string, limit: number = 50) {
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        creatorProfile: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return follows.map((f) => ({
      creatorProfileId: f.creatorProfileId,
      notificationsEnabled: f.notificationsEnabled,
      notificationTier: f.notificationTier,
      followedAt: f.createdAt,
      creator: {
        id: f.creatorProfile.id,
        userId: f.creatorProfile.userId,
        stageName: f.creatorProfile.stageName || f.creatorProfile.user.displayName,
        username: f.creatorProfile.user.username,
        avatarUrl: f.creatorProfile.user.avatarUrl,
        isLive: f.creatorProfile.isLive,
        category: f.creatorProfile.category,
      },
    }));
  }
}
