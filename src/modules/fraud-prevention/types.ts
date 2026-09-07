/**
 * ============================================================================
 * FRAUD PREVENTION & RISK ENGINE - DOMAIN TYPES & INTERFACES
 * ============================================================================
 */

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RiskAction =
  | "ALLOW"
  | "CHALLENGE_2FA"
  | "CHALLENGE_KYC"
  | "DELAY_FULFILLMENT"
  | "REQUIRE_MANUAL_REVIEW"
  | "BLOCK_TRANSACTION"
  | "FREEZE_ACCOUNT";

export type RiskActionType =
  | "CREDIT_PURCHASE"
  | "TIP"
  | "PAYOUT"
  | "LOGIN"
  | "SIGNUP"
  | "REFERRAL_CLAIM"
  | "PPV_UNLOCK"
  | "SUBSCRIPTION"
  | "MESSAGE"
  | "STREAM_CHAT"
  | "ACCOUNT_UPDATE";

export type TriggerSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const TriggerCodes = {
  // Sybil / Multi-Account
  SYBIL_DEVICE_OVERLAP: "SYBIL_DEVICE_OVERLAP",
  SYBIL_IP_SUBNET_BURST: "SYBIL_IP_SUBNET_BURST",
  SYBIL_DISPOSABLE_EMAIL: "SYBIL_DISPOSABLE_EMAIL",
  SYBIL_PLUS_ALIASED_EMAIL: "SYBIL_PLUS_ALIASED_EMAIL",
  SYBIL_ACCOUNT_CREATION_VELOCITY: "SYBIL_ACCOUNT_CREATION_VELOCITY",

  // Payment / Stolen Cards
  PAYMENT_CARD_TESTING_BURST: "PAYMENT_CARD_TESTING_BURST",
  PAYMENT_CARD_HASH_SHARED: "PAYMENT_CARD_HASH_SHARED",
  PAYMENT_GEO_MISMATCH: "PAYMENT_GEO_MISMATCH",
  PAYMENT_HIGH_DENOMINATION_FIRST_TIME: "PAYMENT_HIGH_DENOMINATION_FIRST_TIME",
  PAYMENT_PREPAID_CARD_RISK: "PAYMENT_PREPAID_CARD_RISK",
  PAYMENT_EXCESSIVE_DECLINES: "PAYMENT_EXCESSIVE_DECLINES",

  // Velocity & Rapid Spend Drain
  VELOCITY_SPEND_DRAIN_BURST: "VELOCITY_SPEND_DRAIN_BURST",
  VELOCITY_DEPOSIT_TO_SPEND_LATENCY: "VELOCITY_DEPOSIT_TO_SPEND_LATENCY",
  VELOCITY_FIAT_DEPOSIT_SPIKE: "VELOCITY_FIAT_DEPOSIT_SPIKE",
  VELOCITY_CREDIT_TRANSFER_SPIKE: "VELOCITY_CREDIT_TRANSFER_SPIKE",

  // Chargebacks & Disputes
  CHARGEBACK_PRIOR_DISPUTES: "CHARGEBACK_PRIOR_DISPUTES",
  CHARGEBACK_FINGERPRINT_DISPUTE_RATE: "CHARGEBACK_FINGERPRINT_DISPUTE_RATE",
  CHARGEBACK_HIGH_REFUND_RATIO: "CHARGEBACK_HIGH_REFUND_RATIO",

  // Account Takeover (ATO)
  ATO_IMPOSSIBLE_TRAVEL: "ATO_IMPOSSIBLE_TRAVEL",
  ATO_NEW_DEVICE_CREDENTIAL_CHANGE: "ATO_NEW_DEVICE_CREDENTIAL_CHANGE",
  ATO_CREDENTIAL_STUFFING_BURST: "ATO_CREDENTIAL_STUFFING_BURST",
  ATO_KNOWN_MALICIOUS_IP: "ATO_KNOWN_MALICIOUS_IP",

  // Spam & Engagement Manipulation
  SPAM_CHAT_FLOOD: "SPAM_CHAT_FLOOD",
  SPAM_MESSAGE_VELOCITY: "SPAM_MESSAGE_VELOCITY",
  ENGAGEMENT_CIRCULAR_TIPPING: "ENGAGEMENT_CIRCULAR_TIPPING",
  ENGAGEMENT_BOT_CADENCE: "ENGAGEMENT_BOT_CADENCE",

  // Referral Abuse
  REFERRAL_SELF_ATTRIBUTION: "REFERRAL_SELF_ATTRIBUTION",
  REFERRAL_SHARED_DEVICE: "REFERRAL_SHARED_DEVICE",
  REFERRAL_SHARED_PAYMENT: "REFERRAL_SHARED_PAYMENT",
  REFERRAL_VELOCITY_SPIKE: "REFERRAL_VELOCITY_SPIKE",

  // Network & Bot Infrastructure
  NETWORK_TOR_EXIT_NODE: "NETWORK_TOR_EXIT_NODE",
  NETWORK_DATACENTER_PROXY: "NETWORK_DATACENTER_PROXY",
  NETWORK_HEADLESS_BROWSER: "NETWORK_HEADLESS_BROWSER",

  // Concurrency & System Integrity
  WALLET_CONCURRENCY_CONFLICT: "WALLET_CONCURRENCY_CONFLICT",
  WALLET_DOUBLE_SPEND_ATTEMPT: "WALLET_DOUBLE_SPEND_ATTEMPT",
} as const;

