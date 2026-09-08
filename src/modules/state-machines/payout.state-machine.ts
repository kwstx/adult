/**
 * ============================================================================
 * 8. PAYOUT LIFECYCLE STATE MACHINE
 * ============================================================================
 * 
 * Formal state transition graph, AML/KYC compliance checks, and creator
 * earnings liability clearance for fiat banking (SEPA, ACH, MassPay, Paxum, CosmoPay, USDT).
 * 
 * States:
 * REQUESTED               -> Creator submitted withdrawal request against cleared balance
 * UNDER_COMPLIANCE_REVIEW -> Large amount threshold / OFAC / KYC document check in progress
 * PROCESSING              -> Dispatched to payout provider / banking rail in progress
 * COMPLETED               -> Funds confirmed received by beneficiary; earnings cleared
 * REJECTED                -> Compliance rejection or invalid banking details; earnings unlocked
 * FAILED                  -> Bank rail network error / rejected wire; earnings unlocked
 */

import { BaseStateMachine } from "@/core/state-machine/base.state-machine";
import { PayoutLifecycleState, PayoutLifecycleContext } from "./types";
import { eventBus } from "@/modules/realtime/event-bus";

export const PAYOUT_TRANSITIONS: Record<
  PayoutLifecycleState,
  readonly PayoutLifecycleState[]
> = {
  REQUESTED: ["UNDER_COMPLIANCE_REVIEW", "PROCESSING", "REJECTED", "FAILED"],
  UNDER_COMPLIANCE_REVIEW: ["PROCESSING", "REJECTED", "FAILED"],
  PROCESSING: ["COMPLETED", "FAILED"],
  COMPLETED: [], // Terminal
  REJECTED: [], // Terminal
  FAILED: [], // Terminal
};

export class PayoutStateMachine extends BaseStateMachine<
  PayoutLifecycleState,
  PayoutLifecycleContext
> {
  constructor() {
    super({
      entityType: "Payout",
      initialState: "REQUESTED",
      terminalStates: ["COMPLETED", "REJECTED", "FAILED"],
      transitions: PAYOUT_TRANSITIONS,
      guards: [
        // Privileged actor guard for reviews, processing, and approvals
        (fromState, toState, context) => {
          const privilegedStates: PayoutLifecycleState[] = [
            "UNDER_COMPLIANCE_REVIEW",
            "PROCESSING",
            "COMPLETED",
            "REJECTED",
          ];
          if (privilegedStates.includes(toState)) {
            const role = context?.security?.actorRole;
            if (role !== "ADMIN" && role !== "MODERATOR" && role !== "SYSTEM_AUTOMATION") {
              return {
                allowed: false,
                reason: `Payout transition to '${toState}' requires financial compliance or admin authority. Current role: '${role || "ANONYMOUS"}'.`,
              };
            }
          }
          return true;
        },
        // Invariant: cannot complete a payout without it being in PROCESSING
        (fromState, toState) => {
          if (toState === "COMPLETED" && fromState !== "PROCESSING") {
            return {
              allowed: false,
              reason: `Payout must be in 'PROCESSING' state with active rail dispatch before it can be 'COMPLETED'.`,
            };
          }
          return true;
        },
      ],
      afterTransition: [
        (fromState, toState, context) => {
          if (!context) return;
          eventBus.publish(`creator:${context.creatorProfileId}`, {
            type: `PAYOUT_${toState}` as any,
            payload: {
              payoutId: context.payoutId,
              creatorProfileId: context.creatorProfileId,
              amountCredits: context.amountCredits,
              fiatAmountEur: context.fiatAmountEur,
              payoutMethod: context.payoutMethod,
            },
            timestamp: Date.now(),
          });
        },
      ],
    });
  }

  /**
   * Evaluates if the payout is currently active in processing pipeline
   */
  public isPending(state: PayoutLifecycleState): boolean {
    return state === "REQUESTED" || state === "UNDER_COMPLIANCE_REVIEW" || state === "PROCESSING";
  }

  /**
   * Evaluates if the payout was successfully disbursed
   */
  public isDisbursed(state: PayoutLifecycleState): boolean {
    return state === "COMPLETED";
  }
}

export const payoutStateMachine = new PayoutStateMachine();
