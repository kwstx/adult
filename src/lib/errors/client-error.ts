import {
  ProductErrorResponse,
  ProductErrorCategory,
  ProductErrorCode,
  ProductErrorAction,
} from "./error-codes";

export interface ParsedProductError {
  userTitle: string;
  userMessage: string;
  walletCharged: boolean;
  category: ProductErrorCategory;
  code: ProductErrorCode;
  action: ProductErrorAction;
  isRetryable: boolean;
  requestId?: string;
  timestamp?: string;
  rawError?: any;
}

/**
 * Parses any client-side exception, HTTP Response, or error payload into
 * a standardized ParsedProductError with reassuring defaults.
 */
export async function parseProductError(error: any): Promise<ParsedProductError> {
  // Case 1: Already structured ProductErrorResponse
  if (error && typeof error === "object" && error.userTitle && error.userMessage !== undefined) {
    return {
      userTitle: error.userTitle,
      userMessage: error.userMessage,
      walletCharged: Boolean(error.walletCharged),
      category: error.category || "SYSTEM",
      code: error.code || "INTERNAL_ERROR",
      action: error.action || "RETRY",
      isRetryable: error.isRetryable ?? !error.walletCharged,
      requestId: error.requestId,
      timestamp: error.timestamp,
      rawError: error,
    };
  }

  // Case 2: Fetch Response object
  if (error instanceof Response || (error && typeof error.json === "function")) {
    try {
      const data = await error.json();
      if (data && data.userTitle) {
        return {
          userTitle: data.userTitle,
          userMessage: data.userMessage || "Your credits were not charged. Try again.",
          walletCharged: Boolean(data.walletCharged),
          category: data.category || (error.status === 402 ? "FINANCIAL" : "SYSTEM"),
          code: data.code || (error.status === 402 ? "PAYMENT_FAILED" : "INTERNAL_ERROR"),
          action: data.action || (data.walletCharged ? "CONTACT_SUPPORT" : "RETRY"),
          isRetryable: data.isRetryable ?? !data.walletCharged,
          requestId: data.requestId,
          timestamp: data.timestamp,
          rawError: data,
        };
      }

      // Legacy envelope fallback (data.error or data.message)
      const message = data.error || data.message || "An unexpected issue occurred.";
      const isFinancial = error.status === 402 || message.toLowerCase().includes("payment") || message.toLowerCase().includes("credit");

      return {
        userTitle: isFinancial ? "Payment failed — your wallet was not charged." : "Something went wrong",
        userMessage: isFinancial
          ? "Your wallet was not charged. Please try again or check your payment method."
          : "Your credits were not charged. Try again.",
        walletCharged: false,
        category: isFinancial ? "FINANCIAL" : "SYSTEM",
        code: isFinancial ? "PAYMENT_FAILED" : "INTERNAL_ERROR",
        action: "RETRY",
        isRetryable: true,
        requestId: data.requestId,
        rawError: data,
      };
    } catch {
      // Non-JSON response (e.g. gateway 502/504)
      return {
        userTitle: "Something went wrong",
        userMessage: "Your credits were not charged. Try again.",
        walletCharged: false,
        category: "SYSTEM",
        code: "SERVICE_UNAVAILABLE",
        action: "RETRY",
        isRetryable: true,
        rawError: error,
      };
    }
  }

  // Case 3: Offline / Network connection dropped
  if (
    error instanceof TypeError &&
    (error.message.includes("fetch") || error.message.includes("NetworkError") || error.message.includes("Failed to fetch"))
  ) {
    return {
      userTitle: "Connection lost",
      userMessage: "Network connection was interrupted. Your credits were not charged.",
      walletCharged: false,
      category: "NETWORK",
      code: "NETWORK_ERROR",
      action: "RETRY",
      isRetryable: true,
      rawError: error,
    };
  }

  // Case 4: Standard JavaScript Error object
  const errorMsg = error?.message || String(error || "");
  const isPayment = errorMsg.toLowerCase().includes("payment") || errorMsg.toLowerCase().includes("wallet") || errorMsg.toLowerCase().includes("credit");

  return {
    userTitle: isPayment ? "Payment failed — your wallet was not charged." : "Something went wrong",
    userMessage: isPayment
      ? `${errorMsg} Your wallet was not charged.`
      : "Your credits were not charged. Try again.",
    walletCharged: false,
    category: isPayment ? "FINANCIAL" : "SYSTEM",
    code: isPayment ? "PAYMENT_FAILED" : "INTERNAL_ERROR",
    action: "RETRY",
    isRetryable: true,
    rawError: error,
  };
}
