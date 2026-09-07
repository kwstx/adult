/**
 * ============================================================================
 * AUTHORITATIVE FRAUD PREVENTION & RISK ENGINE
 * ============================================================================
 * Central orchestrator for real-time risk assessment, signal aggregation,
 * multi-layer heuristic rule evaluation, 0-100 risk scoring, and policy action enforcement.
 */

import prisma from "@/lib/db";
import {
  RiskEvaluationContext,
  RiskAssessmentResult,
  RiskLevel,
  RiskAction,
  EvaluatedSignals,
  RuleTrigger,
} from "./types";
import { RiskRule } from "./rules/rule.interface";
import { SybilMultiAccountRule } from "./rules/sybil-multi-account.rule";
import { StolenCardPaymentRule } from "./rules/stolen-card-payment.rule";
import { VelocitySpendDrainRule } from "./rules/velocity-spend-drain.rule";
import { ChargebackRefundRule } from "./rules/chargeback-refund.rule";
import { AccountTakeoverRule } from "./rules/account-takeover.rule";
import { SpamEngagementRule } from "./rules/spam-engagement.rule";
import { ReferralManipulationRule } from "./rules/referral-manipulation.rule";
import { VelocityTracker } from "./signals/velocity-tracker";
import { DeviceFingerprintService } from "./signals/device-fingerprint.service";
import { NetworkSignalService } from "./signals/network-signal.service";
import { AccountProfilerService } from "./signals/account-profiler.service";
import { FraudEnforcementService } from "./enforcement/fraud-enforcement.service";

export interface RiskEngineOptions {
  autoEnforce?: boolean;
}

export class RiskEngine {
  private static instance: RiskEngine;
  private rules: RiskRule[] = [];

  constructor() {
    this.registerDefaultRules();
  }

  static getInstance(): RiskEngine {
    if (!this.instance) {
      this.instance = new RiskEngine();
    }
    return this.instance;
  }

  /**
   * Registers default production heuristic rules.
   */
  private registerDefaultRules(): void {
    this.rules = [
      new SybilMultiAccountRule(),
      new StolenCardPaymentRule(),
      new VelocitySpendDrainRule(),
      new ChargebackRefundRule(),
      new AccountTakeoverRule(),
      new SpamEngagementRule(),
      new ReferralManipulationRule(),
    ];
  }

  /**
   * Evaluates the risk of an incoming action or financial transaction.
   */
  static async evaluate(
    ctx: RiskEvaluationContext,
    options: RiskEngineOptions = { autoEnforce: true }
  ): Promise<RiskAssessmentResult> {
    return this.getInstance().evaluateRisk(ctx, options);
  }

