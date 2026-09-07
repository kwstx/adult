/**
 * ============================================================================
 * AUTHORITATIVE INTERNAL ADMINISTRATION ENGINE
 * ============================================================================
 * 
 * Provides unified, auditable, and authoritative execution for all administrative
 * operations across Identity, Creators, Trust & Safety, Economics, and Realtime.
 */

import prisma from "@/lib/db";
import {
  DashboardOverviewStats,
  UserSearchFilters,
  CreatorSearchFilters,
  User360Detail,
  Creator360Detail,
  SetAccountModerationInput,
  ReviewContentInput,
  ReviewVerificationInput,
  IssueAdminRefundInput,
  IssueAdminAdjustmentInput,
  HandleChargebackInput,
  ReviewPayoutInput,
  TerminateLivestreamInput,
  SecurityAdminContext,
} from "./types";
import { AuditService } from "@/modules/trust-safety/audit.service";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";
import { ContentModerationService } from "@/modules/trust-safety/content-moderation.service";
import { AccountModerationService } from "@/modules/trust-safety/account-moderation.service";
import { CreatorModerationService } from "@/modules/trust-safety/creator-moderation.service";
import { eventBus } from "@/modules/realtime/event-bus";

export class AdminService {
  // ============================================================================
  // 1. DASHBOARD OVERVIEW & VITAL METRICS
  // ============================================================================

  static async getDashboardOverview(): Promise<DashboardOverviewStats> {
    const [
      totalUsers,
      totalCreators,
      activeLiveRooms,
      openReportsCount,
      urgentReportsCount,
      pendingVerificationsCount,
      pendingContentCount,
      pendingPayoutsCount,
      disputedChargebacksCount,
      frozenWalletsCount,
      pendingPayoutsAggregate,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.creatorProfile.count(),
      prisma.livestream.count({ where: { status: "LIVE" } }),
      prisma.report.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
      prisma.moderationCase.count({
        where: {
          status: { in: ["OPEN", "INVESTIGATING"] },
          priority: "CRITICAL_URGENT_UNDERAGE",
        },
      }),
      prisma.creatorVerification.count({ where: { verificationStatus: "PENDING" } }),
      prisma.content.count({ where: { moderationState: "PENDING" } }),
      prisma.payout.count({ where: { status: { in: ["REQUESTED", "UNDER_COMPLIANCE_REVIEW"] } } }),
      prisma.paymentTransaction.count({ where: { status: "DISPUTED_CHARGEBACK" } }),
      prisma.wallet.count({ where: { status: { not: "ACTIVE" } } }),
      prisma.payout.aggregate({
        where: { status: { in: ["REQUESTED", "UNDER_COMPLIANCE_REVIEW"] } },
        _sum: { amountFiatCents: true },
      }),
    ]);

    // Check recent audit chain integrity sample
    const recentAudit = await prisma.auditEvent.findFirst({ orderBy: { createdAt: "desc" } });
    let auditChainIntact = true;
    if (recentAudit) {
      const verifyResult = await AuditService.verifyAuditChain(
        recentAudit.targetEntityType,
        recentAudit.targetEntityId
      );
      auditChainIntact = verifyResult.isValid;
    }

    const systemHealth: "HEALTHY" | "DEGRADED" | "CRITICAL" =
      urgentReportsCount > 0 ? "CRITICAL" : openReportsCount > 50 || disputedChargebacksCount > 10 ? "DEGRADED" : "HEALTHY";

