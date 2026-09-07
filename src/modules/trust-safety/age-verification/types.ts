/**
 * ============================================================================
 * AGE VERIFICATION & ASSURANCE DOMAIN TYPES
 * ============================================================================
 * 
 * Comprehensive domain types for privacy-preserving age assurance,
 * jurisdiction-based entitlement policies, and third-party verification provider adapters.
 * 
 * CORE ARCHITECTURAL PRINCIPLES:
 * 1. No simple checkbox self-attestation ("I am 18" is not verification).
 * 2. Entitlement-based access control: Features check authoritative backend entitlements.
 * 3. Minimal PII Storage: Zero biometric/ID images stored locally; only provider references,
 *    cryptographic hashes, and assurance levels.
 * 4. Pluggable Providers: Standardized adapter interface for Persona, Veriff, Yoti, Stripe, etc.
 * 5. Jurisdiction-aware Policy Engine: Enforces regulatory requirements (Texas HB 1181,
 *    Utah SB 287, UK Online Safety Act, German JMStV, EU AVMSD, etc.).
 */

// ============================================================================
// 1. AGE ASSURANCE LEVELS & METHODS
// ============================================================================

/**
 * Standardized Age Assurance Levels based on NIST 800-63 / ISO 29115 / PAS 1296.
 */
export enum AgeAssuranceLevel {
  /**
   * Level 1: Non-document estimation (e.g. AI facial age estimation with safety buffer)
   */
  LEVEL_1_ESTIMATION = "LEVEL_1_ESTIMATION",

  /**
   * Level 2: Financial verification (e.g. credit card active AVS token / Open Banking)
   */
  LEVEL_2_CARD_AVS = "LEVEL_2_CARD_AVS",

  /**
   * Level 3: High Assurance (Government Photo ID + Biometric 3D Liveness Detection)
   */
  LEVEL_3_DOCUMENT_LIVENESS = "LEVEL_3_DOCUMENT_LIVENESS",

  /**
   * Level 4: Sovereign Government Digital Identity (eIDAS, BankID, itsme, Gov eID)
   */
  LEVEL_4_GOVERNMENT_EID = "LEVEL_4_GOVERNMENT_EID",
}

export type AgeVerificationMethod =
  | "FACIAL_AGE_ESTIMATION"
  | "CREDIT_CARD_ASSURANCE"
  | "ID_DOCUMENT_KYC"
  | "GOVERNMENT_EID"
  | "OPEN_BANKING_AGE_CHECK";

export interface AgeVerificationResult {
  verified: boolean;
  token: string;
  expiresAt: Date;
  method: AgeVerificationMethod;
}


// ============================================================================
// 2. VERIFICATION PROVIDER & STATUS
// ============================================================================

export type AgeVerificationProviderName =
  | "PERSONA"
  | "VERIFF"
  | "YOTI"
  | "STRIPE_IDENTITY"
  | "SANDBOX_MOCK";

export type AgeVerificationStatus =
  | "NOT_STARTED"
  | "SESSION_CREATED"
  | "PENDING_SUBMISSION"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "REVOKED";

export interface ProviderSessionResponse {
  provider: AgeVerificationProviderName;
  providerReference: string;
  sessionToken: string;
  hostedVerificationUrl: string;
  expiresAt: Date;
  environment: "production" | "sandbox";
}

export interface CanonicalVerificationUpdate {
  provider: AgeVerificationProviderName;
  providerReference: string;
  userId: string;
  status: AgeVerificationStatus;
  assuranceLevel: AgeAssuranceLevel;
  method: AgeVerificationMethod;
  verifiedAt?: Date;
  expiresAt?: Date;
  countryCode?: string;
  rejectionReason?: string;
  rawProviderStatus?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// 3. VERIFICATION AS AN ENTITLEMENT
// ============================================================================

/**
 * Feature entitlements gated behind age assurance.
 */
export enum AgeEntitlement {
  /**
   * Basic platform entry & browsing adult catalog
   */
  AGE_VERIFIED_ENTRY = "AGE_VERIFIED_ENTRY",

  /**
   * Streaming live 18+ broadcasts & viewing unblurred adult media
   */
  ADULT_MEDIA_PLAYBACK = "ADULT_MEDIA_PLAYBACK",

  /**
   * Live chat participation, tipping, queue interaction, toy controls
   */
  INTERACTIVE_PARTICIPATION = "INTERACTIVE_PARTICIPATION",

  /**
   * Purchasing pay-per-view videos, photo sets, and premium subscriptions
   */
  PPV_PURCHASE = "PPV_PURCHASE",

  /**
   * 1-on-1 private video bookings & direct messages with creators
   */
  PRIVATE_SESSION_ACCESS = "PRIVATE_SESSION_ACCESS",

  /**
   * Broadcasting live as a creator (requires 2257 custodian compliance + ID verification)
   */
  CREATOR_BROADCAST_2257 = "CREATOR_BROADCAST_2257",
}

export interface AgeEntitlementEvaluation {
  entitlement: AgeEntitlement;
  hasEntitlement: boolean;
  status: AgeVerificationStatus;
  assuranceLevel: AgeAssuranceLevel | null;
  jurisdiction: string;
  requiredLevel: AgeAssuranceLevel;
  provider: AgeVerificationProviderName | null;
  providerReference: string | null;
  verifiedAt: Date | null;
  expiresAt: Date | null;
  isExpired: boolean;
  rejectionReason?: string;
  verificationUrl?: string;
}

export interface UserAgeEntitlementsSummary {
  userId: string;
  isFullyVerified: boolean;
  primaryStatus: AgeVerificationStatus;
  highestAssuranceLevel: AgeAssuranceLevel | null;
  jurisdiction: string;
  verifiedAt: Date | null;
  expiresAt: Date | null;
  entitlements: Record<AgeEntitlement, boolean>;
  evaluations: AgeEntitlementEvaluation[];
}

// ============================================================================
// 4. JURISDICTION & REGULATORY POLICY
// ============================================================================

export interface JurisdictionRule {
  jurisdictionCode: string; // ISO 3166-1 alpha-2 or ISO 3166-2 (e.g. US-TX, GB, DE)
  jurisdictionName: string;
  minimumAssuranceLevel: AgeAssuranceLevel;
  allowedMethods: AgeVerificationMethod[];
  sessionValidityDays: number;
  strictLiabilityEnforced: boolean;
  statutoryReference: string;
  disclaimerText: string;
}

// ============================================================================
// 5. DATA MINIMIZATION & AUDIT SCHEMA
// ============================================================================

/**
 * Data Minimization Contract:
 * What our database is strictly ALLOWED to store vs FORBIDDEN to store.
 */
export interface ZeroPiiVerificationRecord {
  id: string;
  userId: string;
  provider: AgeVerificationProviderName;
  providerReference: string;
  status: AgeVerificationStatus;
  assuranceLevel: AgeAssuranceLevel;
  method: AgeVerificationMethod;
  ipHash: string; // SHA-256 HMAC of client IP with secret salt, never raw IP
  countryCode: string;
  verifiedAt: Date;
  expiresAt: Date;
  // FORBIDDEN FIELDS:
  // - No raw Government ID photos
  // - No unhashed Social Security Numbers / National IDs
  // - No raw facial biometric embeddings or raw selfies
  // - No unmasked credit card numbers
}
