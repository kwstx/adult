/**
 * ============================================================================
 * RULE: STOLEN CARD & CARD TESTING DETECTION
 * ============================================================================
 * Detects card testing attacks (rapid decline bursts), payment instrument reuse
 * across multiple user accounts, BIN country vs IP geo mismatch, and high-denomination
 * spikes on brand new unverified accounts.
 */

import { RiskRule } from "./rule.interface";
import {
  RiskEvaluationContext,
  EvaluatedSignals,
  RuleTrigger,
  TriggerCodes,
} from "../types";

export class StolenCardPaymentRule implements RiskRule {
  readonly id = "RULE_STOLEN_CARD_PAYMENT";
  readonly name = "Stolen Card & Card Testing Detector";
  readonly description =
    "Detects card testing decline velocity, payment instrument sharing across accounts, and BIN geo anomalies.";
  readonly enabled = true;

  async evaluate(
    ctx: RiskEvaluationContext,
    signals: EvaluatedSignals
  ): Promise<RuleTrigger[]> {
    const triggers: RuleTrigger[] = [];

    // Only apply to payment and deposit actions
    if (ctx.actionType !== "CREDIT_PURCHASE" && ctx.actionType !== "SUBSCRIPTION") {
      return triggers;
    }

    // 1. Card Testing / Decline Velocity Burst
    const declines = signals.velocity?.cardDeclinesLast1h || 0;
    if (declines >= 2) {
      const score = declines >= 5 ? 75 : 40;
      triggers.push({
        code: TriggerCodes.PAYMENT_CARD_TESTING_BURST,
        name: "Card Testing / High Decline Velocity",
        scoreContribution: score,
        severity: declines >= 5 ? "CRITICAL" : "HIGH",
        reason: `${declines} payment declines recorded in the past hour. Characteristic of card testing bot attack.`,
        details: { declinesLast1h: declines },
      });
    }

    // 2. Card Sharing across Multiple User IDs
    const cardSharingCount = signals.cardSharingAccountsCount || 0;
    if (cardSharingCount >= 2) {
      const score = cardSharingCount >= 4 ? 85 : 45;
      triggers.push({
        code: TriggerCodes.PAYMENT_CARD_HASH_SHARED,
        name: "Payment Instrument Linked to Multiple Accounts",
        scoreContribution: score,
        severity: cardSharingCount >= 4 ? "CRITICAL" : "HIGH",
        reason: `Payment instrument token is linked to ${cardSharingCount} distinct user accounts.`,
        details: { cardSharingCount },
      });
    }

    // 3. Card Issuing Country vs IP Geolocation Mismatch on New Account
    const cardCountry = ctx.cardCountry?.toUpperCase();
    const ipCountry = signals.network?.countryCode?.toUpperCase();
    const isNew = signals.account?.isNewAccount ?? true;

    if (cardCountry && ipCountry && cardCountry !== ipCountry && isNew) {
      triggers.push({
        code: TriggerCodes.PAYMENT_GEO_MISMATCH,
        name: "Card Issuing Country vs IP Country Mismatch",
        scoreContribution: 25,
        severity: "MEDIUM",
        reason: `Card issued in ${cardCountry} but request originated from IP in ${ipCountry} on an unverified account.`,
        details: { cardCountry, ipCountry },
      });
    }

    // 4. First-Time Buyer High Denomination Spike
    const amountFiatCents = ctx.amountFiatCents || 0;
    const accountAgeHours = signals.account?.accountAgeHours ?? 0;
    const totalLifetimeDeposits = signals.account?.totalDepositsFiatCents ?? 0;

    if (totalLifetimeDeposits === 0 && accountAgeHours < 24) {
      if (amountFiatCents >= 25000) {
        // >= $250 on day 1
        triggers.push({
          code: TriggerCodes.PAYMENT_HIGH_DENOMINATION_FIRST_TIME,
          name: "High Denomination First Purchase",
          scoreContribution: 45,
          severity: "HIGH",
          reason: `Initial credit purchase of $${(amountFiatCents / 100).toFixed(2)} on brand new account (<24 hours).`,
          details: { amountFiatCents, accountAgeHours },
        });
      } else if (amountFiatCents >= 10000) {
        // >= $100 on day 1
        triggers.push({
          code: TriggerCodes.PAYMENT_HIGH_DENOMINATION_FIRST_TIME,
          name: "Elevated Denomination First Purchase",
          scoreContribution: 25,
          severity: "MEDIUM",
          reason: `Initial purchase of $${(amountFiatCents / 100).toFixed(2)} on account less than 24 hours old.`,
          details: { amountFiatCents, accountAgeHours },
        });
      }
    }

    // 5. Prepaid Card Risk
    if (ctx.isPrepaid) {
      triggers.push({
        code: TriggerCodes.PAYMENT_PREPAID_CARD_RISK,
        name: "Anonymous Prepaid Card",
        scoreContribution: 15,
        severity: "LOW",
        reason: "Transaction uses an untraceable prepaid/gift card instrument.",
      });
    }

    return triggers;
  }
}
