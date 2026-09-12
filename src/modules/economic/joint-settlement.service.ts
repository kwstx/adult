// ============================================================================
// AUTHORITATIVE JOINT SETTLEMENT & ENTITLEMENT SERVICE
// Multi-Creator Split Accounting, Atomic Ledger Transactions & Access Entitlements
// ============================================================================

import prisma from "@/lib/db";
import { ApiError } from "@/lib/api-handler";
import { eventBus } from "@/modules/realtime/event-bus";
import { CreditLotService } from "./credit-lot.service";
import { WalletLedgerService, WalletSuspendedError } from "./wallet-ledger.service";
import { EntitlementService } from "@/modules/entitlements/entitlement.service";
import { JointComplianceService } from "@/modules/content/joint-compliance.service";

export interface PurchaseJointPPVInput {
  fanUserId: string;
  jointProductId: string;
  idempotencyKey?: string;
}

export interface PurchaseJointTicketInput {
  fanUserId: string;
  jointEventId: string;
  idempotencyKey?: string;
}

export interface CreatorSettlementShare {
  creatorProfileId: string;
  displayName: string;
  role: string;
  splitPercentage: number;
  creditsEarned: number;
  fiatEstimatedEur: number;
  creatorEarningId: string;
}

export interface JointPPVSettlementResult {
  success: boolean;
  purchaseId: string;
  jointProductId: string;
  title: string;
  priceCreditsPaid: number;
  platformFeeCredits: number;
  netCreatorPoolCredits: number;
  creatorShares: CreatorSettlementShare[];
  fanRemainingBalance: number;
  entitlementId: string;
  mediaUrl: string;
  timestamp: string;
}

export interface JointTicketSettlementResult {
  success: boolean;
  ticketId: string;
  jointEventId: string;
  title: string;
  ticketPriceCredits: number;
  platformFeeCredits: number;
  netCreatorPoolCredits: number;
  creatorShares: CreatorSettlementShare[];
  accessPassToken: string;
  fanRemainingBalance: number;
  scheduledStartAt: string;
  timestamp: string;
}

