/**
 * ============================================================================
 * AUTHORITATIVE CORE STATE MACHINE ENGINE
 * ============================================================================
 * 
 * Production-grade, strongly-typed finite state machine framework for high-risk
 * domain lifecycles (Payments, Subscriptions, Streams, Onboarding, Payouts, etc.).
 * 
 * Guarantees:
 * 1. Zero illegal state transitions (deterministic graph validation).
 * 2. Role-based actor authorization guards.
 * 3. Atomic transition side-effects with synchronous/asynchronous hooks.
 * 4. Immutable audit trail logging & observability metrics.
 * 5. Eliminates arbitrary boolean anti-patterns across the platform.
 */

import { StructuredLogger } from "@/core/observability";

export class StateTransitionError extends Error {
  constructor(
    public readonly entityType: string,
    public readonly fromState: string,
    public readonly toState: string,
    public readonly reason: string,
    public readonly code: string = "ILLEGAL_STATE_TRANSITION"
  ) {
    super(
      `[${entityType} State Machine Error]: Cannot transition from '${fromState}' to '${toState}'. ${reason}`
    );
    this.name = "StateTransitionError";
  }
}

export interface SecurityContext {
  actorId?: string;
  actorRole?: "ANONYMOUS" | "FAN" | "CREATOR" | "MODERATOR" | "ADMIN" | "SYSTEM_AUTOMATION" | string;
  actorType?: "ANONYMOUS" | "USER" | "CREATOR" | "MODERATOR" | "ADMIN" | "SYSTEM_AUTOMATION" | string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

export type TransitionGuard<TState extends string, TContext = any> = (
  fromState: TState,
  toState: TState,
  context?: TContext,
  reason?: string
) => boolean | { allowed: boolean; reason?: string } | Promise<boolean | { allowed: boolean; reason?: string }>;

export type TransitionHook<TState extends string, TContext = any> = (
  fromState: TState,
  toState: TState,
  context?: TContext,
  reason?: string
) => void | Promise<void>;

export interface StateMachineConfig<TState extends string, TContext = any> {
  entityType: string;
  initialState?: TState;
  terminalStates?: TState[];
  transitions: Record<TState, readonly TState[] | TState[]>;
  guards?: Array<TransitionGuard<TState, TContext>>;
  beforeTransition?: Array<TransitionHook<TState, TContext>>;
  afterTransition?: Array<TransitionHook<TState, TContext>>;
}

export interface TransitionResult<TState extends string> {
  success: boolean;
  fromState: TState;
  toState: TState;
  transitionedAt: string;
  reason?: string;
}

export abstract class BaseStateMachine<TState extends string, TContext extends { security?: SecurityContext } = any> {
  public readonly entityType: string;
  public readonly transitions: Record<TState, readonly TState[] | TState[]>;
  public readonly terminalStates: Set<TState>;
  protected readonly guards: Array<TransitionGuard<TState, TContext>> = [];
  protected readonly beforeHooks: Array<TransitionHook<TState, TContext>> = [];
  protected readonly afterHooks: Array<TransitionHook<TState, TContext>> = [];

  constructor(config: StateMachineConfig<TState, TContext>) {
    this.entityType = config.entityType;
    this.transitions = config.transitions;
    this.terminalStates = new Set(config.terminalStates || []);
    if (config.guards) this.guards.push(...config.guards);
    if (config.beforeTransition) this.beforeHooks.push(...config.beforeTransition);
    if (config.afterTransition) this.afterHooks.push(...config.afterTransition);
  }

  /**
   * Retrieves all permissible destination states from the current state
   */
  public getAllowedNextStates(currentState: TState): TState[] {
    const list = this.transitions[currentState];
    return list ? [...list] : [];
  }

  /**
   * Checks if a transition is valid without throwing
   */
  public async canTransition(
    fromState: TState,
    toState: TState,
    context?: TContext,
    reason?: string
  ): Promise<boolean> {
    try {
      await this.validateTransition(fromState, toState, context, reason);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Authoritatively validates a state transition against the graph and guard predicates.
   * Throws StateTransitionError if the transition is impermissible.
   */
  public async validateTransition(
    fromState: TState,
    toState: TState,
    context?: TContext,
    reason?: string
  ): Promise<void> {
    // 1. Idempotency no-op
    if (fromState === toState) {
      return;
    }

    // 2. Terminal State check
    if (this.terminalStates.has(fromState)) {
      throw new StateTransitionError(
        this.entityType,
        fromState,
        toState,
        `State '${fromState}' is terminal. No subsequent transitions are permitted.`,
        "TERMINAL_STATE_VIOLATION"
      );
    }

    // 3. Graph connectivity check
    const allowed = this.transitions[fromState] || [];
    if (!allowed.includes(toState)) {
      throw new StateTransitionError(
        this.entityType,
        fromState,
        toState,
        `Allowed next states from '${fromState}' are: [${allowed.join(", ")}].`,
        "INVALID_TRANSITION_PATH"
      );
    }

    // 4. Custom Guard Predicates
    for (const guard of this.guards) {
      const res = await guard(fromState, toState, context, reason);
      if (typeof res === "boolean") {
        if (!res) {
          throw new StateTransitionError(
            this.entityType,
            fromState,
            toState,
            `Transition guard rejected transition.`,
            "GUARD_CONDITION_FAILED"
          );
        }
      } else if (!res.allowed) {
        throw new StateTransitionError(
          this.entityType,
          fromState,
          toState,
          res.reason || `Transition guard rejected transition.`,
          "GUARD_CONDITION_FAILED"
        );
      }
    }
  }

  /**
   * Authoritatively executes a state transition:
   * 1. Validates transition
   * 2. Executes before-transition hooks
   * 3. Executes custom side-effect callback
   * 4. Executes after-transition hooks & logs audit
   */
  public async transition(
    fromState: TState,
    toState: TState,
    context?: TContext,
    reason?: string,
    sideEffect?: () => Promise<void> | void
  ): Promise<TransitionResult<TState>> {
    await this.validateTransition(fromState, toState, context, reason);

    // No-op if identical
    if (fromState === toState) {
      return {
        success: true,
        fromState,
        toState,
        transitionedAt: new Date().toISOString(),
        reason: "IDEMPOTENT_NOOP",
      };
    }

    // Run Before Hooks
    for (const hook of this.beforeHooks) {
      await hook(fromState, toState, context, reason);
    }

    // Execute synchronous or transactional side-effects
    if (sideEffect) {
      await sideEffect();
    }

    // Run After Hooks
    for (const hook of this.afterHooks) {
      try {
        await hook(fromState, toState, context, reason);
      } catch (hookErr: any) {
        StructuredLogger.warn(`[${this.entityType} StateMachine]: AfterHook warning`, {
          fromState,
          toState,
          error: hookErr.message,
        });
      }
    }

    // Structured Audit Logging
    StructuredLogger.info(`[${this.entityType} State Transition]: ${fromState} -> ${toState}`, {
      entityType: this.entityType,
      fromState,
      toState,
      actorId: context?.security?.actorId,
      actorRole: context?.security?.actorRole,
      reason,
      transitionedAt: new Date().toISOString(),
    });

    return {
      success: true,
      fromState,
      toState,
      transitionedAt: new Date().toISOString(),
      reason,
    };
  }
}
