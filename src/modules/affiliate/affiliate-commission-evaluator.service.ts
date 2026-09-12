/**
 * ============================================================================
 * RECURRING REVENUE SHARE & COMMISSION EVALUATOR SERVICE
 * ============================================================================
 * Evaluates fan deposits, subscription renewals, PPV unlocks, and tips to award
 * referring creators recurring affiliate commissions with double-entry ledger atomicity.
 */

import prisma from "@/lib/db";
import {
  EvaluateCommissionInput,
  CommissionEvaluationResult,
} from "./types";
import { ReferralAttributionService } from "./referral-attribution.service";
import { ReferralFraudGuard } from "./referral-fraud-guard.service";
import { eventBus } from "@/modules/realtime/event-bus";

export class AffiliateCommissionEvaluator {
  /**
   * Calculates the commission credits for a given gross credit amount and rate.
   * Uses floor integer arithmetic to guarantee zero fractional credit loss.
   */
  static calculateCommissionCredits(
    grossAmountCredits: number,
    commissionRatePercent: number
  ): number {
    if (grossAmountCredits <= 0 || commissionRatePercent <= 0) return 0;
    return Math.floor(grossAmountCredits * (commissionRatePercent / 100.0));
  }

  /**
   * Evaluates an eligible fan spend or deposit transaction for affiliate commission.
   */
  static async evaluateAndAwardCommission(
    input: EvaluateCommissionInput,
    externalTx?: any
  ): Promise<CommissionEvaluationResult> {
    const {
      referredUserId,
      sourceType,
      grossAmountCredits,
      sourceTransactionId,
      paymentMethodFingerprint,
      notes,
    } = input;

    if (grossAmountCredits <= 0) {
      return {
        isCommissionAwarded: false,
        grossAmountCredits,
        commissionRatePercent: 0,
        commissionCredits: 0,
        status: "REVOKED",
        reason: "Zero or negative transaction amount.",
      };
    }

    // 1. Payment Instrument Collision Check if fingerprint provided
    if (paymentMethodFingerprint) {
      const isCollision = await ReferralFraudGuard.evaluatePaymentInstrumentCollision(
        paymentMethodFingerprint,
        referredUserId
      );
      if (isCollision) {
        return {
          isCommissionAwarded: false,
          grossAmountCredits,
          commissionRatePercent: 0,
          commissionCredits: 0,
          status: "REVOKED",
          reason: "Revoked: Shared payment instrument between referrer and referee.",
        };
      }
    }

    // 2. Lookup active attribution
    const attribution = await ReferralAttributionService.getActiveAttribution(
      referredUserId,
      externalTx
    );

    if (!attribution) {
      return {
        isCommissionAwarded: false,
        grossAmountCredits,
        commissionRatePercent: 0,
        commissionCredits: 0,
        status: "REVOKED",
        reason: "No active attribution window for referred user.",
      };
    }

    const commissionCredits = this.calculateCommissionCredits(
      grossAmountCredits,
      attribution.commissionRatePercent
    );

    if (commissionCredits <= 0) {
      return {
        isCommissionAwarded: false,
        referralAttributionId: attribution.id,
        referringCreatorProfileId: attribution.referringCreatorProfileId,
        grossAmountCredits,
        commissionRatePercent: attribution.commissionRatePercent,
        commissionCredits: 0,
        status: "REVOKED",
        reason: "Calculated commission resulted in 0 credits.",
      };
    }

    const executeCommissionWrite = async (tx: any) => {
      // a. Create AffiliateCommissionLedger entry
      const ledgerEntry = await tx.affiliateCommissionLedger.create({
        data: {
          referralAttributionId: attribution.id,
          referringCreatorProfileId: attribution.referringCreatorProfileId,
          referredUserId,
          sourceType,
          sourceTransactionId: sourceTransactionId || null,
          grossAmountCredits,
          commissionRatePercent: attribution.commissionRatePercent,
          commissionCredits,
          status: "CLEARED",
          notes: notes || `Affiliate commission for ${sourceType}`,
        },
      });

      // b. Record CreatorEarning entry
      const creatorEarning = await tx.creatorEarning.create({
        data: {
          creatorProfileId: attribution.referringCreatorProfileId,
          amountCredits: commissionCredits,
          sourceType: "PLATFORM_BONUS",
          sourceRefId: ledgerEntry.id,
          clearanceStatus: "CLEARED",
          clearedAt: new Date(),
          platformFeeCredits: 0,
        },
      });

      // Link creatorEarningId to ledgerEntry
      await tx.affiliateCommissionLedger.update({
        where: { id: ledgerEntry.id },
        data: { creatorEarningId: creatorEarning.id },
      });

      // c. Credit creator wallet
      const creatorUserId = attribution.referringCreatorProfile.userId;
      const wallet = await tx.wallet.findUnique({
        where: { userId: creatorUserId },
      });

      if (wallet) {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: commissionCredits },
            purchasedBalance: { increment: commissionCredits },
            version: { increment: 1 },
          },
        });

        // Record wallet transaction
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "BONUS_GRANT",
            amountCredits: commissionCredits,
            direction: "CREDIT",
            status: "COMPLETED",
            balanceAfter: wallet.balance + commissionCredits,
            sourceRefId: creatorEarning.id,
            description: `Affiliate Referral Commission (${attribution.commissionRatePercent}%)`,
          },
        });
      }

      // d. Increment attribution cumulative totals
      await tx.referralAttribution.update({
        where: { id: attribution.id },
        data: {
          totalCommissionEarnedCredits: { increment: commissionCredits },
          totalReferredSpendCredits: { increment: grossAmountCredits },
        },
      });

      // e. Increment referral code totals if linked
      if (attribution.referralCodeId) {
        await tx.creatorReferralCode.update({
          where: { id: attribution.referralCodeId },
          data: {
            totalEarningsCredits: { increment: BigInt(commissionCredits) },
          },
        });
      }

      return { ledgerEntry, creatorEarning };
    };

    let result;
    if (externalTx) {
      result = await executeCommissionWrite(externalTx);
    } else {
      result = await prisma.$transaction(async (tx) => {
        return await executeCommissionWrite(tx);
      });
    }

    // Emit Realtime Event
    try {
      eventBus.publish(`creator:${attribution.referringCreatorProfileId}`, {
        type: "AFFILIATE_COMMISSION_EARNED" as any,
        payload: {
          creatorProfileId: attribution.referringCreatorProfileId,
          referredUserId,
          commissionCredits,
          grossAmountCredits,
          sourceType,
        },
      });
    } catch {
      // Non-blocking
    }

    return {
      isCommissionAwarded: true,
      referralAttributionId: attribution.id,
      referringCreatorProfileId: attribution.referringCreatorProfileId,
      grossAmountCredits,
      commissionRatePercent: attribution.commissionRatePercent,
      commissionCredits,
      commissionLedgerId: result.ledgerEntry.id,
      creatorEarningId: result.creatorEarning.id,
      status: "CLEARED",
    };
  }
}
