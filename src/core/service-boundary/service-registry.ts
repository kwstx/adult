/**
 * Central Service Boundary Registry & Dispatcher
 * 
 * Manages binding and dynamic resolution for the 9 candidate services.
 * Allows transparent switching between IN_PROCESS, OUT_OF_PROCESS_RPC, and ASYNC_WORKER
 * based on environment configuration without modifying consuming domain code.
 */

import {
  CircuitState,
  ServiceContext,
  ServiceHealthStatus,
  ServiceMode,
  ServiceName,
  ServiceResult,
} from "./types";
import { CircuitBreaker } from "./circuit-breaker";

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services = new Map<ServiceName, unknown>();
  private circuitBreakers = new Map<ServiceName, CircuitBreaker>();
  private serviceModes = new Map<ServiceName, ServiceMode>();
  private serviceEndpoints = new Map<ServiceName, string>();
  private startTime = Date.now();

  private constructor() {
    this.initializeDefaultModes();
  }

  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  private initializeDefaultModes(): void {
    const defaultServices: ServiceName[] = [
      "MEDIA_ORCHESTRATION",
      "PAYMENTS_WALLET",
      "MESSAGING",
      "RECOMMENDATION",
      "NOTIFICATIONS",
      "MODERATION",
      "ANALYTICS",
      "SEARCH",
      "CREATOR_PAYOUTS",
    ];

    for (const service of defaultServices) {
      const envKey = `SERVICE_MODE_${service}`;
      const envVal = (process.env[envKey] as ServiceMode) || "IN_PROCESS";
      this.serviceModes.set(service, envVal);

      const endpointKey = `SERVICE_URL_${service}`;
      const endpointVal = process.env[endpointKey] || `http://localhost:${this.getDefaultPort(service)}`;
      this.serviceEndpoints.set(service, endpointVal);

      this.circuitBreakers.set(service, new CircuitBreaker(service));
    }
  }

  private getDefaultPort(service: ServiceName): number {
    const portMap: Record<ServiceName, number> = {
      MEDIA_ORCHESTRATION: 4001,
      PAYMENTS_WALLET: 4002,
      MESSAGING: 4003,
      RECOMMENDATION: 4004,
      NOTIFICATIONS: 4005,
      MODERATION: 4006,
      ANALYTICS: 4007,
      SEARCH: 4008,
      CREATOR_PAYOUTS: 4009,
    };
    return portMap[service] || 4000;
  }

  public register<T>(serviceName: ServiceName, implementation: T): void {
    this.services.set(serviceName, implementation);
  }

  public get<T>(serviceName: ServiceName): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`[ServiceRegistry] Service ${serviceName} is not registered.`);
    }
    return service as T;
  }

  public getMode(serviceName: ServiceName): ServiceMode {
    return this.serviceModes.get(serviceName) || "IN_PROCESS";
  }

  public setMode(serviceName: ServiceName, mode: ServiceMode): void {
    this.serviceModes.set(serviceName, mode);
  }

  public getEndpoint(serviceName: ServiceName): string {
    return this.serviceEndpoints.get(serviceName) || "";
  }

  public setEndpoint(serviceName: ServiceName, endpoint: string): void {
    this.serviceEndpoints.set(serviceName, endpoint);
  }

  public getCircuitBreaker(serviceName: ServiceName): CircuitBreaker {
    let cb = this.circuitBreakers.get(serviceName);
    if (!cb) {
      cb = new CircuitBreaker(serviceName);
      this.circuitBreakers.set(serviceName, cb);
    }
    return cb;
  }

  public async execute<TPayload, TResponse>(
    serviceName: ServiceName,
    action: () => Promise<TResponse>,
    context?: Partial<ServiceContext>,
    fallback?: (err: Error) => Promise<TResponse> | TResponse
  ): Promise<ServiceResult<TResponse>> {
    const start = Date.now();
    const correlationId = context?.correlationId || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const mode = this.getMode(serviceName);
    const cb = this.getCircuitBreaker(serviceName);

    try {
      const data = await cb.execute(action, fallback);
      return {
        success: true,
        data,
        metadata: {
          serviceName,
          executionMode: mode,
          durationMs: Date.now() - start,
          correlationId,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: err.code || "SERVICE_EXECUTION_ERROR",
          message: err.message || "Unknown error occurred during service execution",
          details: err,
        },
        metadata: {
          serviceName,
          executionMode: mode,
          durationMs: Date.now() - start,
          correlationId,
        },
      };
    }
  }

  public getHealthSummary(): ServiceHealthStatus[] {
    const allServices: ServiceName[] = [
      "MEDIA_ORCHESTRATION",
      "PAYMENTS_WALLET",
      "MESSAGING",
      "RECOMMENDATION",
      "NOTIFICATIONS",
      "MODERATION",
      "ANALYTICS",
      "SEARCH",
      "CREATOR_PAYOUTS",
    ];

    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    return allServices.map((serviceName) => {
      const cb = this.getCircuitBreaker(serviceName);
      const state: CircuitState = cb.getState();
      const mode = this.getMode(serviceName);
      const isRegistered = this.services.has(serviceName);

      let status: "HEALTHY" | "DEGRADED" | "UNHEALTHY" = "HEALTHY";
      if (!isRegistered && mode === "IN_PROCESS") {
        status = "UNHEALTHY";
      } else if (state === "OPEN") {
        status = "UNHEALTHY";
      } else if (state === "HALF_OPEN") {
        status = "DEGRADED";
      }

      return {
        serviceName,
        status,
        mode,
        circuitState: state,
        endpoint: mode === "OUT_OF_PROCESS_RPC" ? this.getEndpoint(serviceName) : "in-memory",
        latencyMs: 1,
        uptimeSeconds: uptime,
        lastCheckedAt: new Date().toISOString(),
        details: cb.getMetrics(),
      };
    });
  }
}

export const serviceRegistry = ServiceRegistry.getInstance();
