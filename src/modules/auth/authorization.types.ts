/**
 * ============================================================================
 * AUTHORIZATION ENGINE: CONTRACTS & TYPES
 * ============================================================================
 * 
 * "Authentication answers: Who are you?
 *  Authorization answers: What are you allowed to do?"
 * 
 * This module defines the authoritative domain contracts for evaluating permissions,
 * entitlements, role boundaries, and resource ownership.
 */

import {
  UserRole,
  KYCStatus,
  AccountModerationState,
  ContentAccessLevel,
  StreamMode,
} from "@prisma/client";

/**
 * An Authenticated Subject: Represents the verified identity of the requester.
 * Authentication validates credentials/tokens to construct this object.
 * It DOES NOT represent permission to perform any privileged action.
 */
export interface AuthenticatedSubject {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  kycStatus: KYCStatus;
  moderationState: AccountModerationState;
  isActive: boolean;
  isBanned: boolean;
  banReason?: string | null;
  creatorProfileId?: string | null;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Standard actions requiring authoritative authorization.
 */
export type AuthorizableAction =
  | "ENTER_VIP_ROOM"
  | "VIEW_PPV_CONTENT"
  | "START_CREATOR_LIVESTREAM"
  | "ACCESS_CREATOR_ANALYTICS"
  | "MODIFY_INTERACTION_PRICES"
  | "ISSUE_REFUNDS"
  | "PURCHASE_INTERACTION"
  | "BOOK_PRIVATE_SESSION"
  | "BROADCAST_MEDIA"
  | "REQUEST_PAYOUT";

/**
 * Resource descriptor for entering a creator's VIP room.
 */
export interface VipRoomResource {
  creatorProfileId: string;
  livestreamId?: string;
  requiredTierLevel?: number;
}

/**
 * Resource descriptor for accessing PPV content.
 */
export interface PpvContentResource {
  contentId: string;
  creatorProfileId?: string;
  accessLevel?: ContentAccessLevel;
  priceCredits?: number;
}

/**
 * Resource descriptor for starting or managing a creator livestream.
 */
export interface LivestreamResource {
  creatorProfileId: string;
  livestreamId?: string;
  streamMode?: StreamMode;
}

/**
 * Resource descriptor for accessing creator analytics.
 */
export interface CreatorAnalyticsResource {
  creatorProfileId: string;
  targetUserId?: string;
}

/**
 * Resource descriptor for modifying interaction definitions and pricing.
 */
export interface InteractionDefinitionResource {
  creatorProfileId: string;
  interactionDefinitionId?: string;
  newPriceCredits?: number;
}

/**
 * Resource descriptor for issuing financial refunds.
 */
export interface RefundResource {
  transactionId?: string;
  walletId?: string;
  targetUserId?: string;
  amountCredits?: number;
  reason?: string;
}

/**
 * Union of all authorizable resource types.
 */
export type AuthorizableResource =
  | VipRoomResource
  | PpvContentResource
  | LivestreamResource
  | CreatorAnalyticsResource
  | InteractionDefinitionResource
  | RefundResource
  | Record<string, any>;

/**
 * Standardized error codes for authorization failures.
 */
export type AuthorizationErrorCode =
  | "UNAUTHENTICATED"
  | "ACCOUNT_SUSPENDED"
  | "ACCOUNT_BANNED"
  | "MISSING_VIP_ENTITLEMENT"
  | "PPV_NOT_PURCHASED"
  | "CREATOR_NOT_VERIFIED"
  | "CREATOR_MONETIZATION_DISABLED"
  | "NOT_CREATOR_OWNER"
  | "UNAUTHORIZED_ANALYTICS_ACCESS"
  | "UNAUTHORIZED_PRICE_MODIFICATION"
  | "UNAUTHORIZED_REFUND_ISSUANCE"
  | "RESOURCE_NOT_FOUND"
  | "INSUFFICIENT_ADMIN_PERMISSIONS";

/**
 * Authoritative result of evaluating an authorization policy.
 */
export interface AuthorizationDecision {
  isAuthorized: boolean;
  action: AuthorizableAction;
  subject: AuthenticatedSubject;
  resourceId?: string;
  reason: string;
  errorCode?: AuthorizationErrorCode;
  statusCode: number; // 200, 401, 403, 404
  evaluatedAt: Date;
  diagnostics?: Record<string, any>;
}

/**
 * Contextual metadata passed into authorization evaluation.
 */
export interface AuthorizationContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  adminRole?: string;
  additionalParams?: Record<string, any>;
}