export class JointSettlementService {
  /**
   * 1. ATOMIC SETTLEMENT: Purchase & Unlock Joint PPV Content Piece
   */
  public static async purchaseJointPPV(
    input: PurchaseJointPPVInput
  ): Promise<JointPPVSettlementResult> {
    const {
      fanUserId,
      jointProductId,
      idempotencyKey = `joint_ppv_${fanUserId}_${jointProductId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    } = input;

    // 1. Fetch Joint Product & Co-Stars
    const product = await prisma.jointProduct.findUnique({
      where: { id: jointProductId },
      include: {
        primaryProducer: { include: { user: true } },
        coCreators: {
          include: {
            creatorProfile: { include: { user: true } },
          },
        },
      },
    });

    if (!product) {
      throw new ApiError(404, "Joint PPV product not found.", "PRODUCT_NOT_FOUND");
    }

    if (product.status !== "PUBLISHED") {
      throw new ApiError(400, `Joint PPV is not available for purchase (status: ${product.status}).`, "PRODUCT_NOT_PUBLISHED");
    }

    if (!product.is2257Compliant) {
      throw new ApiError(403, "Cannot purchase Joint PPV: 18 U.S.C. § 2257 compliance records are pending.", "COMPLIANCE_HOLD");
    }

    // Check if already purchased
    const existingPurchase = await prisma.jointProductPurchase.findUnique({
      where: {
        jointProductId_fanId: {
          jointProductId,
          fanId: fanUserId,
        },
      },
    });

    if (existingPurchase) {
      const fanWallet = await prisma.wallet.findUnique({ where: { userId: fanUserId } });
      return {
        success: true,
        purchaseId: existingPurchase.id,
        jointProductId: product.id,
        title: product.title,
        priceCreditsPaid: existingPurchase.priceCreditsPaid,
        platformFeeCredits: existingPurchase.platformFeeCredits,
        netCreatorPoolCredits: existingPurchase.netCreatorCredits,
        creatorShares: [],
        fanRemainingBalance: fanWallet?.balance || 0,
        entitlementId: `ent_joint_${existingPurchase.id}`,
        mediaUrl: product.mediaUrl,
        timestamp: existingPurchase.createdAt.toISOString(),
      };
    }

    const priceCredits = product.priceCredits;

    // 2. Financial calculation
    const rakePercent = Number(product.platformRakePercentage) || 0.20;
    const platformFeeCredits = Math.floor(priceCredits * rakePercent);
    const netCreatorPoolCredits = priceCredits - platformFeeCredits;

    // Calculate individual splits
    let allocatedTotal = 0;
    const computedShares: Array<{
      coCreator: typeof product.coCreators[0];
      splitPercentage: number;
      creditsEarned: number;
    }> = [];

    product.coCreators.forEach((c: any, index: number) => {
      const pct = Number(c.revenueSplitPercentage);
      let share = Math.floor(netCreatorPoolCredits * pct);
      if (index === product.coCreators.length - 1) {
        share = netCreatorPoolCredits - allocatedTotal; // Dust handling
      }
      allocatedTotal += share;
      computedShares.push({
        coCreator: c,
        splitPercentage: pct,
        creditsEarned: share,
      });
    });

    // 3. Atomic PostgreSQL Transaction
    const result = await prisma.$transaction(async (tx: any): Promise<JointPPVSettlementResult> => {
      // Validate fan wallet
      const fanWallet = await tx.wallet.findUnique({ where: { userId: fanUserId } });
      WalletLedgerService.validateWalletUsability(fanWallet, priceCredits);

      const fanBalanceBefore = fanWallet.balance;
      const fanBalanceAfter = fanBalanceBefore - priceCredits;

      // Debit fan wallet
      const updatedFanWallet = await tx.wallet.update({
        where: { id: fanWallet.id },
        data: {
          balance: { decrement: priceCredits },
          lifetimeSpentCredits: { increment: BigInt(priceCredits) },
          version: { increment: 1 },
        },
      });

      // Write Parent Transaction
      const parentTx = await tx.walletTransaction.create({
        data: {
          sourceWalletId: fanWallet.id,
          destinationWalletId: null,
          transactionType: "PPV_PURCHASE",
          direction: "TRANSFER",
          amountCredits: priceCredits,
          platformFeeCredits,
          creatorNetCredits: netCreatorPoolCredits,
          sourceBalanceBefore: fanBalanceBefore,
          sourceBalanceAfter: fanBalanceAfter,
          destBalanceBefore: null,
          destBalanceAfter: null,
          idempotencyKey,
          referenceType: "JOINT_PRODUCT",
          referenceId: product.id,
          status: "COMPLETED",
          note: `Joint PPV Purchase: ${product.title}`,
          metadataJson: JSON.stringify({
            jointProductId: product.id,
            primaryProducerId: product.primaryProducerId,
            coCreatorsCount: product.coCreators.length,
          }),
        },
      });

      // Drawdown fan lots (FEFO)
      await CreditLotService.drawdownCredits(fanWallet.id, priceCredits, parentTx.id, tx);

      // Create JointProductPurchase record
      const purchaseRecord = await tx.jointProductPurchase.create({
        data: {
          jointProductId: product.id,
          fanId: fanUserId,
          priceCreditsPaid: priceCredits,
          platformFeeCredits,
          netCreatorCredits: netCreatorPoolCredits,
          walletTransactionId: parentTx.id,
        },
      });

      // Distribute to each co-creator
      const creatorShares: CreatorSettlementShare[] = [];

      for (const shareItem of computedShares) {
        const { coCreator, splitPercentage, creditsEarned } = shareItem;
        const creatorProfile = coCreator.creatorProfile;

        const creatorWallet = await WalletLedgerService.getOrCreateWallet(creatorProfile.userId, tx);
        if (creatorWallet.status !== "ACTIVE") {
          throw new WalletSuspendedError(creatorWallet.id, creatorWallet.status);
        }

        const creatorBalBefore = creatorWallet.balance;
        const creatorBalAfter = creatorBalBefore + creditsEarned;

        // Credit Co-Star Wallet
        await tx.wallet.update({
          where: { id: creatorWallet.id },
          data: {
            balance: { increment: creditsEarned },
            lifetimeEarnedCredits: { increment: BigInt(creditsEarned) },
            version: { increment: 1 },
          },
        });

        // Update Creator Profile total
        await tx.creatorProfile.update({
          where: { id: creatorProfile.id },
          data: { totalEarnedCredits: { increment: BigInt(creditsEarned) } },
        });

        // Write CreatorEarning Record
        const earning = await tx.creatorEarning.create({
          data: {
            creatorProfileId: creatorProfile.id,
            walletTransactionId: parentTx.id,
            earningSource: "PPV_CONTENT",
            sourceReferenceId: product.id,
            grossCredits: Math.round(priceCredits * splitPercentage),
            platformRakePercentage: rakePercent,
            platformFeeCredits: Math.round(platformFeeCredits * splitPercentage),
            netCreatorCredits: creditsEarned,
            fiatValueEstimatedCents: Math.round(creditsEarned * 0.08 * 100),
            clearanceStatus: "CLEARED",
          },
        });

        // Write Child Transaction for Co-Star
        await tx.walletTransaction.create({
          data: {
            sourceWalletId: fanWallet.id,
            destinationWalletId: creatorWallet.id,
            transactionType: "PPV_PURCHASE",
            direction: "CREDIT",
            amountCredits: creditsEarned,
            platformFeeCredits: 0,
            creatorNetCredits: creditsEarned,
            sourceBalanceBefore: fanBalanceBefore,
            sourceBalanceAfter: fanBalanceAfter,
            destBalanceBefore: creatorBalBefore,
            destBalanceAfter: creatorBalAfter,
            idempotencyKey: `${idempotencyKey}_split_${creatorProfile.id}`,
            referenceType: "JOINT_PRODUCT_SPLIT",
            referenceId: coCreator.id,
            status: "COMPLETED",
            note: `Joint PPV Split (${(splitPercentage * 100).toFixed(0)}%): +${creditsEarned} credits from ${product.title}`,
          },
        });

        creatorShares.push({
          creatorProfileId: creatorProfile.id,
          displayName: creatorProfile.stageName || creatorProfile.user.displayName,
          role: coCreator.role,
          splitPercentage,
          creditsEarned,
          fiatEstimatedEur: Number((creditsEarned / 100).toFixed(2)),
          creatorEarningId: earning.id,
        });
      }

      // Update aggregate metrics on JointProduct
      await tx.jointProduct.update({
        where: { id: product.id },
        data: {
          totalPurchasesCount: { increment: 1 },
          totalCreditsEarned: { increment: netCreatorPoolCredits },
        },
      });

      return {
        success: true,
        purchaseId: purchaseRecord.id,
        jointProductId: product.id,
        title: product.title,
        priceCreditsPaid: priceCredits,
        platformFeeCredits,
        netCreatorPoolCredits,
        creatorShares,
        fanRemainingBalance: updatedFanWallet.balance,
        entitlementId: `ent_joint_${purchaseRecord.id}`,
        mediaUrl: product.mediaUrl,
        timestamp: parentTx.createdAt.toISOString(),
      };
    });

    // 4. Grant Authoritative Entitlement
    await EntitlementService.grantEntitlement({
      userId: fanUserId,
      key: "CONTENT_ACCESS",
      scope: "CONTENT",
      resourceId: product.id,
      sourceType: "ORDER",
      metadata: {
        jointProductId: product.id,
        title: product.title,
        purchaseId: result.purchaseId,
      },
    });

    // 5. Broadcast Event
    eventBus.publish(`creator:${product.primaryProducerId}`, {
      type: "CONTENT_PURCHASED",
      payload: {
        jointProductId: product.id,
        fanUserId,
        priceCredits,
        timestamp: result.timestamp,
      },
    });

    return result;
  }

  /**
   * 2. ATOMIC SETTLEMENT: Purchase Joint Event Ticket
   */
  public static async purchaseJointEventTicket(
    input: PurchaseJointTicketInput
  ): Promise<JointTicketSettlementResult> {
    const {
      fanUserId,
      jointEventId,
      idempotencyKey = `joint_tkt_${fanUserId}_${jointEventId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    } = input;

    const event = await prisma.jointEvent.findUnique({
      where: { id: jointEventId },
      include: {
        primaryHost: { include: { user: true } },
        coHosts: {
          include: {
            creatorProfile: { include: { user: true } },
          },
        },
      },
    });

    if (!event) {
      throw new ApiError(404, "Joint Event not found.", "EVENT_NOT_FOUND");
    }

    if (event.status === "ENDED" || event.status === "CANCELLED") {
      throw new ApiError(400, `Cannot purchase ticket for ${event.status} event.`, "EVENT_NOT_AVAILABLE");
    }

    if (!event.is2257Compliant) {
      throw new ApiError(403, "Cannot purchase ticket: 18 U.S.C. § 2257 compliance is pending for co-hosts.", "COMPLIANCE_HOLD");
    }

    // Check if already ticketed
    const existingTicket = await prisma.jointEventTicket.findUnique({
      where: {
        jointEventId_fanId: {
          jointEventId,
          fanId: fanUserId,
        },
      },
    });

    if (existingTicket) {
      const fanWallet = await prisma.wallet.findUnique({ where: { userId: fanUserId } });
      return {
        success: true,
        ticketId: existingTicket.id,
        jointEventId: event.id,
        title: event.title,
        ticketPriceCredits: existingTicket.ticketPriceCreditsPaid,
        platformFeeCredits: existingTicket.platformFeeCredits,
        netCreatorPoolCredits: existingTicket.netCreatorCredits,
        creatorShares: [],
        accessPassToken: existingTicket.accessPassToken || "pass_valid",
        fanRemainingBalance: fanWallet?.balance || 0,
        scheduledStartAt: event.scheduledStartAt.toISOString(),
        timestamp: existingTicket.createdAt.toISOString(),
      };
    }

    const ticketPrice = event.ticketPriceCredits;
    const rakePercent = Number(event.platformRakePercentage) || 0.20;
    const platformFeeCredits = Math.floor(ticketPrice * rakePercent);
    const netCreatorPoolCredits = ticketPrice - platformFeeCredits;

    // Compute co-host shares
    let allocatedTotal = 0;
    const computedShares: Array<{
      coHost: typeof event.coHosts[0];
      splitPercentage: number;
      creditsEarned: number;
    }> = [];

    event.coHosts.forEach((h: any, index: number) => {
      const pct = Number(h.revenueSplitPercentage);
      let share = Math.floor(netCreatorPoolCredits * pct);
      if (index === event.coHosts.length - 1) {
        share = netCreatorPoolCredits - allocatedTotal;
      }
      allocatedTotal += share;
      computedShares.push({
        coHost: h,
        splitPercentage: pct,
        creditsEarned: share,
      });
    });

    const accessPassToken = `tkt_pass_${Buffer.from(
      JSON.stringify({
        eventId: event.id,
        userId: fanUserId,
        exp: event.scheduledStartAt.getTime() + 1000 * 60 * 60 * 24, // 24h validity after start
      })
    ).toString("base64url")}`;

    // Atomic Settlement
    const result = await prisma.$transaction(async (tx: any): Promise<JointTicketSettlementResult> => {
      const fanWallet = await tx.wallet.findUnique({ where: { userId: fanUserId } });
      WalletLedgerService.validateWalletUsability(fanWallet, ticketPrice);

      const fanBalanceBefore = fanWallet.balance;
      const fanBalanceAfter = fanBalanceBefore - ticketPrice;

      // Debit fan wallet
      const updatedFanWallet = await tx.wallet.update({
        where: { id: fanWallet.id },
        data: {
          balance: { decrement: ticketPrice },
          lifetimeSpentCredits: { increment: BigInt(ticketPrice) },
          version: { increment: 1 },
        },
      });

      // Write Parent Transaction
      const parentTx = await tx.walletTransaction.create({
        data: {
          sourceWalletId: fanWallet.id,
          destinationWalletId: null,
          transactionType: "PRODUCT_PURCHASE",
          direction: "TRANSFER",
          amountCredits: ticketPrice,
          platformFeeCredits,
          creatorNetCredits: netCreatorPoolCredits,
          sourceBalanceBefore: fanBalanceBefore,
          sourceBalanceAfter: fanBalanceAfter,
          destBalanceBefore: null,
          destBalanceAfter: null,
          idempotencyKey,
          referenceType: "JOINT_EVENT",
          referenceId: event.id,
          status: "COMPLETED",
          note: `Joint Event Ticket: ${event.title}`,
        },
      });

      // Drawdown fan lots (FEFO)
      await CreditLotService.drawdownCredits(fanWallet.id, ticketPrice, parentTx.id, tx);

      // Create Ticket Record
      const ticket = await tx.jointEventTicket.create({
        data: {
          jointEventId: event.id,
          fanId: fanUserId,
          ticketPriceCreditsPaid: ticketPrice,
          platformFeeCredits,
          netCreatorCredits: netCreatorPoolCredits,
          walletTransactionId: parentTx.id,
          accessPassToken,
        },
      });

      // Distribute to all co-hosts
      const creatorShares: CreatorSettlementShare[] = [];

      for (const shareItem of computedShares) {
        const { coHost, splitPercentage, creditsEarned } = shareItem;
        const creatorProfile = coHost.creatorProfile;

        const creatorWallet = await WalletLedgerService.getOrCreateWallet(creatorProfile.userId, tx);
        const creatorBalBefore = creatorWallet.balance;
        const creatorBalAfter = creatorBalBefore + creditsEarned;

        await tx.wallet.update({
          where: { id: creatorWallet.id },
          data: {
            balance: { increment: creditsEarned },
            lifetimeEarnedCredits: { increment: BigInt(creditsEarned) },
            version: { increment: 1 },
          },
        });

        await tx.creatorProfile.update({
          where: { id: creatorProfile.id },
          data: { totalEarnedCredits: { increment: BigInt(creditsEarned) } },
        });

        const earning = await tx.creatorEarning.create({
          data: {
            creatorProfileId: creatorProfile.id,
            walletTransactionId: parentTx.id,
            earningSource: "LIVE_TIP",
            sourceReferenceId: event.id,
            grossCredits: Math.round(ticketPrice * splitPercentage),
            platformRakePercentage: rakePercent,
            platformFeeCredits: Math.round(platformFeeCredits * splitPercentage),
            netCreatorCredits: creditsEarned,
            fiatValueEstimatedCents: Math.round(creditsEarned * 0.08 * 100),
            clearanceStatus: "CLEARED",
          },
        });

        creatorShares.push({
          creatorProfileId: creatorProfile.id,
          displayName: creatorProfile.stageName || creatorProfile.user.displayName,
          role: coHost.role,
          splitPercentage,
          creditsEarned,
          fiatEstimatedEur: Number((creditsEarned / 100).toFixed(2)),
          creatorEarningId: earning.id,
        });
      }

      // Increment tickets sold on JointEvent
      await tx.jointEvent.update({
        where: { id: event.id },
        data: {
          totalTicketsSold: { increment: 1 },
          totalCreditsEarned: { increment: netCreatorPoolCredits },
        },
      });

      return {
        success: true,
        ticketId: ticket.id,
        jointEventId: event.id,
        title: event.title,
        ticketPriceCredits: ticketPrice,
        platformFeeCredits,
        netCreatorPoolCredits,
        creatorShares,
        accessPassToken,
        fanRemainingBalance: updatedFanWallet.balance,
        scheduledStartAt: event.scheduledStartAt.toISOString(),
        timestamp: parentTx.createdAt.toISOString(),
      };
    });

    // Grant Entitlement
    await EntitlementService.grantEntitlement({
      userId: fanUserId,
      key: "SPECIAL_EVENT_TICKET",
      scope: "LIVESTREAM",
      resourceId: event.id,
      sourceType: "ORDER",
      metadata: {
        jointEventId: event.id,
        title: event.title,
        ticketId: result.ticketId,
      },
    });

    return result;
  }
}
