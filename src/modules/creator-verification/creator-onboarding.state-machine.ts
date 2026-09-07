/**
 * ============================================================================
 * CREATOR ONBOARDING STATE MACHINE
 * ============================================================================
 * 
 * Formal state transition graph, transition invariants, and prerequisite guards
 * for the Creator Verification and Onboarding lifecycle.
 * 
 * Lifecycle Stages:
 * 1. DRAFT                     -> Creator registers initial interest
 * 2. INFORMATION_COLLECTED     -> Creator provides legal & profile information
 * 3. IDENTITY_VERIFIED         -> Government ID + Biometric selfie verified (18+)
 * 4. CONSENT_PROVENANCE_SATISFIED -> 18 U.S.C. § 2257 statement & performer release signed
 * 5. PLATFORM_REVIEWED         -> Trust & Safety / compliance manual review passed
 * 6. PAYOUT_SETUP_COMPLETED    -> Beneficiary banking / Paxum / Cosmo + W-9/W-8BEN verified
 * 7. MONETIZATION_ENABLED      -> Full authorization: can sell, earn, stream & withdraw
 */

import { CreatorOnboardingState, SecurityContext, CreatorModerationState } from "./types";

export class CreatorStateTransitionError extends Error {
  constructor(
    public readonly fromState: CreatorOnboardingState,
    public readonly toState: CreatorOnboardingState,
    public readonly reason: string,
    public readonly code: string = "ILLEGAL_STATE_TRANSITION"
  ) {
    super(
      `Creator Onboarding State Machine Violation: Cannot transition from '${fromState}' to '${toState}'. Reason: ${reason}`
    );
    this.name = "CreatorStateTransitionError";
  }
}

/**
 * Authoritative State Transition Graph
 */
export const ALLOWED_STATE_TRANSITIONS: Record<
  CreatorOnboardingState,
  CreatorOnboardingState[]
> = {
  // Step 1: Draft
  DRAFT: ["INFORMATION_COLLECTED", "REJECTED"],

  // Step 2: Information Collected
  INFORMATION_COLLECTED: ["IDENTITY_VERIFIED", "REVISION_REQUIRED", "REJECTED"],

  // Step 3: Identity Verified
  IDENTITY_VERIFIED: [
    "CONSENT_PROVENANCE_SATISFIED",
    "REVISION_REQUIRED",
    "REJECTED",
  ],

  // Step 4: Consent & Provenance Satisfied
  CONSENT_PROVENANCE_SATISFIED: [
    "PLATFORM_REVIEWED",
    "REVISION_REQUIRED",
    "REJECTED",
  ],

  // Step 5: Platform Reviewed
  PLATFORM_REVIEWED: [
    "PAYOUT_SETUP_COMPLETED",
    "REVISION_REQUIRED",
    "REJECTED",
  ],

  // Step 6: Payout Setup Completed
  PAYOUT_SETUP_COMPLETED: [
    "MONETIZATION_ENABLED",
    "REVISION_REQUIRED",
    "REJECTED",
  ],

  // Step 7: Monetization Enabled (Active state)
  MONETIZATION_ENABLED: ["RESTRICTED", "SUSPENDED"],

  // Revision Required (Non-linear recovery state)
  REVISION_REQUIRED: [
    "INFORMATION_COLLECTED",
    "IDENTITY_VERIFIED",
    "CONSENT_PROVENANCE_SATISFIED",
    "PAYOUT_SETUP_COMPLETED",
    "REJECTED",
  ],

  // Restricted (Temporary compliance hold)
  RESTRICTED: ["MONETIZATION_ENABLED", "SUSPENDED", "REVISION_REQUIRED"],

  // Suspended (Safety ban)
  SUSPENDED: ["RESTRICTED", "MONETIZATION_ENABLED"], // Only elevated admin pardon can un-suspend

  // Rejected (Terminal)
  REJECTED: ["DRAFT"], // Only admin re-application bypass
};

