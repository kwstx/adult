/**
 * ============================================================================
 * SECURE STRUCTURED BACKEND LOGGER
 * ============================================================================
 * Handles technical logging on the backend without leaking internal details or
 * sensitive credentials (PII, tokens, passwords, card data) to the client.
 */

const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "authorization",
  "creditcard",
  "cardnumber",
  "cvv",
  "pan",
  "jwt",
  "apikey",
  "webhooksecret",
];

function redactSensitiveData(obj: any, depth = 0): any {
  if (depth > 5 || obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    // Redact Bearer tokens in strings
    return obj.replace(/Bearer\s+[A-Za-z0-9-_.]+/gi, "Bearer [REDACTED]");
  }
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, depth + 1));
  }

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
      clean[key] = "[REDACTED]";
    } else {
      clean[key] = redactSensitiveData(value, depth + 1);
    }
  }
  return clean;
}

export class Logger {
  /**
   * Logs a structured technical error with correlation ID and sanitized metadata.
   */
  static error(message: string, error?: any, context?: {
    requestId?: string;
    userId?: string;
    path?: string;
    method?: string;
    metadata?: Record<string, any>;
  }) {
    const payload = {
      timestamp: new Date().toISOString(),
      level: "ERROR",
      message,
      requestId: context?.requestId,
      userId: context?.userId,
      path: context?.path,
      method: context?.method,
      errorName: error?.name || "Error",
      errorMessage: error?.message || String(error),
      stack: error?.stack,
      metadata: context?.metadata ? redactSensitiveData(context.metadata) : undefined,
    };

    console.error(
      `[SERVER_ERROR] [${payload.requestId || "NO_REQ_ID"}] [${payload.path || "UNKNOWN"}] ${payload.message}`,
      JSON.stringify(payload, null, process.env.NODE_ENV === "development" ? 2 : undefined)
    );
  }

  /**
   * Logs a structured warning.
   */
  static warn(message: string, context?: Record<string, any>) {
    console.warn(
      `[SERVER_WARN] ${message}`,
      context ? JSON.stringify(redactSensitiveData(context)) : ""
    );
  }

  /**
   * Logs an informational message.
   */
  static info(message: string, context?: Record<string, any>) {
    console.log(
      `[SERVER_INFO] ${message}`,
      context ? JSON.stringify(redactSensitiveData(context)) : ""
    );
  }
}
