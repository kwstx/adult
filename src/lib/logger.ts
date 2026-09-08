/**
 * ============================================================================
 * SECURE STRUCTURED BACKEND LOGGER
 * ============================================================================
 * Handles technical logging on the backend without leaking internal details or
 * sensitive credentials (PII, tokens, passwords, card data) to the client.
 */

import { StructuredLogger, redactSensitiveValues } from "@/core/observability/structured-logger";

export { redactSensitiveValues as redactSensitiveData };

export class Logger {
  /**
   * Logs a structured technical error with correlation ID and sanitized metadata.
   */
  static error(
    message: string,
    error?: any,
    context?: {
      requestId?: string;
      userId?: string;
      path?: string;
      method?: string;
      metadata?: Record<string, any>;
    }
  ) {
    StructuredLogger.error(message, error, context);
  }

  /**
   * Logs a structured warning.
   */
  static warn(message: string, context?: Record<string, any>) {
    StructuredLogger.warn(message, { metadata: context });
  }

  /**
   * Logs an informational message.
   */
  static info(message: string, context?: Record<string, any>) {
    StructuredLogger.info(message, { metadata: context });
  }

  /**
   * Logs debug information.
   */
  static debug(message: string, context?: Record<string, any>) {
    StructuredLogger.debug(message, { metadata: context });
  }
}