export class CreatorOnboardingStateMachine {
  /**
   * Validate whether a requested state transition is legally permissible.
   * Throws CreatorStateTransitionError if the transition violates invariants.
   */
  static validateTransition(
    fromState: CreatorOnboardingState,
    toState: CreatorOnboardingState,
    context?: SecurityContext,
    reason?: string
  ): void {
    if (fromState === toState) {
      return; // No-op idempotent transition
    }

    const allowedNextStates = ALLOWED_STATE_TRANSITIONS[fromState] || [];
    if (!allowedNextStates.includes(toState)) {
      throw new CreatorStateTransitionError(
        fromState,
        toState,
        `Direct transition from '${fromState}' to '${toState}' is not permitted. Permissible next states are: [${allowedNextStates.join(
          ", "
        )}]`,
        "INVALID_TRANSITION_PATH"
      );
    }

    // Role-based authorization rules:
    // Transitioning to PLATFORM_REVIEWED, REJECTED, RESTRICTED, or SUSPENDED requires privileged actor.
    if (
      toState === "PLATFORM_REVIEWED" ||
      toState === "REJECTED" ||
      toState === "RESTRICTED" ||
      toState === "SUSPENDED"
    ) {
      if (
        context &&
        context.actorRole !== "ADMIN" &&
        context.actorRole !== "MODERATOR" &&
        context.actorRole !== "SYSTEM_AUTOMATION"
      ) {
        throw new CreatorStateTransitionError(
          fromState,
          toState,
          `Action requires compliance officer, administrator, or safety automation authority. Current role: '${context.actorRole || "ANONYMOUS"}'`,
          "UNAUTHORIZED_TRANSITION_ACTOR"
        );
      }
    }

    // Guard: Monetization Enablement requires all prior steps
    if (toState === "MONETIZATION_ENABLED" && fromState !== "PAYOUT_SETUP_COMPLETED" && fromState !== "RESTRICTED") {
      throw new CreatorStateTransitionError(
        fromState,
        toState,
        `Cannot enable monetization without completed payout setup and platform review clearance.`,
        "PREREQUISITE_NOT_MET"
      );
    }
  }

  /**
   * Maps high-resolution onboarding state to Prisma CreatorModerationState
   */
  static mapToModerationState(state: CreatorOnboardingState): CreatorModerationState {
    switch (state) {
      case "DRAFT":
      case "INFORMATION_COLLECTED":
        return "APPLICATION";
      case "IDENTITY_VERIFIED":
      case "CONSENT_PROVENANCE_SATISFIED":
      case "PLATFORM_REVIEWED":
      case "PAYOUT_SETUP_COMPLETED":
        return "VERIFICATION_PENDING";
      case "MONETIZATION_ENABLED":
        return "MONETIZATION_ENABLED";
      case "RESTRICTED":
      case "REVISION_REQUIRED":
        return "RESTRICTED";
      case "SUSPENDED":
      case "REJECTED":
        return "SUSPENDED";
      default:
        return "APPLICATION";
    }
  }

  /**
   * Evaluates if creator can sell PPV, products, interactions, or subscriptions.
   * Fundamental Rule: ONLY MONETIZATION_ENABLED can sell.
   */
  static canSell(state: CreatorOnboardingState): boolean {
    return state === "MONETIZATION_ENABLED";
  }

  /**
   * Evaluates if creator can receive incoming earnings (tips, subscriptions, purchases).
   * Fundamental Rule: ONLY MONETIZATION_ENABLED can receive earnings.
   */
  static canReceiveEarnings(state: CreatorOnboardingState): boolean {
    return state === "MONETIZATION_ENABLED";
  }

  /**
   * Evaluates if creator can broadcast live streams.
   */
  static canBroadcastLive(state: CreatorOnboardingState): boolean {
    return state === "MONETIZATION_ENABLED" || state === "PAYOUT_SETUP_COMPLETED";
  }

  /**
   * Evaluates if creator can request fiat payouts from accumulated earnings.
   */
  static canRequestPayout(state: CreatorOnboardingState): boolean {
    return state === "MONETIZATION_ENABLED";
  }

  /**
   * Get 1-based sequential step index for the given state.
   */
  static getStepIndex(state: CreatorOnboardingState): number {
    switch (state) {
      case "DRAFT":
        return 1;
      case "INFORMATION_COLLECTED":
        return 2;
      case "IDENTITY_VERIFIED":
        return 3;
      case "CONSENT_PROVENANCE_SATISFIED":
        return 4;
      case "PLATFORM_REVIEWED":
        return 5;
      case "PAYOUT_SETUP_COMPLETED":
        return 6;
      case "MONETIZATION_ENABLED":
        return 7;
      case "REVISION_REQUIRED":
        return 2;
      case "RESTRICTED":
      case "SUSPENDED":
      case "REJECTED":
        return 0;
    }
  }
}
