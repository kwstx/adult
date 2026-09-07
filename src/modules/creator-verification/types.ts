/**
 * ============================================================================
 * CREATOR VERIFICATION & ONBOARDING STATE MACHINE: TYPE DEFINITIONS
 * ============================================================================
 * 
 * Formal type definitions, state representations, compliance payload schemas,
 * step status tracking, and backend permission guard models.
 */

import {
  GovIdType,
  VerificationStatus,
  CreatorModerationState,
  PayoutMethod,
  UserRole,
  KYCStatus,
} from "@prisma/client";

// Re-export Prisma enums
export {
  GovIdType,
  VerificationStatus,
  CreatorModerationState,
  PayoutMethod,
  UserRole,
  KYCStatus,
};

// ============================================================================
// 1. ONBOARDING STATE ENUM
// ============================================================================

/**
 * High-resolution state machine states for Creator Onboarding:
 * 1. DRAFT: Application initiated, pending required basic information.
 * 2. INFORMATION_COLLECTED: Profile, stage name, category, legal contact info provided.
 * 3. IDENTITY_VERIFIED: Automated/manual KYC passed (Gov ID Front/Back + Biometric Liveness + Age >= 18).
 * 4. CONSENT_PROVENANCE_SATISFIED: 18 U.S.C. § 2257 statement signed, performer release executed, custodian registered.
 * 5. PLATFORM_REVIEWED: Platform compliance / Trust & Safety officer manual/automated risk review approved.
 * 6. PAYOUT_SETUP_COMPLETED: Payout destination (Bank SEPA/ACH, Paxum, CosmoPay, MassPay) verified & Tax form certified.
 * 7. MONETIZATION_ENABLED: Fully active. Authorized to sell, publish PPV, stream, and receive creator earnings.
 * 
 * Exceptional / Non-linear states:
 * - REVISION_REQUIRED: Application returned to creator for document/info corrections.
 * - REJECTED: Permanently rejected (underage, fraud, compliance breach).
 * - RESTRICTED: Temporary administrative/compliance hold on an active creator.
 * - SUSPENDED: Platform ban / safety termination.
 */
export type CreatorOnboardingState =
  | "DRAFT"
  | "INFORMATION_COLLECTED"
  | "IDENTITY_VERIFIED"
  | "CONSENT_PROVENANCE_SATISFIED"
  | "PLATFORM_REVIEWED"
  | "PAYOUT_SETUP_COMPLETED"
  | "MONETIZATION_ENABLED"
  | "REVISION_REQUIRED"
  | "REJECTED"
  | "RESTRICTED"
  | "SUSPENDED";

// ============================================================================
// 2. ACTOR & SECURITY CONTEXT
// ============================================================================

export interface SecurityContext {
  actorId?: string;
  actorRole?: "FAN" | "CREATOR" | "MODERATOR" | "ADMIN" | "AUDITOR" | "SYSTEM_AUTOMATION";
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

// ============================================================================
// 3. STEP PAYLOAD INTERFACES
// ============================================================================

/**
 * Step 1 & 2: Application & Required Creator Information
 */
export interface CreatorInformationInput {
  stageName: string;
  legalFirstName: string;
  legalLastName: string;
  bio?: string;
  category: string;
  tags?: string[];
  countryOfResidence: string;
  residentialAddress: string;
  city: string;
  postalCode: string;
  contactEmail: string;
  contactPhone?: string;
}

/**
 * Step 3: Identity Verification (KYC + Age Assurance)
 */
export interface IdentityVerificationInput {
  idType: GovIdType;
  idNumber: string;
  idDocumentFrontUrl: string;
  idDocumentBackUrl?: string;
  selfieWithIdUrl: string;
  dateOfBirth: string; // ISO format: YYYY-MM-DD
  issuingCountry: string;
  expirationDate?: string; // ISO format: YYYY-MM-DD
  kycProviderReference?: string;
  livenessConfidenceScore?: number; // 0.0 - 1.0
}

/**
 * Step 4: Consent, 18 U.S.C. § 2257 & Content Provenance
 */
export interface ConsentProvenanceInput {
  // 18 U.S.C. § 2257 statutory statement
  statutory2257Acknowledged: boolean;
  legalFullNameSignature: string;
  signatureTimestamp: string; // ISO DateTime
  primaryCustodianName: string;
  primaryCustodianAddress: string;
  secondaryCustodianName?: string;
  secondaryCustodianAddress?: string;

