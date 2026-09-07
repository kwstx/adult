/**
 * ============================================================================
 * ACCOUNT PROFILER & HISTORICAL REPUTATION SERVICE
 * ============================================================================
 * Gathers user account maturity, verification status, payment track record,
 * chargeback rates, and email risk signals.
 */

import prisma from "@/lib/db";
import { AccountProfileSnapshot } from "../types";

export class AccountProfilerService {
  // Known disposable / temporary email domains
  private static readonly DISPOSABLE_EMAIL_DOMAINS = new Set([
    "mailinator.com",
    "tempmail.com",
    "guerrillamail.com",
    "10minutemail.com",
    "throwawaymail.com",
    "trashmail.com",
    "sharklasers.com",
    "dispostable.com",
    "getairmail.com",
    "yopmail.com",
    "temp-mail.org",
    "fakeinbox.com",
  ]);

  /**
   * Normalizes an email by removing Gmail/Outlook '+' aliases and dot variations
   * to detect duplicate account farms using alias tricks.
   */
  static normalizeEmail(email: string): string {
    const trimmed = email.trim().toLowerCase();
    const parts = trimmed.split("@");
    if (parts.length !== 2) return trimmed;

    let [user, domain] = parts;

    // Remove + alias
    const plusIndex = user.indexOf("+");
    if (plusIndex !== -1) {
      user = user.substring(0, plusIndex);
    }

    // Remove dots for gmail
    if (domain === "gmail.com" || domain === "googlemail.com") {
      user = user.replace(/\./g, "");
      domain = "gmail.com";
    }

    return `${user}@${domain}`;
  }

  /**
   * Checks if an email uses a known disposable/temporary domain.
   */
  static isDisposableEmail(email: string): boolean {
    const domain = email.split("@")[1]?.toLowerCase()?.trim();
    if (!domain) return false;
    return this.DISPOSABLE_EMAIL_DOMAINS.has(domain);
  }

  /**
   * Gathers account metrics from database or returns fresh account profile for unauthenticated guests.
   */
  static async getAccountProfile(userId?: string): Promise<AccountProfileSnapshot | null> {
    if (!userId) return null;

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          wallet: true,
          paymentTransactions: {
            select: {
              id: true,
              status: true,
              amountFiatCents: true,
              creditsPurchased: true,
              createdAt: true,
            },
          },
        },
      });

      if (!user) return null;

      const now = Date.now();
      const accountAgeHours = Math.max(
        0,
        Math.floor((now - user.createdAt.getTime()) / (1000 * 3600))
      );

      const successfulPayments = user.paymentTransactions.filter(
        (pt) => pt.status === "SUCCESS"
      );
      const disputePayments = user.paymentTransactions.filter(
        (pt) => pt.status === "FAILED" || (pt as any).status === "REFUNDED"
      );

      const totalDepositsFiatCents = successfulPayments.reduce(
        (acc, pt) => acc + pt.amountFiatCents,
        0
      );
      const totalCreditsPurchased = successfulPayments.reduce(
        (acc, pt) => acc + pt.creditsPurchased,
        0
      );

      const totalTransactions = user.paymentTransactions.length;
      const disputeCount = disputePayments.length;
      const chargebackRate =
        totalTransactions > 0 ? disputeCount / totalTransactions : 0;

      const totalCreditsSpent = user.wallet
        ? Number(user.wallet.lifetimeSpentCredits || 0)
        : 0;

      return {
        userId: user.id,
        username: user.username,
        email: user.email,
        accountAgeHours,
        kycStatus: user.kycStatus,
        role: user.role,
        moderationState: user.moderationState,
        isBanned: user.isBanned,
        totalDepositsFiatCents,
        totalCreditsPurchased,
        totalCreditsSpent,
        historicalDisputeCount: disputeCount,
        historicalChargebackCount: 0, // Enhanced via dispute tracker
        chargebackRate,
        refundRate: 0,
        isNewAccount: accountAgeHours < 72,
        lastSeenAt: user.lastSeenAt,
      };
    } catch (error) {
      console.error("[AccountProfilerService] Failed to fetch account profile:", error);
      return null;
    }
  }

  /**
   * Tracks tokenized card fingerprint across accounts.
   */
  static async recordCardFingerprint(
    cardHash: string,
    userId: string,
    bin?: string,
    last4?: string,
    country?: string,
    isPrepaid?: boolean
  ): Promise<{ cardSharingCount: number; isBlocked: boolean; disputeCount: number }> {
    try {
      const existing = await prisma.paymentInstrumentFingerprint.findUnique({
        where: { cardHash },
      });

      if (existing) {
        let linkedUsers: string[] = [];
        try {
          linkedUsers = JSON.parse(existing.linkedUserIdsJson || "[]");
        } catch {
          linkedUsers = [];
        }

        if (!linkedUsers.includes(userId)) {
          linkedUsers.push(userId);
        }

        await prisma.paymentInstrumentFingerprint.update({
          where: { id: existing.id },
          data: {
            linkedUserIdsJson: JSON.stringify(linkedUsers),
            totalTransactions: { increment: 1 },
          },
        });

        return {
          cardSharingCount: linkedUsers.length,
          isBlocked: existing.isBlocked,
          disputeCount: existing.totalDisputes + existing.totalChargebacks,
        };
      }

      await prisma.paymentInstrumentFingerprint.create({
        data: {
          cardHash,
          binNumber: bin || null,
          lastFour: last4 || null,
          cardCountry: country || null,
          isPrepaid: isPrepaid || false,
          linkedUserIdsJson: JSON.stringify([userId]),
          totalTransactions: 1,
        },
      });

      return {
        cardSharingCount: 1,
        isBlocked: false,
        disputeCount: 0,
      };
    } catch (error) {
      console.warn("[AccountProfilerService] Card fingerprint recording error:", error);
      return { cardSharingCount: 1, isBlocked: false, disputeCount: 0 };
    }
  }
}
