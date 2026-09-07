/**
 * ============================================================================
 * PLUGGABLE RISK RULE INTERFACE
 * ============================================================================
 */

import { RiskEvaluationContext, EvaluatedSignals, RuleTrigger } from "../types";

export interface RiskRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly enabled: boolean;

  /**
   * Evaluates the context and collected signals, returning any triggered rule infractions.
   */
  evaluate(
    ctx: RiskEvaluationContext,
    signals: EvaluatedSignals
  ): Promise<RuleTrigger[]>;
}
