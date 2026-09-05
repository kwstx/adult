import prisma from "@/lib/db";
import {
  CreditType,
  CreditLotStatusType,
  CreditLotRecord,
  CreditTypeDrawdownSummary,
  TypedWalletBalance,
} from "./types";

export class CreditLotService {
  /**
   * Grants a new credit lot into a user's wallet with explicit typing and rules.
   */
  static async grantLot(
    walletId: string,
    params: {
      creditType: CreditType;
      amount: number;
      fiatValueCents?: number;
      fiatCurrency?: string;
      expiresAt?: Date | null;
      grantReason?: string;
      paymentTransactionId?: string;
    },
    tx?: any
  ): Promise<CreditLotRecord> {
    const db = tx || prisma;
    const {
      creditType,
      amount,
      fiatValueCents = 0,
      fiatCurrency = "USD",
      expiresAt = null,
      grantReason,
      paymentTransactionId,
    } = params;

    if (amount <= 0) {
      throw new Error(`Cannot grant non-positive credit amount (${amount})`);
    }

    // 1. Create the granular lot record
    const lot = await db.creditLot.create({
      data: {
        walletId,
        creditType,
        originalAmount: amount,
        remainingAmount: amount,
        fiatValueCents: creditType === "PURCHASED" ? fiatValueCents : 0,
        fiatCurrency,
        expiresAt: creditType === "PURCHASED" ? null : expiresAt,
        grantReason: grantReason || `${creditType} credit grant`,
        paymentTransactionId,
        status: "ACTIVE",
      },
    });

    // 2. Increment the corresponding typed balance field on Wallet
    const balanceFieldMap: Record<CreditType, string> = {
      PURCHASED: "purchasedBalance",
      PROMOTIONAL: "promotionalBalance",
      BONUS: "bonusBalance",
    };

    const targetField = balanceFieldMap[creditType];

    await db.wallet.update({
      where: { id: walletId },
      data: {
        balance: { increment: amount },
        [targetField]: { increment: amount },
        version: { increment: 1 },
      },
    });

    return lot as unknown as CreditLotRecord;
  }