export type TriggerCode = (typeof TriggerCodes)[keyof typeof TriggerCodes];

export interface RuleTrigger {
  code: TriggerCode | string;
  name: string;
  scoreContribution: number;
  severity: TriggerSeverity;
  reason: string;
  details?: Record<string, any>;
}

export interface DeviceFingerprintData {
  fingerprintHash: string;
  canvasHash?: string;
  webglHash?: string;
  audioHash?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  platform?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  isHeadless?: boolean;
  hasTouchSupport?: boolean;
  userAgent?: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  countryCode?: string;
  city?: string;
  region?: string;
}

export interface RiskEvaluationContext {
  userId?: string;
  actionType: RiskActionType;
  amountCredits?: number;
  amountFiatCents?: number;
  currency?: string;
  targetUserId?: string;
  targetCreatorId?: string;
  paymentMethod?: string;
  cardHash?: string;
  cardBin?: string;
  cardLast4?: string;
  cardCountry?: string;
  isPrepaid?: boolean;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: DeviceFingerprintData;
  geoLocation?: GeoLocation;
  email?: string;
  referralCode?: string;
  referredUserId?: string;
  messageContent?: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export interface AccountProfileSnapshot {
  userId: string;
  username: string;
  email: string;
  accountAgeHours: number;
  kycStatus: string;
  role: string;
  moderationState: string;
  isBanned: boolean;
  totalDepositsFiatCents: number;
  totalCreditsPurchased: number;
  totalCreditsSpent: number;
  historicalDisputeCount: number;
  historicalChargebackCount: number;
  chargebackRate: number;
  refundRate: number;
  isNewAccount: boolean; // < 72 hours
  lastSeenAt?: Date | null;
  lastPasswordChangedAt?: Date | null;
}

export interface NetworkSignals {
  ip: string;
  isDatacenter: boolean;
  isVpnOrProxy: boolean;
  isTorExitNode: boolean;
  countryCode?: string;
  asn?: string;
  isp?: string;
  impossibleTravelDetected: boolean;
  calculatedSpeedKmh?: number;
  previousGeo?: GeoLocation;
  currentGeo?: GeoLocation;
}

export interface VelocitySnapshot {
  transactionsLast1m: number;
  transactionsLast1h: number;
  transactionsLast24h: number;
  creditsSpentLast5m: number;
  creditsSpentLast1h: number;
  fiatDepositedLast1h: number;
  fiatDepositedLast24h: number;
  failedLoginsLast15m: number;
  cardDeclinesLast1h: number;
  messagesLast1m: number;
  accountCreationsFromIpLast1h: number;
}

export interface EvaluatedSignals {
  account?: AccountProfileSnapshot;
  network?: NetworkSignals;
  device?: DeviceFingerprintData;
  velocity?: VelocitySnapshot;
  linkedAccountsCount?: number;
  cardSharingAccountsCount?: number;
}

export interface RiskAssessmentResult {
  assessmentId: string;
  userId?: string;
  actionType: RiskActionType;
  riskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  recommendedAction: RiskAction;
  finalAction: RiskAction;
  triggers: RuleTrigger[];
  delayFulfillmentSeconds?: number;
  requiresManualReview: boolean;
  signals: EvaluatedSignals;
  executionTimeMs: number;
  timestamp: string;
}

export interface WalletHoldRecord {
  id: string;
  walletId: string;
  userId: string;
  amountCredits: number;
  reason: string;
  status: "HELD" | "RELEASED" | "SEIZED_CHARGEBACK" | "REFUNDED";
  releaseAt: Date;
  releasedAt?: Date | null;
  createdAt: Date;
}
