/**
 * ============================================================================
 * 3. INTERACTION LIFECYCLE STATE MACHINE
 * ============================================================================
 * 
 * Formal state transition graph and refund guards for real-time live interactions,
 * tips with actions, toy vibrations, wheel spins, and costume changes.
 * 
 * States:
 * PAID      -> Paid via wallet double-entry ledger, pending placement in queue
 * QUEUED    -> Placed into creator's live interaction queue
 * EXECUTING -> Active display on stream / IoT toy trigger / timer running
 * COMPLETED -> Interaction fulfilled, XP awarded, stats updated (Terminal)
 * REJECTED  -> Creator declined action / inappropriate request (triggers refund)
 * REFUNDED  -> Funds returned to buyer's wallet ledger (Terminal)
 */

import { BaseStateMachine } from "@/core/state-machine/base.state-machine";
import { InteractionLifecycleState, InteractionLifecycleContext } from "./types";
import { eventBus } from "@/modules/realtime/event-bus";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";

export const INTERACTION_TRANSITIONS: Record<
  InteractionLifecycleState,
  readonly InteractionLifecycleState[]
> = {
  PAID: ["QUEUED", "REJECTED", "REFUNDED"],
  QUEUED: ["EXECUTING", "REJECTED", "REFUNDED"],
  EXECUTING: ["COMPLETED", "REJECTED", "REFUNDED"],
  COMPLETED: [], // Terminal
  REJECTED: ["REFUNDED"],
  REFUNDED: [], // Terminal
};

export class InteractionStateMachine extends BaseStateMachine<
  InteractionLifecycleState,
  InteractionLifecycleContext
> {
  constructor() {
    super({
      entityType: "Interaction",
      initialState: "PAID",
      terminalStates: ["COMPLETED", "REFUNDED"],
      transitions: INTERACTION_TRANSITIONS,
      guards: [
        // Cannot complete an interaction that wasn't actively executing
        (fromState, toState) => {
          if (toState === "COMPLETED" && fromState !== "EXECUTING") {
            return {
              allowed: false,
              reason: `Interaction must be actively 'EXECUTING' before it can transition to 'COMPLETED'.`,
            };
          }
          return true;
        },
      ],
      afterTransition: [
        async (fromState, toState, context) => {
          if (!context) return;

          // 1. Emit realtime event
          eventBus.publish(`creator:${context.creatorProfileId}`, {
            type: `INTERACTION_${toState}` as any,
            payload: {
              purchaseId: context.purchaseId,
              interactionId: context.interactionId,
              fanId: context.fanId,
              creatorProfileId: context.creatorProfileId,
              creditsAmount: context.creditsAmount,
              refundReason: context.refundReason,
            },
            timestamp: Date.now(),
          });
        },
      ],
    });
  }

  /**
   * Evaluates if the interaction is currently active in queue or stage
   */
  public isActive(state: InteractionLifecycleState): boolean {
    return state === "PAID" || state === "QUEUED" || state === "EXECUTING";
  }

  /**
   * Evaluates if the interaction was fulfilled successfully
   */
  public isFulfilled(state: InteractionLifecycleState): boolean {
    return state === "COMPLETED";
  }
}

export const interactionStateMachine = new InteractionStateMachine();
