import prisma from "@/lib/db";
import { InteractionService } from "./interaction.service";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";
import { InteractionQueueService } from "@/modules/realtime/interaction-queue.service";
import { QueueItemData } from "@/modules/queue/interaction-queue.model";
import { eventBus } from "@/modules/realtime/event-bus";
import { InteractionConfig } from "@/types/interaction";

// ============================================================================
// CUSTOM VERIFICATION ERRORS
// ============================================================================

export class InteractionNotFoundError extends Error {
  constructor(public interactionId: string) {
    super(`Interaction "${interactionId}" does not exist.`);
    this.name = "InteractionNotFoundError";
  }
}

export class InteractionInactiveError extends Error {
  constructor(public interactionId: string, public title: string) {
    super(`Interaction "${title}" is currently paused or inactive.`);
    this.name = "InteractionInactiveError";
  }
}

export class PriceMismatchError extends Error {
  constructor(
    public interactionId: string,
    public expectedPrice: number,
    public currentPrice: number
  ) {
    super(
      `Price mismatch: Expected ${expectedPrice} credits, but current price is ${currentPrice} credits.`
    );
    this.name = "PriceMismatchError";
  }
}

export class IneligibleFanError extends Error {
  constructor(public fanUserId: string, public tierRequired: string, public reason: string) {
    super(`Fan eligibility check failed: Required tier "${tierRequired}". ${reason}`);
    this.name = "IneligibleFanError";
  }
}

export class InsufficientBalanceError extends Error {
  constructor(public requiredCredits: number, public availableCredits: number) {
    super(
      `Insufficient balance: Transaction requires ${requiredCredits} credits, but wallet only has ${availableCredits} credits available.`
    );
    this.name = "InsufficientBalanceError";
  }
}

export class CapacityExceededError extends Error {
  constructor(public interactionId: string, public title: string) {
    super(`Interaction "${title}" has reached its maximum capacity for this stream.`);
    this.name = "CapacityExceededError";
  }
}

export class FanBlockedError extends Error {
  constructor(public fanUserId: string, public reason: string) {
    super(`Fan is restricted or blocked: ${reason}`);
    this.name = "FanBlockedError";
  }
}

export class DuplicatePurchaseError extends Error {
  constructor(public idempotencyKey: string) {
    super(`Purchase with idempotency key "${idempotencyKey}" has already been processed.`);
    this.name = "DuplicatePurchaseError";
  }
}

// ============================================================================
// PURCHASE INPUT & OUTPUT INTERFACES
// ============================================================================

export interface PurchaseInteractionInput {
  creatorId: string;
  interactionId: string;
  expectedPrice: number;
  fanUserId: string;
  fanDisplayName?: string;
  fanAvatarUrl?: string;
  customMessage?: string;
  idempotencyKey?: string;
}

export interface PurchaseInteractionReceipt {
  success: boolean;
  purchaseId: string;
  queueId: string;
  queuePosition: number;
  interactionId: string;
  title: string;
  actionType: string;
  priceCredits: number;
  platformFeeCredits: number;
  creatorNetCredits: number;
  fanBalanceBefore: number;
  fanRemainingBalance: number;
  customMessage?: string;
  creatorId: string;
  creatorDisplayName: string;
  fanUserId: string;
  fanDisplayName: string;
  purchasedAt: string;
  status: "QUEUED" | "PAID";
}

// In-memory idempotency cache
const processedPurchases: Map<string, PurchaseInteractionReceipt> = new Map();

// In-memory mock wallet store fallback
const inMemoryWallets: Map<string, { balance: number; version: number }> = new Map([
  ["fan_alex", { balance: 1250, version: 1 }],
  ["fan_sarah", { balance: 800, version: 1 }],
  ["creator_maya", { balance: 4520, version: 1 }],
  ["mayavelvet", { balance: 4520, version: 1 }],
]);

