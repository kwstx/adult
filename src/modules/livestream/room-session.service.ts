import prisma from "@/lib/db";
import { mediaAdapter } from "./media.adapter";
import { PlaybackToken } from "./types";

export interface ViewerPermissions {
  canView: boolean;
  canChat: boolean;
  canInteract: boolean;
  canTip: boolean;
  isVip: boolean;
  isModerator: boolean;
  isCreator: boolean;
  isAdmin: boolean;
  isAgeVerified: boolean;
  restrictionReason?: string;
}

export interface ViewerRelationship {
  isFollowing: boolean;
  isSubscribed: boolean;
  subscriptionTier: string | null;
  subscriptionExpiresAt: Date | null;
  totalTokensContributed: number;
  fanLevel: number;
  fanTitle: string;
  fanBadge: string | null;
  topContributorRank: number | null;
}

export interface RoomConfig {
  id: string;
  creatorId: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  streamTitle: string;
  isLive: boolean;
  viewerCount: number;
  tags: string[];
  isPrivateShow: boolean;
  minTipForPrivate: number;
  is2257Compliant: boolean;
  complianceApprovedAt: Date | null;
  activeSessionId?: string;
}

export interface StreamGoalData {
  title: string;
  target: number;
  progress: number;
  percentage: number;
  remaining: number;
  isCompleted: boolean;
}

export interface InteractionCatalogueItem {
  id: string;
  title: string;
  description: string | null;
  creditCost: number;
  actionType: string;
  sortOrder: number;
  isEnabled: boolean;
}

export interface PPVVaultItem {
  id: string;
  title: string;
  description: string | null;
  previewUrl: string | null;
  creditPrice: number;
  mediaType: string;
  isUnlocked: boolean;
}

export interface RoomSessionPayload {
  roomConfig: RoomConfig;
  permissions: ViewerPermissions;
  relationship: ViewerRelationship;
  goal: StreamGoalData;
  interactions: InteractionCatalogueItem[];
  ppvVault: PPVVaultItem[];
  playback?: PlaybackToken;
  viewerWalletBalance: number;
}

