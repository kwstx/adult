/**
 * ============================================================================
 * RULE: ACCOUNT TAKEOVER (ATO) & ANOMALY DETECTION
 * ============================================================================
 * Identifies unauthorized access via credential stuffing, impossible travel
 * anomalies (Haversine velocity jumps), and suspicious credential changes.
 */

import { RiskRule } from "./rule.interface";
import {
  RiskEvaluationContext,
  EvaluatedSignals,
  RuleTrigger,
  TriggerCodes,
} from "../types";

export class AccountTakeoverRule implements RiskRule {
  readonly id = "RULE_ACCOUNT_TAKEOVER";
  readonly name = "Account Takeover (ATO) & Anomaly Detector";
  readonly description =
    "Detects impossible travel velocity anomalies, credential stuffing bursts, and Tor/anonymizing proxies.";
  readonly enabled = true;

  async evaluate(
    ctx: RiskEvaluationContext,
    signals: EvaluatedSignals
  ): Promise<RuleTrigger[]> {
    const triggers: RuleTrigger[] = [];

    // 1. Impossible Travel Velocity Check (>850 km/h)
    if (signals.network?.impossibleTravelDetected) {
      const speed = signals.network.calculatedSpeedKmh || 0;
      triggers.push({
        code: TriggerCodes.ATO_IMPOSSIBLE_TRAVEL,
        name: "Impossible Travel Velocity Anomaly",
        scoreContribution: 60,
        severity: "CRITICAL",
        reason: `Geographic location changed at an impossible velocity of ~${speed} km/h between sequential events.`,
        details: {
          speedKmh: speed,
          prevGeo: signals.network.previousGeo,
          currGeo: signals.network.currentGeo,
        },
      });
    }

    // 2. Credential Stuffing & Failed Login Velocity Burst
    const failedLogins = signals.velocity?.failedLoginsLast15m || 0;
    if (failedLogins >= 3) {
      const score = failedLogins >= 6 ? 60 : 40;
      triggers.push({
        code: TriggerCodes.ATO_CREDENTIAL_STUFFING_BURST,
        name: "Credential Stuffing / High Failed Login Velocity",
        scoreContribution: score,
        severity: failedLogins >= 6 ? "CRITICAL" : "HIGH",
        reason: `${failedLogins} failed authentication attempts recorded in the past 15 minutes before this action.`,
        details: { failedLoginsLast15m: failedLogins },
      });
    }

    // 3. Tor Exit Node or Datacenter Proxy during Financial Operations
    const isSensitive =
      ctx.actionType === "CREDIT_PURCHASE" ||
      ctx.actionType === "PAYOUT" ||
      ctx.actionType === "ACCOUNT_UPDATE";

    if (isSensitive && signals.network?.isTorExitNode) {
      triggers.push({
        code: TriggerCodes.NETWORK_TOR_EXIT_NODE,
        name: "Tor Exit Node on Financial Transaction",
        scoreContribution: 50,
        severity: "HIGH",
        reason: "Financial action was executed via a known Tor anonymizing exit node.",
        details: { ip: signals.network.ip },
      });
    } else if (isSensitive && signals.network?.isDatacenter) {
      triggers.push({
        code: TriggerCodes.NETWORK_DATACENTER_PROXY,
        name: "Datacenter Hosting IP on Financial Transaction",
        scoreContribution: 25,
        severity: "MEDIUM",
        reason: "Financial request routed through a commercial cloud hosting/datacenter IP rather than residential ISP.",
        details: { ip: signals.network.ip },
      });
    }

    return triggers;
  }
}
