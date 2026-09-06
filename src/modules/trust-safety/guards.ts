/**
 * ============================================================================
 * AUTHORITATIVE TRUST & SAFETY ENFORCEMENT GUARDS
 * ============================================================================
 * 
 * Reusable server-side guard functions that protect endpoints, economic transactions,
 * media delivery, and real-time broadcasts.
 */

import { ContentModerationService } from "./content-moderation.service";
import { AccountModerationService } from "./account-moderation.service";
import { CreatorModerationService } from "./creator-moderation.service";
import { ContentModerationState } from "./types";

export class TrustSafetyGuardError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "TrustSafetyGuardError";
  }
}

export class TrustSafetyGuards {
  /**
   * Ensures content is in an accessible moderation state for the requester.
   */
  static assertContentAccessible(
    content: {
      id: string;
      creatorProfileId: string;
      moderationState: ContentModerationState;
      accessLevel: string;
      isPublished: boolean;
    },
    viewer?: {
      userId?: string;
      role?: string;
      isCreatorOwner?: boolean;
    }
  ) {
    const result = ContentModerationService.evaluateAccess(content, viewer);
    if (!result.isAccessible) {
      throw new TrustSafetyGuardError(
        403,
        "CONTENT_MODERATION_RESTRICTED",
        result.rejectionReason || "Content is not available due to moderation policy."
      );
    }
    return result;
  }

  /**
   * Ensures account has permission to perform a specific action (chat, tip, stream, etc.).
   */
  static async assertAccountAction(
    userId: string,
    action: "login" | "chat" | "tip" | "purchase" | "stream" | "withdraw"
  ) {
    const perms = await AccountModerationService.evaluatePermissions(userId);

    if (!perms.canLogin) {
      throw new TrustSafetyGuardError(
        403,
        "ACCOUNT_SUSPENDED_OR_BANNED",
        perms.restrictionReason || "Account access is suspended or banned."
      );
    }

    if (action === "chat" && !perms.canChat) {
      throw new TrustSafetyGuardError(
        403,
        "ACCOUNT_CHAT_MUTED",
        "Chat participation is disabled for this account."
      );
    }

    if (action === "tip" && !perms.canSendTips) {
      throw new TrustSafetyGuardError(
        403,
        "ACCOUNT_TIPPING_DISABLED",
        "Tipping is restricted on this account."
      );
    }

    if (action === "purchase" && !perms.canPurchasePPV) {
      throw new TrustSafetyGuardError(
        403,
        "ACCOUNT_PURCHASES_DISABLED",
        "Purchasing is disabled for this account."
      );
    }

    if (action === "stream" && !perms.canBroadcastLive) {
      throw new TrustSafetyGuardError(
        403,
        "BROADCASTING_DISALLOWED",
        "Live broadcasting privileges are not enabled for this account."
      );
    }

    if (action === "withdraw" && !perms.canWithdrawFunds) {
      throw new TrustSafetyGuardError(
        403,
        "WITHDRAWALS_FROZEN",
        "Withdrawals are currently placed on administrative hold."
      );
    }

    return perms;
  }

  /**
   * Ensures creator is in verified / monetization enabled state.
   */
  static async assertCreatorCanMonetize(creatorProfileId: string) {
    const status = await CreatorModerationService.evaluateMonetizationStatus(creatorProfileId);
    if (!status.canEarnCredits) {
      throw new TrustSafetyGuardError(
        403,
        "CREATOR_MONETIZATION_NOT_CLEARED",
        status.restrictionReason || "Creator monetization is not currently active."
      );
    }
    return status;
  }
}
