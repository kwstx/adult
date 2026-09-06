/**
 * ============================================================================
 * AUTHORITATIVE MODERATION STATE MACHINES & GUARDS
 * ============================================================================
 * 
 * Defines state transition graphs, invariant validators, and transition
 * guards for Content, User Accounts, and Creator Profiles.
 */

import {
  ContentModerationState,
  AccountModerationState,
  CreatorModerationState,
  SecurityContext,
} from "./types";

export class ModerationStateTransitionError extends Error {
  constructor(
    public readonly entityType: "Content" | "Account" | "Creator",
    public readonly fromState: string,
    public readonly toState: string,
    public readonly reason: string
  ) {
    super(
      `Illegal ${entityType} moderation transition from '${fromState}' to '${toState}': ${reason}`
    );
    this.name = "ModerationStateTransitionError";
  }
}

// ============================================================================
// 1. CONTENT MODERATION STATE MACHINE
// ============================================================================

/**
 * Valid transitions for Content:
 * PENDING    -> APPROVED, RESTRICTED, REMOVED, REJECTED
 * APPROVED   -> RESTRICTED, REMOVED, PENDING (e.g. edited)
 * RESTRICTED -> APPROVED, REMOVED, REJECTED
 * REMOVED    -> APPEALED, APPROVED (reinstated by admin)
 * APPEALED   -> APPROVED (overturned), REJECTED (appeal denied), REMOVED
 * REJECTED   -> APPEALED, APPROVED (reinstated by admin)
 */
export const VALID_CONTENT_TRANSITIONS: Record<
  ContentModerationState,
  ContentModerationState[]
> = {
  PENDING: ["APPROVED", "RESTRICTED", "REMOVED", "REJECTED"],
  APPROVED: ["RESTRICTED", "REMOVED", "PENDING"],
  RESTRICTED: ["APPROVED", "REMOVED", "REJECTED"],
  REMOVED: ["APPEALED", "APPROVED"],
  APPEALED: ["APPROVED", "REJECTED", "REMOVED"],
  REJECTED: ["APPEALED", "APPROVED"],
};

export class ContentStateMachine {
  /**
   * Validate whether a content state transition is legally permissible.
   */
  static validateTransition(
    fromState: ContentModerationState,
    toState: ContentModerationState,
    context?: SecurityContext,
    reason?: string
  ): void {
    if (fromState === toState) {
      return; // No-op transition is permitted
    }

    const allowedNextStates = VALID_CONTENT_TRANSITIONS[fromState] || [];
    if (!allowedNextStates.includes(toState)) {
      throw new ModerationStateTransitionError(
        "Content",
        fromState,
        toState,
        `Allowed next states from '${fromState}' are: [${allowedNextStates.join(", ")}]`
      );
    }

    // Role-based guard checks
    if (toState === "REMOVED" || toState === "REJECTED") {
      if (
        context &&
        context.actorType !== "MODERATOR" &&
        context.actorType !== "ADMIN" &&
        context.actorType !== "SYSTEM_AUTOMATION"
      ) {
        throw new ModerationStateTransitionError(
          "Content",
          fromState,
          toState,
          `Only Moderators, Admins, or System Automation can move content to '${toState}'.`
        );
      }
      if (!reason || reason.trim().length === 0) {
        throw new ModerationStateTransitionError(
          "Content",
          fromState,
          toState,
          `A non-empty justification reason is required when transitioning content to '${toState}'.`
        );
      }
    }
  }

  /**
   * Determine whether the content should be publicly visible to fans.
   */
  static isVisibleToPublic(state: ContentModerationState): boolean {
    return state === "APPROVED" || state === "RESTRICTED";
  }

  /**
   * Determine whether the content requires blurred preview and 18+ strict gate.
   */
  static isRestrictedGateRequired(state: ContentModerationState): boolean {
    return state === "RESTRICTED";
  }
}

// ============================================================================
// 2. ACCOUNT MODERATION STATE MACHINE
// ============================================================================

/**
 * Valid transitions for Accounts:
 * ACTIVE       -> RESTRICTED, SUSPENDED, BANNED, UNDER_REVIEW
 * RESTRICTED   -> ACTIVE, SUSPENDED, BANNED, UNDER_REVIEW
 * SUSPENDED    -> ACTIVE (duration expired/cleared), RESTRICTED, BANNED, UNDER_REVIEW
 * BANNED       -> UNDER_REVIEW (upon formal legal appeal or admin review), ACTIVE (pardon)
 * UNDER_REVIEW -> ACTIVE, RESTRICTED, SUSPENDED, BANNED
 */
export const VALID_ACCOUNT_TRANSITIONS: Record<
  AccountModerationState,
  AccountModerationState[]