  /**
   * Drawdown Credits Engine: FEFO (First Expiring, First Out) + Priority Drawdown.
   *
   * Drawdown Priority Order:
   * 1. Lots with earliest `expiresAt` (Expiring promotional/bonus credits used first)
   * 2. `PROMOTIONAL` -> `BONUS` -> `PURCHASED`
   * 3. For `PURCHASED`: FIFO (Oldest purchase lot first for accurate tax & cost basis)
   */
  static async drawdownCredits(
    walletId: string,
    amountToDeduct: number,
    walletTransactionId: string,
    tx?: any
  ): Promise<CreditTypeDrawdownSummary> {
    const db = tx || prisma;

    if (amountToDeduct <= 0) {
      return {
        promotionalDeducted: 0,
        bonusDeducted: 0,
        purchasedDeducted: 0,
        totalDeducted: 0,
        deductions: [],
      };
    }

    const now = new Date();

    // 1. Fetch all active, non-depleted, unexpired lots for this wallet
    const activeLots = await db.creditLot.findMany({
      where: {
        walletId,
        status: "ACTIVE",
        remainingAmount: { gt: 0 },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    // 2. Sort according to authoritative accounting rules:
    //    a) Expiring lots first (sorted by expiresAt ASC)
    //    b) Credit type priority: PROMOTIONAL (1) -> BONUS (2) -> PURCHASED (3)
    //    c) For same priority: FIFO by createdAt ASC
    const typePriority: Record<CreditType, number> = {
      PROMOTIONAL: 1,
      BONUS: 2,
      PURCHASED: 3,
    };

    const sortedLots = [...activeLots].sort((a: any, b: any) => {
      // Both have expiration dates
      if (a.expiresAt && b.expiresAt) {
        const timeDiff = new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
        if (timeDiff !== 0) return timeDiff;
      }
      // One has expiration date, the other does not -> expiring lot goes first!
      if (a.expiresAt && !b.expiresAt) return -1;
      if (!a.expiresAt && b.expiresAt) return 1;

      // Same expiration status: sort by type priority
      const pDiff = (typePriority[a.creditType as CreditType] || 99) - (typePriority[b.creditType as CreditType] || 99);
      if (pDiff !== 0) return pDiff;

      // Same type priority: FIFO by creation time
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // 3. Verify total available credits in active lots >= amountToDeduct
    const totalAvailable = sortedLots.reduce((acc: number, lot: any) => acc + lot.remainingAmount, 0);
    if (totalAvailable < amountToDeduct) {
      throw new Error(
        `Insufficient typed credits: Needed ${amountToDeduct}, but only ${totalAvailable} available in active lots.`
      );
    }

    // 4. Perform iterative drawdown and create deduction records
    let remainingToDraw = amountToDeduct;
    let promoDeducted = 0;
    let bonusDeducted = 0;
    let purchasedDeducted = 0;
    const deductionResults: Array<{
      lotId: string;
      creditType: CreditType;
      amount: number;
      expiresAt?: Date | null;
    }> = [];

    for (const lot of sortedLots) {
      if (remainingToDraw <= 0) break;

      const lotAvailable = lot.remainingAmount;
      const takeAmount = Math.min(lotAvailable, remainingToDraw);
      const newLotRemaining = lotAvailable - takeAmount;
      const isDepleted = newLotRemaining === 0;

      // Update the lot
      await db.creditLot.update({
        where: { id: lot.id },
        data: {
          remainingAmount: newLotRemaining,
          status: isDepleted ? "DEPLETED" : "ACTIVE",
        },
      });

      // Create granular deduction record
      await db.creditLotDeduction.create({
        data: {
          creditLotId: lot.id,
          walletTransactionId,
          amountDeducted: takeAmount,
          creditType: lot.creditType,
        },
      });

      if (lot.creditType === "PROMOTIONAL") promoDeducted += takeAmount;
      else if (lot.creditType === "BONUS") bonusDeducted += takeAmount;
      else if (lot.creditType === "PURCHASED") purchasedDeducted += takeAmount;

      deductionResults.push({
        lotId: lot.id,
        creditType: lot.creditType as CreditType,
        amount: takeAmount,
        expiresAt: lot.expiresAt,
      });

      remainingToDraw -= takeAmount;
    }

    // 5. Update wallet cached typed balance fields
    await db.wallet.update({
      where: { id: walletId },
      data: {
        purchasedBalance: { decrement: purchasedDeducted },
        promotionalBalance: { decrement: promoDeducted },
        bonusBalance: { decrement: bonusDeducted },
        version: { increment: 1 },
      },
    });

    return {
      promotionalDeducted: promoDeducted,
      bonusDeducted,
      purchasedDeducted,
      totalDeducted: amountToDeduct,
      deductions: deductionResults,
    };
  }

  /**
   * Sweeps expired promotional or bonus credit lots across wallets.
   * Decrements wallet balance and logs immutable CREDIT_EXPIRATION ledger entries.
   */
  static async expireStaleLots(
    walletId?: string,
    now: Date = new Date(),
    tx?: any
  ): Promise<{
    expiredLotsCount: number;
    totalCreditsExpired: number;
    affectedWallets: string[];
  }> {
    const db = tx || prisma;

    const whereClause: any = {
      status: "ACTIVE",
      remainingAmount: { gt: 0 },
      expiresAt: { lte: now },
    };

    if (walletId) {
      whereClause.walletId = walletId;
    }

    const expiredLots = await db.creditLot.findMany({
      where: whereClause,
      include: { wallet: true },
    });

    if (expiredLots.length === 0) {
      return { expiredLotsCount: 0, totalCreditsExpired: 0, affectedWallets: [] };
    }

    let totalExpired = 0;
    const affectedWalletSet = new Set<string>();

    for (const lot of expiredLots) {
      const expiredAmount = lot.remainingAmount;
      if (expiredAmount <= 0) continue;

      totalExpired += expiredAmount;
      affectedWalletSet.add(lot.walletId);

      // 1. Mark lot as EXPIRED
      await db.creditLot.update({
        where: { id: lot.id },
        data: {
          remainingAmount: 0,
          status: "EXPIRED",
        },
      });

      const currentBalance = lot.wallet.balance;
      const newBalance = Math.max(0, currentBalance - expiredAmount);

      const typedField = lot.creditType === "PROMOTIONAL" ? "promotionalBalance" : "bonusBalance";

      // 2. Decrement wallet balance & typed balance
      await db.wallet.update({
        where: { id: lot.walletId },
        data: {
          balance: { decrement: expiredAmount },
          [typedField]: { decrement: expiredAmount },
          version: { increment: 1 },
        },
      });

      // 3. Write immutable CREDIT_EXPIRATION ledger record
      await db.walletTransaction.create({
        data: {
          sourceWalletId: lot.walletId,
          destinationWalletId: null,
          transactionType: "CREDIT_EXPIRATION",
          direction: "DEBIT",
          amountCredits: expiredAmount,
          primaryCreditType: lot.creditType,
          platformFeeCredits: 0,
          creatorNetCredits: 0,
          sourceBalanceBefore: currentBalance,
          sourceBalanceAfter: newBalance,
          idempotencyKey: `expire_lot_${lot.id}_${now.getTime()}`,
          referenceType: "CREDIT_LOT",
          referenceId: lot.id,
          status: "COMPLETED",
          note: `Expiration: -${expiredAmount} ${lot.creditType.toLowerCase()} credits expired on ${lot.expiresAt?.toISOString().split("T")[0]}`,
          metadataJson: JSON.stringify({
            lotId: lot.id,
            creditType: lot.creditType,
            expiredAmount,
            originalAmount: lot.originalAmount,
            expiresAt: lot.expiresAt,
          }),
        },
      });
    }

    return {
      expiredLotsCount: expiredLots.length,
      totalCreditsExpired: totalExpired,
      affectedWallets: Array.from(affectedWalletSet),
    };
  }

  /**
   * Restores consumed lots for a refunded transaction.
   */
  static async restoreLotDeductions(
    walletTransactionId: string,
    tx?: any
  ): Promise<{
    restoredPurchased: number;
    restoredPromo: number;
    restoredBonus: number;
    totalRestored: number;
  }> {
    const db = tx || prisma;

    const deductions = await db.creditLotDeduction.findMany({
      where: { walletTransactionId },
      include: { creditLot: true },
    });

    let restoredPurchased = 0;
    let restoredPromo = 0;
    let restoredBonus = 0;

    for (const deduction of deductions) {
      const { creditLot, amountDeducted, creditType } = deduction;

      if (creditLot) {
        // Restore into existing lot
        const newRemaining = creditLot.remainingAmount + amountDeducted;
        await db.creditLot.update({
          where: { id: creditLot.id },
          data: {
            remainingAmount: newRemaining,
            status: "ACTIVE",
          },
        });
      }

      if (creditType === "PURCHASED") restoredPurchased += amountDeducted;
      else if (creditType === "PROMOTIONAL") restoredPromo += amountDeducted;
      else if (creditType === "BONUS") restoredBonus += amountDeducted;
    }

    return {
      restoredPurchased,
      restoredPromo,
      restoredBonus,
      totalRestored: restoredPurchased + restoredPromo + restoredBonus,
    };
  }

  /**
   * Authoritatively computes and returns typed wallet balance and breakdown.
   */
  static async getTypedBalance(walletId: string, tx?: any): Promise<TypedWalletBalance> {
    const db = tx || prisma;

    const wallet = await db.wallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    const now = new Date();

    const activeLots = await db.creditLot.findMany({
      where: {
        walletId,
        status: "ACTIVE",
        remainingAmount: { gt: 0 },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { expiresAt: "asc" },
    });

    let purchasedSum = 0;
    let promoSum = 0;
    let bonusSum = 0;
    let soonestExpiringLot: any = null;

    for (const lot of activeLots) {
      if (lot.creditType === "PURCHASED") {
        purchasedSum += lot.remainingAmount;
      } else if (lot.creditType === "PROMOTIONAL") {
        promoSum += lot.remainingAmount;
      } else if (lot.creditType === "BONUS") {
        bonusSum += lot.remainingAmount;
      }

      if (lot.expiresAt && lot.remainingAmount > 0) {
        if (!soonestExpiringLot || new Date(lot.expiresAt) < new Date(soonestExpiringLot.expiresAt)) {
          soonestExpiringLot = lot;
        }
      }
    }

    let expiringSoon = null;
    if (soonestExpiringLot && soonestExpiringLot.expiresAt) {
      const expDate = new Date(soonestExpiringLot.expiresAt);
      const diffMs = expDate.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      expiringSoon = {
        amount: soonestExpiringLot.remainingAmount,
        expiresAt: expDate,
        daysRemaining,
      };
    }

    return {
      totalCredits: wallet.balance,
      purchasedCredits: purchasedSum,
      promotionalCredits: promoSum,
      bonusCredits: bonusSum,
      lockedBalance: wallet.lockedBalance,
      pendingBalance: wallet.pendingBalance,
      expiringSoon,
      activeLotsCount: activeLots.length,
    };
  }
}
