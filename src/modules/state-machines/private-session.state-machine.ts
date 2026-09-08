/**
 * ============================================================================
 * 6. PRIVATE SESSION LIFECYCLE STATE MACHINE
 * ============================================================================
 * 
 * Formal state transition graph, mutual authorization guards, and financial
 * hold clearance for 1-on-1 private video calls.
 * 
 * States:
 * PENDING_CREATOR_ACCEPT -> Fan reserved slot and locked credits; waiting creator RSVP
 * ACCEPTED               -> Creator confirmed booking; room lobby scheduled
 * IN_PROGRESS            -> Both participants connected to WebRTC private stage
 * COMPLETED              -> Session elapsed; creator earnings cleared; session archived
 * REJECTED               -> Creator declined request within SLA; auto-refunds fan
 * CANCELLED_BY_FAN       -> Fan canceled before show; policy-based refund applied
 * CANCELLED_BY_CREATOR   -> Creator canceled; full refund + reliability metric strike
 * NO_SHOW                -> Participant failed to connect within 5 min window
 */

import { BaseStateMachine } from "@/core/state-machine/base.state-machine";
import { PrivateSessionLifecycleState, PrivateSessionLifecycleContext } from "./types";
import { eventBus } from "@/modules/realtime/event-bus";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";

export const PRIVATE_SESSION_TRANSITIONS: Record<
  PrivateSessionLifecycleState,
  readonly PrivateSessionLifecycleState[]
> = {
  PENDING_CREATOR_ACCEPT: ["ACCEPTED", "REJECTED", "CANCELLED_BY_FAN"],
  ACCEPTED: ["IN_PROGRESS", "CANCELLED_BY_FAN", "CANCELLED_BY_CREATOR", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED_BY_CREATOR", "NO_SHOW"],
  COMPLETED: [], // Terminal
  REJECTED: [], // Terminal
  CANCELLED_BY_FAN: [], // Terminal
  CANCELLED_BY_CREATOR: [], // Terminal
  NO_SHOW: [], // Terminal
};

export class PrivateSessionStateMachine extends BaseStateMachine<
  PrivateSessionLifecycleState,
  PrivateSessionLifecycleContext
> {
  constructor() {
    super({
      entityType: "PrivateSession",
      initialState: "PENDING_CREATOR_ACCEPT",
      terminalStates: [
        "COMPLETED",
        "REJECTED",
        "CANCELLED_BY_FAN",
        "CANCELLED_BY_CREATOR",
        "NO_SHOW",
      ],
      transitions: PRIVATE_SESSION_TRANSITIONS,
      guards: [
        // Cannot complete a session that wasn't actively in progress
        (fromState, toState) => {
          if (toState === "COMPLETED" && fromState !== "IN_PROGRESS") {
            return {
              allowed: false,
              reason: `Private session must be actively 'IN_PROGRESS' before it can transition to 'COMPLETED'.`,
            };
          }
          return true;
        },
      ],
      afterTransition: [
        async (fromState, toState, context) => {
          if (!context) return;

          // 1. Emit realtime event
          eventBus.publish(`session:${context.bookingId}`, {
            type: `SESSION_${toState}` as any,
            payload: {
              bookingId: context.bookingId,
              fanId: context.fanId,
              creatorProfileId: context.creatorProfileId,
              scheduledStartTime: context.scheduledStartTime,
              durationMinutes: context.durationMinutes,
              priceCredits: context.priceCredits,
              cancellationReason: context.cancellationReason,
              rejectionReason: context.rejectionReason,
            },
            timestamp: Date.now(),
          });
        },
      ],
    });
  }

  /**
   * Authority Evaluator: is the room lobby open for video streaming?
   */
  public isRoomActive(state: PrivateSessionLifecycleState): boolean {
    return state === "IN_PROGRESS" || state === "ACCEPTED";
  }

  /**
   * Authority Evaluator: are creator earnings cleared and finalized?
   */
  public isEarningsCleared(state: PrivateSessionLifecycleState): boolean {
    return state === "COMPLETED";
  }
}

export const privateSessionStateMachine = new PrivateSessionStateMachine();
