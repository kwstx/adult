// ============================================================================
// AUTHORITATIVE CO-STREAM STATE MACHINE
// Finite State Machine Governing Multi-Creator Broadcast Lifecycles & Constraints
// ============================================================================

export type CoStreamSessionState =
  | "INVITED"
  | "ACCEPTED"
  | "PREPARING"
  | "LIVE"
  | "ENDED"
  | "CANCELLED";

export type CoStreamTrigger =
  | "GUEST_ACCEPTED"
  | "GUEST_DECLINED"
  | "HOST_CANCELLED"
  | "PREPARATION_READY"
  | "START_BROADCAST"
  | "END_BROADCAST"
  | "TERMINATED_SAFETY";

export class InvalidStateTransitionError extends Error {
  constructor(
    public fromState: CoStreamSessionState,
    public trigger: CoStreamTrigger,
    public reason: string
  ) {
    super(`Cannot transition Co-Stream from ${fromState} via ${trigger}: ${reason}`);
    this.name = "InvalidStateTransitionError";
  }
}

export class CoStreamSplitValidationError extends Error {
  constructor(public currentSum: number) {
    super(
      `Co-Stream split percentages must sum to exactly 100% (1.00). Current sum: ${(
        currentSum * 100
      ).toFixed(1)}%`
    );
    this.name = "CoStreamSplitValidationError";
  }
}

export interface StateTransitionResult {
  previousState: CoStreamSessionState;
  nextState: CoStreamSessionState;
  trigger: CoStreamTrigger;
  timestamp: string;
}

export class CoStreamStateMachine {
  private static VALID_TRANSITIONS: Record<
    CoStreamSessionState,
    Partial<Record<CoStreamTrigger, CoStreamSessionState>>
  > = {
    INVITED: {
      GUEST_ACCEPTED: "ACCEPTED",
      GUEST_DECLINED: "CANCELLED",
      HOST_CANCELLED: "CANCELLED",
    },
    ACCEPTED: {
      PREPARATION_READY: "PREPARING",
      HOST_CANCELLED: "CANCELLED",
    },
    PREPARING: {
      START_BROADCAST: "LIVE",
      HOST_CANCELLED: "CANCELLED",
    },
    LIVE: {
      END_BROADCAST: "ENDED",
      TERMINATED_SAFETY: "ENDED",
    },
    ENDED: {},
    CANCELLED: {},
  };

  /**
   * Evaluates and transitions a Co-Stream session state.
   */
  public static transition(
    currentState: CoStreamSessionState,
    trigger: CoStreamTrigger,
    context?: {
      participantCount?: number;
      totalSplitPercentage?: number;
    }
  ): StateTransitionResult {
    const allowed = this.VALID_TRANSITIONS[currentState];
    const nextState = allowed?.[trigger];

    if (!nextState) {
      throw new InvalidStateTransitionError(
        currentState,
        trigger,
        `No valid transition exists from state "${currentState}" for trigger "${trigger}".`
      );
    }

    // Invariant 1: Broadcast launch requires total split percentage to equal 100% (1.00)
    if (trigger === "START_BROADCAST" && context?.totalSplitPercentage !== undefined) {
      const sum = Number(context.totalSplitPercentage.toFixed(2));
      if (Math.abs(sum - 1.0) > 0.001) {
        throw new CoStreamSplitValidationError(sum);
      }
    }

    // Invariant 2: Broadcast launch requires at least 2 participating creators
    if (trigger === "START_BROADCAST" && context?.participantCount !== undefined) {
      if (context.participantCount < 2) {
        throw new InvalidStateTransitionError(
          currentState,
          trigger,
          `Multi-creator broadcast requires at least 2 confirmed co-hosts. Current confirmed: ${context.participantCount}`
        );
      }
    }

    return {
      previousState: currentState,
      nextState,
      trigger,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Helper to check if session is active/monetizable
   */
  public static isLive(state: CoStreamSessionState): boolean {
    return state === "LIVE";
  }

  /**
   * Helper to check if session can accept configuration changes
   */
  public static canModifySettings(state: CoStreamSessionState): boolean {
    return state === "INVITED" || state === "ACCEPTED" || state === "PREPARING";
  }
}