    return {
      totalUsers,
      totalCreators,
      activeLiveRooms,
      openReportsCount,
      urgentReportsCount,
      pendingVerificationsCount,
      pendingContentCount,
      pendingPayoutsCount,
      disputedChargebacksCount,
      frozenWalletsCount,
      totalPlatformVolumeCredits: 0,
      totalPendingPayoutsCents: pendingPayoutsAggregate._sum.amountFiatCents || 0,
      systemHealth,
      auditChainIntact,
    };
  }

  // ============================================================================
  // 2. USER SEARCH & 360 INSPECTION
  // ============================================================================

  static async searchUsers(filters: UserSearchFilters) {
    const where: any = {};

    if (filters.query) {
      const q = filters.query.trim();
      where.OR = [
        { id: { contains: q } },
        { username: { contains: q } },
        { displayName: { contains: q } },
        { email: { contains: q } },
      ];
    }

    if (filters.role) where.role = filters.role;
    if (filters.kycStatus) where.kycStatus = filters.kycStatus;
    if (filters.moderationState) where.moderationState = filters.moderationState;
    if (typeof filters.isBanned === "boolean") where.isBanned = filters.isBanned;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filters.limit || 50,
        skip: filters.offset || 0,
        include: {
          wallet: {
            select: {
              id: true,
              balance: true,
              purchasedBalance: true,
              promotionalBalance: true,
              bonusBalance: true,
              status: true,
            },
          },
          creatorProfile: {
            select: {
              id: true,
              stageName: true,
              moderationState: true,
              isLive: true,
              totalFollowers: true,
            },
          },
          _count: {
            select: {
              reportsReceived: true,
              reportsSubmitted: true,
              moderationCasesTarget: true,
              paymentTransactions: true,
            },
          },
        },
      }),
    ]);

    return { total, limit: filters.limit || 50, offset: filters.offset || 0, users };
  }

  static async getUser360(userId: string): Promise<User360Detail> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
        creatorProfile: true,
        ageAssuranceRecords: { orderBy: { verifiedAt: "desc" }, take: 5 },
      },
    });

    if (!user) {
      throw new Error(`User with ID ${userId} not found.`);
    }

    const [
      riskAssessments,
      deviceFingerprints,
      reportsReceived,
      reportsSubmitted,
      moderationCases,
      recentTransactions,
      auditHistory,
    ] = await Promise.all([
      prisma.riskAssessmentRecord.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.deviceFingerprintRecord.findMany({
        where: { userId },
        orderBy: { lastSeenAt: "desc" },
        take: 5,
      }),
      prisma.report.findMany({
        where: { reportedUserId: userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { reporter: { select: { id: true, username: true } } },
      }),
      prisma.report.findMany({
        where: { reporterId: userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.moderationCase.findMany({
        where: { reportedUserId: userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      user.wallet
        ? prisma.walletTransaction.findMany({
            where: {
              OR: [{ sourceWalletId: user.wallet.id }, { destinationWalletId: user.wallet.id }],
            },
            orderBy: { createdAt: "desc" },
            take: 15,
          })
        : [],
      prisma.auditEvent.findMany({
        where: { targetEntityType: "User", targetEntityId: userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return {
      user,
      wallet: user.wallet,
      creatorProfile: user.creatorProfile,
      riskAssessments,
      deviceFingerprints,
      reportsReceived,
      reportsSubmitted,
      moderationCases,
      recentTransactions,
      auditHistory,
    };
  }

  // ============================================================================
  // 3. CREATOR SEARCH & 360 INSPECTION
  // ============================================================================

  static async searchCreators(filters: CreatorSearchFilters) {
    const where: any = {};

    if (filters.query) {
      const q = filters.query.trim();
      where.OR = [
        { stageName: { contains: q } },
        { user: { username: { contains: q } } },
        { user: { email: { contains: q } } },
        { user: { displayName: { contains: q } } },
      ];
    }

    if (filters.category) where.category = filters.category;
    if (filters.moderationState) where.moderationState = filters.moderationState;
    if (typeof filters.isLive === "boolean") where.isLive = filters.isLive;
    if (filters.minFollowers) where.totalFollowers = { gte: filters.minFollowers };

    const [total, creators] = await Promise.all([
      prisma.creatorProfile.count({ where }),
      prisma.creatorProfile.findMany({
        where,
        orderBy: [{ isLive: "desc" }, { totalFollowers: "desc" }],
        take: filters.limit || 50,
        skip: filters.offset || 0,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
              avatarUrl: true,
              kycStatus: true,
              moderationState: true,
              isBanned: true,
            },
          },
          verifications: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: {
            select: {
              contents: true,
              followers: true,
              livestreams: true,
              payouts: true,
            },
          },
        },
      }),
    ]);

    return { total, limit: filters.limit || 50, offset: filters.offset || 0, creators };
  }

  static async getCreator360(creatorId: string): Promise<Creator360Detail> {
    const creator = await prisma.creatorProfile.findFirst({
      where: { OR: [{ id: creatorId }, { userId: creatorId }] },
      include: {
        user: true,
        verifications: { orderBy: { createdAt: "desc" } },
        payouts: { orderBy: { requestedAt: "desc" }, take: 10 },
      },
    });

    if (!creator) {
      throw new Error(`Creator profile with ID ${creatorId} not found.`);
    }

    const [earningsAgg, contentsCount, subscribersCount, activeLivestream, recentLivestreams, reportsReceived] =
      await Promise.all([
        prisma.creatorEarning.aggregate({
          where: { creatorProfileId: creator.id },
          _sum: {
            grossCredits: true,
            platformFeeCredits: true,
            netCreatorCredits: true,
          },
        }),
        prisma.content.count({ where: { creatorProfileId: creator.id } }),
        prisma.subscription.count({ where: { creatorProfileId: creator.id, status: "ACTIVE" } }),
        prisma.livestream.findFirst({ where: { creatorProfileId: creator.id, status: "LIVE" } }),
        prisma.livestream.findMany({
          where: { creatorProfileId: creator.id },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.report.findMany({
          where: { reportedCreatorProfileId: creator.id },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { reporter: { select: { id: true, username: true } } },
        }),
      ]);

    return {
      creator,
      user: creator.user,
      verifications: creator.verifications,
      earningsSummary: {
        totalGrossCredits: earningsAgg._sum.grossCredits || 0,
        totalPlatformFeeCredits: earningsAgg._sum.platformFeeCredits || 0,
        totalNetCredits: earningsAgg._sum.netCreatorCredits || 0,
        pendingHoldCredits: 0,
        clearedCredits: earningsAgg._sum.netCreatorCredits || 0,
      },
      payouts: creator.payouts,
      contentsCount,
      subscribersCount,
      activeLivestream,
      recentLivestreams,
      reportsReceived,
    };
  }

  // ============================================================================
  // 4. ACCOUNT MODERATION, FREEZING & BANNING
  // ============================================================================

  static async setAccountModeration(
    input: SetAccountModerationInput,
    adminContext: SecurityAdminContext
  ) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      include: { wallet: true, creatorProfile: true },
    });

    if (!user) {
      throw new Error(`User with ID ${input.userId} not found.`);
    }

    const oldState = user.moderationState;
    const newState = input.moderationState;
    const isBanned = newState === "BANNED";

    // 1. Transactional update on User & Wallet
    const updatedUser = await prisma.$transaction(async (tx: any) => {
      const u = await tx.user.update({
        where: { id: input.userId },
        data: {
          moderationState: newState,
          isBanned,
          banReason: isBanned ? input.banReason || input.reason : null,
          isActive: newState !== "BANNED" && newState !== "SUSPENDED",
        },
      });

      // Synchronize wallet freeze status
      if (user.wallet) {
        let walletStatus = "ACTIVE";
        if (newState === "SUSPENDED" || newState === "BANNED" || newState === "RESTRICTED") {
          walletStatus = "FROZEN_SECURITY";
        }
        await tx.wallet.update({
          where: { id: user.wallet.id },
          data: { status: walletStatus },
        });
      }

      // Synchronize creator profile status if applicable
      if (user.creatorProfile) {
        let creatorModState = user.creatorProfile.moderationState;
        if (newState === "BANNED" || newState === "SUSPENDED") {
          creatorModState = "SUSPENDED";
        } else if (newState === "RESTRICTED") {
          creatorModState = "RESTRICTED";
        } else if (newState === "ACTIVE" && user.creatorProfile.moderationState === "SUSPENDED") {
          creatorModState = "VERIFIED";
        }

        await tx.creatorProfile.update({
          where: { id: user.creatorProfile.id },
          data: {
            moderationState: creatorModState,
            isLive: newState === "BANNED" || newState === "SUSPENDED" ? false : user.creatorProfile.isLive,
          },
        });
      }

      return u;
    });

    // 2. Authoritative Audit Event
    await AuditService.logStateTransition({
      targetEntityType: "User",
      targetEntityId: input.userId,
      oldState,
      newState,
      reason: input.reason,
      actionName: "ADMIN_ACCOUNT_MODERATION_OVERRIDE",
      context: {
        actorId: adminContext.adminId,
        actorType: "ADMIN",
        ipAddress: adminContext.ipAddress,
        userAgent: adminContext.userAgent,
      },
      metadata: {
        adminUsername: adminContext.username,
        adminRole: adminContext.adminRole,
        banReason: input.banReason,
        durationHours: input.durationHours,
      },
    });

    return updatedUser;
  }

  // ============================================================================
  // 5. REPORTS & MODERATION QUEUE
  // ============================================================================

  static async listReports(params: {
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.category) where.category = params.category;

    const [total, reports] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: params.limit || 50,
        skip: params.offset || 0,
        include: {
          reporter: { select: { id: true, username: true, displayName: true } },
          reportedUser: { select: { id: true, username: true, displayName: true, moderationState: true } },
          reportedCreatorProfile: { select: { id: true, stageName: true, moderationState: true } },
          reportedContent: { select: { id: true, title: true, previewUrl: true, moderationState: true } },
          reportedLivestream: { select: { id: true, title: true, status: true } },
          moderationCases: true,
        },
      }),
    ]);

    return { total, limit: params.limit || 50, offset: params.offset || 0, reports };
  }

  static async resolveReport(
    reportId: string,
    action: "DISMISS" | "ACTION_TAKEN" | "ESCALATE",
    notes: string,
    adminContext: SecurityAdminContext
  ) {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new Error(`Report ${reportId} not found.`);

    const newStatus =
      action === "DISMISS"
        ? "RESOLVED_DISMISSED"
        : action === "ESCALATE"
        ? "ESCALATED_LEGAL"
        : "ACTION_TAKEN";

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: newStatus,
        assignedModeratorId: adminContext.adminId,
        moderatorNotes: notes,
        resolvedAt: new Date(),
      },
    });

    await AuditService.logEvent(
      {
        action: "ADMIN_REPORT_RESOLVED",
        targetEntityType: "Report",
        targetEntityId: reportId,
        oldState: report.status,
        newState: newStatus,
        reason: notes,
        metadata: { action, adminUsername: adminContext.username },
      },
      {
        actorId: adminContext.adminId,
        actorType: "ADMIN",
        ipAddress: adminContext.ipAddress,
        userAgent: adminContext.userAgent,
      }
    );

    return updated;
  }

  // ============================================================================
  // 6. CONTENT REVIEW & MODERATION
  // ============================================================================

  static async listPendingContent(params: {
    moderationState?: string;
    contentType?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (params.moderationState) {
      where.moderationState = params.moderationState;
    } else {
      where.moderationState = { in: ["PENDING", "RESTRICTED", "APPEALED"] };
    }
    if (params.contentType) where.contentType = params.contentType;

    const [total, items] = await Promise.all([
      prisma.content.count({ where }),
      prisma.content.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: params.limit || 50,
        skip: params.offset || 0,
        include: {
          creatorProfile: {
            select: {
              id: true,
              stageName: true,
              user: { select: { id: true, username: true, displayName: true } },
            },
          },
          _count: { select: { reports: true } },
        },
      }),
    ]);

    return { total, limit: params.limit || 50, offset: params.offset || 0, items };
  }

  static async reviewContent(input: ReviewContentInput, adminContext: SecurityAdminContext) {
    return await ContentModerationService.transitionState(
      input.contentId,
      input.decision as any,
      input.reason,
      {
        actorId: adminContext.adminId,
        actorType: "ADMIN",
        ipAddress: adminContext.ipAddress,
        userAgent: adminContext.userAgent,
      }
    );
  }

  // ============================================================================
  // 7. CREATOR VERIFICATION (18 U.S.C. § 2257 & KYC)
  // ============================================================================

  static async listPendingVerifications(params: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const where: any = {};
    if (params.status) {
      where.verificationStatus = params.status;
    } else {
      where.verificationStatus = "PENDING";
    }

    const [total, verifications] = await Promise.all([
      prisma.creatorVerification.count({ where }),
      prisma.creatorVerification.findMany({
        where,
        orderBy: { createdAt: "asc" },
        take: params.limit || 50,
        skip: params.offset || 0,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
              avatarUrl: true,
              kycStatus: true,
            },
          },
          creatorProfile: {
            select: {
              id: true,
              stageName: true,
              moderationState: true,
            },
          },
        },
      }),
    ]);

    return { total, limit: params.limit || 50, offset: params.offset || 0, verifications };
  }

  static async reviewVerification(
    input: ReviewVerificationInput,
    adminContext: SecurityAdminContext
  ) {
    const verification = await prisma.creatorVerification.findUnique({
      where: { id: input.verificationId },
      include: { creatorProfile: true, user: true },
    });

    if (!verification) {
      throw new Error(`Creator verification ${input.verificationId} not found.`);
    }

    const isApproved = input.decision === "APPROVED";
    const verificationStatus = isApproved ? "APPROVED" : "REJECTED";

    const updated = await prisma.$transaction(async (tx: any) => {
      // 1. Update verification record
      const v = await tx.creatorVerification.update({
        where: { id: input.verificationId },
        data: {
          verificationStatus,
          verifiedByAdminId: adminContext.adminId,
          verifiedAt: new Date(),
          rejectionReason: isApproved ? null : input.rejectionReason || "Verification failed compliance review.",
          complianceNotes: input.complianceNotes || null,
        },
      });

      // 2. Update user KYC status
      await tx.user.update({
        where: { id: verification.userId },
        data: {
          kycStatus: isApproved ? "COMPLIANCE_2257_APPROVED" : "REJECTED",
        },
      });

      // 3. Update Creator Profile moderation state
      await tx.creatorProfile.update({
        where: { id: verification.creatorProfileId },
        data: {
          moderationState: isApproved ? "MONETIZATION_ENABLED" : "APPLICATION",
        },
      });

      return v;
    });

    // 4. Audit Event
    await AuditService.logEvent(
      {
        action: "ADMIN_CREATOR_VERIFICATION_REVIEW",
        targetEntityType: "CreatorVerification",
        targetEntityId: input.verificationId,
        oldState: verification.verificationStatus,
        newState: verificationStatus,
        reason: isApproved ? "2257 & KYC Certified by Admin" : input.rejectionReason,
        metadata: {
          adminUsername: adminContext.username,
          legalName: `${verification.legalFirstName} ${verification.legalLastName}`,
          decision: input.decision,
          notes: input.complianceNotes,
        },
      },
      {
        actorId: adminContext.adminId,
        actorType: "ADMIN",
        ipAddress: adminContext.ipAddress,
        userAgent: adminContext.userAgent,
      }
    );

    return updated;
  }

  // ============================================================================
  // 8. PAYMENT INVESTIGATION & GATEWAY SEARCH
  // ============================================================================

  static async investigatePayments(params: {
    userId?: string;
    gateway?: string;
    status?: string;
    query?: string;
    minRiskScore?: number;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (params.userId) where.userId = params.userId;
    if (params.gateway) where.paymentGateway = params.gateway;
    if (params.status) where.status = params.status;
    if (params.minRiskScore) where.riskScore = { gte: params.minRiskScore };

    if (params.query) {
      const q = params.query.trim();
      where.OR = [
        { id: { contains: q } },
        { gatewayTransactionId: { contains: q } },
        { idempotencyKey: { contains: q } },
        { user: { username: { contains: q } } },
        { user: { email: { contains: q } } },
      ];
    }

    const [total, payments] = await Promise.all([
      prisma.paymentTransaction.count({ where }),
      prisma.paymentTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: params.limit || 50,
        skip: params.offset || 0,
        include: {
          user: {
            select: { id: true, username: true, displayName: true, email: true, moderationState: true },
          },
        },
      }),
    ]);

    return { total, limit: params.limit || 50, offset: params.offset || 0, payments };
  }

  static async getPaymentDetail(paymentId: string) {
    const payment = await prisma.paymentTransaction.findUnique({
      where: { id: paymentId },
      include: {
        user: { include: { wallet: true } },
      },
    });

    if (!payment) throw new Error(`Payment transaction ${paymentId} not found.`);

    // Find linked credit lots minted from this transaction
    const creditLots = await prisma.creditLot.findMany({
      where: { paymentTransactionId: payment.id },
      include: { deductions: true },
    });

    return { payment, creditLots };
  }

  // ============================================================================
  // 9. WALLET ACTIVITY & FORENSIC INVESTIGATION
  // ============================================================================

  static async investigateWallet(userIdOrWalletId: string) {
    const wallet = await prisma.wallet.findFirst({
      where: { OR: [{ id: userIdOrWalletId }, { userId: userIdOrWalletId }] },
      include: {
        user: { select: { id: true, username: true, displayName: true, email: true, role: true } },
        creditLots: { orderBy: { createdAt: "desc" }, take: 20 },
        walletHolds: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!wallet) throw new Error(`Wallet ${userIdOrWalletId} not found.`);

    // Fetch forensic statement and reconcile balance
    const [statement, reconciliation] = await Promise.all([
      WalletLedgerService.getWalletStatement(wallet.userId, { limit: 30 }),
      WalletLedgerService.reconcileWallet(wallet.id),
    ]);

    return { wallet, statement, reconciliation };
  }

  // ============================================================================
  // 10. CONTROLLED REFUNDS & ADJUSTMENTS
  // ============================================================================

  static async issueControlledRefund(
    input: IssueAdminRefundInput,
    adminContext: SecurityAdminContext
  ) {
    let transactionId = input.transactionId;

    // If purchase ID provided, look up transaction
    if (!transactionId && input.purchaseId) {
      const purchase = await prisma.contentPurchase.findUnique({
        where: { id: input.purchaseId },
      });
      transactionId = purchase?.walletTransactionId || undefined;
    }

    if (!transactionId) {
      throw new Error("A valid transactionId or purchaseId must be provided for refund.");
    }

    const result = await WalletLedgerService.processRefund({
      originalTransactionId: transactionId,
      reason: input.reason,
      requestedByUserId: adminContext.adminId,
      adminUserId: adminContext.adminId,
      idempotencyKey: input.idempotencyKey,
    });

    await AuditService.logEvent(
      {
        action: "ADMIN_CONTROLLED_REFUND",
        targetEntityType: "WalletTransaction",
        targetEntityId: transactionId,
        reason: input.reason,
        metadata: {
          adminUsername: adminContext.username,
          adminRole: adminContext.adminRole,
          refundResult: result,
        },
      },
      {
        actorId: adminContext.adminId,
        actorType: "ADMIN",
        ipAddress: adminContext.ipAddress,
        userAgent: adminContext.userAgent,
      }
    );

    return result;
  }

  static async issueAdminAdjustment(
    input: IssueAdminAdjustmentInput,
    adminContext: SecurityAdminContext
  ) {
    if (input.amountCredits <= 0) {
      throw new Error("Adjustment amount credits must be strictly positive.");
    }

    let result;
    if (input.direction === "CREDIT") {
      if (input.creditType === "PROMOTIONAL") {
        result = await WalletLedgerService.grantPromotionalCredits({
          userId: input.userId,
          amountCredits: input.amountCredits,
          reason: input.reason,
          idempotencyKey: input.idempotencyKey,
          durationDays: 30,
          adminUserId: adminContext.adminId,
        });
      } else {
        result = await WalletLedgerService.grantBonusCredits({
          userId: input.userId,
          amountCredits: input.amountCredits,
          reason: input.reason,
          idempotencyKey: input.idempotencyKey,
          adminUserId: adminContext.adminId,
        });
      }
    } else {
      // Admin debit adjustment
      result = await prisma.$transaction(async (tx: any) => {
        const wallet = await WalletLedgerService.getOrCreateWallet(input.userId, tx);
        if (wallet.balance < input.amountCredits) {
          throw new Error(`Cannot debit ${input.amountCredits} credits: wallet only has ${wallet.balance}.`);
        }

        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore - input.amountCredits;

        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: balanceAfter,
            purchasedBalance: Math.max(0, wallet.purchasedBalance - input.amountCredits),
            version: { increment: 1 },
          },
        });

        const walletTx = await tx.walletTransaction.create({
          data: {
            sourceWalletId: wallet.id,
            transactionType: "ADMIN_ADJUSTMENT",
            direction: "DEBIT",
            amountCredits: input.amountCredits,
            sourceBalanceBefore: balanceBefore,
            sourceBalanceAfter: balanceAfter,
            idempotencyKey: input.idempotencyKey,
            status: "COMPLETED",
            note: input.reason,
          },
        });

        return { wallet: updatedWallet, transaction: walletTx };
      });
    }

    await AuditService.logEvent(
      {
        action: "ADMIN_WALLET_BALANCE_ADJUSTMENT",
        targetEntityType: "User",
        targetEntityId: input.userId,
        reason: input.reason,
        metadata: {
          adminUsername: adminContext.username,
          direction: input.direction,
          creditType: input.creditType,
          amountCredits: input.amountCredits,
          idempotencyKey: input.idempotencyKey,
          notes: input.notes,
        },
      },
      {
        actorId: adminContext.adminId,
        actorType: "ADMIN",
        ipAddress: adminContext.ipAddress,
        userAgent: adminContext.userAgent,
      }
    );

    return result;
  }

  // ============================================================================
  // 11. CHARGEBACKS & DISPUTE RESOLUTION
  // ============================================================================

  static async listChargebacks(params: { status?: string; limit?: number; offset?: number }) {
    const where: any = {
      status: params.status || "DISPUTED_CHARGEBACK",
    };

    const [total, chargebacks] = await Promise.all([
      prisma.paymentTransaction.count({ where }),
      prisma.paymentTransaction.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: params.limit || 50,
        skip: params.offset || 0,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
              moderationState: true,
              isBanned: true,
            },
          },
        },
      }),
    ]);

    return { total, limit: params.limit || 50, offset: params.offset || 0, chargebacks };
  }

  static async handleChargebackDispute(
    input: HandleChargebackInput,
    adminContext: SecurityAdminContext
  ) {
    const result = await WalletLedgerService.processChargebackDispute({
      paymentTransactionId: input.paymentTransactionId,
      disputeReferenceId: input.chargebackId || `cb_${Date.now()}`,
      disputeFeeCents: input.gatewayFeeCents || 1500,
      reason: input.reason,
      idempotencyKey: `cb_handle_${input.paymentTransactionId}_${Date.now()}`,
    });

    await AuditService.logEvent(
      {
        action: "ADMIN_CHARGEBACK_DISPUTE_PROCESSED",
        targetEntityType: "PaymentTransaction",
        targetEntityId: input.paymentTransactionId,
        reason: input.reason,
        metadata: {
          adminUsername: adminContext.username,
          freezeWallet: input.freezeWallet,
          evidenceNotes: input.evidenceNotes,
        },
      },
      {
        actorId: adminContext.adminId,
        actorType: "ADMIN",
        ipAddress: adminContext.ipAddress,
        userAgent: adminContext.userAgent,
      }
    );

    return result;
  }

  // ============================================================================
  // 12. CREATOR PAYOUT REVIEW & APPROVAL
  // ============================================================================

  static async listPayoutRequests(params: { status?: string; limit?: number; offset?: number }) {
    const where: any = {};
    if (params.status) {
      where.status = params.status;
    } else {
      where.status = { in: ["REQUESTED", "UNDER_COMPLIANCE_REVIEW", "PROCESSING"] };
    }

    const [total, payouts] = await Promise.all([
      prisma.payout.count({ where }),
      prisma.payout.findMany({
        where,
        orderBy: { requestedAt: "asc" },
        take: params.limit || 50,
        skip: params.offset || 0,
        include: {
          creatorProfile: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  email: true,
                  kycStatus: true,
                  moderationState: true,
                },
              },
            },
          },
          reviewedByAdmin: {
            select: { id: true, username: true, displayName: true },
          },
        },
      }),
    ]);

    return { total, limit: params.limit || 50, offset: params.offset || 0, payouts };
  }

  static async reviewPayout(input: ReviewPayoutInput, adminContext: SecurityAdminContext) {
    const payout = await prisma.payout.findUnique({
      where: { id: input.payoutId },
      include: { creatorProfile: { include: { user: true } } },
    });

    if (!payout) throw new Error(`Payout request ${input.payoutId} not found.`);

    const isApprove = input.decision === "APPROVE";
    const nextStatus = isApprove ? "COMPLETED" : "REJECTED";

    const updated = await prisma.$transaction(async (tx: any) => {
      const p = await tx.payout.update({
        where: { id: input.payoutId },
        data: {
          status: nextStatus,
          reviewedByAdminId: adminContext.adminId,
          reviewedAt: new Date(),
          completedAt: isApprove ? new Date() : null,
          failureReason: isApprove ? null : input.rejectionReason || "Payout rejected by administrator.",
          gatewayReferenceId: input.gatewayReferenceId || payout.gatewayReferenceId,
        },
      });

      // If approved, mark creator earnings as PAID_OUT
      if (isApprove) {
        await tx.creatorEarning.updateMany({
          where: {
            creatorProfileId: payout.creatorProfileId,
            clearanceStatus: "CLEARED",
          },
          data: { clearanceStatus: "PAID_OUT" },
        });
      }

      // If rejected, refund the deducted credits back to the creator wallet
      if (!isApprove && payout.creditsDeducted > 0) {
        const creatorWallet = await tx.wallet.findUnique({
          where: { userId: payout.creatorProfile.userId },
        });

        if (creatorWallet) {
          await tx.wallet.update({
            where: { id: creatorWallet.id },
            data: {
              balance: { increment: payout.creditsDeducted },
              purchasedBalance: { increment: payout.creditsDeducted },
            },
          });

          await tx.walletTransaction.create({
            data: {
              destinationWalletId: creatorWallet.id,
              transactionType: "REFUND",
              direction: "CREDIT",
              amountCredits: payout.creditsDeducted,
              destBalanceBefore: creatorWallet.balance,
              destBalanceAfter: creatorWallet.balance + payout.creditsDeducted,
              idempotencyKey: `payout_reject_refund_${payout.id}_${Date.now()}`,
              note: `Refund of deducted credits from rejected payout ${payout.id}`,
            },
          });
        }
      }

      return p;
    });

    await AuditService.logEvent(
      {
        action: "ADMIN_CREATOR_PAYOUT_REVIEW",
        targetEntityType: "Payout",
        targetEntityId: input.payoutId,
        oldState: payout.status,
        newState: nextStatus,
        reason: isApprove ? "Payout Approved & Settled" : input.rejectionReason,
        metadata: {
          adminUsername: adminContext.username,
          amountFiatCents: payout.amountFiatCents,
          creditsDeducted: payout.creditsDeducted,
          creatorUsername: payout.creatorProfile.user.username,
        },
      },
      {
        actorId: adminContext.adminId,
        actorType: "ADMIN",
        ipAddress: adminContext.ipAddress,
        userAgent: adminContext.userAgent,
      }
    );

    return updated;
  }

  // ============================================================================
  // 13. LIVESTREAM INCIDENT MONITORING & KILL SWITCH
  // ============================================================================

  static async listLivestreamIncidents() {
    const activeStreams = await prisma.livestream.findMany({
      where: { status: "LIVE" },
      orderBy: { currentViewerCount: "desc" },
      include: {
        creatorProfile: {
          include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
        },
        reports: { where: { status: "OPEN" } },
        _count: { select: { participants: true, reports: true } },
      },
    });

    const terminatedIncidents = await prisma.livestream.findMany({
      where: { status: "TERMINATED_SAFETY" },
      orderBy: { endedAt: "desc" },
      take: 10,
      include: {
        creatorProfile: {
          include: { user: { select: { id: true, username: true, displayName: true } } },
        },
      },
    });

    return { activeStreams, terminatedIncidents };
  }

  static async terminateLivestream(
    input: TerminateLivestreamInput,
    adminContext: SecurityAdminContext
  ) {
    const stream = await prisma.livestream.findUnique({
      where: { id: input.livestreamId },
      include: { creatorProfile: true },
    });

    if (!stream) throw new Error(`Livestream ${input.livestreamId} not found.`);

    const updated = await prisma.$transaction(async (tx: any) => {
      const s = await tx.livestream.update({
        where: { id: input.livestreamId },
        data: {
          status: "TERMINATED_SAFETY",
          endedAt: new Date(),
        },
      });

      await tx.creatorProfile.update({
        where: { id: stream.creatorProfileId },
        data: { isLive: false },
      });

      if (input.moderationAction === "SUSPEND_CREATOR") {
        await tx.creatorProfile.update({
          where: { id: stream.creatorProfileId },
          data: { moderationState: "SUSPENDED" },
        });

        await tx.user.update({
          where: { id: stream.creatorProfile.userId },
          data: { moderationState: "SUSPENDED" },
        });
      }

      return s;
    });

    // Realtime broadcast room emergency shutdown
    try {
      eventBus.publish(`stream:${input.livestreamId}`, {
        type: "STREAM_TERMINATED_SAFETY" as any,
        payload: {
          reason: input.reason,
          terminatedAt: new Date().toISOString(),
        },
      });
    } catch {
      // Best-effort realtime publish
    }

    await AuditService.logEvent(
      {
        action: "ADMIN_LIVESTREAM_EMERGENCY_KILL",
        targetEntityType: "Livestream",
        targetEntityId: input.livestreamId,
        oldState: stream.status,
        newState: "TERMINATED_SAFETY",
        reason: input.reason,
        metadata: {
          adminUsername: adminContext.username,
          creatorProfileId: stream.creatorProfileId,
          moderationAction: input.moderationAction,
        },
      },
      {
        actorId: adminContext.adminId,
        actorType: "ADMIN",
        ipAddress: adminContext.ipAddress,
        userAgent: adminContext.userAgent,
      }
    );

    return updated;
  }

  // ============================================================================
  // 14. AUDIT HISTORY & CRYPTOGRAPHIC VERIFICATION
  // ============================================================================

  static async queryAuditLogs(params: {
    targetEntityType?: string;
    targetEntityId?: string;
    actorId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }) {
    return await AuditService.queryAuditLogs(params);
  }

  static async verifyAuditIntegrity(targetEntityType: string, targetEntityId: string) {
    return await AuditService.verifyAuditChain(targetEntityType, targetEntityId);
  }
}
