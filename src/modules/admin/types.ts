/**
 * ============================================================================
 * AUTHORITATIVE ADMINISTRATION & INTERNAL PLATFORM TYPES
 * ============================================================================
 */

import {
  UserRole,
  KYCStatus,
  AccountModerationState,
  CreatorModerationState,
  VerificationStatus,
  ReportCategory,
  ReportStatus,
  ModerationPriority,
  ContentModerationState,
  PaymentGateway,
  PaymentTransactionStatus,
  PayoutStatus,
  PayoutMethod,
  WalletTransactionType,
  StreamStatus,
} from "@prisma/client";

// ----------------------------------------------------------------------------
// 1. RBAC & PERMISSION TYPES
// ----------------------------------------------------------------------------

export type AdminRole = "SUPER_ADMIN" | "COMPLIANCE_OFFICER" | "FINANCIAL_AUDITOR" | "CONTENT_MODERATOR" | "SUPPORT_LEAD";

export type AdminPermission =
  | "USERS_VIEW"
  | "USERS_MANAGE"
  | "USERS_FREEZE"
  | "USERS_BAN"
  | "CREATORS_VIEW"
  | "CREATORS_MANAGE"
  | "CREATORS_VERIFY"
  | "REPORTS_VIEW"
  | "REPORTS_RESOLVE"
  | "CONTENT_VIEW"
  | "CONTENT_MODERATE"
  | "PAYMENTS_VIEW"
  | "WALLETS_VIEW"
  | "FINANCIAL_REFUND"
  | "FINANCIAL_ADJUST"
  | "CHARGEBACKS_VIEW"
  | "CHARGEBACKS_RESOLVE"
  | "PAYOUTS_VIEW"
  | "PAYOUTS_REVIEW"
  | "INCIDENTS_VIEW"
  | "INCIDENTS_TERMINATE"
  | "AUDIT_VIEW"
  | "AUDIT_VERIFY"
  | "SYSTEM_SETTINGS";

export interface AdminSession {
  adminId: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  adminRole: AdminRole;
  permissions: AdminPermission[];
  token: string;
  expiresAt: string;
  issuedAt: string;
  ipAddress?: string;
  requiresStepUp?: boolean;
}

export interface SecurityAdminContext {
  adminId: string;
  username: string;
  adminRole: AdminRole;
  ipAddress?: string;
  userAgent?: string;
  stepUpConfirmed?: boolean;
}

// ----------------------------------------------------------------------------
// 2. DASHBOARD OVERVIEW & METRICS
// ----------------------------------------------------------------------------

export interface DashboardOverviewStats {
  totalUsers: number;
  totalCreators: number;
  activeLiveRooms: number;
  openReportsCount: number;
  urgentReportsCount: number;
  pendingVerificationsCount: number;
  pendingContentCount: number;
  pendingPayoutsCount: number;
  disputedChargebacksCount: number;
  frozenWalletsCount: number;
  totalPlatformVolumeCredits: number;
  totalPendingPayoutsCents: number;
  systemHealth: "HEALTHY" | "DEGRADED" | "CRITICAL";
  auditChainIntact: boolean;
}

// ----------------------------------------------------------------------------
// 3. USER & CREATOR SEARCH INPUTS & RESPONSES
// ----------------------------------------------------------------------------

export interface UserSearchFilters {
  query?: string;
  role?: UserRole;
  kycStatus?: KYCStatus;
  moderationState?: AccountModerationState;
  isBanned?: boolean;
  minRiskScore?: number;
  limit?: number;
  offset?: number;
}

export interface CreatorSearchFilters {
  query?: string;
  category?: string;
  moderationState?: CreatorModerationState;
  isLive?: boolean;
  minFollowers?: number;
  limit?: number;
  offset?: number;
}

export interface User360Detail {
  user: any;
  wallet: any;
  creatorProfile: any;
  riskAssessments: any[];
  deviceFingerprints: any[];
  reportsReceived: any[];
  reportsSubmitted: any[];
  moderationCases: any[];
  recentTransactions: any[];
  auditHistory: any[];
}

export interface Creator360Detail {
  creator: any;
  user: any;
  verifications: any[];
  earningsSummary: {
    totalGrossCredits: number;
    totalPlatformFeeCredits: number;
    totalNetCredits: number;
    pendingHoldCredits: number;
    clearedCredits: number;
  };
  payouts: any[];
  contentsCount: number;
  subscribersCount: number;
  activeLivestream: any;
  recentLivestreams: any[];
  reportsReceived: any[];
}

// ----------------------------------------------------------------------------
// 4. ACTION INPUT PAYLOADS
// ----------------------------------------------------------------------------

export interface SetAccountModerationInput {
  userId: string;
  moderationState: AccountModerationState;
  reason: string;
  banReason?: string;
  durationHours?: number;
}

export interface ReviewContentInput {
  contentId: string;
  decision: "APPROVED" | "RESTRICTED" | "REMOVED" | "REJECTED";
  reason: string;
}

export interface ReviewVerificationInput {
  verificationId: string;
  decision: "APPROVED" | "REJECTED";
  rejectionReason?: string;
  complianceNotes?: string;
}

export interface IssueAdminRefundInput {
  transactionId?: string;
  purchaseId?: string;
  reason: string;
  idempotencyKey: string;
  customCreditsToRefund?: number;
}

export interface IssueAdminAdjustmentInput {
  userId: string;
  direction: "CREDIT" | "DEBIT";
  creditType: "PURCHASED" | "PROMOTIONAL" | "BONUS";
  amountCredits: number;
  reason: string;
  idempotencyKey: string;
  notes?: string;
}

export interface HandleChargebackInput {
  paymentTransactionId: string;
  chargebackId?: string;
  gatewayFeeCents?: number;
  freezeWallet?: boolean;
  reason: string;
  evidenceNotes?: string;
}

export interface ReviewPayoutInput {
  payoutId: string;
  decision: "APPROVE" | "REJECT";
  rejectionReason?: string;
  gatewayReferenceId?: string;
}

export interface TerminateLivestreamInput {
  livestreamId: string;
  reason: string;
  moderationAction?: "TERMINATE_ONLY" | "SUSPEND_CREATOR";
}
