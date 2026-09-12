// ============================================================================
// AUTHORITATIVE CO-STREAM SPLIT LEDGER SERVICE
// Real-Time Multi-Creator Revenue Splitting, Atomic Settlement & Ledger Accounting
// ============================================================================

import prisma from "@/lib/db";
import { ApiError } from "@/lib/api-handler";
import { eventBus } from "@/modules/realtime/event-bus";
import { CreditLotService } from "./credit-lot.service";
import { WalletLedgerService, InsufficientFundsError, WalletSuspendedError } from "./wallet-ledger.service";
import { CreatorPermissionsGuard } from "@/modules/creator-verification/creator-permissions.guard";

export interface ProcessCoStreamSplitTipInput {
  fanUserId: string;
  coStreamSessionId: string;
  grossCredits: number;
  customMessage?: string;
  interactionDefinitionId?: string;
  idempotencyKey?: string;
}

export interface CreatorSplitShare {
  creatorProfileId: string;
  creatorUserId: string;
  displayName: string;
  role: string;
  splitPercentage: number;
  creditsEarned: number;
  fiatEstimatedEur: number;
  creatorEarningId: string;
}

export interface CoStreamSplitResult {
  success: boolean;
  parentTransactionId: string;
  idempotencyKey: string;
  coStreamSessionId: string;
  grossCredits: number;
  platformRakeCredits: number;
  netCreatorPoolCredits: number;
  creatorShares: CreatorSplitShare[];
  fanRemainingBalance: number;
  timestamp: string;
}

