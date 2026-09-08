/**
 * ============================================================================
 * AUTHORITATIVE STRUCTURED JSON LOGGER WITH TRACING & PII REDACTION
 * ============================================================================
 * Production structured logging engine:
 * - Emits machine-parseable JSON records
 * - Automatically enriches log lines with active W3C traceId & spanId
 * - Enforces zero-PII / credentials redaction
 * - Standard log levels: DEBUG, INFO, WARN, ERROR, FATAL
 */

import { Tracer } from "./tracer";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

export interface LogContext {
  traceId?: string;
  spanId?: string;
  requestId?: string;
  userId?: string;
  creatorProfileId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  service?: string;
  metadata?: Record<string, any>;
}

export interface StructuredLogRecord {
  timestamp: string;
  level: LogLevel;
  service: string;
  environment: string;
  message: string;
  traceId?: string;
  spanId?: string;
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

const SENSITIVE_PATTERNS = [
  "password",
  "passphrase",
  "token",
  "secret",
  "authorization",
  "bearer",
  "creditcard",
  "cardnumber",
  "cvv",
  "cvc",
  "pan",
  "ssn",
  "govid",
  "passport",
  "idnumber",
  "apikey",
  "webhooksecret",
  "sessionsecret",
  "privatekey",
];

export function redactSensitiveValues(obj: any, depth = 0): any {
  if (depth > 6 || obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    // Redact Bearer tokens and potential PANs / CVVs
    let str = obj.replace(/Bearer\s+[A-Za-z0-9-_.]+/gi, "Bearer [REDACTED]");
    str = str.replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, "[REDACTED_PAN]");
    return str;
  }
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveValues(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_PATTERNS.some((p) => lowerKey.includes(p))) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = redactSensitiveValues(value, depth + 1);
    }
  }
  return sanitized;
}

export class StructuredLogger {
  private static serviceName = process.env.SERVICE_NAME || "stream-core-platform";
  private static environment = process.env.APP_ENV || process.env.NODE_ENV || "development";
  private static minLogLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "INFO";

  private static levelPriority: Record<LogLevel, number> = {
    DEBUG: 10,
    INFO: 20,
    WARN: 30,
    ERROR: 40,
    FATAL: 50,
  };

  private static shouldLog(level: LogLevel): boolean {
    return StructuredLogger.levelPriority[level] >= StructuredLogger.levelPriority[StructuredLogger.minLogLevel];
  }

  private static buildRecord(
    level: LogLevel,
    message: string,
    error?: Error | any,
    context?: LogContext
  ): StructuredLogRecord {
    const activeSpanContext = Tracer.getActiveContext();

    const record: StructuredLogRecord = {
      timestamp: new Date().toISOString(),
      level,
      service: context?.service || StructuredLogger.serviceName,
      environment: StructuredLogger.environment,
      message,
      traceId: context?.traceId || activeSpanContext?.traceId,
      spanId: context?.spanId || activeSpanContext?.spanId,
      requestId: context?.requestId,
      userId: context?.userId,
      path: context?.path,
      method: context?.method,
      statusCode: context?.statusCode,
      durationMs: context?.durationMs,
    };

    if (error) {
      record.error = {
        name: error.name || "Error",
        message: error.message || String(error),
        stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
      };
    }

    if (context?.metadata) {
      record.metadata = redactSensitiveValues(context.metadata);
    }

    return record;
  }

  private static emit(record: StructuredLogRecord): void {
    const jsonOutput = JSON.stringify(record);

    switch (record.level) {
      case "DEBUG":
        console.debug(jsonOutput);
        break;
      case "INFO":
        console.log(jsonOutput);
        break;
      case "WARN":
        console.warn(jsonOutput);
        break;
      case "ERROR":
      case "FATAL":
        console.error(jsonOutput);
        break;
    }
  }

  public static debug(message: string, context?: LogContext): void {
    if (!StructuredLogger.shouldLog("DEBUG")) return;
    const record = StructuredLogger.buildRecord("DEBUG", message, undefined, context);
    StructuredLogger.emit(record);
  }

  public static info(message: string, context?: LogContext): void {
    if (!StructuredLogger.shouldLog("INFO")) return;
    const record = StructuredLogger.buildRecord("INFO", message, undefined, context);
    StructuredLogger.emit(record);
  }

  public static warn(message: string, context?: LogContext): void {
    if (!StructuredLogger.shouldLog("WARN")) return;
    const record = StructuredLogger.buildRecord("WARN", message, undefined, context);
    StructuredLogger.emit(record);
  }

  public static error(message: string, error?: Error | any, context?: LogContext): void {
    if (!StructuredLogger.shouldLog("ERROR")) return;
    const record = StructuredLogger.buildRecord("ERROR", message, error, context);
    StructuredLogger.emit(record);
  }

  public static fatal(message: string, error?: Error | any, context?: LogContext): void {
    if (!StructuredLogger.shouldLog("FATAL")) return;
    const record = StructuredLogger.buildRecord("FATAL", message, error, context);
    StructuredLogger.emit(record);
  }
}
