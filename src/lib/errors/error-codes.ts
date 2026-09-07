/**
 * ============================================================================
 * PRODUCT ERROR DEFINITIONS & SEMANTIC ERROR CODES
 * ============================================================================
 * Errors are treated as first-class product states rather than technical crashes.
 * Every error maps to:
 * - A clear category (Financial, Interaction, System, Auth, Moderation, Network)
 * - A reassuring user title and message
 * - An explicit wallet charge indicator (walletCharged: boolean)
 * - An actionable recovery path (RETRY, TOP_UP, WAIT, DISMISS, CONTACT_SUPPORT)
 */

export type ProductErrorCategory =
  | "FINANCIAL"
  | "INTERACTION"
  | "SYSTEM"
  | "AUTHENTICATION"
  | "AUTHORIZATION"
  | "MODERATION"
  | "MEDIA"
  | "NETWORK";

export type ProductErrorAction =
  | "RETRY"
  | "TOP_UP"
  | "WAIT"
  | "DISMISS"
  | "RELOAD"
  | "LOGIN"
  | "CONTACT_SUPPORT";

export type ProductErrorCode =
  // Financial & Wallet
  | "PAYMENT_FAILED"
  | "PAYMENT_PENDING"
  | "PAYMENT_CANCELLED"
  | "PAYMENT_EXPIRED"
  | "INSUFFICIENT_FUNDS"
  | "WALLET_SUSPENDED"
  | "WALLET_NOT_CHARGED"
  | "TRANSACTION_DUPLICATE"
  | "TRANSACTION_NOT_FOUND"
  | "CONCURRENCY_CONFLICT"

  // Interactions & Live Attention Marketplace
  | "INTERACTION_UNAVAILABLE"
  | "INTERACTION_EXHAUSTED"
  | "INTERACTION_PRICE_CHANGED"
  | "INTERACTION_DISABLED"
  | "QUEUE_FULL"
  | "STREAM_ENDED"

  // Content & Access Entitlements
  | "CONTENT_NOT_FOUND"
  | "CONTENT_ALREADY_PURCHASED"
  | "ENTITLEMENT_DENIED"

  // Auth & Security
  | "UNAUTHORIZED"
  | "INVALID_TOKEN"
  | "SESSION_EXPIRED"
  | "FORBIDDEN"
  | "INSUFFICIENT_PERMISSIONS"
  | "ACCOUNT_SUSPENDED"
  | "AGE_ASSURANCE_REQUIRED"

  // Moderation & Trust/Safety
  | "CONTENT_FLAGGED"
  | "MESSAGE_BLOCKED"
  | "RATE_LIMITED"

  // System & Infrastructure
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "VALIDATION_FAILED";

export interface ProductErrorResponse {
  success: false;
  error: string;
  userTitle: string;
  userMessage: string;
  walletCharged: boolean;
  category: ProductErrorCategory;
  code: ProductErrorCode;
  action: ProductErrorAction;
  isRetryable: boolean;
  requestId: string;
  timestamp: string;
  details?: any;
}
