/**
 * Operational Data Service (OLTP Fast Path)
 * 
 * Answers high-concurrency, low-latency operational questions:
 * 1. "What is Alex's wallet balance?" -> getWalletBalance(userId)
 * 2. "What subscriptions are active?" -> getActiveSubscriptions(query)
 * 3. "Who owns this video?" -> getContentOwnership(contentId, queryUserId?)
 * 
 * Principles:
 * - Direct point lookups via Primary Key or Unique Index on PostgreSQL
 * - No full-table historical scans
 * - Sub-10ms response times for critical transaction and authorization checks
 */

import prisma from "@/lib/db";
import { redis } from "@/lib/redis";
import {
  WalletBalanceOperationalView,
  ActiveSubscriptionsOperationalView,
  ContentOwnershipOperationalView,
  ActiveSubscriptionItem,
} from "./types";

const CREDITS_PER_EUR = 100; // 100 credits = €1.00

export class OperationalDataService {
  /**
   * Operational Question 1: "What is Alex's wallet balance?"
   * 
   * Retrieves authoritative point-in-time wallet balance and active credit lots.
   * Leverages indexed lookup on `wallets.user_id` and active `credit_lots`.
   */
  public static async getWalletBalance(
    userId: string,
    db: any = prisma
  ): Promise<WalletBalanceOperationalView> {
    if (!userId) {
      throw new Error("Operational query requires a valid userId");
    }

    // 1. Fetch Authoritative Wallet Row (Indexed Point Lookup)
    const wallet = await db.wallet.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        balance: true,
        purchasedBalance: true,
        promotionalBalance: true,
        bonusBalance: true,
        lockedBalance: true,
        pendingBalance: true,
        status: true,
        updatedAt: true,
      },
    });

    if (!wallet) {
      // Return 0-balance operational view if wallet is not yet materialized
      return {
        userId,
        walletId: "unallocated",
        status: "ACTIVE",
        totalBalance: 0,
        breakdown: {
          purchasedCredits: 0,
          promotionalCredits: 0,
          bonusCredits: 0,
          lockedCredits: 0,
          pendingCredits: 0,
        },
        fiatEquivalentEur: 0,
        creditLots: [],
        fetchedAt: new Date().toISOString(),
      };
    }

    // 2. Fetch Active Credit Lots for granular lot breakdown (FIFO traceability)
    const activeLots = await db.creditLot.findMany({
      where: {
        walletId: wallet.id,
        status: "ACTIVE",
        remainingCredits: { gt: 0 },
      },
      select: {
        id: true,
        type: true,
        remainingCredits: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const totalBalance = wallet.balance || 0;
    const fiatEquivalentEur = Number((totalBalance / CREDITS_PER_EUR).toFixed(2));

    return {
      userId: wallet.userId,
      walletId: wallet.id,
      status: wallet.status as any,
      totalBalance,
      breakdown: {
        purchasedCredits: wallet.purchasedBalance || 0,
        promotionalCredits: wallet.promotionalBalance || 0,
        bonusCredits: wallet.bonusBalance || 0,
        lockedCredits: wallet.lockedBalance || 0,
        pendingCredits: wallet.pendingBalance || 0,
      },
      fiatEquivalentEur,
      creditLots: activeLots.map((lot: any) => ({
        lotId: lot.id,
        type: lot.type,
        remainingCredits: lot.remainingCredits,
        expiresAt: lot.expiresAt ? new Date(lot.expiresAt).toISOString() : null,
      })),
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * Operational Question 2: "What subscriptions are active?"
   * 
   * Fast indexed lookup of all currently active and valid subscriptions.
   * Can be queried globally, for a specific fan, or for a specific creator.
   */
  public static async getActiveSubscriptions(
    query: { userId?: string; creatorProfileId?: string } = {},
    db: any = prisma
  ): Promise<ActiveSubscriptionsOperationalView> {
    const now = new Date();
    const whereClause: any = {
      status: "ACTIVE",
      currentPeriodEnd: { gte: now },
    };

    if (query.userId) {
      whereClause.fanId = query.userId;
    }

    if (query.creatorProfileId) {
      whereClause.creatorProfileId = query.creatorProfileId;
    }

    // Fast indexed query: [status, current_period_end]
    const subscriptions = await db.subscription.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            tier: true,
            tierName: true,
            priceCredits: true,
            billingIntervalDays: true,
          },
        },
        fan: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        creatorProfile: {
          select: {
            id: true,
            stageName: true,
            user: {
              select: {
                username: true,
              },
            },
          },
        },
      },
      orderBy: { currentPeriodEnd: "desc" },
    });

    const items: ActiveSubscriptionItem[] = subscriptions.map((sub: any) => {
      const daysRemaining = Math.max(
        0,
        Math.ceil((new Date(sub.currentPeriodEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );

      return {
        subscriptionId: sub.id,
        fanId: sub.fanId,
        fanUsername: sub.fan?.username,
        fanDisplayName: sub.fan?.displayName,
        creatorProfileId: sub.creatorProfileId,
        creatorStageName: sub.creatorProfile?.stageName,
        creatorUsername: sub.creatorProfile?.user?.username,
        tier: sub.product?.tier || "BASIC",
        tierName: sub.product?.tierName || "Subscription",
        priceCredits: sub.product?.priceCredits || 0,
        billingIntervalDays: sub.product?.billingIntervalDays || 30,
        status: sub.status,
        currentPeriodStart: new Date(sub.currentPeriodStart).toISOString(),
        currentPeriodEnd: new Date(sub.currentPeriodEnd).toISOString(),
        autoRenew: sub.autoRenew ?? true,
        daysRemaining,
        isGracePeriod: sub.inGracePeriod ?? false,
      };
    });

    return {
      totalActive: items.length,
      subscriptions: items,
      queriedFor: {
        userId: query.userId,
        creatorProfileId: query.creatorProfileId,
      },
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * Operational Question 3: "Who owns this video?"
   * 
   * Retrieves authoritative content ownership information for a video/media asset.
   * Also verifies user entitlement (creator owner, PPV unlock, active VIP sub, or public).
   */
  public static async getContentOwnership(
    contentId: string,
    queryUserId?: string,
    db: any = prisma
  ): Promise<ContentOwnershipOperationalView> {
    if (!contentId) {
      throw new Error("Operational query requires a valid contentId");
    }

    // 1. Fetch Authoritative Content & Creator Details (Indexed Point Lookup)
    const content = await db.content.findUnique({
      where: { id: contentId },
      include: {
        creatorProfile: {
          select: {
            id: true,
            userId: true,
            stageName: true,
            user: {
              select: {
                username: true,
              },
            },
          },
        },
      },
    });

    if (!content) {
      throw new Error(`Content not found with ID: ${contentId}`);
    }

    const creatorOwner = {
      creatorProfileId: content.creatorProfileId,
      creatorUserId: content.creatorProfile?.userId || "",
      stageName: content.creatorProfile?.stageName || "Creator",
      username: content.creatorProfile?.user?.username || "creator",
    };

    let userEntitlement: ContentOwnershipOperationalView["userEntitlement"] = undefined;

    // 2. Evaluate User Entitlement if a requesting user is provided
    if (queryUserId) {
      let hasAccess = false;
      let accessReason: any = "NO_ACCESS";
      let purchasedAt: string | undefined = undefined;
      let transactionId: string | undefined = undefined;

      if (queryUserId === creatorOwner.creatorUserId) {
        // Creator owns the content
        hasAccess = true;
        accessReason = "CREATOR_OWNER";
      } else if (content.accessLevel === "PUBLIC") {
        hasAccess = true;
        accessReason = "FREE_PUBLIC";
      } else {
        // Check PPV Direct Purchase
        const directPurchase = await db.contentPurchase.findFirst({
          where: {
            contentId: content.id,
            buyerUserId: queryUserId,
          },
        });

        if (directPurchase) {
          hasAccess = true;
          accessReason = "PPV_PURCHASED";
          purchasedAt = new Date(directPurchase.createdAt).toISOString();
          transactionId = directPurchase.id;
        } else if (
          content.accessLevel === "SUBSCRIBERS_ONLY" ||
          content.accessLevel === "TIER_VIP_ONLY"
        ) {
          // Check active subscription
          const now = new Date();
          const activeSub = await db.subscription.findFirst({
            where: {
              fanId: queryUserId,
              creatorProfileId: content.creatorProfileId,
              status: "ACTIVE",
              currentPeriodEnd: { gte: now },
            },
            include: { product: true },
          });

          if (activeSub) {
            if (content.accessLevel === "SUBSCRIBERS_ONLY") {
              hasAccess = true;
              accessReason = "ACTIVE_SUBSCRIPTION";
            } else if (
              content.accessLevel === "TIER_VIP_ONLY" &&
              (activeSub.product?.tier === "VIP" || activeSub.product?.tier === "DIAMOND")
            ) {
              hasAccess = true;
              accessReason = "ACTIVE_SUBSCRIPTION";
            }
          }
        }
      }

      userEntitlement = {
        userId: queryUserId,
        hasAccess,
        accessReason,
        purchasedAt,
        transactionId,
      };
    }

    return {
      contentId: content.id,
      title: content.title || "Untitled Media",
      contentType: content.type as any,
      creatorOwner,
      accessLevel: content.accessLevel as any,
      priceCredits: content.priceCredits || 0,
      isPublished: content.isPublished ?? true,
      userEntitlement,
      fetchedAt: new Date().toISOString(),
    };
  }
}
