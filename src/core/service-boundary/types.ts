/**
 * Core Service Mesh & Boundary Types
 * 
 * Defines standard execution modes, execution contexts, standardized results,
 * circuit breaker parameters, and health telemetry.
 */

export type ServiceMode = "IN_PROCESS" | "OUT_OF_PROCESS_RPC" | "ASYNC_WORKER";

export type ServiceName =
  | "MEDIA_ORCHESTRATION"
  | "PAYMENTS_WALLET"
  | "MESSAGING"
  | "RECOMMENDATION"
  | "NOTIFICATIONS"
  | "MODERATION"
  | "ANALYTICS"
  | "SEARCH"
  | "CREATOR_PAYOUTS";

export interface ServiceContext {
  correlationId: string;
  tenantId?: string;
  userId?: string;
  clientIp?: string;
  userAgent?: string;
  sourceModule?: string;
  timestamp: string;
}

export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    retriable?: boolean;
  };
  metadata: {
    serviceName: ServiceName;
    executionMode: ServiceMode;
    durationMs: number;
    correlationId: string;
    cached?: boolean;
  };
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit (e.g. 5)
  resetTimeoutMs: number;    // Time to wait before testing half-open state (e.g. 10000ms)
  timeoutMs: number;         // Max request execution time (e.g. 3000ms)
  halfOpenMaxTrials: number; // Number of successful trials to close circuit (e.g. 2)
}

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface ServiceHealthStatus {
  serviceName: ServiceName;
  status: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  mode: ServiceMode;
  circuitState: CircuitState;
  endpoint?: string;
  latencyMs: number;
  uptimeSeconds: number;
  lastCheckedAt: string;
  details?: Record<string, unknown>;
}

export interface RpcClientConfig {
  endpoint: string;
  authToken?: string;
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
}
