/**
 * ============================================================================
 * CREATOR AFFILIATE & REFERRAL ATTRIBUTION ENGINE - TYPES & INTERFACES
 * ============================================================================
 */

import {
  AttributionModelType,
  AttributionStatus,
  AffiliateCommissionStatus,
  AffiliateSourceType,
} from "@/generated/prisma";

export {
  AttributionModelType,
  AttributionStatus,
  AffiliateCommissionStatus,
  AffiliateSourceType,
};

export interface SignedReferralPayload {
  code: string;
  creatorProfileId: string;
  campaignName?: string;
  commissionRatePercent: number;
  spendWindowDays: number;
  issuedAt: number; // Unix timestamp ms
  expiresAt: number; // Unix timestamp ms
  nonce: string;
}

export interface SignedReferralTokenResult {
  token: string;
  code: string;
  creatorProfileId: string;
  vanityUrl: string;
  expiresAt: Date;
}

export interface RecordTouchpointInput {
  referralCode: string;
  anonymousSessionId: string;
  deviceFingerprintHash?: string;
  ipAddress?: string;
  userAgent?: string;
  landingPage?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  targetUserId?: string;
}

export interface TouchpointRecordResult {
  touchpointId: string;
  referralCode: string;
  creatorProfileId: string;
  signedAttributionCookie: string;
  cookieExpiresAt: Date;
}

export interface AttributeUserRegistrationInput {
  newUserId: string;
  referralCode?: string;
  signedToken?: string;
  anonymousSessionId?: string;
  deviceFingerprintHash?: string;
  ipAddress?: string;
  userAgent?: string;
  userEmail?: string;
}

export interface ReferralFraudCheckResult {
  isAllowed: boolean;
  fraudStatus: "PASSED" | "FLAGGED_REVIEW" | "BLOCKED";
  fraudReason?: string;
  riskScore: number;
  matchedRules: string[];
}

export interface AttributionRecordResult {
  attributionId: string;
  referredUserId: string;
  referringCreatorProfileId: string;
  referralCodeId?: string | null;
  attributionModel: AttributionModelType;
  status: AttributionStatus;
  commissionRatePercent: number;
  spendWindowDays: number;
  windowExpiresAt: Date;
  fraudCheckStatus: string;
}

export interface EvaluateCommissionInput {
  referredUserId: string;
  sourceType: AffiliateSourceType;
  grossAmountCredits: number;
  sourceTransactionId?: string;
  paymentMethodFingerprint?: string;
  notes?: string;
}

export interface CommissionEvaluationResult {
  isCommissionAwarded: boolean;
  referralAttributionId?: string;
  referringCreatorProfileId?: string;
  grossAmountCredits: number;
  commissionRatePercent: number;
  commissionCredits: number;
  commissionLedgerId?: string;
  creatorEarningId?: string;
  status: AffiliateCommissionStatus;
  reason?: string;
}

export interface CreatorAffiliateStats {
  creatorProfileId: string;
  totalClicks: number;
  totalSignups: number;
  conversionRatePercent: number;
  activeSpendersCount: number;
  totalCommissionEarnedCredits: number;
  totalCommissionEarnedFiat: number;
  currency: string;
  activeLinksCount: number;
  fraudBlockedAttempts: number;
}

export interface CreatorReferralLinkSummary {
  id: string;
  code: string;
  campaignName: string | null;
  vanityUrl: string;
  commissionRatePercent: number;
  cookieWindowDays: number;
  spendWindowDays: number;
  isActive: boolean;
  totalClicks: number;
  totalSignups: number;
  totalEarningsCredits: number;
  conversionRatePercent: number;
  createdAt: Date;
}

export interface CreateReferralLinkInput {
  creatorProfileId: string;
  vanityCode: string;
  campaignName?: string;
  commissionRatePercent?: number; // Defaults to 10.0%
  cookieWindowDays?: number; // Defaults to 30 days
  spendWindowDays?: number; // Defaults to 30 days
}