> = {
  ACTIVE: ["RESTRICTED", "SUSPENDED", "BANNED", "UNDER_REVIEW"],
  RESTRICTED: ["ACTIVE", "SUSPENDED", "BANNED", "UNDER_REVIEW"],
  SUSPENDED: ["ACTIVE", "RESTRICTED", "BANNED", "UNDER_REVIEW"],
  BANNED: ["UNDER_REVIEW", "ACTIVE"],
  UNDER_REVIEW: ["ACTIVE", "RESTRICTED", "SUSPENDED", "BANNED"],
};

export class AccountStateMachine {
  /**
   * Validate whether an account state transition is legally permissible.
   */
  static validateTransition(
    fromState: AccountModerationState,
    toState: AccountModerationState,
    context?: SecurityContext,
    reason?: string
  ): void {
    if (fromState === toState) {
      return; // No-op
    }

    const allowedNextStates = VALID_ACCOUNT_TRANSITIONS[fromState] || [];
    if (!allowedNextStates.includes(toState)) {
      throw new ModerationStateTransitionError(
        "Account",
        fromState,
        toState,
        `Allowed next states from '${fromState}' are: [${allowedNextStates.join(", ")}]`
      );
    }

    // Role checks
    if (toState === "BANNED" || toState === "SUSPENDED") {
      if (
        context &&
        context.actorType !== "MODERATOR" &&
        context.actorType !== "ADMIN" &&
        context.actorType !== "SYSTEM_AUTOMATION"
      ) {
        throw new ModerationStateTransitionError(
          "Account",
          fromState,
          toState,
          `Only privileged personnel or safety automation may suspend or ban accounts.`
        );
      }
      if (!reason || reason.trim().length === 0) {
        throw new ModerationStateTransitionError(
          "Account",
          fromState,
          toState,
          `A formal reason must be provided when transitioning account to '${toState}'.`
        );
      }
    }
  }
}

// ============================================================================
// 3. CREATOR MODERATION STATE MACHINE
// ============================================================================

/**
 * Valid transitions for Creator Profiles:
 * APPLICATION          -> VERIFICATION_PENDING, RESTRICTED
 * VERIFICATION_PENDING -> VERIFIED, APPLICATION (docs rejected, re-apply), RESTRICTED
 * VERIFIED             -> MONETIZATION_ENABLED, RESTRICTED, SUSPENDED
 * MONETIZATION_ENABLED -> RESTRICTED, SUSPENDED, VERIFIED (monetization revoked)
 * RESTRICTED           -> MONETIZATION_ENABLED, VERIFIED, SUSPENDED
 * SUSPENDED            -> RESTRICTED, MONETIZATION_ENABLED, VERIFIED
 */
export const VALID_CREATOR_TRANSITIONS: Record<
  CreatorModerationState,
  CreatorModerationState[]
> = {
  APPLICATION: ["VERIFICATION_PENDING", "RESTRICTED"],
  VERIFICATION_PENDING: ["VERIFIED", "APPLICATION", "RESTRICTED"],
  VERIFIED: ["MONETIZATION_ENABLED", "RESTRICTED", "SUSPENDED"],
  MONETIZATION_ENABLED: ["RESTRICTED", "SUSPENDED", "VERIFIED"],
  RESTRICTED: ["MONETIZATION_ENABLED", "VERIFIED", "SUSPENDED"],
  SUSPENDED: ["RESTRICTED", "MONETIZATION_ENABLED", "VERIFIED"],
};

export class CreatorStateMachine {
  /**
   * Validate creator lifecycle and moderation transition.
   */
  static validateTransition(
    fromState: CreatorModerationState,
    toState: CreatorModerationState,
    context?: SecurityContext,
    reason?: string
  ): void {
    if (fromState === toState) {
      return; // No-op
    }

    const allowedNextStates = VALID_CREATOR_TRANSITIONS[fromState] || [];
    if (!allowedNextStates.includes(toState)) {
      throw new ModerationStateTransitionError(
        "Creator",
        fromState,
        toState,
        `Allowed next states from '${fromState}' are: [${allowedNextStates.join(", ")}]`
      );
    }

    // Guard: Only ADMIN or COMPLIANCE can verify or enable monetization
    if (toState === "VERIFIED" || toState === "MONETIZATION_ENABLED") {
      if (
        context &&
        context.actorType !== "ADMIN" &&
        context.actorType !== "MODERATOR" &&
        context.actorType !== "SYSTEM_AUTOMATION"
      ) {
        throw new ModerationStateTransitionError(
          "Creator",
          fromState,
          toState,
          `Verification and monetization enablement require administrative authority.`
        );
      }
    }
  }

  /**
   * Check if creator is eligible for active live streaming & earnings.
   */
  static canStreamAndMonetize(state: CreatorModerationState): {
    canStream: boolean;
    canMonetize: boolean;
  } {
    return {
      canStream: state === "VERIFIED" || state === "MONETIZATION_ENABLED",
      canMonetize: state === "MONETIZATION_ENABLED",
    };
  }
}
