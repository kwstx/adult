/**
 * ============================================================================
 * AUTHORITATIVE TRUST & SAFETY ARCHITECTURE: TYPE DEFINITIONS
 * ============================================================================
 * 
 * Core domain types, state machines, case management, automated signals,
 * evidence schemas, appeal workflows, and immutable audit event models.
 */

import {
  ContentModerationState,
  AccountModerationState,
  CreatorModerationState,
  AppealStatus,
  ReportedObjectType,
  ReportCategory,
  ReportStatus,
  ModerationPriority,
  ModerationCaseStatus,
  ModerationActionType,
} from "@prisma/client";

// Re-export Prisma enums as canonical domain enums
export {
  ContentModerationState,
  AccountModerationState,
  CreatorModerationState,
  AppealStatus,
  ReportedObjectType,
  ReportCategory,
  ReportStatus,
  ModerationPriority,
  ModerationCaseStatus,
  ModerationActionType,
};

// ============================================================================
// COMPLIANCE & AGE VERIFICATION TYPES
// ============================================================================

export type {
  AgeVerificationMethod,
  AgeVerificationResult,
} from "./age-verification/types";

export type KycStatus = "UNVERIFIED" | "PENDING" | "AGE_VERIFIED" | "COMPLIANCE_2257_APPROVED" | "REJECTED" | "SUSPENDED";


export interface Compliance2257Payload {
  creatorId: string;
  legalFullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  governmentIdType: "PASSPORT" | "DRIVERS_LICENSE" | "NATIONAL_ID" | "RESIDENCE_PERMIT";
  idNumber: string;
  documentVaultUrl: string;
}

// ============================================================================
// 1. ACTOR & IDENTITY CONTEXT
// ============================================================================

export type ActorType =
  | "USER"
  | "CREATOR"
  | "MODERATOR"
  | "ADMIN"
  | "SYSTEM_AUTOMATION"
  | "EXTERNAL_REGULATOR";

export interface SecurityContext {
  actorId?: string;
  actorType: ActorType;
  actorRole?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

// ============================================================================
// 2. AUTOMATED SIGNALS & THREAT DETECTION
// ============================================================================

export interface MediaPerceptualHashSignal {
  pHash?: string;
  knownBadMatch: boolean;
  matchDatabase?: "CSAM_PHOTODNA" | "COPYRIGHT_FINGERPRINT" | "KNOWN_FRAUD_VAULT" | "NONE";
  similarityScore: number; // 0.0 - 1.0
}

export interface TextSafetySignal {
  toxicityScore: number; // 0.0 - 1.0
  severeHarassmentScore: number;
  underageSolicitationScore: number;
  threatViolenceScore: number;
  phishingOrScamScore: number;
  flaggedKeywords: string[];
}

export interface AccountVelocitySignal {
  registrationsFromSameIp24h: number;
  chargebackRateScore: number; // 0.0 - 1.0
  burnerEmailRisk: boolean;
  priorViolationCount: number;
  accountAgeDays: number;
}

export interface ReporterTrustSignal {
  reporterHistoricalAccuracyRate: number; // 0.0 - 1.0
  priorReportsSubmitted: number;
  falseReportRate: number;
  isBrigadeRisk: boolean;
}

export interface AutomatedSignals {
  compositeRiskScore: number; // 0 - 100
  recommendedPriority: ModerationPriority;
  recommendedAction?: ModerationActionType;
  mediaHashSignal?: MediaPerceptualHashSignal;
  textSafetySignal?: TextSafetySignal;
  velocitySignal?: AccountVelocitySignal;
  reporterSignal?: ReporterTrustSignal;
  duplicateReportsCount: number;
  triggeredPolicyCodes: string[];
  evaluatedAt: string; // ISO DateTime
  evaluatorVersion: string;
}

// ============================================================================
// 3. STRUCTURED EVIDENCE
// ============================================================================

export type EvidenceType =
  | "IMAGE_SCREENSHOT"
  | "VIDEO_CLIP_OR_TIMESTAMP"
  | "CHAT_LOG_SNIPPET"
  | "DOCUMENT_VAULT_REF"
  | "URL_LINK"
  | "SYSTEM_TELEMETRY"
  | "NETWORK_PAYLOAD";

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  url?: string;
  textSnippet?: string;
  timestampSeconds?: number;
  capturedAt: string;
  notes?: string;
  sha256Hash?: string;
}

// ============================================================================
// 4. MODERATION CASE & DECISION TYPES
// ============================================================================

export interface CreateCaseInput {
  sourceReportId?: string;
  reportedObjectType: ReportedObjectType;
  reportedObjectId: string;
  reporterId?: string;
  reporterType?: ActorType;
  reasonCategory: ReportCategory;
  reason: string;
  evidenceItems?: EvidenceItem[];
  automatedSignals?: Partial<AutomatedSignals>;
  priority?: ModerationPriority;
}

export interface RenderDecisionInput {
  caseId: string;
  reviewerId: string;
  decision: string; // e.g., "APPROVED", "RESTRICTED", "REMOVED", "SUSPENDED", "BANNED", "DISMISSED"
  decisionAction: ModerationActionType;
  decisionNotes: string;
  policyViolations?: string[];
  actionDurationHours?: number; // For temporary suspensions
}

export interface SubmitAppealInput {
  caseId: string;
  appellantUserId: string;
  appealReason: string;
  appealEvidenceItems?: EvidenceItem[];
}

export interface ReviewAppealInput {
  caseId: string;
  reviewerId: string;
  overturnDecision: boolean; // true = overturn & restore, false = uphold penalty
  decisionNotes: string;
}

// ============================================================================
// 5. IMMUTABLE AUDIT TRAIL
// ============================================================================

export interface AuditLogInput {
  actorId?: string;
  actorType?: ActorType;
  action: string;
  targetEntityType: "Content" | "User" | "CreatorProfile" | "ModerationCase" | "Report" | "Compliance2257";
  targetEntityId: string;
  oldState?: string;
  newState?: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditVerificationResult {
  isValid: boolean;
  totalEventsChecked: number;
  lastEventId?: string;
  tamperedEventId?: string;
  checkedAt: string;
}

// ============================================================================
// 6. PERMISSION & ACCESS EVALUATIONS
// ============================================================================

export interface AccountPermissions {
  canLogin: boolean;
  canBrowse: boolean;
  canChat: boolean;
  canSendTips: boolean;
  canPurchasePPV: boolean;
  canSubscribe: boolean;
  canBroadcastLive: boolean;
  canWithdrawFunds: boolean;
  isRestrictedMode: boolean;
  restrictionReason?: string;
}

export interface ContentAccessResult {
  isAccessible: boolean;
  requiresAgeGate: boolean;
  isBlurredPreview: boolean;
  rejectionReason?: string;
  moderationState: ContentModerationState;
}

export interface CreatorMonetizationStatus {
  canGoLive: boolean;
  canEarnCredits: boolean;
  canRequestPayout: boolean;
  monetizationState: CreatorModerationState;
  restrictionReason?: string;
}