  // Performer Consent & Release Form
  performerConsentAgreementSigned: boolean;
  performerReleaseDocumentUrl?: string;
  allowsThirdPartyCollaborators: boolean;
  collaboratorConsentRecordVaultUrl?: string;

  // Content Provenance Declaration
  provenanceAttestation: {
    soleCopyrightHolder: boolean;
    allPerformersAge18Plus: boolean;
    noNonConsensualMedia: boolean;
    noProhibitedContentCategories: boolean;
  };
}

/**
 * Step 5: Platform Review (Trust & Safety / Compliance Officer)
 */
export interface PlatformReviewInput {
  reviewerId: string;
  decision: "APPROVED" | "REVISION_REQUESTED" | "REJECTED";
  complianceNotes: string;
  riskScore?: number; // 0 - 100
  sanctionsCheckPassed: boolean;
  pepCheckPassed: boolean; // Politically Exposed Person
  flaggedIssues?: string[];
}

/**
 * Step 6: Payout Setup & Tax Compliance
 */
export interface PayoutSetupInput {
  payoutMethod: PayoutMethod;
  beneficiaryName: string;
  currency: string; // e.g. USD, EUR, GBP
  // Encrypted / tokenized beneficiary details: IBAN / Account Number / Paxum Email / Wallet Address
  beneficiaryAccountData: {
    ibanOrAccountNumber?: string;
    routingOrSwiftCode?: string;
    bankName?: string;
    paxumEmail?: string;
    cosmoPayId?: string;
    cryptoWalletAddress?: string;
    cryptoNetwork?: string;
  };
  // Tax Certification (W-9 for US, W-8BEN for International)
  taxFormType: "W9" | "W8BEN" | "W8BEN_E";
  taxIdNumberOrSSN: string; // Will be securely encrypted
  taxCertificationConfirmed: boolean;
  taxSignatureName: string;
  taxSignatureDate: string;
}

/**
 * Step 7: Monetization Enablement Activation
 */
export interface MonetizationActivationInput {
  activationNotes?: string;
  agreedToTermsVersion: string;
}

// ============================================================================
// 4. ONBOARDING STATUS & PROGRESS TRACKING
// ============================================================================

export interface OnboardingStepProgress {
  stepIndex: number;
  stepKey: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isCurrent: boolean;
  isBlocked: boolean;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatorOnboardingProgress {
  creatorProfileId: string;
  userId: string;
  stageName: string;
  currentState: CreatorOnboardingState;
  moderationState: CreatorModerationState;
  isMonetizationEnabled: boolean;
  canSell: boolean;
  canReceiveEarnings: boolean;
  canBroadcastLive: boolean;
  canRequestPayout: boolean;
  currentStepIndex: number;
  totalSteps: number;
  completionPercentage: number;
  steps: OnboardingStepProgress[];
  blockers: string[];
  rejectionReason?: string;
  complianceNotes?: string;
  lastUpdated: string;
}

// ============================================================================
// 5. BACKEND PERMISSION CHECK RESULTS
// ============================================================================

export interface CreatorPermissionsCheckResult {
  authorized: boolean;
  creatorProfileId: string;
  currentState: CreatorOnboardingState;
  moderationState: CreatorModerationState;
  reason?: string;
  requiredStep?: string;
  missingRequirements?: string[];
}
