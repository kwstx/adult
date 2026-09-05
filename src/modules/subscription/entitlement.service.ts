import prisma from "@/lib/db";
import {
  EntitlementType,
  EntitlementCheckInput,
  EntitlementCheckResult,
  FanEntitlementsSummary,
  SubscriptionStatus,
  SubscriptionTier,
} from "./types";

export class EntitlementService {
  /**
   * The Authoritative Gatekeeper:
   * "Does this fan currently possess entitlement X?"
   *
   * Validates subscriber status, active period, paused state, tier levels,
   * product-configured entitlements, and creator/admin privileges.
   */
  static async hasEntitlement(
    input: EntitlementCheckInput,
    db: any = prisma
  ): Promise<EntitlementCheckResult> {
    const { fanId, creatorProfileId, entitlement, context } = input;

    // 1. Fetch Creator and Creator's User ID
    const creator = await db.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: { id: true, userId: true },
    });

    if (!creator) {
      return {
        hasEntitlement: false,
        reason: "Creator profile not found.",
        statusCode: 404,
      };
    }

    // 2. Creator Authority Bypass: Creators always possess all entitlements for their own domain
    if (fanId && fanId === creator.userId) {
      return {
        hasEntitlement: true,
        reason: "Creator has full authoritative access to own content and features.",
        statusCode: 200,
        isBypassed: true,
      };
    }

    // 3. Unauthenticated viewers cannot possess subscriber entitlements
    if (!fanId) {
      return {
        hasEntitlement: false,
        reason: "Authentication required to verify subscription entitlements.",
        statusCode: 401,
      };
    }

    // 4. Admin / Moderator Check
    const user = await db.user.findUnique({
      where: { id: fanId },
      select: { id: true, role: true, isBanned: true },
    });

    if (!user || user.isBanned) {
      return {
        hasEntitlement: false,
        reason: "User account is suspended or not found.",
        statusCode: 403,
      };
    }

    if (user.role === "ADMIN") {
      return {
        hasEntitlement: true,
        reason: "Platform administrator authority bypass.",
        statusCode: 200,
        isBypassed: true,
      };
    }

    // 5. Look up customer's subscription for this creator
    const subscription = await db.subscription.findUnique({
      where: {
        fanId_creatorProfileId: {
          fanId,
          creatorProfileId,
        },
      },
      include: {
        product: true,
      },
    });

    if (!subscription) {
      return {
        hasEntitlement: false,
        reason: `No active subscription found with this creator. Required entitlement: ${entitlement}`,
        statusCode: 403,
      };
    }

    // 6. Check Paused State
    if (subscription.isPaused || subscription.status === SubscriptionStatus.PAUSED) {
      return {
        hasEntitlement: false,
        reason: "Subscription is currently paused. Resume subscription to restore access.",
        statusCode: 403,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          tier: subscription.tier,
          tierName: subscription.tierName,
          tierLevel: subscription.tierLevel,
          billingPriceCents: subscription.billingPriceCents,
          billingCurrency: subscription.billingCurrency,
          isPriceGrandfathered: subscription.isPriceGrandfathered,
          renewalDate: subscription.renewalDate,
          currentPeriodEnd: subscription.currentPeriodEnd,
          isPaused: true,
        },
      };
    }

    const now = new Date();

    // 7. Check Active Period & Status
    const isPeriodActive = subscription.currentPeriodEnd >= now;
    const isPastDueInGrace =
      subscription.status === SubscriptionStatus.PAST_DUE &&
      subscription.gracePeriodEndsAt &&
      subscription.gracePeriodEndsAt >= now;

    const isAuthorizedStatus =
      (subscription.status === SubscriptionStatus.ACTIVE && isPeriodActive) ||
      (subscription.cancelAtPeriodEnd && isPeriodActive) ||
      isPastDueInGrace;

    if (!isAuthorizedStatus) {
      return {
        hasEntitlement: false,
        reason: `Subscription is ${subscription.status.toLowerCase()} and period has expired.`,
        statusCode: 403,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          tier: subscription.tier,
          tierName: subscription.tierName,
          tierLevel: subscription.tierLevel,
          billingPriceCents: subscription.billingPriceCents,
          billingCurrency: subscription.billingCurrency,
          isPriceGrandfathered: subscription.isPriceGrandfathered,
          renewalDate: subscription.renewalDate,
          currentPeriodEnd: subscription.currentPeriodEnd,
          isPaused: false,
        },
      };
    }

    // 8. Check Tier Level Constraints
    if (context?.minTierLevel && subscription.tierLevel < context.minTierLevel) {
      return {
        hasEntitlement: false,
        reason: `Subscription tier (${subscription.tierName}) does not meet minimum level requirement (${context.minTierLevel}). Upgrade required.`,
        statusCode: 403,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          tier: subscription.tier,
          tierName: subscription.tierName,
          tierLevel: subscription.tierLevel,
          billingPriceCents: subscription.billingPriceCents,
          billingCurrency: subscription.billingCurrency,
          isPriceGrandfathered: subscription.isPriceGrandfathered,
          renewalDate: subscription.renewalDate,
          currentPeriodEnd: subscription.currentPeriodEnd,
          isPaused: false,
        },
      };
    }

    // 9. Check Specific Configured Entitlements on Product or Default Tier Matrix
    const productEntitlements: string[] = subscription.product?.entitlements
      ? subscription.product.entitlements.split(",").map((e: string) => e.trim().toUpperCase())
      : [];

    const requestedEntitlement = entitlement.trim().toUpperCase();

    const defaultMatrix: Record<string, string[]> = {
      BASIC: ["SUBSCRIBER_CONTENT", "SUBSCRIBER_CHAT", "CUSTOM_BADGE"],
      VIP: [
        "SUBSCRIBER_CONTENT",
        "SUBSCRIBER_CHAT",
        "SUBSCRIBER_LIVE",
        "VIP_MEDIA",
        "DIRECT_MESSAGES",
        "CUSTOM_BADGE",
        "VOD_RECORDINGS",
      ],
      DIAMOND: [
        "SUBSCRIBER_CONTENT",
        "SUBSCRIBER_CHAT",
        "SUBSCRIBER_LIVE",
        "VIP_MEDIA",
        "DIRECT_MESSAGES",
        "DISCOUNT_PPV",
        "CUSTOM_BADGE",
        "VOD_RECORDINGS",
      ],
    };

    const hasSpecificEntitlement =
      productEntitlements.includes(requestedEntitlement) ||
      (defaultMatrix[subscription.tier]?.includes(requestedEntitlement) ?? false) ||
      subscription.tierLevel >= 3;

    if (!hasSpecificEntitlement) {
      return {
        hasEntitlement: false,
        reason: `Current tier (${subscription.tierName}) does not include the "${entitlement}" entitlement.`,
        statusCode: 403,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          tier: subscription.tier,
          tierName: subscription.tierName,
          tierLevel: subscription.tierLevel,
          billingPriceCents: subscription.billingPriceCents,
          billingCurrency: subscription.billingCurrency,
          isPriceGrandfathered: subscription.isPriceGrandfathered,
          renewalDate: subscription.renewalDate,
          currentPeriodEnd: subscription.currentPeriodEnd,
          isPaused: false,
        },
      };
    }

    // 10. Entitlement Authorized!
    return {
      hasEntitlement: true,
      reason: `Entitlement "${entitlement}" authorized under active tier: ${subscription.tierName}.`,
      statusCode: 200,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        tier: subscription.tier,
        tierName: subscription.tierName,
        tierLevel: subscription.tierLevel,
        billingPriceCents: subscription.billingPriceCents,
        billingCurrency: subscription.billingCurrency,
        isPriceGrandfathered: subscription.isPriceGrandfathered,
        renewalDate: subscription.renewalDate,
        currentPeriodEnd: subscription.currentPeriodEnd,
        isPaused: false,
      },
    };
  }

  /**
   * Content Gate: Authorizes access to posts, photos, videos, and media.
   */
  static async authorizeContentAccess(
    params: {
      fanId?: string | null;
      contentId: string;
    },
    db: any = prisma
  ): Promise<{ allowed: boolean; reason: string; statusCode: number }> {
    const { fanId, contentId } = params;

    const content = await db.content.findUnique({
      where: { id: contentId },
      include: { creatorProfile: true },
    });

    if (!content) {
      return { allowed: false, reason: "Content not found.", statusCode: 404 };
    }

    if (content.accessLevel === "PUBLIC") {
      return { allowed: true, reason: "Content is public.", statusCode: 200 };
    }

    if (!fanId) {
      return { allowed: false, reason: "Login required to access this content.", statusCode: 401 };
    }

    if (content.creatorProfile?.userId === fanId) {
      return { allowed: true, reason: "Content owner authorized.", statusCode: 200 };
    }

    if (content.accessLevel === "FOLLOWERS_ONLY") {
      const follow = await db.follow.findUnique({
        where: {
          followerId_creatorProfileId: {
            followerId: fanId,
            creatorProfileId: content.creatorProfileId,
          },
        },
      });
      if (follow) {
        return { allowed: true, reason: "Follower access granted.", statusCode: 200 };
      }
    }

    if (content.accessLevel === "PPV_PURCHASE") {
      const purchase = await db.contentPurchase.findUnique({
        where: {
          contentId_fanId: {
            contentId,
            fanId,
          },
        },
      });
      if (purchase) {
        return { allowed: true, reason: "PPV unlock purchased.", statusCode: 200 };
      }
    }

    if (content.accessLevel === "SUBSCRIBERS_ONLY") {
      const entCheck = await this.hasEntitlement(
        {
          fanId,
          creatorProfileId: content.creatorProfileId,
          entitlement: "SUBSCRIBER_CONTENT",
          context: { contentId },
        },
        db
      );
      return {
        allowed: entCheck.hasEntitlement,
        reason: entCheck.reason,
        statusCode: entCheck.statusCode,
      };
    }

    if (content.accessLevel === "TIER_VIP_ONLY") {
      const entCheck = await this.hasEntitlement(
        {
          fanId,
          creatorProfileId: content.creatorProfileId,
          entitlement: "VIP_MEDIA",
          context: { minTierLevel: 2, contentId },
        },
        db
      );
      return {
        allowed: entCheck.hasEntitlement,
        reason: entCheck.reason,
        statusCode: entCheck.statusCode,
      };
    }

    return {
      allowed: false,
      reason: "Subscription or PPV purchase required to view this content.",
      statusCode: 403,
    };
  }

  /**
   * Chat Gate: Authorizes chat participation in live broadcast rooms.
   */
  static async authorizeChatAccess(
    params: {
      fanId?: string | null;
      creatorProfileId: string;
      livestreamId?: string;
      isSubscribersOnlyChat?: boolean;
    },
    db: any = prisma
  ): Promise<{ allowed: boolean; reason: string; canBypassSlowMode: boolean; badge?: any }> {
    const { fanId, creatorProfileId, isSubscribersOnlyChat = false } = params;

    if (!isSubscribersOnlyChat) {
      return { allowed: true, reason: "Public chat enabled.", canBypassSlowMode: false };
    }

    const entCheck = await this.hasEntitlement(
      {
        fanId,
        creatorProfileId,
        entitlement: "SUBSCRIBER_CHAT",
      },
      db
    );

    if (!entCheck.hasEntitlement) {
      return {
        allowed: false,
        reason: entCheck.reason,
        canBypassSlowMode: false,
      };
    }

    const isVipTier = (entCheck.subscription?.tierLevel ?? 1) >= 2;

    return {
      allowed: true,
      reason: "Subscriber chat authorized.",
      canBypassSlowMode: isVipTier,
      badge: {
        tierName: entCheck.subscription?.tierName,
        tierLevel: entCheck.subscription?.tierLevel,
      },
    };
  }

  /**
   * Livestream Gate: Authorizes viewing subscriber-only live stream broadcasts.
   */
  static async authorizeLiveStreamAccess(
    params: {
      fanId?: string | null;
      creatorProfileId: string;
      livestreamId?: string;
      streamMode: "PUBLIC_BROADCAST" | "SUBSCRIBERS_ONLY" | "VIP_GROUP" | "TICKETED_PPV" | "PRIVATE_1ON1";
    },
    db: any = prisma
  ): Promise<{ allowed: boolean; reason: string; statusCode: number }> {
    const { fanId, creatorProfileId, streamMode } = params;

    if (streamMode === "PUBLIC_BROADCAST") {
      return { allowed: true, reason: "Public broadcast.", statusCode: 200 };
    }

    if (streamMode === "SUBSCRIBERS_ONLY") {
      const entCheck = await this.hasEntitlement(
        {
          fanId,
          creatorProfileId,
          entitlement: "SUBSCRIBER_LIVE",
        },
        db
      );
      return {
        allowed: entCheck.hasEntitlement,
        reason: entCheck.reason,
        statusCode: entCheck.statusCode,
      };
    }

    if (streamMode === "VIP_GROUP") {
      const entCheck = await this.hasEntitlement(
        {
          fanId,
          creatorProfileId,
          entitlement: "VIP_MEDIA",
          context: { minTierLevel: 2 },
        },
        db
      );
      return {
        allowed: entCheck.hasEntitlement,
        reason: entCheck.reason,
        statusCode: entCheck.statusCode,
      };
    }

    return {
      allowed: false,
      reason: "Restricted stream broadcast.",
      statusCode: 403,
    };
  }

  /**
   * Retrieves full breakdown of all active entitlements for a fan + creator pair.
   */
  static async getFanEntitlements(
    fanId: string,
    creatorProfileId: string,
    db: any = prisma
  ): Promise<FanEntitlementsSummary> {
    const sub = await db.subscription.findUnique({
      where: {
        fanId_creatorProfileId: {
          fanId,
          creatorProfileId,
        },
      },
      include: {
        product: true,
      },
    });

    if (!sub) {
      return {
        fanId,
        creatorProfileId,
        isSubscribed: false,
        status: null,
        tier: null,
        tierName: null,
        tierLevel: 0,
        billingPriceCents: 0,
        billingCurrency: "EUR",
        isPriceGrandfathered: false,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        renewalDate: null,
        autoRenew: false,
        isPaused: false,
        entitlements: [],
        badge: null,
      };
    }

    const rawEntitlements = sub.product?.entitlements
      ? sub.product.entitlements.split(",").map((e: string) => e.trim() as EntitlementType)
      : (["SUBSCRIBER_CONTENT", "SUBSCRIBER_CHAT"] as EntitlementType[]);

    return {
      fanId,
      creatorProfileId,
      isSubscribed: sub.status === SubscriptionStatus.ACTIVE,
      status: sub.status,
      tier: sub.tier,
      tierName: sub.tierName,
      tierLevel: sub.tierLevel,
      billingPriceCents: sub.billingPriceCents,
      billingCurrency: sub.billingCurrency,
      isPriceGrandfathered: sub.isPriceGrandfathered,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      renewalDate: sub.renewalDate,
      autoRenew: sub.autoRenew,
      isPaused: sub.isPaused,
      entitlements: rawEntitlements,
      badge: {
        name: `${sub.tierName} Subscriber`,
        iconUrl: sub.product?.badgeIconUrl,
        colorHex: sub.product?.badgeColorHex || "#9333EA",
      },
    };
  }
}
