import { UserRole, KYCStatus, SubscriptionTier } from "@prisma/client";

/**
 * ============================================================================
 * ZERO-TRUST SERVER AUTHORITY ENGINE: TYPES & INTERFACES
 * ============================================================================
 * 
 * The browser is NEVER authoritative for:
 * 1. Price
 * 2. User ID
 * 3. Creator ID
 * 4. Balance
 * 5. Permissions
 * 6. Subscription status
 * 7. Ownership
 * 8. XP
 * 9. Level
 * 10. Role
 * 
 * Every value is resolved authoritatively on the server.
 */

// ----------------------------------------------------------------------------
// Custom Error Classes for Zero-Trust Violations
// ----------------------------------------------------------------------------

export class AuthoritativeSecurityError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = "AuthoritativeSecurityError";
  }
}

export class ClientTamperingAttemptError extends AuthoritativeSecurityError {
  constructor(
    public readonly field: string,
    public readonly clientValue: any,
    public readonly serverValue: any,
    message?: string
  ) {
    super(
      400,
      "CLIENT_TAMPERING_DETECTED",
      message || `Client attempted to submit authoritative server field "${field}". Client value was ignored.`
    );
    this.name = "ClientTamperingAttemptError";
  }
}

export class ResourceNotFoundError extends AuthoritativeSecurityError {
  constructor(public readonly resourceType: string, public readonly resourceId: string) {
    super(404, "RESOURCE_NOT_FOUND", `${resourceType} "${resourceId}" does not exist.`);
    this.name = "ResourceNotFoundError";
  }
}

export class ResourceMismatchError extends AuthoritativeSecurityError {
  constructor(
    public readonly resourceId: string,
    public readonly claimedCreatorId: string,
    public readonly actualCreatorId: string
  ) {
    super(
      403,
      "RESOURCE_CREATOR_MISMATCH",
      `Resource "${resourceId}" belongs to creator "${actualCreatorId}", not "${claimedCreatorId}".`
    );
    this.name = "ResourceMismatchError";
  }
}

export class IneligibleAccessError extends AuthoritativeSecurityError {
  constructor(
    public readonly reason: string,
    public readonly requiredTierOrLevel?: string,
    public readonly currentStatus?: string
  ) {
    super(
      403,
      "INELIGIBLE_ACCESS",
      `Access denied: ${reason}${requiredTierOrLevel ? ` (Required: ${requiredTierOrLevel}, Current: ${currentStatus || "None"})` : ""}`
    );
    this.name = "IneligibleAccessError";
  }
}

export class InsufficientAuthoritativeBalanceError extends AuthoritativeSecurityError {
  constructor(public readonly requiredCredits: number, public readonly actualCredits: number) {
    super(
      402,
      "INSUFFICIENT_BALANCE",
      `Insufficient wallet balance: Required ${requiredCredits} credits, but authoritative server ledger only has ${actualCredits} credits.`
    );
    this.name = "InsufficientAuthoritativeBalanceError";
  }
}

// ----------------------------------------------------------------------------
// Authoritative Resolution Contexts
// ----------------------------------------------------------------------------

export interface AuthoritativeUserContext {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
  kycStatus: KYCStatus;
  moderationState: string;
  isActive: boolean;
  isBanned: boolean;
  creatorProfileId: string | null;
}

export interface AuthoritativeCreatorContext {
  creatorProfileId: string;
  userId: string;
  stageName: string;
  username: string;
  moderationState: string;
  isMonetizationEnabled: boolean;
  hasApproved2257: boolean;
  kycStatus: KYCStatus;
}

export interface AuthoritativePriceResult {
  resourceType: "INTERACTION" | "PPV_CONTENT" | "SUBSCRIPTION" | "PRIVATE_SESSION" | "STORE_PRODUCT" | "GIFT_TIER";
  resourceId: string;
  title: string;
  authoritativePriceCredits: number;
  creatorProfileId: string;
  metadata?: Record<string, any>;
}

export interface AuthoritativeWalletContext {
  walletId: string;
  userId: string;
  totalBalance: number;
  purchasedBalance: number;
  promotionalBalance: number;
  bonusBalance: number;
  status: "ACTIVE" | "LOCKED" | "SUSPENDED" | "SUSPENDED_CHARGEBACK";
  version: number;
}

export interface AuthoritativeSubscriptionContext {
  isSubscribed: boolean;
  subscriptionId?: string;
  tier?: SubscriptionTier;
  isVIP: boolean;
  status?: string;
  expiresAt?: Date | null;
}

export interface AuthoritativeOwnershipContext {
  isOwned: boolean;
  purchaseId?: string;
  purchasedAt?: Date;
  unlockReason?: "PURCHASED_PPV" | "CREATOR_OWNER" | "PUBLIC_ACCESS" | "SUBSCRIPTION_ACCESS" | "FOLLOWER_ACCESS" | "ENTITLED";
}

export interface AuthoritativeProgressionContext {
  fanUserId: string;
  creatorProfileId?: string;
  totalXp: number;
  fanLevel: number;
  relationshipTier: "FAN" | "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND";
  relationshipLevel: number;
}

// ----------------------------------------------------------------------------
// Forbidden Client Fields (Untrusted List)
// ----------------------------------------------------------------------------

export const FORBIDDEN_CLIENT_FIELDS = [
  "price",
  "priceCredits",
  "expectedPrice",
  "creditCost",
  "amountCredits",
  "userId",
  "fanUserId",
  "buyerId",
  "senderId",
  "creatorId",
  "creatorProfileId",
  "balance",
  "availableBalance",
  "availableCredits",
  "role",
  "isAdmin",
  "isCreator",
  "isModerator",
  "permissions",
  "canSell",
  "canBroadcast",
  "isVerified",
  "is2257Approved",
  "isSubscribed",
  "subscriptionTier",
  "isVIP",
  "ownsContent",
  "isUnlocked",
  "hasAccess",
  "xp",
  "totalXp",
  "currentXp",
  "level",
  "fanLevel",
  "relationshipTier",
] as const;

export type ForbiddenClientField = typeof FORBIDDEN_CLIENT_FIELDS[number];
