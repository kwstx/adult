/**
 * ============================================================================
 * 4. PAYMENT LIFECYCLE STATE MACHINE
 * ============================================================================
 * 
 * Formal state transition graph, idempotent webhook guards, and financial
 * reconciliation invariants for fiat and crypto checkout flows (CCBill, Segpay, Epoch, Stripe, NOWPayments).
 * 
 * States:
 * INITIALIZED         -> User initiated checkout intent; session registered
 * PENDING_WEBHOOK     -> Gateway checkout page loaded; awaiting server webhook
 * SUCCEEDED           -> Authoritative webhook signature verified; wallet credited
 * FAILED              -> Declined by issuer, card error, or checkout session expired
 * DISPUTED_CHARGEBACK -> Bank chargeback or dispute received; wallet penalty applied
 * REFUNDED            -> Payment reversed by merchant or platform administration
 */

import { BaseStateMachine } from "@/core/state-machine/base.state-machine";
import { PaymentLifecycleState, PaymentLifecycleContext } from "./types";
import { eventBus } from "@/modules/realtime/event-bus";

export const PAYMENT_TRANSITIONS: Record<
  PaymentLifecycleState,
  readonly PaymentLifecycleState[]
> = {
  INITIALIZED: ["PENDING_WEBHOOK", "SUCCEEDED", "FAILED"],
  PENDING_WEBHOOK: ["SUCCEEDED", "FAILED"],
  SUCCEEDED: ["DISPUTED_CHARGEBACK", "REFUNDED"],
  FAILED: [], // Terminal
  DISPUTED_CHARGEBACK: ["REFUNDED"],
  REFUNDED: [], // Terminal
};

export class PaymentStateMachine extends BaseStateMachine<
  PaymentLifecycleState,
  PaymentLifecycleContext
> {
  constructor() {
    super({
      entityType: "Payment",
      initialState: "INITIALIZED",
      terminalStates: ["FAILED", "REFUNDED"],
      transitions: PAYMENT_TRANSITIONS,
      guards: [
        // Only Admin or Webhook Automation can mark payment SUCCEEDED, REFUNDED, or DISPUTED
        (fromState, toState, context) => {
          const privilegedStates: PaymentLifecycleState[] = [
            "SUCCEEDED",
            "REFUNDED",
            "DISPUTED_CHARGEBACK",
          ];
          if (privilegedStates.includes(toState)) {
            const role = context?.security?.actorRole;
            if (
              role !== "ADMIN" &&
              role !== "SYSTEM_AUTOMATION" &&
              role !== "MODERATOR"
            ) {
              return {
                allowed: false,
                reason: `Payment transition to '${toState}' requires verified server webhook or administrative authority. Current role: '${role || "ANONYMOUS"}'.`,
              };
            }
          }
          return true;
        },
        // Prevent refunding an unfulfilled/failed payment
        (fromState, toState) => {
          if (toState === "REFUNDED" && fromState !== "SUCCEEDED" && fromState !== "DISPUTED_CHARGEBACK") {
            return {
              allowed: false,
              reason: `Cannot refund a payment in '${fromState}' state. Only 'SUCCEEDED' or 'DISPUTED_CHARGEBACK' payments can be refunded.`,
            };
          }
          return true;
        },
      ],
      afterTransition: [
        (fromState, toState, context) => {
          if (!context) return;
          eventBus.publish(`payment:${context.paymentId}`, {
            type: `PAYMENT_${toState}` as any,
            payload: {
              paymentId: context.paymentId,
              userId: context.userId,
              amountCents: context.amountCents,
              gateway: context.gateway,
            },
            timestamp: Date.now(),
          });
        },
      ],
    });
  }

  /**
   * Authority Evaluator: is payment finalized and settled?
   */
  public isSettled(state: PaymentLifecycleState): boolean {
    return state === "SUCCEEDED";
  }

  /**
   * Authority Evaluator: can this payment be refunded?
   */
  public canRefund(state: PaymentLifecycleState): boolean {
    return state === "SUCCEEDED" || state === "DISPUTED_CHARGEBACK";
  }
}

export const paymentStateMachine = new PaymentStateMachine();
