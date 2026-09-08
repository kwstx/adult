/**
 * ============================================================================
 * 5. SUBSCRIPTION LIFECYCLE STATE MACHINE
 * ============================================================================
 * 
 * Formal state transition graph, grace-period invariants, and automatic
 * entitlement synchronization for creator recurring memberships.
 * 
 * States:
 * ACTIVE   -> Membership in good standing; full subscriber/VIP perks granted
 * PAST_DUE -> Renewal payment failed; in 3-day grace period with retry schedule
 * CANCELED -> User canceled auto-renew; perks remain active until billing period ends
 * EXPIRED  -> Grace period elapsed or canceled term ended; entitlements authoritatively revoked
 * PAUSED   -> User temporarily suspended membership renewal
 */

import { BaseStateMachine } from "@/core/state-machine/base.state-machine";
import { SubscriptionLifecycleState, SubscriptionLifecycleContext } from "./types";
import { EntitlementService } from "@/modules/entitlements/entitlement.service";
import { eventBus } from "@/modules/realtime/event-bus";

export const SUBSCRIPTION_TRANSITIONS: Record<
  SubscriptionLifecycleState,
  readonly SubscriptionLifecycleState[]
> = {
  ACTIVE: ["PAST_DUE", "CANCELED", "PAUSED"],
  PAST_DUE: ["ACTIVE", "EXPIRED"],
  CANCELED: ["ACTIVE", "EXPIRED"],
  PAUSED: ["ACTIVE", "CANCELED", "EXPIRED"],
  EXPIRED: ["ACTIVE"],
};

export class SubscriptionStateMachine extends BaseStateMachine<
  SubscriptionLifecycleState,
  SubscriptionLifecycleContext
> {
  constructor() {
    super({
      entityType: "Subscription",
      initialState: "ACTIVE",
      transitions: SUBSCRIPTION_TRANSITIONS,
      afterTransition: [
        async (fromState, toState, context) => {
          if (!context) return;

          // 1. Emit subscription lifecycle event
          eventBus.publish(`user:${context.fanId}`, {
            type: `SUBSCRIPTION_${toState}` as any,
            payload: {
              subscriptionId: context.subscriptionId,
              fanId: context.fanId,
              creatorProfileId: context.creatorProfileId,
              tierName: context.tierName,
            },
            timestamp: Date.now(),
          });

          // 2. Authoritative Entitlement Synchronization
          if (toState === "ACTIVE") {
            try {
              await EntitlementService.grantEntitlement({
                userId: context.fanId,
                creatorProfileId: context.creatorProfileId,
                key: "SUBSCRIBER",
                scope: "CREATOR",
                sourceType: "SUBSCRIPTION",
                metadata: { tierName: context.tierName },
              });
            } catch {
              // Non-blocking in mock
            }
          } else if (toState === "EXPIRED") {
            try {
              await EntitlementService.revokeEntitlement({
                userId: context.fanId,
                creatorProfileId: context.creatorProfileId,
                key: "SUBSCRIBER",
                reason: "Subscription expired or past-due grace period elapsed",
              });
            } catch {
              // Non-blocking in mock
            }
          }
        },
      ],
    });
  }

  /**
   * Authority Evaluator: does this subscription state grant content/live access?
   */
  public hasActivePerks(state: SubscriptionLifecycleState): boolean {
    return state === "ACTIVE" || state === "CANCELED" || state === "PAST_DUE";
  }

  /**
   * Authority Evaluator: is the subscription renewing automatically?
   */
  public willAutoRenew(state: SubscriptionLifecycleState): boolean {
    return state === "ACTIVE";
  }
}

export const subscriptionStateMachine = new SubscriptionStateMachine();
