import prisma from "@/lib/db";
import { ContentType, ContentAccessLevel } from "@prisma/client";
import { ApiError } from "@/lib/api-handler";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";

export interface CreateContentInput {
  title: string;
  description?: string;
  contentType?: ContentType;
  accessLevel?: ContentAccessLevel;
  priceCredits?: number;
  previewUrl?: string;
  mediaUrl: string;
  mediaDurationSeconds?: number;
  fileSizeBytes?: number;
}

export class ContentService {
  /**
   * Creates and publishes new creator content.
   */
  static async createContent(creatorProfileId: string, input: CreateContentInput) {
    const {
      title,
      description,
      contentType = "VIDEO",
      accessLevel = "PPV_PURCHASE",
      priceCredits = 0,
      previewUrl,
      mediaUrl,
      mediaDurationSeconds,
      fileSizeBytes,
    } = input;

    const content = await prisma.content.create({
      data: {
        creatorProfileId,
        title,
        description,
        contentType,
        accessLevel,
        priceCredits: accessLevel === "PPV_PURCHASE" ? priceCredits : 0,
        previewUrl,
        mediaUrl,
        mediaDurationSeconds,
        fileSizeBytes: fileSizeBytes ? BigInt(fileSizeBytes) : undefined,
        isPublished: true,
        moderationState: "APPROVED",
      },
    });

    return {
      ...content,
      fileSizeBytes: content.fileSizeBytes ? content.fileSizeBytes.toString() : null,
    };
  }

  /**
   * Authoritatively retrieves content and evaluates viewer authorization.
   */
  static async getContent(contentId: string, viewerId?: string) {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
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
    });

    if (!content || !content.isPublished || content.isArchived) {
      throw new ApiError(404, "Content item not found or unavailable.", "CONTENT_NOT_FOUND");
    }

    let isUnlocked = false;
    let unlockReason: string | null = null;

    // 1. Creator always has full access
    if (viewerId && content.creatorProfile.userId === viewerId) {
      isUnlocked = true;
      unlockReason = "CREATOR_OWNER";
    } else if (content.accessLevel === "PUBLIC") {
      isUnlocked = true;
      unlockReason = "PUBLIC_ACCESS";
    } else if (viewerId) {
      if (content.accessLevel === "FOLLOWERS_ONLY") {
        const follow = await prisma.follow.findUnique({
          where: {
            followerId_creatorProfileId: {
              followerId: viewerId,
              creatorProfileId: content.creatorProfileId,
            },
          },
        });
        if (follow) {
          isUnlocked = true;
          unlockReason = "FOLLOWER_ACCESS";
        }
      } else if (content.accessLevel === "SUBSCRIBERS_ONLY" || content.accessLevel === "TIER_VIP_ONLY") {
        const sub = await prisma.subscription.findFirst({
          where: {
            fanId: viewerId,
            creatorProfileId: content.creatorProfileId,
            status: "ACTIVE",
          },
        });
        if (sub) {
          if (content.accessLevel === "TIER_VIP_ONLY" && sub.tier !== "VIP" && sub.tier !== "DIAMOND") {
            isUnlocked = false;
          } else {
            isUnlocked = true;
            unlockReason = "SUBSCRIPTION_ACCESS";
          }
        }
      } else if (content.accessLevel === "PPV_PURCHASE") {
        const purchase = await prisma.contentPurchase.findUnique({
          where: {
            contentId_fanId: {
              contentId: content.id,
              fanId: viewerId,
            },
          },
        });
        if (purchase) {
          isUnlocked = true;
          unlockReason = "PURCHASED_PPV";
        }
      }
    }

    // Increment view count asynchronously
    await prisma.content.update({
      where: { id: content.id },
      data: { viewCount: { increment: 1 } },
    });

    return {
      id: content.id,
      creatorProfileId: content.creatorProfileId,
      title: content.title,
      description: content.description,
      contentType: content.contentType,
      accessLevel: content.accessLevel,
      priceCredits: content.priceCredits,
      previewUrl: content.previewUrl,
      mediaDurationSeconds: content.mediaDurationSeconds,
      viewCount: content.viewCount + 1,
      likeCount: content.likeCount,
      purchaseCount: content.purchaseCount,
      publishedAt: content.publishedAt,
      creator: {
        id: content.creatorProfile.id,
        stageName: content.creatorProfile.stageName || content.creatorProfile.user.displayName,
        username: content.creatorProfile.user.username,
        avatarUrl: content.creatorProfile.user.avatarUrl,
      },
      isUnlocked,
      unlockReason,
      // Authoritative media stream URL only returned if authorized
      mediaUrl: isUnlocked ? content.mediaUrl : null,
    };
  }

  /**
   * Unlocks PPV content via wallet transaction atomically.
   */
  static async unlockPPV(fanId: string, contentId: string, idempotencyKey?: string) {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: { creatorProfile: true },
    });

    if (!content) {
      throw new ApiError(404, "Content not found.", "CONTENT_NOT_FOUND");
    }

    if (content.accessLevel !== "PPV_PURCHASE" && content.priceCredits <= 0) {
      return { success: true, alreadyUnlocked: true, contentId };
    }

    // Check if already purchased
    const existing = await prisma.contentPurchase.findUnique({
      where: {
        contentId_fanId: {
          contentId,
          fanId,
        },
      },
    });

    if (existing) {
      return { success: true, alreadyPurchased: true, purchaseId: existing.id };
    }

    // Debit wallet & grant entitlement through economic engine
    const ledgerResult = await WalletLedgerService.processPPVPurchase({
      fanUserId: fanId,
      contentId: content.id,
      idempotencyKey: idempotencyKey || `ppv_${fanId}_${content.id}_${Date.now()}`,
    });

    return {
      success: true,
      transactionId: ledgerResult.transactionId,
      contentId: content.id,
      creditsPaid: content.priceCredits,
      fanRemainingBalance: ledgerResult.fanRemainingBalance,
    };
  }

  /**
   * Lists creator content gallery with unlock states.
   */
  static async listCreatorContent(creatorProfileId: string, viewerId?: string, options: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.content.findMany({
        where: {
          creatorProfileId,
          isPublished: true,
          isArchived: false,
        },
        orderBy: { publishedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.content.count({
        where: {
          creatorProfileId,
          isPublished: true,
          isArchived: false,
        },
      }),
    ]);

    // Fetch user purchases for these contents if viewerId provided
    const userPurchases = viewerId
      ? await prisma.contentPurchase.findMany({
          where: {
            fanId: viewerId,
            contentId: { in: items.map((i) => i.id) },
          },
          select: { contentId: true },
        })
      : [];

    const purchasedContentIds = new Set(userPurchases.map((p) => p.contentId));

    return {
      items: items.map((item) => {
        const isPurchased = purchasedContentIds.has(item.id);
        const isFree = item.accessLevel === "PUBLIC" || item.priceCredits === 0;
        const isUnlocked = isPurchased || isFree;

        return {
          id: item.id,
          title: item.title,
          description: item.description,
          contentType: item.contentType,
          accessLevel: item.accessLevel,
          priceCredits: item.priceCredits,
          previewUrl: item.previewUrl,
          mediaDurationSeconds: item.mediaDurationSeconds,
          viewCount: item.viewCount,
          likeCount: item.likeCount,
          purchaseCount: item.purchaseCount,
          publishedAt: item.publishedAt,
          isUnlocked,
          mediaUrl: isUnlocked ? item.mediaUrl : null,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
