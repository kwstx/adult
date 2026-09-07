import {
  ProductErrorCategory,
  ProductErrorCode,
  ProductErrorAction,
  ProductErrorResponse,
} from "./error-codes";

export interface ProductErrorOptions {
  statusCode?: number;
  code?: ProductErrorCode;
  category?: ProductErrorCategory;
  userTitle?: string;
  userMessage?: string;
  walletCharged?: boolean;
  action?: ProductErrorAction;
  isRetryable?: boolean;
  details?: any;
  technicalMessage?: string;
}

/**
 * Base Product Error class.
 * Ensures every application error is treated as a first-class product state.
 */
export class ProductError extends Error {
  public readonly statusCode: number;
  public readonly code: ProductErrorCode;
  public readonly category: ProductErrorCategory;
  public readonly userTitle: string;
  public readonly userMessage: string;
  public readonly walletCharged: boolean;
  public readonly action: ProductErrorAction;
  public readonly isRetryable: boolean;
  public readonly details?: any;
  public readonly technicalMessage: string;

  constructor(message: string, options: ProductErrorOptions = {}) {
    super(options.technicalMessage || message);
    this.name = "ProductError";

    this.statusCode = options.statusCode ?? 400;
    this.code = options.code ?? "INTERNAL_ERROR";
    this.category = options.category ?? "SYSTEM";
    this.userTitle = options.userTitle ?? "Something went wrong";
    this.userMessage = options.userMessage ?? "Your credits were not charged. Try again.";
    this.walletCharged = options.walletCharged ?? false;
    this.action = options.action ?? (this.walletCharged ? "CONTACT_SUPPORT" : "RETRY");
    this.isRetryable = options.isRetryable ?? !this.walletCharged;
    this.details = options.details;
    this.technicalMessage = options.technicalMessage || message;
  }

  /**
   * Serializes the error into a sanitized client-facing response payload.
   */
  public toResponse(requestId: string): ProductErrorResponse {
    return {
      success: false,
      error: this.userTitle,
      userTitle: this.userTitle,
      userMessage: this.userMessage,
      walletCharged: this.walletCharged,
      category: this.category,
      code: this.code,
      action: this.action,
      isRetryable: this.isRetryable,
      requestId,
      timestamp: new Date().toISOString(),
      details: this.details,
    };
  }
}

// ============================================================================
// FINANCIAL & TRANSACTIONAL PRODUCT ERRORS
// ============================================================================

/**
 * Thrown when a fiat or credit payment fails.
 * Guarantees to the fan: "Payment failed — your wallet was not charged."
 */
export class PaymentFailedError extends ProductError {
  constructor(
    reason?: string,
    options?: { details?: any; technicalMessage?: string }
  ) {
    super(reason || "Payment processing failed.", {
      statusCode: 402,
      code: "PAYMENT_FAILED",
      category: "FINANCIAL",
      userTitle: "Payment failed — your wallet was not charged.",
      userMessage:
        reason ||
        "The payment provider could not complete this transaction. Your wallet was not charged. Please try again or use another payment method.",
      walletCharged: false,
      action: "RETRY",
      isRetryable: true,
      details: options?.details,
      technicalMessage: options?.technicalMessage || `Payment failed: ${reason || "Gateway decline"}`,
    });
    this.name = "PaymentFailedError";
  }
}

/**
 * Used when a payment is awaiting asynchronous webhook confirmation from the provider.
 * Fans see: "Payment pending"
 */
export class PaymentPendingError extends ProductError {
  constructor(purchaseId?: string) {
    super("Payment is currently pending provider confirmation.", {
      statusCode: 202,
      code: "PAYMENT_PENDING",
      category: "FINANCIAL",
      userTitle: "Payment pending",
      userMessage:
        "Your payment is currently being confirmed by the payment gateway. Your credits will appear automatically as soon as confirmation completes.",
      walletCharged: false,
      action: "WAIT",
      isRetryable: false,
      details: { purchaseId },
    });
    this.name = "PaymentPendingError";
  }
}