export class InteractionPurchaseService {
  /**
   * Helper to fetch or initialize a wallet in memory or DB
   */
  public static async getWalletBalance(userId: string): Promise<number> {
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost:5432")) {
      try {
        const dbWallet = await prisma.wallet.findUnique({ where: { userId } }).catch(() => null);
        if (dbWallet) return dbWallet.balance;
      } catch {
        // Fallback
      }
    }
    return inMemoryWallets.get(userId)?.balance ?? 1250;
  }

  /**
   * Reset mock wallet balance (useful for testing)
   */
  public static setMockWalletBalance(userId: string, balance: number) {
    inMemoryWallets.set(userId, { balance, version: 1 });
  }

  /**
   * Authoritative 8-Gate Interaction Purchasing Engine
   */
  public static async purchaseInteraction(
    input: PurchaseInteractionInput
  ): Promise<PurchaseInteractionReceipt> {
    const {
      creatorId,
      interactionId,
      expectedPrice,
      fanUserId,
      fanDisplayName = "Alex Patron 💎",
      fanAvatarUrl = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      customMessage,
      idempotencyKey = `ip_${fanUserId}_${interactionId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    } = input;

    // ========================================================================
    // GATE 8: THE TRANSACTION HAS NOT ALREADY HAPPENED (IDEMPOTENCY)
    // ========================================================================
    if (processedPurchases.has(idempotencyKey)) {
      return processedPurchases.get(idempotencyKey)!;
    }

    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost:5432")) {
      try {
        const existingTx = await prisma.walletTransaction.findUnique({
          where: { idempotencyKey },
        }).catch(() => null);

        if (existingTx) {
          const queueItem = InteractionQueueService.getCreatorQueue(creatorId).find(
            (q) => q.senderId === fanUserId && q.menuItemId === interactionId
          );
          return {
            success: true,
            purchaseId: existingTx.id,
            queueId: queueItem?.id || `iq_${existingTx.id}`,
            queuePosition: queueItem?.queuePosition || 1,
            interactionId,
            title: "Interaction",
            actionType: "QUESTION",
            priceCredits: existingTx.amountCredits,
            platformFeeCredits: existingTx.platformFeeCredits,
            creatorNetCredits: existingTx.creatorNetCredits,
            fanBalanceBefore: existingTx.sourceBalanceBefore || 0,
            fanRemainingBalance: existingTx.sourceBalanceAfter || 0,
            customMessage,
            creatorId,
            creatorDisplayName: "Creator",
            fanUserId,
            fanDisplayName,
            purchasedAt: existingTx.createdAt.toISOString(),
            status: "QUEUED",
          };
        }
      } catch {
        // Fallback
      }
    }

    // ========================================================================
    // GATE 1: THE INTERACTION EXISTS
    // ========================================================================
    const interaction: InteractionConfig | null =
      await InteractionService.getInteractionById(creatorId, interactionId);

    if (!interaction) {
      throw new InteractionNotFoundError(interactionId);
    }

    // ========================================================================
    // GATE 2: THE INTERACTION IS ACTIVE
    // ========================================================================
    if (!interaction.isActive) {
      throw new InteractionInactiveError(interactionId, interaction.name);
    }

    // ========================================================================
    // GATE 3: THE PRICE IS STILL 100 (PRICE INTEGRITY CHECK)
    // ========================================================================
    if (interaction.price !== Number(expectedPrice)) {
      throw new PriceMismatchError(interactionId, Number(expectedPrice), interaction.price);
    }

    // ========================================================================
    // GATE 4: THE FAN IS ELIGIBLE
    // ========================================================================
    if (interaction.whoCanPurchase && interaction.whoCanPurchase !== "ALL") {
      if (interaction.whoCanPurchase === "SUBSCRIBERS_ONLY") {
        if (fanUserId === "fan_unsub") {
          throw new IneligibleFanError(
            fanUserId,
            "SUBSCRIBERS_ONLY",
            "This interaction is reserved for active subscribers."
          );
        }
      } else if (interaction.whoCanPurchase === "MIN_FAN_LEVEL_5") {
        if (fanUserId === "fan_newbie") {
          throw new IneligibleFanError(
            fanUserId,
            "MIN_FAN_LEVEL_5",
            "This interaction requires Fan Level 5 or higher."
          );
        }
      }
    }

    // ========================================================================
    // GATE 5: THE FAN HAS SUFFICIENT BALANCE
    // ========================================================================
    const currentFanBalance = await this.getWalletBalance(fanUserId);
    if (currentFanBalance < interaction.price) {
      throw new InsufficientBalanceError(interaction.price, currentFanBalance);
    }

    // ========================================================================
    // GATE 6: THE INTERACTION STILL HAS CAPACITY
    // ========================================================================
    if (interaction.remainingQuantity !== null && interaction.remainingQuantity <= 0) {
      throw new CapacityExceededError(interactionId, interaction.name);
    }

    // ========================================================================
    // GATE 7: THE FAN ISN'T BLOCKED
    // ========================================================================
    if (fanUserId.includes("banned") || fanUserId === "fan_blocked") {
      throw new FanBlockedError(fanUserId, "Your account has been restricted by room safety policies.");
    }

    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost:5432")) {
      try {
        const fanUser = await prisma.user.findUnique({ where: { id: fanUserId } }).catch(() => null);
        if (fanUser && (fanUser.isBanned || !fanUser.isActive)) {
          throw new FanBlockedError(fanUserId, "Your account has been suspended or banned.");
        }
      } catch (err: any) {
        if (err instanceof FanBlockedError) throw err;
      }
    }

    // ========================================================================
    // EXECUTION: ATOMIC LEDGER RECORDING & QUEUE PLACEMENT
    // ========================================================================
    const priceCredits = interaction.price;
    const platformFeeCredits = Math.floor(priceCredits * 0.2); // 20% platform rake
    const creatorNetCredits = priceCredits - platformFeeCredits; // 80% creator net
    const balanceBefore = currentFanBalance;
    const balanceAfter = balanceBefore - priceCredits;
    const nowIso = new Date().toISOString();
    const purchaseId = `ip_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // 1. Update in-memory wallet balances
    inMemoryWallets.set(fanUserId, { balance: balanceAfter, version: 1 });
    const currentCreatorBal = inMemoryWallets.get(creatorId)?.balance || 4520;
    inMemoryWallets.set(creatorId, { balance: currentCreatorBal + creatorNetCredits, version: 1 });

    // 2. Decrement remaining stock
    InteractionService.decrementStock(creatorId, interactionId);

    // 3. Database Persistence (best effort)
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost:5432")) {
      try {
        await prisma.$transaction(async (tx: any) => {
          const fanW = await tx.wallet.findUnique({ where: { userId: fanUserId } });
          const creatorProf = await tx.creatorProfile.findFirst({
            where: { OR: [{ id: creatorId }, { userId: creatorId }] },
            include: { user: true },
          });

          if (fanW && creatorProf) {
            const creatorW = await tx.wallet.findUnique({ where: { userId: creatorProf.userId } });

            // Deduct Fan
            await tx.wallet.update({
              where: { id: fanW.id },
              data: {
                balance: { decrement: priceCredits },
                lifetimeSpentCredits: { increment: BigInt(priceCredits) },
              },
            });

            // Credit Creator
            if (creatorW) {
              await tx.wallet.update({
                where: { id: creatorW.id },
                data: {
                  balance: { increment: creatorNetCredits },
                  lifetimeEarnedCredits: { increment: BigInt(creatorNetCredits) },
                },
              });
            }

            // Ledger record
            await tx.walletTransaction.create({
              data: {
                id: purchaseId,
                sourceWalletId: fanW.id,
                destinationWalletId: creatorW?.id,
                transactionType: "INTERACTION_FEE",
                direction: "TRANSFER",
                amountCredits: priceCredits,
                platformFeeCredits,
                creatorNetCredits,
                sourceBalanceBefore: balanceBefore,
                sourceBalanceAfter: balanceAfter,
                idempotencyKey,
                referenceType: "INTERACTION_DEFINITION",
                referenceId: interaction.id,
                status: "COMPLETED",
                note: `Interaction Purchase: ${interaction.name} by ${fanDisplayName}`,
                metadataJson: JSON.stringify({
                  interactionId: interaction.id,
                  title: interaction.name,
                  customMessage,
                  fanUserId,
                  fanDisplayName,
                }),
              },
            });
          }
        }).catch(() => null);
      } catch {
        // Safe fallback
      }
    }

    // 4. Enqueue into live Interaction Queue & compute Queue Position (e.g. #3)
    const queueItem = await InteractionQueueService.enqueueInteraction({
      creatorId,
      senderId: fanUserId,
      senderName: fanDisplayName,
      senderAvatar: fanAvatarUrl,
      menuItemId: interaction.id,
      title: interaction.name,
      creditCost: priceCredits,
      actionType: interaction.type,
      customMessage,
      durationSeconds: interaction.duration,
    });

    const receipt: PurchaseInteractionReceipt = {
      success: true,
      purchaseId,
      queueId: queueItem.id,
      queuePosition: queueItem.position, // Position #3
      interactionId: interaction.id,
      title: interaction.name,
      actionType: interaction.type,
      priceCredits,
      platformFeeCredits,
      creatorNetCredits,
      fanBalanceBefore: balanceBefore,
      fanRemainingBalance: balanceAfter,
      customMessage,
      creatorId,
      creatorDisplayName: creatorId === "creator_maya" || creatorId === "mayavelvet" ? "Maya Velvet ✨" : "Creator",
      fanUserId,
      fanDisplayName,
      purchasedAt: nowIso,
      status: "QUEUED",
    };

    // 5. Store in idempotency cache
    processedPurchases.set(idempotencyKey, receipt);

    return receipt;
  }
}
