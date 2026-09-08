/**
 * ============================================================================
 * 2. LIVESTREAM LIFECYCLE STATE MACHINE
 * ============================================================================
 * 
 * Formal state transition graph, invariant validators, and safety guards
 * for live broadcast sessions.
 * 
 * States:
 * SCHEDULED          -> Creator planned a broadcast event
 * PREPARING          -> Camera check, encoder handshake, room allocated
 * LIVE               -> Active broadcast, video streaming, interactive chat
 * PAUSED             -> Intermission / temporary network disconnect
 * ENDED              -> Normal broadcast teardown, VOD generation, metrics locked
 * TERMINATED_SAFETY  -> Immediate emergency shutdown by compliance/moderator
 */

import { BaseStateMachine } from "@/core/state-machine/base.state-machine";
import { LivestreamLifecycleState, LivestreamLifecycleContext } from "./types";
import { eventBus } from "@/modules/realtime/event-bus";

export const LIVESTREAM_TRANSITIONS: Record<
  LivestreamLifecycleState,
  readonly LivestreamLifecycleState[]
> = {
  SCHEDULED: ["PREPARING", "ENDED", "TERMINATED_SAFETY"],
  PREPARING: ["LIVE", "ENDED", "TERMINATED_SAFETY"],
  LIVE: ["PAUSED", "ENDED", "TERMINATED_SAFETY"],
  PAUSED: ["LIVE", "ENDED", "TERMINATED_SAFETY"],
  ENDED: [], // Terminal
  TERMINATED_SAFETY: [], // Terminal
};

export class LivestreamStateMachine extends BaseStateMachine<
  LivestreamLifecycleState,
  LivestreamLifecycleContext
> {
  constructor() {
    super({
      entityType: "Livestream",
      initialState: "SCHEDULED",
      terminalStates: ["ENDED", "TERMINATED_SAFETY"],
      transitions: LIVESTREAM_TRANSITIONS,
      guards: [
        // Safety Termination requires privileged actor
        (fromState, toState, context) => {
          if (toState === "TERMINATED_SAFETY") {
            const role = context?.security?.actorRole;
            if (role !== "ADMIN" && role !== "MODERATOR" && role !== "SYSTEM_AUTOMATION") {
              return {
                allowed: false,
                reason: `Emergency stream termination requires Moderator or Administrator authority. Current role: '${role || "ANONYMOUS"}'.`,
              };
            }
          }
          return true;
        },
        // Only the stream owner or Admin can go live / pause
        (fromState, toState, context) => {
          if (toState === "LIVE" || toState === "PAUSED" || toState === "PREPARING") {
            const role = context?.security?.actorRole;
            if (role !== "CREATOR" && role !== "ADMIN" && role !== "SYSTEM_AUTOMATION") {
              return {
                allowed: false,
                reason: `Only the creator or platform system may broadcast. Current role: '${role || "ANONYMOUS"}'.`,
              };
            }
          }
          return true;
        },
      ],
      afterTransition: [
        (fromState, toState, context) => {
          if (!context) return;
          if (toState === "LIVE") {
            eventBus.publish(`stream:${context.streamId}`, {
              type: "LIVE_STARTED" as any,
              payload: {
                streamId: context.streamId,
                creatorProfileId: context.creatorProfileId,
              },
              timestamp: Date.now(),
            });
          } else if (toState === "ENDED") {
            eventBus.publish(`stream:${context.streamId}`, {
              type: "LIVE_ENDED" as any,
              payload: {
                streamId: context.streamId,
                creatorProfileId: context.creatorProfileId,
                totalDurationSeconds: context.totalDurationSeconds || 0,
              },
              timestamp: Date.now(),
            });
          } else if (toState === "TERMINATED_SAFETY") {
            eventBus.publish(`stream:${context.streamId}`, {
              type: "SECURITY_ALERT" as any,
              payload: {
                streamId: context.streamId,
                creatorProfileId: context.creatorProfileId,
                reason: context.moderationReason || "Stream terminated by trust & safety",
              },
              timestamp: Date.now(),
            });
          }
        },
      ],
    });
  }

  /**
   * Authority Evaluator: is the stream active and accepting viewer connections?
   */
  public isBroadcasting(state: LivestreamLifecycleState): boolean {
    return state === "LIVE" || state === "PAUSED";
  }

  /**
   * Authority Evaluator: can viewers interact and send gifts/tips?
   */
  public allowsInteractions(state: LivestreamLifecycleState): boolean {
    return state === "LIVE";
  }
}

export const livestreamStateMachine = new LivestreamStateMachine();
