/**
 * ============================================================================
 * 1. CREATOR ONBOARDING STATE MACHINE
 * ============================================================================
 * 
 * Formal state transition graph, invariant validators, and role guards
 * for the 7-step Creator Verification, Compliance & Monetization pipeline.
 */

import { BaseStateMachine, StateTransitionError } from "@/core/state-machine/base.state-machine";
import { CreatorOnboardingState, CreatorOnboardingContext } from "./types";

export const CREATOR_ONBOARDING_TRANSITIONS: Record<
  CreatorOnboardingState,
  readonly CreatorOnboardingState[]
> = {
  DRAFT: ["IDENTITY_VERIFIED", "INFORMATION_COLLECTED", "REJECTED"],
  IDENTITY_VERIFIED: [
    "INFORMATION_COLLECTED",
    "CONSENT_PROVENANCE_SATISFIED",
    "PAYOUT_SETUP_COMPLETED",
    "REVISION_REQUIRED",
    "REJECTED",
  ],
  INFORMATION_COLLECTED: [
    "IDENTITY_VERIFIED",
    "PAYOUT_SETUP_COMPLETED",
    "CONSENT_PROVENANCE_SATISFIED",
    "REVISION_REQUIRED",
    "REJECTED",
  ],
  PAYOUT_SETUP_COMPLETED: [
    "CONSENT_PROVENANCE_SATISFIED",
    "PLATFORM_REVIEWED",
    "MONETIZATION_ENABLED",
    "REVISION_REQUIRED",
    "REJECTED",
  ],
  CONSENT_PROVENANCE_SATISFIED: [
    "PLATFORM_REVIEWED",
    "PAYOUT_SETUP_COMPLETED",
    "MONETIZATION_ENABLED",
    "REVISION_REQUIRED",
    "REJECTED",
  ],
  PLATFORM_REVIEWED: [
    "PAYOUT_SETUP_COMPLETED",
    "MONETIZATION_ENABLED",
    "REVISION_REQUIRED",
    "REJECTED",
  ],
  MONETIZATION_ENABLED: ["RESTRICTED", "SUSPENDED"],
  REVISION_REQUIRED: [
    "DRAFT",
    "INFORMATION_COLLECTED",
    "IDENTITY_VERIFIED",
    "PAYOUT_SETUP_COMPLETED",
    "CONSENT_PROVENANCE_SATISFIED",
    "PLATFORM_REVIEWED",
    "REJECTED",
  ],
  RESTRICTED: ["MONETIZATION_ENABLED", "SUSPENDED", "REVISION_REQUIRED"],
  SUSPENDED: ["RESTRICTED", "MONETIZATION_ENABLED"],
  REJECTED: ["DRAFT"],
};

export class CreatorOnboardingStateMachine extends BaseStateMachine<
  CreatorOnboardingState,
  CreatorOnboardingContext
> {
  constructor() {
    super({
      entityType: "CreatorOnboarding",
      initialState: "DRAFT",
      transitions: CREATOR_ONBOARDING_TRANSITIONS,
      guards: [
        // Role check for privileged status changes
        (fromState, toState, context) => {
          const privilegedStates: CreatorOnboardingState[] = [
            "PLATFORM_REVIEWED",
            "REJECTED",
            "RESTRICTED",
            "SUSPENDED",
          ];
          if (privilegedStates.includes(toState)) {
            const role = context?.security?.actorRole;
            if (role !== "ADMIN" && role !== "MODERATOR" && role !== "SYSTEM_AUTOMATION") {
              return {
                allowed: false,
                reason: `Transitioning to '${toState}' requires administrative or compliance authority. Current role: '${role || "ANONYMOUS"}'.`,
              };
            }
          }
          return true;
        },
        // Monetization Enablement prerequisite guard
        (fromState, toState) => {
          if (toState === "MONETIZATION_ENABLED") {
            const validPrecursors: CreatorOnboardingState[] = [
              "PLATFORM_REVIEWED",
              "PAYOUT_SETUP_COMPLETED",
              "CONSENT_PROVENANCE_SATISFIED",
              "RESTRICTED",
            ];
            if (!validPrecursors.includes(fromState)) {
              return {
                allowed: false,
                reason: `Cannot enable monetization without completed payout setup and platform review clearance.`,
              };
            }
          }
          return true;
        },
      ],
    });
  }

  /**
   * Authority Evaluator: can creator sell PPV, products, or subscriptions?
   */
  public canSell(state: CreatorOnboardingState): boolean {
    return state === "MONETIZATION_ENABLED";
  }

  /**
   * Authority Evaluator: can creator broadcast live streams?
   */
  public canBroadcastLive(state: CreatorOnboardingState): boolean {
    return state === "MONETIZATION_ENABLED" || state === "PAYOUT_SETUP_COMPLETED";
  }

  /**
   * Authority Evaluator: can creator withdraw accumulated earnings?
   */
  public canRequestPayout(state: CreatorOnboardingState): boolean {
    return state === "MONETIZATION_ENABLED";
  }

  /**
   * Returns 1-based progress index for UI progression steps
   */
  public getStepIndex(state: CreatorOnboardingState): number {
    switch (state) {
      case "DRAFT": return 1;
      case "INFORMATION_COLLECTED": return 2;
      case "IDENTITY_VERIFIED": return 3;
      case "PAYOUT_SETUP_COMPLETED": return 4;
      case "CONSENT_PROVENANCE_SATISFIED": return 5;
      case "PLATFORM_REVIEWED": return 6;
      case "MONETIZATION_ENABLED": return 7;
      case "REVISION_REQUIRED": return 2;
      default: return 0;
    }
  }
}

export const creatorOnboardingStateMachine = new CreatorOnboardingStateMachine();
