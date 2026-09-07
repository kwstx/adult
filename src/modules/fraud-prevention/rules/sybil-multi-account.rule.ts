/**
 * ============================================================================
 * RULE: SYBIL & MULTI-ACCOUNT DETECTION
 * ============================================================================
 * Identifies attempts to create dozens of accounts or abuse promotions
 * via shared device fingerprints, subnet clustering, disposable emails, and alias tricks.
 */

import { RiskRule } from "./rule.interface";
import {
  RiskEvaluationContext,
  EvaluatedSignals,
  RuleTrigger,
  TriggerCodes,
} from "../types";
import { AccountProfilerService } from "../signals/account-profiler.service";

export class SybilMultiAccountRule implements RiskRule {
  readonly id = "RULE_SYBIL_MULTI_ACCOUNT";
  readonly name = "Sybil & Multi-Account Clustering Detector";
  readonly description =
    "Detects automated bot account farming, shared physical device fingerprints across accounts, and disposable emails.";
  readonly enabled = true;

  async evaluate(
    ctx: RiskEvaluationContext,
    signals: EvaluatedSignals
  ): Promise<RuleTrigger[]> {
    const triggers: RuleTrigger[] = [];
    const email = ctx.email || signals.account?.email;
    const linkedCount = signals.linkedAccountsCount || 0;

    // 1. Device Fingerprint Overlap
    if (linkedCount >= 2) {
      let score = 25;
      let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";

      if (linkedCount >= 6) {
        score = 80;
        severity = "CRITICAL";
      } else if (linkedCount >= 4) {
        score = 50;
        severity = "HIGH";
      } else if (linkedCount >= 2) {
        score = 30;
        severity = "MEDIUM";
      }

      triggers.push({
        code: TriggerCodes.SYBIL_DEVICE_OVERLAP,
        name: "Device Fingerprint Multi-Account Overlap",
        scoreContribution: score,
        severity,
        reason: `Physical device fingerprint is linked to ${linkedCount} distinct user accounts.`,
        details: { linkedAccountsCount: linkedCount },
      });
    }

    // 2. Disposable Email Domains
    if (email && AccountProfilerService.isDisposableEmail(email)) {
      triggers.push({
        code: TriggerCodes.SYBIL_DISPOSABLE_EMAIL,
        name: "Disposable Email Provider",
        scoreContribution: 45,
        severity: "HIGH",
        reason: `Email address "${email}" is hosted by a known disposable/temporary inbox domain.`,
        details: { email },
      });
    }

    // 3. Plus-Aliased Email on Fresh Account Creation / Action
    if (email && email.includes("+") && (signals.account?.isNewAccount ?? true)) {
      triggers.push({
        code: TriggerCodes.SYBIL_PLUS_ALIASED_EMAIL,
        name: "Plus-Aliased Sub-Addressing",
        scoreContribution: 15,
        severity: "LOW",
        reason: "User account utilizes '+' sub-addressing alias tricks commonly used for batch account farms.",
        details: { email },
      });
    }

    // 4. IP Sign-up Velocity Burst
    const signupsFromIp = signals.velocity?.accountCreationsFromIpLast1h || 0;
    if (signupsFromIp >= 3) {
      const score = signupsFromIp >= 6 ? 60 : 35;
      triggers.push({
        code: TriggerCodes.SYBIL_ACCOUNT_CREATION_VELOCITY,
        name: "High Account Creation Velocity on IP",
        scoreContribution: score,
        severity: signupsFromIp >= 6 ? "HIGH" : "MEDIUM",
        reason: `${signupsFromIp} new accounts created from this IP address within the last hour.`,
        details: { signupsLast1h: signupsFromIp },
      });
    }

    // 5. Headless Browser / Automation signals
    if (signals.device?.isHeadless) {
      triggers.push({
        code: TriggerCodes.NETWORK_HEADLESS_BROWSER,
        name: "Headless Browser / Automation Client",
        scoreContribution: 40,
        severity: "HIGH",
        reason: "Request originates from an automated headless browser environment (Puppeteer/Playwright/Selenium).",
      });
    }

    return triggers;
  }
}