export class SplitLedgerService {
  /**
   * Authoritative Atomic Co-Stream Split Settlement
   */
  public static async processCoStreamTip(
    input: ProcessCoStreamSplitTipInput
  ): Promise<CoStreamSplitResult> {
    const {
      fanUserId,
      coStreamSessionId,
      grossCredits,
      customMessage,
      interactionDefinitionId,
      idempotencyKey = `costream_tip_${fanUserId}_${coStreamSessionId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    } = input;

    if (grossCredits <= 0) {
      throw new ApiError(400, "Tip credits must be greater than zero.", "INVALID_CREDIT_AMOUNT");
    }

    // 1. Fetch Authoritative Co-Stream Session
    const session = await prisma.coStreamSession.findUnique({
      where: { id: coStreamSessionId },
      include: {
        primaryHost: { include: { user: true } },
        participants: {
          where: { status: { in: ["ACCEPTED", "CONNECTED"] } },
          include: {
            creatorProfile: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new ApiError(404, "Co-Stream session not found.", "SESSION_NOT_FOUND");
    }

    if (session.status !== "LIVE") {
      throw new ApiError(400, `Cannot tip on co-stream session in "${session.status}" state. Broadcast must be LIVE.`, "SESSION_NOT_LIVE");
    }

    if (session.participants.length === 0) {
      throw new ApiError(400, "No active participants found in this co-stream session.", "NO_ACTIVE_CO_HOSTS");
    }

    // 2. Monetization verification guards for all participating creators
    for (const p of session.participants) {
      await CreatorPermissionsGuard.assertCanReceiveEarnings(p.creatorProfileId, "LIVE_TIP");
    }

    // 3. Financial calculations
    const rakePercent = Number(session.platformRakePercentage) || 0.20; // 20% default rake
    const platformRakeCredits = Math.floor(grossCredits * rakePercent);
    const netCreatorPoolCredits = grossCredits - platformRakeCredits;

    // Calculate individual creator cuts
    let allocatedTotal = 0;
    const computedShares: Array<{
      participant: typeof session.participants[0];
      splitPercentage: number;
      creditsEarned: number;
    }> = [];

    session.participants.forEach((p: any, index: number) => {
      const pct = Number(p.splitPercentage);
      let share = Math.floor(netCreatorPoolCredits * pct);
      if (index === session.participants.length - 1) {
        // Handle potential integer rounding dust to ensure exact allocation
        share = netCreatorPoolCredits - allocatedTotal;
      }
      allocatedTotal += share;
      computedShares.push({
        participant: p,
        splitPercentage: pct,
        creditsEarned: share,
      });
    });

    // 4. Atomic PostgreSQL Transaction
    const result = await prisma.$transaction(async (tx: any): Promise<CoStreamSplitResult> => {
      // 4a. Check Idempotency
      const existingTx = await tx.walletTransaction.findUnique({
        where: { idempotencyKey },
      });

      if (existingTx) {
        const fanWallet = await tx.wallet.findUnique({ where: { userId: fanUserId } });
        return {
          success: true,
          parentTransactionId: existingTx.id,
          idempotencyKey: existingTx.idempotencyKey,
          coStreamSessionId,
          grossCredits: existingTx.amountCredits,
          platformRakeCredits: existingTx.platformFeeCredits,
          creatorNetCredits: existingTx.creatorNetCredits,
          netCreatorPoolCredits: existingTx.creatorNetCredits,
          creatorShares: [],
          fanRemainingBalance: fanWallet?.balance || 0,
          timestamp: existingTx.createdAt.toISOString(),
        } as any;
      }

      // 4b. Validate Fan Wallet
      const fanWallet = await tx.wallet.findUnique({ where: { userId: fanUserId } });
      WalletLedgerService.validateWalletUsability(fanWallet, grossCredits);

      const fanBalanceBefore = fanWallet.balance;
      const fanBalanceAfter = fanBalanceBefore - grossCredits;

      // 4c. Debit Fan Wallet atomically
      const updatedFanWallet = await tx.wallet.update({
        where: { id: fanWallet.id },
        data: {
          balance: { decrement: grossCredits },
          lifetimeSpentCredits: { increment: BigInt(grossCredits) },
          version: { increment: 1 },
        },
      });

      // 4d. Write Parent WalletTransaction (Fan to Platform Co-Stream Pool)
      const parentTx = await tx.walletTransaction.create({
        data: {
          sourceWalletId: fanWallet.id,
          destinationWalletId: null, // Multi-destination co-stream pool
          transactionType: "LIVE_TIP",
          direction: "TRANSFER",
          amountCredits: grossCredits,
          platformFeeCredits: platformRakeCredits,
          creatorNetCredits: netCreatorPoolCredits,
          sourceBalanceBefore: fanBalanceBefore,
          sourceBalanceAfter: fanBalanceAfter,
          destBalanceBefore: null,
          destBalanceAfter: null,
          idempotencyKey,
          referenceType: "CO_STREAM_SESSION",
          referenceId: session.id,
          status: "COMPLETED",
          note: customMessage
            ? `Co-Stream Tip: ${customMessage}`
            : `Co-Stream Tip to ${session.title}`,
          metadataJson: JSON.stringify({
            coStreamSessionId: session.id,
            livestreamId: session.livestreamId,
            interactionDefinitionId,
            fanUserId,
            participantsCount: session.participants.length,
            platformRakePercent: rakePercent * 100,
          }),
        },
      });

      // 4e. Drawdown Fan Credit Lots (FEFO)
      await CreditLotService.drawdownCredits(fanWallet.id, grossCredits, parentTx.id, tx);

      // 4f. Distribute Net Creator Pool Atomically to Each Co-Host
      const finalShares: CreatorSplitShare[] = [];

      for (const shareItem of computedShares) {
        const { participant, splitPercentage, creditsEarned } = shareItem;
        const creatorProfile = participant.creatorProfile;

        const creatorWallet = await WalletLedgerService.getOrCreateWallet(creatorProfile.userId, tx);
        if (creatorWallet.status !== "ACTIVE") {
          throw new WalletSuspendedError(creatorWallet.id, creatorWallet.status);
        }

        const creatorBalBefore = creatorWallet.balance;
        const creatorBalAfter = creatorBalBefore + creditsEarned;

        // Credit Co-Host Wallet
        await tx.wallet.update({
          where: { id: creatorWallet.id },
          data: {
            balance: { increment: creditsEarned },
            lifetimeEarnedCredits: { increment: BigInt(creditsEarned) },
            version: { increment: 1 },
          },
        });

        // Update Creator Profile Total
        await tx.creatorProfile.update({
          where: { id: creatorProfile.id },
          data: {
            totalEarnedCredits: { increment: BigInt(creditsEarned) },
          },
        });

        // Update CoStreamParticipant Cumulative Earned
        await tx.coStreamParticipant.update({
          where: { id: participant.id },
          data: {
            totalCreditsEarned: { increment: creditsEarned },
          },
        });

        // Write CreatorEarning Record for Clearance
        const creatorEarning = await tx.creatorEarning.create({
          data: {
            creatorProfileId: creatorProfile.id,
            walletTransactionId: parentTx.id,
            earningSource: "LIVE_TIP",
            sourceReferenceId: session.id,
            grossCredits: Math.round(grossCredits * splitPercentage),
            platformRakePercentage: rakePercent,
            platformFeeCredits: Math.round(platformRakeCredits * splitPercentage),
            netCreatorCredits: creditsEarned,
            fiatValueEstimatedCents: Math.round(creditsEarned * 0.08 * 100),
            clearanceStatus: "CLEARED",
          },
        });

        // Write Co-Host Child Ledger Transaction
        await tx.walletTransaction.create({
          data: {
            sourceWalletId: fanWallet.id,
            destinationWalletId: creatorWallet.id,
            transactionType: "LIVE_TIP",
            direction: "CREDIT",
            amountCredits: creditsEarned,
            platformFeeCredits: 0,
            creatorNetCredits: creditsEarned,
            sourceBalanceBefore: fanBalanceBefore,
            sourceBalanceAfter: fanBalanceAfter,
            destBalanceBefore: creatorBalBefore,
            destBalanceAfter: creatorBalAfter,
            idempotencyKey: `${idempotencyKey}_split_${creatorProfile.id}`,
            referenceType: "CO_STREAM_PARTICIPANT_SPLIT",
            referenceId: participant.id,
            status: "COMPLETED",
            note: `Co-Stream Split (${(splitPercentage * 100).toFixed(0)}%): +${creditsEarned} credits from ${session.title}`,
            metadataJson: JSON.stringify({
              coStreamSessionId: session.id,
              parentTransactionId: parentTx.id,
              splitPercentage,
              creatorEarningId: creatorEarning.id,
            }),
          },
        });

        // Update Relationship XP between fan and this co-host
        try {
          await tx.creatorRelationship.upsert({
            where: {
              fanId_creatorProfileId: {
                fanId: fanUserId,
                creatorProfileId: creatorProfile.id,
              },
            },
            create: {
              fanId: fanUserId,
              creatorProfileId: creatorProfile.id,
              totalCreditsSpent: BigInt(creditsEarned),
              totalXp: BigInt(creditsEarned * 10),
              currentStreakDays: 1,
              lastInteractedAt: new Date(),
            },
            update: {
              totalCreditsSpent: { increment: BigInt(creditsEarned) },
              totalXp: { increment: BigInt(creditsEarned * 10) },
              lastInteractedAt: new Date(),
            },
          });
        } catch {
          // Graceful fallback
        }

        finalShares.push({
          creatorProfileId: creatorProfile.id,
          creatorUserId: creatorProfile.userId,
          displayName: creatorProfile.user.displayName,
          role: participant.role,
          splitPercentage,
          creditsEarned,
          fiatEstimatedEur: Number((creditsEarned / 100).toFixed(2)),
          creatorEarningId: creatorEarning.id,
        });
      }

      // 4g. Update Aggregated CoStreamSession Financial Metrics
      await tx.coStreamSession.update({
        where: { id: session.id },
        data: {
          totalGrossCredits: { increment: grossCredits },
          totalPlatformFee: { increment: platformRakeCredits },
          totalNetCredits: { increment: netCreatorPoolCredits },
        },
      });

      return {
        success: true,
        parentTransactionId: parentTx.id,
        idempotencyKey,
        coStreamSessionId: session.id,
        grossCredits,
        platformRakeCredits,
        netCreatorPoolCredits,
        creatorShares: finalShares,
        fanRemainingBalance: updatedFanWallet.balance,
        timestamp: parentTx.createdAt.toISOString(),
      };
    });

    // 5. Broadcast Split Earning Real-Time Events
    // Broadcast to room
    eventBus.publish(`room:${session.primaryHostId}`, {
      type: "CO_STREAM_SPLIT_EARNING",
      payload: {
        sessionId: session.id,
        fanUserId,
        grossCredits,
        netPool: result.netCreatorPoolCredits,
        shares: result.creatorShares,
        customMessage,
        createdAt: result.timestamp,
      },
    });

    // Notify each creator on their private control room channel
    for (const share of result.creatorShares) {
      eventBus.publish(`creator:${share.creatorProfileId}`, {
        type: "SPLIT_EARNING_RECEIVED",
        payload: {
          sessionId: session.id,
          creditsEarned: share.creditsEarned,
          fiatEstimatedEur: share.fiatEstimatedEur,
          fanUserId,
          customMessage,
        },
      });
    }

    return result;
  }
}
