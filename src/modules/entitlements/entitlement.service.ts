import prisma from "@/lib/db";
import {
  EntitlementKey,
  EntitlementScope,
  EntitlementRecord,
  EntitlementCheckInput,
  EntitlementCheckResult,
  GetUserEntitlementsInput,
  UserEntitlementsSummary,
  GrantEntitlementInput,
  RevokeEntitlementInput,
} from "./types";
import { eventBus } from "@/modules/realtime/event-bus";
import { StructuredLogger } from "@/core/observability";

// Global in-memory entitlement grant registry (supports fast resolution, test harnesses, and supplemental grants)
const ephemeralGrantsStore = new Map<string, EntitlementRecord>();

export class EntitlementService {
  /**
   * Authoritative Gatekeeper:
   * Answers: "What does this user currently have access to?"
   *
   * Validates:
   * 1. Unauthenticated requests
   * 2. Banned / suspended user accounts
   * 3. Creator self-domain bypass (creator always has full access to their own domain/content)
   * 4. Platform Administrator authority bypass
   * 5. Active creator subscriptions and tier levels
   * 6. Authoritative PPV content purchases
   * 7. Private session bookings
   * 8. Livestream seat reservations
   * 9. Explicit / stored entitlement grants
   */
  static async checkEntitlement(
    input: EntitlementCheckInput,
    db: any = prisma
  ): Promise<EntitlementCheckResult> {
    const { userId, key, scope = "GLOBAL", creatorProfileId, resourceId, minimumTierLevel = 1 } = input;

    // 1. Unauthenticated viewers cannot hold private entitlements
    if (!userId) {
      return {
        hasEntitlement: false,
        reason: `Authentication required to verify entitlement: ${key}`,
        statusCode: 401,
      };
    }

    // 2. User Account Status & Role Check
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isBanned: true },
    });

    if (!user || user.isBanned) {
      return {
        hasEntitlement: false,
        reason: "User account not found or suspended.",
        statusCode: 403,
      };
    }

    // 3. Platform Administrator Bypass
    if (user.role === "ADMIN") {
      return {
        hasEntitlement: true,
        reason: "Platform Administrator authority bypass granted.",
        statusCode: 200,
        isBypassed: true,
      };
    }

    // 4. Creator Self-Domain Authority Bypass
    if (creatorProfileId) {
      const creator = await db.creatorProfile.findUnique({
        where: { id: creatorProfileId },
        select: { id: true, userId: true },
      });

      if (creator && creator.userId === userId) {
        return {
          hasEntitlement: true,
          reason: "Creator has full authoritative access to their own domain and content.",
          statusCode: 200,
          isBypassed: true,
        };
      }
    }

    // 5. Check Explicit Stored / Ephemeral Entitlement Grants
    for (const grant of ephemeralGrantsStore.values()) {
      if (grant.userId === userId && grant.isActive && grant.key === key) {
        if (!grant.expiresAt || grant.expiresAt > new Date()) {
          const matchResource = !resourceId || !grant.resourceId || grant.resourceId === resourceId;
          const matchCreator = !creatorProfileId || !grant.creatorProfileId || grant.creatorProfileId === creatorProfileId;
          if (matchResource && matchCreator) {
            return {
              hasEntitlement: true,
              reason: `Authoritative direct entitlement active (${grant.sourceType}).`,
              statusCode: 200,
              entitlement: grant,
              expiresAt: grant.expiresAt,
              tierLevel: grant.tierLevel || 1,
            };
          }
        }
      }
    }

    // 6. Domain-Specific Authoritative Rule Evaluation
    const now = new Date();

    // 6A. Subscriptions & Tiered VIP Access
    if (
      key === "SUBSCRIBER" ||
      key === "VIP_ACCESS" ||
      key === "DIAMOND_ACCESS" ||
      key === "SUBSCRIBER_CONTENT" ||
      key === "SUBSCRIBER_CHAT" ||
      key === "SUBSCRIBER_LIVE"
    ) {
      if (!creatorProfileId) {
        return {
          hasEntitlement: false,
          reason: "creatorProfileId is required to evaluate creator subscription entitlements.",
          statusCode: 400,
        };
      }

      const subscription = await db.subscription.findUnique({
        where: {
          fanId_creatorProfileId: {
            fanId: userId,
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
          reason: `No active subscription found with creator ${creatorProfileId}. Required: ${key}`,
          statusCode: 403,
        };
      }

      // Check subscription active state & grace period
      const isPeriodValid = new Date(subscription.currentPeriodEnd) > now;
      const isGraceValid = subscription.gracePeriodEndsAt && new Date(subscription.gracePeriodEndsAt) > now;

      if (subscription.status !== "ACTIVE" && !isPeriodValid && !isGraceValid) {
        return {
          hasEntitlement: false,
          reason: `Subscription is not active (Status: ${subscription.status}).`,
          statusCode: 403,
        };
      }

      if (subscription.isPaused) {
        return {
          hasEntitlement: false,
          reason: "Subscription is currently paused.",
          statusCode: 403,
        };
      }

      // Tier Level validation (1 = Basic, 2 = VIP, 3 = Diamond)
      const requiredTier = key === "DIAMOND_ACCESS" ? 3 : key === "VIP_ACCESS" ? 2 : minimumTierLevel;
      const fanTierLevel = subscription.tierLevel || 1;

      if (fanTierLevel < requiredTier) {
        return {
          hasEntitlement: false,
          reason: `Subscription tier level (${fanTierLevel}) is below required level (${requiredTier}).`,
          statusCode: 403,
        };
      }

      return {
        hasEntitlement: true,
        reason: `Active subscription verified (Tier: ${subscription.tierName || subscription.tier}, Level: ${fanTierLevel}).`,
        statusCode: 200,
        expiresAt: subscription.currentPeriodEnd,
        tierLevel: fanTierLevel,
      };
    }

    // 6B. PPV Content Access
    if (key === "CONTENT_ACCESS" || key === "PPV_PURCHASE") {
      const contentId = resourceId;
      if (!contentId) {
        return {
          hasEntitlement: false,
          reason: "resourceId (contentId) is required to evaluate content access.",
          statusCode: 400,
        };
      }

      // Check Content access level first
      const content = await db.content.findUnique({
        where: { id: contentId },
        select: { id: true, creatorProfileId: true, accessLevel: true, isPublished: true },
      });

      if (!content) {
        return {
          hasEntitlement: false,
          reason: "Content item not found.",
          statusCode: 404,
        };
      }

      if (content.accessLevel === "PUBLIC") {
        return {
          hasEntitlement: true,
          reason: "Public content is accessible to all users.",
          statusCode: 200,
        };
      }

      // Check if unlocked via direct ContentPurchase
      const purchase = await db.contentPurchase.findUnique({
        where: {
          contentId_fanId: {
            contentId,
            fanId: userId,
          },
        },
      });

      if (purchase) {
        if (!purchase.expiresAt || new Date(purchase.expiresAt) > now) {
          return {
            hasEntitlement: true,
            reason: "PPV content has been purchased and unlocked.",
            statusCode: 200,
            expiresAt: purchase.expiresAt,
          };
        }
      }

      // If subscribers-only content, verify creator subscription
      if (content.accessLevel === "SUBSCRIBERS_ONLY" || content.accessLevel === "TIER_VIP_ONLY") {
        const subCheck = await this.checkEntitlement(
          {
            userId,
            key: content.accessLevel === "TIER_VIP_ONLY" ? "VIP_ACCESS" : "SUBSCRIBER",
            creatorProfileId: content.creatorProfileId,
          },
          db
        );

        if (subCheck.hasEntitlement) {
          return {
            hasEntitlement: true,
            reason: `Unlocked via active subscriber entitlement (${subCheck.reason}).`,
            statusCode: 200,
            expiresAt: subCheck.expiresAt,
          };
        }
      }

      return {
        hasEntitlement: false,
        reason: "Content is locked. PPV purchase or active subscription required.",
        statusCode: 403,
      };
    }

    // 6C. Private Session Room Access
    if (key === "PRIVATE_SESSION_ACCESS") {
      const bookingId = resourceId;
      if (!bookingId) {
        return {
          hasEntitlement: false,
          reason: "resourceId (bookingId) is required to evaluate private session access.",
          statusCode: 400,
        };
      }

      const booking = await db.booking.findUnique({
        where: { id: bookingId },
        include: { creatorProfile: true },
      });

      if (!booking) {
        return {
          hasEntitlement: false,
          reason: "Private session booking not found.",
          statusCode: 404,
        };
      }

      const isParticipant = booking.fanId === userId || booking.creatorProfile.userId === userId;
      if (!isParticipant) {
        return {
          hasEntitlement: false,
          reason: "User is not an authorized participant of this private session.",
          statusCode: 403,
        };
      }

      const validStatuses = ["CONFIRMED", "IN_PROGRESS", "ACCEPTED"];
      if (!validStatuses.includes(booking.status)) {
        return {
          hasEntitlement: false,
          reason: `Private session is not in an active state (Status: ${booking.status}).`,
          statusCode: 403,
        };
      }

      return {
        hasEntitlement: true,
        reason: "User is confirmed participant in this private session.",
        statusCode: 200,
      };
    }

    // 6D. Premium Livestream Seat Access
    if (key === "PREMIUM_SEAT") {
      const streamId = resourceId;
      if (!streamId) {
        return {
          hasEntitlement: false,
          reason: "resourceId (livestreamId) is required to evaluate seat entitlement.",
          statusCode: 400,
        };
      }

      const occupiedSeat = await db.seat.findFirst({
        where: {
          livestreamId: streamId,
          currentUserId: userId,
          isOccupied: true,
        },
      });

      if (occupiedSeat) {
        if (!occupiedSeat.expiresAt || new Date(occupiedSeat.expiresAt) > now) {
          return {
            hasEntitlement: true,
            reason: `User occupies seat #${occupiedSeat.seatIndex} (${occupiedSeat.seatTier}).`,
            statusCode: 200,
            expiresAt: occupiedSeat.expiresAt,
          };
        }
      }

      return {
        hasEntitlement: false,
        reason: "User does not currently hold a premium seat in this livestream.",
        statusCode: 403,
      };
    }

    // Default response if no matching entitlement was found
    return {
      hasEntitlement: false,
      reason: `No valid entitlement found for key: ${key}`,
      statusCode: 403,
    };
  }

  /**
   * Consolidated Entitlements Resolver:
   * Returns complete entitlement summary for a user in a single authoritative query,
   * eliminating dozens of independent client-side permission checks.
   */
  static async getUserEntitlements(
    input: GetUserEntitlementsInput,
    db: any = prisma
  ): Promise<UserEntitlementsSummary> {
    const { userId, creatorProfileId, livestreamId } = input;
    const now = new Date();

    const result: UserEntitlementsSummary = {
      userId,
      creatorProfileId: creatorProfileId || null,
      livestreamId: livestreamId || null,
      isSubscriber: false,
      isVip: false,
      isDiamond: false,
      subscriptionTierLevel: 0,
      hasPrivateSession: false,
      hasPremiumSeat: false,
      hasPriorityQueue: false,
      hasDirectMessageAccess: false,
      unlockedContentIds: [],
      activeEntitlements: [],
      evaluatedAt: now.toISOString(),
    };

    if (!userId) return result;

    // 1. Check Creator Subscription (if creator context provided)
    if (creatorProfileId) {
      const sub = await db.subscription.findUnique({
        where: {
          fanId_creatorProfileId: {
            fanId: userId,
            creatorProfileId,
          },
        },
      });

      if (sub && (sub.status === "ACTIVE" || (sub.gracePeriodEndsAt && new Date(sub.gracePeriodEndsAt) > now))) {
        result.isSubscriber = true;
        result.subscriptionTierLevel = sub.tierLevel || 1;
        result.isVip = result.subscriptionTierLevel >= 2;
        result.isDiamond = result.subscriptionTierLevel >= 3;
        result.hasDirectMessageAccess = true;

        result.activeEntitlements.push({
          id: `sub_${sub.id}`,
          key: "SUBSCRIBER",
          scope: "CREATOR",
          creatorProfileId,
          expiresAt: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
          sourceType: "SUBSCRIPTION",
          metadata: { tier: sub.tierName || sub.tier, tierLevel: result.subscriptionTierLevel },
        });

        if (result.isVip) {
          result.activeEntitlements.push({
            id: `vip_${sub.id}`,
            key: "VIP_ACCESS",
            scope: "CREATOR",
            creatorProfileId,
            expiresAt: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
            sourceType: "SUBSCRIPTION",
            metadata: { tierLevel: result.subscriptionTierLevel },
          });
        }
      }
    }

    // 2. Fetch all Unlocked PPV Content for this user
    const purchases = await db.contentPurchase.findMany({
      where: { fanId: userId },
      select: { id: true, contentId: true, expiresAt: true, createdAt: true },
    });

    for (const p of purchases) {
      if (!p.expiresAt || new Date(p.expiresAt) > now) {
        result.unlockedContentIds.push(p.contentId);
        result.activeEntitlements.push({
          id: `content_${p.id}`,
          key: "CONTENT_ACCESS",
          scope: "CONTENT",
          resourceId: p.contentId,
          expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null,
          sourceType: "DIRECT_PURCHASE",
        });
      }
    }

    // 3. Check Livestream Seat (if livestream context provided)
    if (livestreamId) {
      const seat = await db.seat.findFirst({
        where: {
          livestreamId,
          currentUserId: userId,
          isOccupied: true,
        },
      });

      if (seat && (!seat.expiresAt || new Date(seat.expiresAt) > now)) {
        result.hasPremiumSeat = true;
        result.activeEntitlements.push({
          id: `seat_${seat.id}`,
          key: "PREMIUM_SEAT",
          scope: "LIVESTREAM",
          resourceId: livestreamId,
          expiresAt: seat.expiresAt ? seat.expiresAt.toISOString() : null,
          sourceType: "DIRECT_PURCHASE",
          metadata: { seatIndex: seat.seatIndex, seatTier: seat.seatTier },
        });
      }
    }

    // 4. Check Stored Ephemeral / Explicit Grants
    for (const grant of ephemeralGrantsStore.values()) {
      if (grant.userId === userId && grant.isActive) {
        if (!grant.expiresAt || grant.expiresAt > now) {
          if (
            (!creatorProfileId || grant.creatorProfileId === creatorProfileId || !grant.creatorProfileId) &&
            (!livestreamId || grant.resourceId === livestreamId || !grant.resourceId)
          ) {
            result.activeEntitlements.push({
              id: grant.id,
              key: grant.key,
              scope: grant.scope,
              creatorProfileId: grant.creatorProfileId,
              resourceId: grant.resourceId,
              expiresAt: grant.expiresAt ? grant.expiresAt.toISOString() : null,
              sourceType: grant.sourceType,
              metadata: grant.metadata,
            });

            if (grant.key === "PRIVATE_SESSION_ACCESS") result.hasPrivateSession = true;
            if (grant.key === "PRIORITY_INTERACTION") result.hasPriorityQueue = true;
          }
        }
      }
    }

    return result;
  }

  /**
   * Authoritative Grant of an Entitlement
   * Idempotently establishes access and notifies realtime event bus.
   */
  static async grantEntitlement(
    input: GrantEntitlementInput,
    _tx?: any
  ): Promise<EntitlementRecord> {
    const { userId, key, scope, creatorProfileId, resourceId, orderId, tierLevel = 1, expiresAt, sourceType, metadata } = input;

    const id = `ent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const record: EntitlementRecord = {
      id,
      userId,
      key,
      scope,
      creatorProfileId: creatorProfileId || null,
      resourceId: resourceId || null,
      orderId: orderId || null,
      tierLevel,
      grantedAt: new Date(),
      expiresAt: expiresAt || null,
      isActive: true,
      sourceType,
      metadata: metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const grantKey = `${userId}:${key}:${scope}:${creatorProfileId || "*"}:${resourceId || "*"}`;
    ephemeralGrantsStore.set(grantKey, record);

    StructuredLogger.info("Authoritative Entitlement Granted", {
      entitlementId: id,
      userId,
      key,
      scope,
      creatorProfileId: creatorProfileId || undefined,
      resourceId: resourceId || undefined,
      orderId: orderId || undefined,
      sourceType,
      expiresAt,
    });

    eventBus.publish(`user:${userId}`, {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: "ENTITLEMENT_GRANTED" as any,
      channel: `user:${userId}`,
      timestamp: Date.now(),
      payload: {
        entitlementId: id,
        userId,
        key,
        scope,
        creatorProfileId,
        resourceId,
        orderId,
        tierLevel,
        expiresAt,
      },
    });

    return record;
  }

  /**
   * Authoritative Revocation of an Entitlement (e.g. on Refund, Chargeback, Expiry, or Ban)
   */
  static async revokeEntitlement(
    input: RevokeEntitlementInput,
    _tx?: any
  ): Promise<{ success: boolean; revokedCount: number }> {
    const { userId, key, creatorProfileId, resourceId, orderId, entitlementId, reason } = input;
    let count = 0;

    for (const [storeKey, record] of ephemeralGrantsStore.entries()) {
      if (record.userId !== userId) continue;

      let match = true;
      if (entitlementId && record.id !== entitlementId) match = false;
      if (key && record.key !== key) match = false;
      if (creatorProfileId && record.creatorProfileId !== creatorProfileId) match = false;
      if (resourceId && record.resourceId !== resourceId) match = false;
      if (orderId && record.orderId !== orderId) match = false;

      if (match) {
        record.isActive = false;
        record.updatedAt = new Date();
        ephemeralGrantsStore.delete(storeKey);
        count++;

        StructuredLogger.warn("Authoritative Entitlement Revoked", {
          entitlementId: record.id,
          userId,
          key: record.key,
          reason,
        });

        eventBus.publish(`user:${userId}`, {
          id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          type: "ENTITLEMENT_REVOKED" as any,
          channel: `user:${userId}`,
          timestamp: Date.now(),
          payload: {
            entitlementId: record.id,
            userId,
            key: record.key,
            scope: record.scope,
            reason,
          },
        });
      }
    }

    return { success: true, revokedCount: count };
  }

  /**
   * Resets internal memory state (useful for clean unit and integration testing)
   */
  static _resetStoreForTesting(): void {
    ephemeralGrantsStore.clear();
  }
}