  async evaluateRisk(
    ctx: RiskEvaluationContext,
    options: RiskEngineOptions = { autoEnforce: true }
  ): Promise<RiskAssessmentResult> {
    const startTime = Date.now();
    const clientIp = ctx.ipAddress || "127.0.0.1";

    // 1. Parallel Signal Aggregation
    const [accountProfile, velocitySnapshot, deviceAnalysis, cardAnalysis] =
      await Promise.all([
        AccountProfilerService.getAccountProfile(ctx.userId),
        VelocityTracker.getVelocitySnapshot(ctx.userId, clientIp),
        ctx.deviceFingerprint
          ? DeviceFingerprintService.analyzeAndRecordDevice(
              ctx.userId,
              ctx.deviceFingerprint
            )
          : null,
        ctx.cardHash && ctx.userId
          ? AccountProfilerService.recordCardFingerprint(
              ctx.cardHash,
              ctx.userId,
              ctx.cardBin,
              ctx.cardLast4,
              ctx.cardCountry,
              ctx.isPrepaid
            )
          : null,
      ]);

    const networkSignals = NetworkSignalService.analyzeNetwork(
      clientIp,
      ctx.geoLocation
    );

    const signals: EvaluatedSignals = {
      account: accountProfile || undefined,
      velocity: velocitySnapshot,
      network: networkSignals,
      device: ctx.deviceFingerprint,
      linkedAccountsCount: deviceAnalysis?.linkedUserCount || 0,
      cardSharingAccountsCount: cardAnalysis?.cardSharingCount || 0,
    };

    // 2. Parallel Rule Execution
    const activeRules = this.rules.filter((r) => r.enabled);
    const ruleOutputs = await Promise.all(
      activeRules.map((rule) =>
        rule.evaluate(ctx, signals).catch((err) => {
          console.error(`[RiskEngine] Rule ${rule.id} execution failed:`, err);
          return [] as RuleTrigger[];
        })
      )
    );

    const triggers: RuleTrigger[] = ruleOutputs.flat();

    // 3. Composite Risk Score Calculation (0 - 100)
    let rawScore = 0;
    for (const t of triggers) {
      rawScore += t.scoreContribution;
    }

    // Account maturity mitigation discount (trusted accounts with >$500 spend receive up to 15 points discount)
    if (
      signals.account &&
      !signals.account.isNewAccount &&
      signals.account.totalCreditsSpent > 5000 &&
      signals.account.historicalChargebackCount === 0
    ) {
      rawScore = Math.max(0, rawScore - 15);
    }

    const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    // 4. Determine Risk Level & Action Thresholds
    let riskLevel: RiskLevel = "LOW";
    let recommendedAction: RiskAction = "ALLOW";
    let delaySeconds: number | undefined;
    let requiresManualReview = false;

    if (finalScore >= 90) {
      riskLevel = "CRITICAL";
      recommendedAction = "FREEZE_ACCOUNT";
    } else if (finalScore >= 80) {
      riskLevel = "CRITICAL";
      recommendedAction = "BLOCK_TRANSACTION";
    } else if (finalScore >= 70) {
      riskLevel = "HIGH";
      recommendedAction = "REQUIRE_MANUAL_REVIEW";
      requiresManualReview = true;
    } else if (finalScore >= 50) {
      riskLevel = "HIGH";
      recommendedAction = "DELAY_FULFILLMENT";
      delaySeconds = 24 * 3600; // 24-hour clearance hold
    } else if (finalScore >= 30) {
      riskLevel = "MEDIUM";
      recommendedAction =
        ctx.actionType === "CREDIT_PURCHASE" ? "CHALLENGE_KYC" : "CHALLENGE_2FA";
    } else {
      riskLevel = "LOW";
      recommendedAction = "ALLOW";
    }

    const executionTimeMs = Date.now() - startTime;
    const assessmentId = `risk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const assessmentResult: RiskAssessmentResult = {
      assessmentId,
      userId: ctx.userId,
      actionType: ctx.actionType,
      riskScore: finalScore,
      riskLevel,
      recommendedAction,
      finalAction: recommendedAction,
      triggers,
      delayFulfillmentSeconds: delaySeconds,
      requiresManualReview,
      signals,
      executionTimeMs,
      timestamp: new Date().toISOString(),
    };

    // 5. Persist Risk Assessment Record
    try {
      await prisma.riskAssessmentRecord.create({
        data: {
          id: assessmentId,
          userId: ctx.userId || null,
          actionType: ctx.actionType,
          riskScore: finalScore,
          riskLevel,
          recommendedAction,
          finalAction: recommendedAction,
          ruleTriggersJson: JSON.stringify(triggers),
          signalsJson: JSON.stringify(signals),
          contextJson: JSON.stringify({
            amountCredits: ctx.amountCredits,
            amountFiatCents: ctx.amountFiatCents,
            paymentMethod: ctx.paymentMethod,
            cardCountry: ctx.cardCountry,
          }),
          ipAddress: clientIp,
          userAgent: ctx.userAgent || null,
          deviceFingerprintHash: ctx.deviceFingerprint?.fingerprintHash || null,
          executionTimeMs,
        },
      });
    } catch (e) {
      console.warn("[RiskEngine] Failed to persist risk assessment record:", e);
    }

    // 6. Automatic Enforcement Dispatch
    if (options.autoEnforce) {
      await FraudEnforcementService.enforce(assessmentResult, ctx).catch(
        (err) => {
          console.error("[RiskEngine] Auto-enforcement error:", err);
        }
      );
    }

    return assessmentResult;
  }
}
