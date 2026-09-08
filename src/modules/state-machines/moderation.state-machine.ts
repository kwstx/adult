/**
 * ============================================================================
 * 7. MODERATION & TRUST-SAFETY STATE MACHINES
 * ============================================================================
 * 
 * Formal state transition graphs, compliance invariants, and administrative
 * guards for Content, User Accounts, and Creator Profiles.
 */

import { BaseStateMachine } from "@/core/state-machine/base.state-machine";
import {
  ContentModerationState,
  AccountModerationState,
  CreatorModerationState,
  ModerationLifecycleContext,
} from "./types";
import { eventBus } from "@/modules/realtime/event-bus";

// ----------------------------------------------------------------------------
// 1. CONTENT MODERATION STATE MACHINE
// ----------------------------------------------------------------------------
export const CONTENT_MODERATION_TRANSITIONS: Record<
  ContentModerationState,
  readonly ContentModerationState[]
> = {
  PENDING: ["APPROVED", "RESTRICTED", "REMOVED", "REJECTED"],
  APPROVED: ["RESTRICTED", "REMOVED", "PENDING"],
  RESTRICTED: ["APPROVED", "REMOVED", "REJECTED"],
  REMOVED: ["APPEALED", "APPROVED"],
  APPEALED: ["APPROVED", "REJECTED", "REMOVED"],
  REJECTED: ["APPEALED", "APPROVED"],
};

export class ContentModerationStateMachine extends BaseStateMachine<
  ContentModerationState,
  ModerationLifecycleContext
> {
  constructor() {
    super({
      entityType: "ContentModeration",
      initialState: "PENDING",
      transitions: CONTENT_MODERATION_TRANSITIONS,
      guards: [
        (fromState, toState, context, reason) => {
          if (toState === "REMOVED" || toState === "REJECTED") {
            const role = context?.security?.actorRole;
            if (role !== "MODERATOR" && role !== "ADMIN" && role !== "SYSTEM_AUTOMATION") {
              return {
                allowed: false,
                reason: `Only moderators, administrators, or safety automation can remove/reject content. Current role: '${role || "ANONYMOUS"}'.`,
              };
            }
            if (!reason || reason.trim().length === 0) {
              return {
                allowed: false,
                reason: `A formal justification reason is required when transitioning content to '${toState}'.`,
              };
            }
          }
          return true;
        },
      ],
      afterTransition: [
        (fromState, toState, context) => {
          if (!context) return;
          eventBus.publish(`moderation:content:${context.entityId}`, {
            type: `CONTENT_MODERATION_${toState}` as any,
            payload: {
              contentId: context.entityId,
              toState,
            },
            timestamp: Date.now(),
          });
        },
      ],
    });
  }

  public isPubliclyVisible(state: ContentModerationState): boolean {
    return state === "APPROVED" || state === "RESTRICTED";
  }

  public requiresBlurredGate(state: ContentModerationState): boolean {
    return state === "RESTRICTED";
  }
}

// ----------------------------------------------------------------------------
// 2. ACCOUNT MODERATION STATE MACHINE
// ----------------------------------------------------------------------------
export const ACCOUNT_MODERATION_TRANSITIONS: Record<
  AccountModerationState,
  readonly AccountModerationState[]
> = {
  ACTIVE: ["RESTRICTED", "SUSPENDED", "BANNED", "UNDER_REVIEW"],
  RESTRICTED: ["ACTIVE", "SUSPENDED", "BANNED", "UNDER_REVIEW"],
  SUSPENDED: ["ACTIVE", "RESTRICTED", "BANNED", "UNDER_REVIEW"],
  BANNED: ["UNDER_REVIEW", "ACTIVE"],
  UNDER_REVIEW: ["ACTIVE", "RESTRICTED", "SUSPENDED", "BANNED"],
};

export class AccountModerationStateMachine extends BaseStateMachine<
  AccountModerationState,
  ModerationLifecycleContext
> {
  constructor() {
    super({
      entityType: "AccountModeration",
      initialState: "ACTIVE",
      transitions: ACCOUNT_MODERATION_TRANSITIONS,
      guards: [
        (fromState, toState, context, reason) => {
          if (toState === "BANNED" || toState === "SUSPENDED") {
            const role = context?.security?.actorRole;
            if (role !== "MODERATOR" && role !== "ADMIN" && role !== "SYSTEM_AUTOMATION") {
              return {
                allowed: false,
                reason: `Only privileged safety personnel or automation may suspend/ban accounts. Current role: '${role || "ANONYMOUS"}'.`,
              };
            }
            if (!reason || reason.trim().length === 0) {
              return {
                allowed: false,
                reason: `A non-empty moderation reason is required for account suspension or ban.`,
              };
            }
          }
          return true;
        },
      ],
      afterTransition: [
        (fromState, toState, context) => {
          if (!context) return;
          eventBus.publish(`user:${context.entityId}`, {
            type: `ACCOUNT_MODERATION_${toState}` as any,
            payload: {
              userId: context.entityId,
              toState,
            },
            timestamp: Date.now(),
          });
        },
      ],
    });
  }

  public canAuthenticate(state: AccountModerationState): boolean {
    return state === "ACTIVE" || state === "RESTRICTED" || state === "UNDER_REVIEW";
  }

  public canTransact(state: AccountModerationState): boolean {
    return state === "ACTIVE";
  }
}

// ----------------------------------------------------------------------------
// 3. CREATOR MODERATION STATE MACHINE
// ----------------------------------------------------------------------------
export const CREATOR_MODERATION_TRANSITIONS: Record<
  CreatorModerationState,
  readonly CreatorModerationState[]
> = {
  APPLICATION: ["VERIFICATION_PENDING", "RESTRICTED"],
  VERIFICATION_PENDING: ["VERIFIED", "APPLICATION", "RESTRICTED"],
  VERIFIED: ["MONETIZATION_ENABLED", "RESTRICTED", "SUSPENDED"],
  MONETIZATION_ENABLED: ["RESTRICTED", "SUSPENDED", "VERIFIED"],
  RESTRICTED: ["MONETIZATION_ENABLED", "VERIFIED", "SUSPENDED"],
  SUSPENDED: ["RESTRICTED", "MONETIZATION_ENABLED", "VERIFIED"],
};

export class CreatorModerationStateMachine extends BaseStateMachine<
  CreatorModerationState,
  ModerationLifecycleContext
> {
  constructor() {
    super({
      entityType: "CreatorModeration",
      initialState: "APPLICATION",
      transitions: CREATOR_MODERATION_TRANSITIONS,
      guards: [
        (fromState, toState, context) => {
          if (toState === "VERIFIED" || toState === "MONETIZATION_ENABLED") {
            const role = context?.security?.actorRole;
            if (role !== "ADMIN" && role !== "MODERATOR" && role !== "SYSTEM_AUTOMATION") {
              return {
                allowed: false,
                reason: `Verification and monetization enablement require administrative approval.`,
              };
            }
          }
          return true;
        },
      ],
    });
  }

  public canStreamAndMonetize(state: CreatorModerationState): {
    canStream: boolean;
    canMonetize: boolean;
  } {
    return {
      canStream: state === "VERIFIED" || state === "MONETIZATION_ENABLED",
      canMonetize: state === "MONETIZATION_ENABLED",
    };
  }
}

export const contentModerationStateMachine = new ContentModerationStateMachine();
export const accountModerationStateMachine = new AccountModerationStateMachine();
export const creatorModerationStateMachine = new CreatorModerationStateMachine();