/**
 * Thrown when fan attempts an interaction, tip, or unlock without sufficient balance.
 */
export class InsufficientCreditsProductError extends ProductError {
  constructor(requiredCredits: number, availableCredits: number) {
    super(
      `Insufficient credits: Required ${requiredCredits}, available ${availableCredits}.`,
      {
        statusCode: 400,
        code: "INSUFFICIENT_FUNDS",
        category: "FINANCIAL",
        userTitle: "Insufficient credits",
        userMessage: `This requires ${requiredCredits.toLocaleString()} credits, but your current balance is ${availableCredits.toLocaleString()} credits. Your wallet was not charged.`,
        walletCharged: false,
        action: "TOP_UP",
        isRetryable: false,
        details: { requiredCredits, availableCredits, deficit: requiredCredits - availableCredits },
      }
    );
    this.name = "InsufficientCreditsProductError";
  }
}

/**
 * Thrown when a user or creator wallet is locked or suspended.
 */
export class WalletSuspendedProductError extends ProductError {
  constructor(walletStatus: string = "SUSPENDED") {
    super(`Wallet is currently suspended (${walletStatus}).`, {
      statusCode: 403,
      code: "WALLET_SUSPENDED",
      category: "FINANCIAL",
      userTitle: "Account restricted",
      userMessage:
        "Financial operations are currently paused for this account. Your wallet was not charged. Please contact support for assistance.",
      walletCharged: false,
      action: "CONTACT_SUPPORT",
      isRetryable: false,
      details: { walletStatus },
    });
    this.name = "WalletSuspendedProductError";
  }
}

/**
 * Thrown when a duplicate idempotency key is submitted.
 */
export class DuplicateTransactionProductError extends ProductError {
  constructor(idempotencyKey: string) {
    super(`Duplicate transaction key: ${idempotencyKey}`, {
      statusCode: 409,
      code: "TRANSACTION_DUPLICATE",
      category: "FINANCIAL",
      userTitle: "Transaction already processed",
      userMessage:
        "This transaction was already completed. No duplicate charge was made to your wallet.",
      walletCharged: false,
      action: "DISMISS",
      isRetryable: false,
      details: { idempotencyKey },
    });
    this.name = "DuplicateTransactionProductError";
  }
}

// ============================================================================
// INTERACTION & LIVE MARKETPLACE PRODUCT ERRORS
// ============================================================================

/**
 * Thrown when an interaction is sold out, disabled, or creator is offline.
 */
export class InteractionUnavailableProductError extends ProductError {
  constructor(
    reason: string = "This interaction is currently unavailable.",
    code: ProductErrorCode = "INTERACTION_UNAVAILABLE"
  ) {
    super(reason, {
      statusCode: 409,
      code,
      category: "INTERACTION",
      userTitle: "Interaction unavailable",
      userMessage: `${reason} Your credits were not charged.`,
      walletCharged: false,
      action: "DISMISS",
      isRetryable: false,
    });
    this.name = "InteractionUnavailableProductError";
  }
}

// ============================================================================
// SYSTEM & UNEXPECTED PRODUCT ERRORS
// ============================================================================

/**
 * Thrown for unexpected server-side crashes or unhandled exceptions.
 * Replaces raw "500 Internal Server Error" with friendly reassurance.
 */
export class SystemProductError extends ProductError {
  constructor(technicalMessage?: string, details?: any) {
    super(technicalMessage || "An internal error occurred.", {
      statusCode: 500,
      code: "INTERNAL_ERROR",
      category: "SYSTEM",
      userTitle: "Something went wrong",
      userMessage: "Your credits were not charged. Please try again.",
      walletCharged: false,
      action: "RETRY",
      isRetryable: true,
      details,
      technicalMessage: technicalMessage || "Unexpected server-side error.",
    });
    this.name = "SystemProductError";
  }
}
