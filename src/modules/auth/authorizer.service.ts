/**
 * ============================================================================
 * AUTHORIZATION POLICY ENGINE: AUTHORITATIVE BACKEND SECURITY
 * ============================================================================
 * 
 * "Authentication answers: Who are you?
 *  Authorization answers: What are you allowed to do?
 *  A logged-in fan may be authenticated, but they are not automatically authorized
 *  to enter VIP rooms, view PPV, start livestreams, access analytics, modify prices,
 *  or issue refunds."
 * 
 * Every security-sensitive or financial action must evaluate authorization server-side.
 */

import prisma from "@/lib/db";
import {
  AuthenticatedSubject,
  AuthorizableAction,
  AuthorizableResource,
  AuthorizationDecision,
  AuthorizationErrorCode,
  AuthorizationContext,
  VipRoomResource,
  PpvContentResource,
  LivestreamResource,
  CreatorAnalyticsResource,
  InteractionDefinitionResource,
  RefundResource,
} from "./authorization.types";
import { ROLE_PERMISSIONS, mapUserRoleToAdminRole, hasPermission } from "../admin/admin-rbac";
import { SubscriptionStatus } from "@prisma/client";

/**
 * Custom error class thrown when authorization is denied.
 */
export class AuthorizationError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: AuthorizationErrorCode,
    message: string,
    public readonly decision?: AuthorizationDecision
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class AuthorizerService {
  /**
   * Authoritative gatekeeper: evaluates if the authenticated subject is authorized
   * to perform the given action on the target resource.
   */
  static async can(
    subject: AuthenticatedSubject | undefined | null,
    action: AuthorizableAction,
    resource?: AuthorizableResource,
    context?: AuthorizationContext,
    db: any = prisma
  ): Promise<AuthorizationDecision> {
    const now = new Date();

    // 1. Authentication Check ("Who are you?")
    if (!subject || !subject.userId) {
      return {
        isAuthorized: false,
        action,
        subject: subject || ({} as AuthenticatedSubject),
        reason: "Authentication required. Requester identity is unverified.",
        errorCode: "UNAUTHENTICATED",
        statusCode: 401,
        evaluatedAt: now,
      };
    }

    // 2. Base Account Moderation Checks
    if (subject.isBanned || subject.moderationState === "BANNED") {
      return {
        isAuthorized: false,
        action,
        subject,
        reason: `Access denied: Account is banned. Reason: ${subject.banReason || "Terms violation"}`,
        errorCode: "ACCOUNT_BANNED",
        statusCode: 403,
        evaluatedAt: now,
      };
    }

    if (subject.moderationState === "SUSPENDED") {
      return {
        isAuthorized: false,
        action,
        subject,
        reason: "Access denied: Account is currently suspended by Trust & Safety.",
        errorCode: "ACCOUNT_SUSPENDED",
        statusCode: 403,
        evaluatedAt: now,
      };
    }

    // 3. Delegate to Domain Policy Handlers
    switch (action) {
      case "ENTER_VIP_ROOM":
        return await this.evaluateEnterVipRoom(subject, resource as VipRoomResource, context, db);

      case "VIEW_PPV_CONTENT":
        return await this.evaluateViewPpvContent(subject, resource as PpvContentResource, context, db);

      case "START_CREATOR_LIVESTREAM":
      case "BROADCAST_MEDIA":
        return await this.evaluateStartCreatorLivestream(subject, resource as LivestreamResource, context, db);

      case "ACCESS_CREATOR_ANALYTICS":
        return await this.evaluateAccessCreatorAnalytics(subject, resource as CreatorAnalyticsResource, context, db);

      case "MODIFY_INTERACTION_PRICES":
        return await this.evaluateModifyInteractionPrices(subject, resource as InteractionDefinitionResource, context, db);

      case "ISSUE_REFUNDS":
        return await this.evaluateIssueRefunds(subject, resource as RefundResource, context, db);

      default:
        return {
          isAuthorized: false,
          action,
          subject,
          reason: `Unsupported authorizable action: ${action}`,
          errorCode: "INSUFFICIENT_ADMIN_PERMISSIONS",
          statusCode: 403,
          evaluatedAt: now,
        };
    }
  }

  /**
   * Asserts authorization. Throws AuthorizationError if evaluation fails.
   */
  static async assertCan(
    subject: AuthenticatedSubject | undefined | null,
    action: AuthorizableAction,
    resource?: AuthorizableResource,
    context?: AuthorizationContext,
    db: any = prisma
  ): Promise<AuthorizationDecision> {
    const decision = await this.can(subject, action, resource, context, db);
    if (!decision.isAuthorized) {
      throw new AuthorizationError(
        decision.statusCode,
        decision.errorCode || "INSUFFICIENT_ADMIN_PERMISSIONS",
        decision.reason,
        decision
      );
    }
    return decision;
  }

  // ============================================================================
  // POLICY 1: ENTER CREATOR'S VIP ROOM
  // ============================================================================
  private static async evaluateEnterVipRoom(
    subject: AuthenticatedSubject,
    resource: VipRoomResource,
    context?: AuthorizationContext,
    db: any = prisma
  ): Promise<AuthorizationDecision> {
    const now = new Date();
    const { creatorProfileId, requiredTierLevel = 2 } = resource;

    // Fetch creator profile
    const creator = await db.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: { id: true, userId: true, stageName: true, allowFreeVip: true },
    });

    if (!creator) {
      return {
        isAuthorized: false,
        action: "ENTER_VIP_ROOM",
        subject,
        resourceId: creatorProfileId,
        reason: `Creator profile "${creatorProfileId}" not found.`,
        errorCode: "RESOURCE_NOT_FOUND",
        statusCode: 404,
        evaluatedAt: now,
      };
    }

    // Owner Creator Bypass: Creator always has access to their own VIP room
    if (subject.userId === creator.userId) {
      return {
        isAuthorized: true,
        action: "ENTER_VIP_ROOM",
        subject,
        resourceId: creatorProfileId,
        reason: "Creator owner authorized for own VIP room.",
        statusCode: 200,
        evaluatedAt: now,
        diagnostics: { role: "OWNER" },
      };
    }

    // Platform Admin Bypass
    if (subject.role === "ADMIN") {
      return {
        isAuthorized: true,
        action: "ENTER_VIP_ROOM",
        subject,
        resourceId: creatorProfileId,
        reason: "Platform administrator granted VIP room access.",
        statusCode: 200,
        evaluatedAt: now,
        diagnostics: { role: "ADMIN" },
      };
    }

    // Allow Free VIP if creator explicitly enabled it
    if (creator.allowFreeVip) {
      return {
        isAuthorized: true,
        action: "ENTER_VIP_ROOM",
        subject,
        resourceId: creatorProfileId,
        reason: "Creator has enabled free VIP room admission.",
        statusCode: 200,
        evaluatedAt: now,
      };
    }

    // Authoritative Subscription & Entitlement Check
    const subscription = await db.subscription.findUnique({
      where: {
        fanId_creatorProfileId: {
          fanId: subject.userId,
          creatorProfileId,
        },
      },
      include: { product: true },
    });

    if (!subscription) {
      return {
        isAuthorized: false,
        action: "ENTER_VIP_ROOM",
        subject,
        resourceId: creatorProfileId,
        reason: "Access denied. Entering this VIP room requires an active VIP tier subscription.",
        errorCode: "MISSING_VIP_ENTITLEMENT",
        statusCode: 403,
        evaluatedAt: now,
        diagnostics: { requiredTierLevel },
      };
    }

    // Check if subscription is paused
    if (subscription.isPaused || subscription.status === SubscriptionStatus.PAUSED) {
      return {
        isAuthorized: false,
        action: "ENTER_VIP_ROOM",
        subject,
        resourceId: creatorProfileId,
        reason: "VIP subscription is paused. Resume subscription to access VIP room.",
        errorCode: "MISSING_VIP_ENTITLEMENT",
        statusCode: 403,
        evaluatedAt: now,
      };
    }

    // Check subscription active status & period
    const isPeriodActive = subscription.currentPeriodEnd >= now;
    const isPastDueInGrace =
      subscription.status === SubscriptionStatus.PAST_DUE &&
      subscription.gracePeriodEndsAt &&
      subscription.gracePeriodEndsAt >= now;

    const isActive =
      (subscription.status === SubscriptionStatus.ACTIVE && isPeriodActive) ||
      (subscription.cancelAtPeriodEnd && isPeriodActive) ||
      isPastDueInGrace;

    if (!isActive) {
      return {
        isAuthorized: false,
        action: "ENTER_VIP_ROOM",
        subject,
        resourceId: creatorProfileId,
        reason: `Subscription is expired (${subscription.status}). Active renewal required for VIP room entry.`,
        errorCode: "MISSING_VIP_ENTITLEMENT",
        statusCode: 403,
        evaluatedAt: now,
      };
    }

    // Check Tier Level requirement (e.g. tierLevel >= 2 for VIP/Diamond)
    if (subscription.tierLevel < requiredTierLevel) {
      const productEntitlements: string[] = subscription.product?.entitlements
        ? subscription.product.entitlements.split(",").map((e: string) => e.trim().toUpperCase())
        : [];

      const hasVipEntitlement =
        productEntitlements.includes("VIP_MEDIA") ||
        productEntitlements.includes("SUBSCRIBER_LIVE") ||
        subscription.tier === "VIP" ||
        subscription.tier === "DIAMOND";

      if (!hasVipEntitlement) {
        return {
          isAuthorized: false,
          action: "ENTER_VIP_ROOM",
          subject,
          resourceId: creatorProfileId,
          reason: `Current subscription tier (${subscription.tierName}) does not meet VIP level requirement. Upgrade required.`,
          errorCode: "MISSING_VIP_ENTITLEMENT",
          statusCode: 403,
          evaluatedAt: now,
          diagnostics: {
            currentTier: subscription.tierName,
            currentTierLevel: subscription.tierLevel,
            requiredTierLevel,
          },
        };
      }
    }

    return {
      isAuthorized: true,
      action: "ENTER_VIP_ROOM",
      subject,
      resourceId: creatorProfileId,
      reason: `VIP access authorized under tier: ${subscription.tierName}.`,
      statusCode: 200,
      evaluatedAt: now,
      diagnostics: {
        subscriptionId: subscription.id,
        tierName: subscription.tierName,
        tierLevel: subscription.tierLevel,
      },
    };
  }

  // ============================================================================
  // POLICY 2: VIEW PPV CONTENT
  // ============================================================================
  private static async evaluateViewPpvContent(
    subject: AuthenticatedSubject,
    resource: PpvContentResource,
    context?: AuthorizationContext,
    db: any = prisma
  ): Promise<AuthorizationDecision> {
    const now = new Date();
    const { contentId } = resource;

    const content = await db.content.findUnique({
      where: { id: contentId },
      include: { creatorProfile: true },
    });

    if (!content) {
      return {
        isAuthorized: false,
        action: "VIEW_PPV_CONTENT",
        subject,
        resourceId: contentId,
        reason: `Content with ID "${contentId}" not found.`,
        errorCode: "RESOURCE_NOT_FOUND",
        statusCode: 404,
        evaluatedAt: now,
      };
    }

    // Public content is authorized to all authenticated users
    if (content.accessLevel === "PUBLIC") {
      return {
        isAuthorized: true,
        action: "VIEW_PPV_CONTENT",
        subject,
        resourceId: contentId,
        reason: "Content access level is public.",
        statusCode: 200,
        evaluatedAt: now,
      };
    }

    // Creator Owner Bypass: Creators always have full access to their own content
    if (content.creatorProfile?.userId === subject.userId) {
      return {
        isAuthorized: true,
        action: "VIEW_PPV_CONTENT",
        subject,
        resourceId: contentId,
        reason: "Content creator owner authorized.",
        statusCode: 200,
        evaluatedAt: now,
        diagnostics: { isOwner: true },
      };
    }

    // Platform Administrator Bypass
    if (subject.role === "ADMIN") {
      return {
        isAuthorized: true,
        action: "VIEW_PPV_CONTENT",
        subject,
        resourceId: contentId,
        reason: "Platform administrator authorized for content playback inspection.",
        statusCode: 200,
        evaluatedAt: now,
        diagnostics: { role: "ADMIN" },
      };
    }

    // PPV Purchase Verification
    if (content.accessLevel === "PPV_PURCHASE") {
      const purchase = await db.contentPurchase.findUnique({
        where: {
          contentId_fanId: {
            contentId,
            fanId: subject.userId,
          },
        },
      });

      if (!purchase) {
        return {
          isAuthorized: false,
          action: "VIEW_PPV_CONTENT",
          subject,
          resourceId: contentId,
          reason: `Access denied. This PPV content requires purchase for ${content.priceCredits} credits.`,
          errorCode: "PPV_NOT_PURCHASED",
          statusCode: 403,
          evaluatedAt: now,
          diagnostics: {
            priceCredits: content.priceCredits,
            contentTitle: content.title,
          },
        };
      }

      return {
        isAuthorized: true,
        action: "VIEW_PPV_CONTENT",
        subject,
        resourceId: contentId,
        reason: `PPV content access authorized via purchase record (${purchase.id}).`,
        statusCode: 200,
        evaluatedAt: now,
        diagnostics: { purchaseId: purchase.id, purchasedAt: purchase.createdAt },
      };
    }

    // Subscribers Only Content
    if (content.accessLevel === "SUBSCRIBERS_ONLY") {
      const sub = await db.subscription.findUnique({
        where: {
          fanId_creatorProfileId: {
            fanId: subject.userId,
            creatorProfileId: content.creatorProfileId,
          },
        },
      });

      if (!sub || sub.status !== SubscriptionStatus.ACTIVE || sub.currentPeriodEnd < now) {
        return {
          isAuthorized: false,
          action: "VIEW_PPV_CONTENT",
          subject,
          resourceId: contentId,
          reason: "Access denied. Active creator subscription required to view subscriber media.",
          errorCode: "MISSING_VIP_ENTITLEMENT",
          statusCode: 403,
          evaluatedAt: now,
        };
      }

      return {
        isAuthorized: true,
        action: "VIEW_PPV_CONTENT",
        subject,
        resourceId: contentId,
        reason: "Subscriber content access authorized.",
        statusCode: 200,
        evaluatedAt: now,
      };
    }

    return {
      isAuthorized: false,
      action: "VIEW_PPV_CONTENT",
      subject,
      resourceId: contentId,
      reason: "Restricted content access level. Authorization requirements not met.",
      errorCode: "PPV_NOT_PURCHASED",
      statusCode: 403,
      evaluatedAt: now,
    };
  }

  // ============================================================================
  // POLICY 3: START CREATOR LIVESTREAM
  // ============================================================================
  private static async evaluateStartCreatorLivestream(
    subject: AuthenticatedSubject,
    resource: LivestreamResource,
    context?: AuthorizationContext,
    db: any = prisma
  ): Promise<AuthorizationDecision> {
    const now = new Date();
    const { creatorProfileId } = resource;

    // 1. Role validation: Fans are strictly prohibited from broadcasting
    if (subject.role === "FAN") {
      return {
        isAuthorized: false,
        action: "START_CREATOR_LIVESTREAM",
        subject,
        resourceId: creatorProfileId,
        reason: "Access denied. User role is FAN. Only approved creators can start livestreams.",
        errorCode: "CREATOR_NOT_VERIFIED",
        statusCode: 403,
        evaluatedAt: now,
        diagnostics: { userRole: subject.role },
      };
    }

    // 2. Resolve Creator Profile
    const creator = await db.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      include: {
        verifications: {
          where: { verificationStatus: "APPROVED" },
          take: 1,
        },
      },
    });

    if (!creator) {
      return {
        isAuthorized: false,
        action: "START_CREATOR_LIVESTREAM",
        subject,
        resourceId: creatorProfileId,
        reason: `Creator profile "${creatorProfileId}" does not exist.`,
        errorCode: "RESOURCE_NOT_FOUND",
        statusCode: 404,
        evaluatedAt: now,
      };
    }

    // 3. Channel Ownership: Creator can only start broadcast on their own channel
    if (creator.userId !== subject.userId && subject.role !== "ADMIN") {
      return {
        isAuthorized: false,
        action: "START_CREATOR_LIVESTREAM",
        subject,
        resourceId: creatorProfileId,
        reason: "Access denied. You cannot start a livestream on another creator's channel.",
        errorCode: "NOT_CREATOR_OWNER",
        statusCode: 403,
        evaluatedAt: now,
        diagnostics: {
          targetCreatorUserId: creator.userId,
          requesterUserId: subject.userId,
        },
      };
    }

    // 4. Verification & 18 U.S.C. § 2257 Compliance Check
    const hasApproved2257 =
      creator.verifications.length > 0 ||
      subject.kycStatus === "COMPLIANCE_2257_APPROVED";

    if (!hasApproved2257 && subject.role !== "ADMIN") {
      return {
        isAuthorized: false,
        action: "START_CREATOR_LIVESTREAM",
        subject,
        resourceId: creatorProfileId,
        reason: "Access denied. 18 U.S.C. § 2257 legal age and identity verification must be approved before broadcasting.",
        errorCode: "CREATOR_NOT_VERIFIED",
        statusCode: 403,
        evaluatedAt: now,
        diagnostics: { kycStatus: subject.kycStatus },
      };
    }

    // 5. Creator Moderation & Monetization State
    if (
      creator.moderationState !== "MONETIZATION_ENABLED" &&
      creator.moderationState !== "VERIFIED" &&
      subject.role !== "ADMIN"
    ) {
      return {
        isAuthorized: false,
        action: "START_CREATOR_LIVESTREAM",
        subject,
        resourceId: creatorProfileId,
        reason: `Creator profile is not active for broadcasting (Current status: ${creator.moderationState}).`,
        errorCode: "CREATOR_MONETIZATION_DISABLED",
        statusCode: 403,
        evaluatedAt: now,
        diagnostics: { moderationState: creator.moderationState },
      };
    }

    return {
      isAuthorized: true,
      action: "START_CREATOR_LIVESTREAM",
      subject,
      resourceId: creatorProfileId,
      reason: "Creator livestream broadcast authorized.",
      statusCode: 200,
      evaluatedAt: now,
      diagnostics: {
        creatorId: creator.id,
        stageName: creator.stageName,
      },
    };
  }

  // ============================================================================
  // POLICY 4: ACCESS CREATOR ANALYTICS
  // ============================================================================
  private static async evaluateAccessCreatorAnalytics(
    subject: AuthenticatedSubject,
    resource: CreatorAnalyticsResource,
    context?: AuthorizationContext,
    db: any = prisma
  ): Promise<AuthorizationDecision> {
    const now = new Date();
    const { creatorProfileId } = resource;

    const creator = await db.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: { id: true, userId: true, stageName: true },
    });

    if (!creator) {
      return {
        isAuthorized: false,
        action: "ACCESS_CREATOR_ANALYTICS",
        subject,
        resourceId: creatorProfileId,
        reason: `Creator profile "${creatorProfileId}" not found.`,
        errorCode: "RESOURCE_NOT_FOUND",
        statusCode: 404,
        evaluatedAt: now,
      };
    }

    // Creator Owner Authority: Creator can view their own analytics
    if (creator.userId === subject.userId) {
      return {
        isAuthorized: true,
        action: "ACCESS_CREATOR_ANALYTICS",
        subject,
        resourceId: creatorProfileId,
        reason: "Creator authorized to inspect own performance and revenue analytics.",
        statusCode: 200,
        evaluatedAt: now,
        diagnostics: { isOwner: true },
      };
    }

    // Platform Admin / Compliance Auditor RBAC Authority
    if (subject.role === "ADMIN" || subject.role === "AUDITOR") {
      try {
        const adminRole = mapUserRoleToAdminRole(subject.role, subject.email);
        const canView =
          hasPermission(adminRole, "CREATORS_VIEW") ||
          hasPermission(adminRole, "AUDIT_VIEW");

        if (canView) {
          return {
            isAuthorized: true,
            action: "ACCESS_CREATOR_ANALYTICS",
            subject,
            resourceId: creatorProfileId,
            reason: `Administrative oversight authorized via RBAC role: ${adminRole}.`,
            statusCode: 200,
            evaluatedAt: now,
            diagnostics: { adminRole },
          };
        }
      } catch {
        // Fallthrough if admin role mapping fails
      }
    }

    // Fans, other creators, or unauthorized accounts are strictly rejected
    return {
      isAuthorized: false,
      action: "ACCESS_CREATOR_ANALYTICS",
      subject,
      resourceId: creatorProfileId,
      reason: "Access denied. Creator analytics and revenue data are confidential to the creator and compliance officers.",
      errorCode: "UNAUTHORIZED_ANALYTICS_ACCESS",
      statusCode: 403,
      evaluatedAt: now,
      diagnostics: {
        requesterRole: subject.role,
        requesterUserId: subject.userId,
      },
    };
  }

  // ============================================================================
  // POLICY 5: MODIFY INTERACTION PRICES
  // ============================================================================
  private static async evaluateModifyInteractionPrices(
    subject: AuthenticatedSubject,
    resource: InteractionDefinitionResource,
    context?: AuthorizationContext,
    db: any = prisma
  ): Promise<AuthorizationDecision> {
    const now = new Date();
    const { creatorProfileId, interactionDefinitionId, newPriceCredits } = resource;

    const creator = await db.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: { id: true, userId: true, moderationState: true },
    });

    if (!creator) {
      return {
        isAuthorized: false,
        action: "MODIFY_INTERACTION_PRICES",
        subject,
        resourceId: creatorProfileId,
        reason: `Creator profile "${creatorProfileId}" not found.`,
        errorCode: "RESOURCE_NOT_FOUND",
        statusCode: 404,
        evaluatedAt: now,
      };
    }

    // If a specific interaction definition is targeted, check that it belongs to this creator
    if (interactionDefinitionId) {
      const definition = await db.interactionDefinition.findUnique({
        where: { id: interactionDefinitionId },
        select: { id: true, creatorProfileId: true, title: true },
      });

      if (!definition || definition.creatorProfileId !== creatorProfileId) {
        return {
          isAuthorized: false,
          action: "MODIFY_INTERACTION_PRICES",
          subject,
          resourceId: interactionDefinitionId,
          reason: `Interaction definition "${interactionDefinitionId}" does not belong to creator "${creatorProfileId}".`,
          errorCode: "RESOURCE_NOT_FOUND",
          statusCode: 404,
          evaluatedAt: now,
        };
      }
    }

    // Creator Storefront Owner Authority
    if (creator.userId === subject.userId) {
      if (creator.moderationState === "SUSPENDED") {
        return {
          isAuthorized: false,
          action: "MODIFY_INTERACTION_PRICES",
          subject,
          resourceId: creatorProfileId,
          reason: "Access denied. Cannot modify interaction catalogue while creator account is suspended.",
          errorCode: "ACCOUNT_SUSPENDED",
          statusCode: 403,
          evaluatedAt: now,
        };
      }

      return {
        isAuthorized: true,
        action: "MODIFY_INTERACTION_PRICES",
        subject,
        resourceId: creatorProfileId,
        reason: "Creator authorized to modify storefront pricing and interaction definitions.",
        statusCode: 200,
        evaluatedAt: now,
        diagnostics: { isOwner: true, newPriceCredits },
      };
    }

    // Admin RBAC Management Authority
    if (subject.role === "ADMIN") {
      try {
        const adminRole = mapUserRoleToAdminRole(subject.role, subject.email);
        if (hasPermission(adminRole, "CREATORS_MANAGE") || hasPermission(adminRole, "SYSTEM_SETTINGS")) {
          return {
            isAuthorized: true,
            action: "MODIFY_INTERACTION_PRICES",
            subject,
            resourceId: creatorProfileId,
            reason: `Admin override authorized via RBAC role: ${adminRole}.`,
            statusCode: 200,
            evaluatedAt: now,
            diagnostics: { adminRole },
          };
        }
      } catch {
        // Fallthrough
      }
    }

    return {
      isAuthorized: false,
      action: "MODIFY_INTERACTION_PRICES",
      subject,
      resourceId: creatorProfileId,
      reason: "Access denied. Only the creator owner or platform administrator may modify interaction definitions and prices.",
      errorCode: "UNAUTHORIZED_PRICE_MODIFICATION",
      statusCode: 403,
      evaluatedAt: now,
      diagnostics: { requesterRole: subject.role },
    };
  }

  // ============================================================================
  // POLICY 6: ISSUE REFUNDS
  // ============================================================================
  private static async evaluateIssueRefunds(
    subject: AuthenticatedSubject,
    resource: RefundResource,
    context?: AuthorizationContext,
    db: any = prisma
  ): Promise<AuthorizationDecision> {
    const now = new Date();
    const { transactionId, amountCredits } = resource;

    // Fans are strictly prohibited from issuing financial ledger refunds
    if (subject.role === "FAN") {
      return {
        isAuthorized: false,
        action: "ISSUE_REFUNDS",
        subject,
        resourceId: transactionId,
        reason: "Access denied. Fans are not authorized to issue financial refunds or reverse ledger transactions.",
        errorCode: "UNAUTHORIZED_REFUND_ISSUANCE",
        statusCode: 403,
        evaluatedAt: now,
        diagnostics: { requesterRole: subject.role },
      };
    }

    // Administrative RBAC Authorization: Requires explicit FINANCIAL_REFUND permission
    if (subject.role === "ADMIN" || subject.role === "AUDITOR") {
      try {
        const adminRole = mapUserRoleToAdminRole(subject.role, subject.email);
        const isPermitted = hasPermission(adminRole, "FINANCIAL_REFUND");

        if (isPermitted) {
          return {
            isAuthorized: true,
            action: "ISSUE_REFUNDS",
            subject,
            resourceId: transactionId,
            reason: `Financial refund issuance authorized under admin role: ${adminRole}.`,
            statusCode: 200,
            evaluatedAt: now,
            diagnostics: {
              adminRole,
              amountCredits,
              transactionId,
            },
          };
        }
      } catch {
        // Fallthrough
      }
    }

    return {
      isAuthorized: false,
      action: "ISSUE_REFUNDS",
      subject,
      resourceId: transactionId,
      reason: "Access denied. Financial refunds require administrative compliance authorization (FINANCIAL_REFUND permission).",
      errorCode: "UNAUTHORIZED_REFUND_ISSUANCE",
      statusCode: 403,
      evaluatedAt: now,
      diagnostics: { requesterRole: subject.role },
    };
  }
}