export class RoomSessionService {
  /**
   * Authoritative Room Bootstrapper:
   * Computes all 10 systems' initial state in parallel with high database efficiency.
   */
  static async getRoomSession(params: {
    creatorIdOrUsername: string;
    viewerUserId?: string;
  }): Promise<RoomSessionPayload | null> {
    const { creatorIdOrUsername, viewerUserId } = params;

    // 1. Fetch Creator Profile with relations
    const creator = await prisma.creatorProfile.findFirst({
      where: {
        OR: [
          { id: creatorIdOrUsername },
          { userId: creatorIdOrUsername },
          { user: { username: creatorIdOrUsername } },
        ],
      },
      include: {
        user: {
          include: {
            wallet: true,
          },
        },
        interactionDefinitions: {
          where: { isEnabled: true },
          orderBy: { sortOrder: "asc" },
        },
        contents: {
          where: { isPublished: true },
          orderBy: { createdAt: "desc" },
        },
        verifications: {
          select: {
            verificationStatus: true,
            verifiedAt: true,
          },
        },
        livestreams: {
          where: { status: "LIVE" },
          take: 1,
          orderBy: { startedAt: "desc" },
        },
        collectiveGoals: {
          where: { status: "ACTIVE" },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!creator) return null;

    // 2. Fetch Viewer User (if authenticated)
    const viewer = viewerUserId
      ? await prisma.user.findUnique({
          where: { id: viewerUserId },
          include: {
            wallet: true,
            subscriptionsFan: {
              where: { creatorProfileId: creator.id },
            },
            contentPurchases: {
              where: { content: { creatorProfileId: creator.id } },
            },
            ageAssuranceRecords: {
              where: { status: "APPROVED" },
              take: 1,
            },
          },
        })
      : null;

    // 3. Compute Viewer Permissions
    const isCreator = viewer?.id === creator.userId;
    const isAdmin = viewer?.role === "ADMIN";
    const isModerator = viewer?.role === "MODERATOR" || isAdmin || isCreator;
    const isAgeVerified =
      viewer?.kycStatus === "AGE_VERIFIED" ||
      viewer?.kycStatus === "COMPLIANCE_2257_APPROVED" ||
      (viewer?.ageAssuranceRecords?.length ?? 0) > 0;

    const activeSubscription = viewer?.subscriptionsFan?.find(
      (s) => s.status === "ACTIVE" && new Date(s.currentPeriodEnd) >= new Date()
    );
    const isVip = Boolean(activeSubscription) || isCreator || isAdmin;

    let canView = true;
    let restrictionReason: string | undefined;

    const activeLive = creator.livestreams[0];
    if (activeLive?.streamMode === "PRIVATE_1ON1" && !isCreator && !isAdmin) {
      canView = false;
      restrictionReason = "This room is in Private Show mode. VIP membership is required to view.";
    }

    const permissions: ViewerPermissions = {
      canView,
      canChat: canView && (isAgeVerified || Boolean(viewer)),
      canInteract: canView,
      canTip: canView && Boolean(viewer),
      isVip,
      isModerator,
      isCreator,
      isAdmin,
      isAgeVerified,
      restrictionReason,
    };

    // 4. Compute Viewer Relationship Level
    let totalContributed = 0;
    let topRank: number | null = null;

    if (viewer) {
      const viewerWalletId = viewer.wallet?.id;
      const creatorWalletId = creator.user.wallet?.id;

      if (viewerWalletId && creatorWalletId) {
        const fanTips = await prisma.walletTransaction.findMany({
          where: {
            sourceWalletId: viewerWalletId,
            destinationWalletId: creatorWalletId,
            status: "COMPLETED",
            transactionType: { in: ["LIVE_TIP", "PPV_PURCHASE", "SUBSCRIPTION_PAYMENT", "INTERACTION_FEE"] },
          },
          select: { amountCredits: true },
        });
        totalContributed = fanTips.reduce((sum, item) => sum + item.amountCredits, 0);

        const allTippers = await prisma.walletTransaction.groupBy({
          by: ["sourceWalletId"],
          where: {
            destinationWalletId: creatorWalletId,
            status: "COMPLETED",
            transactionType: "LIVE_TIP",
            sourceWalletId: { not: null },
          },
          _sum: { amountCredits: true },
          orderBy: { _sum: { amountCredits: "desc" } },
        });

        const rankIndex = allTippers.findIndex((t: any) => t.sourceWalletId === viewerWalletId);
        if (rankIndex >= 0) {
          topRank = rankIndex + 1;
        }
      }
    }

    const fanLevel = Math.max(1, Math.floor(Math.sqrt(totalContributed / 40)) + 1);
    let fanTitle = "New Explorer";
    let fanBadge: string | null = null;

    if (isCreator) {
      fanTitle = "Room Host";
      fanBadge = "CREATOR";
    } else if (isAdmin) {
      fanTitle = "Platform Admin";
      fanBadge = "ADMIN";
    } else if (isModerator) {
      fanTitle = "Moderator";
      fanBadge = "MOD";
    } else if (topRank === 1) {
      fanTitle = "#1 Top Patron";
      fanBadge = "👑 #1 SUPPORTER";
    } else if (isVip) {
      fanTitle = "VIP Member";
      fanBadge = `💎 VIP Lv.${fanLevel}`;
    } else if (fanLevel >= 5) {
      fanTitle = "Superfan";
      fanBadge = `⭐ Fan Lv.${fanLevel}`;
    } else if (fanLevel >= 2) {
      fanTitle = "Supporter";
      fanBadge = `Lv.${fanLevel}`;
    }

    const relationship: ViewerRelationship = {
      isFollowing: Boolean(activeSubscription) || totalContributed > 0,
      isSubscribed: Boolean(activeSubscription),
      subscriptionTier: activeSubscription?.tier || null,
      subscriptionExpiresAt: activeSubscription?.currentPeriodEnd || null,
      totalTokensContributed: totalContributed,
      fanLevel,
      fanTitle,
      fanBadge,
      topContributorRank: topRank,
    };

    // 5. Creator Live Goal
    const activeGoal = creator.collectiveGoals[0];
    const goalTarget = activeGoal?.targetCredits || 500;
    const goalProgress = activeGoal?.currentCredits || 0;
    const goalPercent = Math.min(100, Math.round((goalProgress / goalTarget) * 100));
    const goalRemaining = Math.max(0, goalTarget - goalProgress);

    const goal: StreamGoalData = {
      title: activeGoal?.title || "Stream Milestone Goal 🎯",
      target: goalTarget,
      progress: goalProgress,
      percentage: goalPercent,
      remaining: goalRemaining,
      isCompleted: goalProgress >= goalTarget,
    };

    // 6. Interaction Catalogue
    const interactions: InteractionCatalogueItem[] = creator.interactionDefinitions.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      creditCost: item.priceCredits,
      actionType: item.actionType,
      sortOrder: item.sortOrder,
      isEnabled: item.isEnabled,
    }));

    // 7. PPV Vault with unlocked status for this viewer
    const unlockedPpvIds = new Set(viewer?.contentPurchases.map((p) => p.contentId) || []);
    const ppvVault: PPVVaultItem[] = creator.contents.map((ppv) => ({
      id: ppv.id,
      title: ppv.title,
      description: ppv.description,
      previewUrl: ppv.previewUrl,
      creditPrice: ppv.priceCredits,
      mediaType: ppv.contentType,
      isUnlocked: unlockedPpvIds.has(ppv.id) || isCreator,
    }));

    // 8. Room Configuration
    const approvedVerification = creator.verifications.find((v) => v.verificationStatus === "APPROVED");
    const roomConfig: RoomConfig = {
      id: creator.id,
      creatorId: creator.id,
      userId: creator.userId,
      displayName: creator.user.displayName,
      username: creator.user.username,
      avatarUrl: creator.user.avatarUrl,
      bannerUrl: creator.bannerUrl,
      bio: creator.bio,
      streamTitle: activeLive?.title || "Live Stream",
      isLive: creator.isLive,
      viewerCount: activeLive?.currentViewerCount || 0,
      tags: creator.tags ? creator.tags.split(",").map((t) => t.trim()) : [],
      isPrivateShow: activeLive?.streamMode === "PRIVATE_1ON1",
      minTipForPrivate: creator.defaultMinTip,
      is2257Compliant: !!approvedVerification,
      complianceApprovedAt: approvedVerification?.verifiedAt || null,
      activeSessionId: activeLive?.id,
    };

    // 9. Playback Access Token (if allowed)
    let playback: PlaybackToken | undefined;
    if (canView) {
      playback = await mediaAdapter.generatePlaybackToken(creator.id, viewerUserId, isVip);
    }

    return {
      roomConfig,
      permissions,
      relationship,
      goal,
      interactions,
      ppvVault,
      playback,
      viewerWalletBalance: viewer?.wallet?.balance ?? 0,
    };
  }
}
