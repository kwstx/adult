/**
 * ============================================================================
 * FRAUD ENFORCEMENT & POLICY ACTION SERVICE
 * ============================================================================
 * Executes policy enforcement actions resulting from risk evaluations:
 * creates delayed fulfillment holds, generates Trust & Safety moderation cases,
 * freezes fraudulent wallets, and records immutable audit events.
 */

import prisma from "@/lib/db";
import {
  RiskAssessmentResult,
  RiskEvaluationContext,
  RiskAction,
} from "../types";

export class FraudEnforcementService {
  /**
   * Applies the policy enforcement outcome for an assessment.
   */
  static async enforce(
    assessment: RiskAssessmentResult,
    ctx: RiskEvaluationContext
  ): Promise<{
    enforced: boolean;
    action: RiskAction;
    holdId?: string;
    caseId?: string;
    message?: string;
  }> {
    const action = assessment.finalAction;
    const userId = ctx.userId;

    switch (action) {
      case "ALLOW":
        return { enforced: true, action: "ALLOW" };

      case "CHALLENGE_2FA":
      case "CHALLENGE_KYC":
        return {
          enforced: true,
          action,
          message:
            action === "CHALLENGE_2FA"
              ? "Additional 2-Factor Authentication required to complete this transaction."
              : "Identity / Age verification required to proceed with this high-risk transaction.",
        };

      case "DELAY_FULFILLMENT": {
        let holdId: string | undefined;
        const delaySeconds = assessment.delayFulfillmentSeconds || 24 * 3600; // Default 24 hours
        const releaseAt = new Date(Date.now() + delaySeconds * 1000);
        const amountCredits = ctx.amountCredits || 0;

        if (userId && amountCredits > 0) {
          const wallet = await prisma.wallet.findUnique({
            where: { userId },
          });

          if (wallet) {
            const hold = await prisma.walletHold.create({
              data: {
                walletId: wallet.id,
                userId,
                amountCredits,
                reason: `Delayed fulfillment due to risk score ${assessment.riskScore}/100. Primary triggers: ${assessment.triggers.map((t) => t.name).join(", ")}`,
                status: "HELD",
                riskAssessmentId: assessment.assessmentId,
                releaseAt,
              },
            });

            holdId = hold.id;

            // Increment wallet locked balance
            await prisma.wallet.update({
              where: { id: wallet.id },
              data: {
                lockedBalance: { increment: amountCredits },
              },
            });
          }
        }

        return {
          enforced: true,
          action: "DELAY_FULFILLMENT",
          holdId,
          message: `Fulfillment delayed for ${Math.round(delaySeconds / 3600)}h clearance window due to elevated risk.`,
        };
      }

      case "REQUIRE_MANUAL_REVIEW": {
        let caseId: string | undefined;

        if (userId) {
          const caseNumber = `FRD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

          const createdCase = await prisma.moderationCase.create({
            data: {
              caseNumber,
              reportedObjectType: "ACCOUNT",
              reportedObjectId: userId,
              reportedUserId: userId,
              reporterType: "SYSTEM",
              reasonCategory: "OTHER",
              reason: `Automated Fraud Alert: Risk Score ${assessment.riskScore}/100 [${assessment.actionType}]`,
              priority: assessment.riskScore >= 85 ? "URGENT" : "HIGH",
              status: "OPEN",
              evidence: JSON.stringify({
                assessmentId: assessment.assessmentId,
                riskScore: assessment.riskScore,
                triggers: assessment.triggers,
                context: ctx,
              }),
              automatedSignals: JSON.stringify(assessment.signals),
              internalNotes: `Triggered by Risk Engine: ${assessment.triggers.map((t) => t.name).join("; ")}`,
            },
          });

          caseId = createdCase.id;
        }

        return {
          enforced: true,
          action: "REQUIRE_MANUAL_REVIEW",
          caseId,
          message: "Transaction held for Trust & Safety analyst manual review.",
        };
      }

      case "BLOCK_TRANSACTION": {
        if (userId) {
          await prisma.auditEvent.create({
            data: {
              actorId: userId,
              actorType: "SYSTEM_AUTOMATION",
              action: "FRAUD_TRANSACTION_BLOCKED",
              targetEntityType: "Transaction",
              targetEntityId: assessment.assessmentId,
              reason: `Transaction blocked by Risk Engine. Risk score ${assessment.riskScore}/100.`,
              metadataJson: JSON.stringify({
                triggers: assessment.triggers,
                context: ctx,
              }),
            },
          });
        }

        return {
          enforced: true,
          action: "BLOCK_TRANSACTION",
          message: "Transaction blocked due to policy violations and risk score threshold.",
        };
      }

      case "FREEZE_ACCOUNT": {
        if (userId) {
          await prisma.$transaction([
            prisma.wallet.updateMany({
              where: { userId },
              data: { status: "LOCKED" },
            }),
            prisma.user.update({
              where: { id: userId },
              data: {
                moderationState: "SUSPENDED",
                isBanned: true,
                banReason: `Automated Fraud Lockout (Risk Score ${assessment.riskScore}/100): ${assessment.triggers.map((t) => t.name).join(", ")}`,
              },
            }),
            prisma.auditEvent.create({
              data: {
                actorId: userId,
                actorType: "SYSTEM_AUTOMATION",
                action: "ACCOUNT_FROZEN_FRAUD_PREVENTION",
                targetEntityType: "User",
                targetEntityId: userId,
                reason: `Account frozen. Critical risk score ${assessment.riskScore}/100.`,
                metadataJson: JSON.stringify({
                  assessmentId: assessment.assessmentId,
                  triggers: assessment.triggers,
                }),
              },
            }),
          ]);
        }

        return {
          enforced: true,
          action: "FREEZE_ACCOUNT",
          message: "Account and wallet locked due to critical fraud detection signals.",
        };
      }
    }
  }

  /**
   * Releases a held transaction / wallet hold following manual analyst approval.
   */
  static async releaseHold(
    holdId: string,
    analystId: string,
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    const hold = await prisma.walletHold.findUnique({
      where: { id: holdId },
      include: { wallet: true },
    });

    if (!hold) {
      throw new Error(`Wallet hold record ${holdId} not found.`);
    }

    if (hold.status !== "HELD") {
      throw new Error(`Wallet hold ${holdId} is already ${hold.status}.`);
    }

    await prisma.$transaction([
      prisma.walletHold.update({
        where: { id: holdId },
        data: {
          status: "RELEASED",
          releasedAt: new Date(),
          releaseNotes: `Approved by analyst ${analystId}: ${notes || "No notes"}`,
        },
      }),
      prisma.wallet.update({
        where: { id: hold.walletId },
        data: {
          lockedBalance: { decrement: hold.amountCredits },
        },
      }),
      prisma.auditEvent.create({
        data: {
          actorId: analystId,
          actorType: "MODERATOR",
          action: "WALLET_HOLD_RELEASED",
          targetEntityType: "WalletHold",
          targetEntityId: holdId,
          reason: notes || "Analyst manual approval",
        },
      }),
    ]);

    return { success: true, message: `Wallet hold ${holdId} successfully released.` };
  }

  /**
   * Seizes credits associated with a confirmed fraudulent transaction or chargeback.
   */
  static async seizeHold(
    holdId: string,
    analystId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    const hold = await prisma.walletHold.findUnique({
      where: { id: holdId },
      include: { wallet: true },
    });

    if (!hold) {
      throw new Error(`Wallet hold record ${holdId} not found.`);
    }

    if (hold.status !== "HELD") {
      throw new Error(`Wallet hold ${holdId} is already ${hold.status}.`);
    }

    await prisma.$transaction([
      prisma.walletHold.update({
        where: { id: holdId },
        data: {
          status: "SEIZED_CHARGEBACK",
          releasedAt: new Date(),
          releaseNotes: `Seized by analyst ${analystId}: ${reason}`,
        },
      }),
      prisma.wallet.update({
        where: { id: hold.walletId },
        data: {
          balance: { decrement: hold.amountCredits },
          lockedBalance: { decrement: hold.amountCredits },
        },
      }),
      prisma.auditEvent.create({
        data: {
          actorId: analystId,
          actorType: "MODERATOR",
          action: "WALLET_HOLD_SEIZED_FRAUD",
          targetEntityType: "WalletHold",
          targetEntityId: holdId,
          reason,
        },
      }),
    ]);

    return { success: true, message: `Wallet hold ${holdId} seized and credits deducted.` };
  }
}
