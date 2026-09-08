/**
 * Resilient RPC Client
 * 
 * Dispatches structured calls to remote microservices when running in OUT_OF_PROCESS_RPC mode.
 * Supports authentication, correlation header propagation, timeouts, and exponential retry.
 */

import { RpcClientConfig, ServiceContext } from "./types";

export class RpcClient {
  constructor(private readonly config: RpcClientConfig) {}

  public async call<TResponse = unknown, TPayload = unknown>(
    method: string,
    payload: TPayload,
    context?: Partial<ServiceContext>
  ): Promise<TResponse> {
    const correlationId = context?.correlationId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const url = `${this.config.endpoint.replace(/\/$/, "")}/${method.replace(/^\//, "")}`;

    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts <= this.config.maxRetries) {
      attempts++;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Correlation-ID": correlationId,
          "X-Timestamp": context?.timestamp || new Date().toISOString(),
        };

        if (this.config.authToken) {
          headers["Authorization"] = `Bearer ${this.config.authToken}`;
        }
        if (context?.tenantId) {
          headers["X-Tenant-ID"] = context.tenantId;
        }
        if (context?.userId) {
          headers["X-User-ID"] = context.userId;
        }
        if (context?.sourceModule) {
          headers["X-Source-Module"] = context.sourceModule;
        }

        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errBody = await response.text().catch(() => "");
          throw new Error(
            `RPC call to ${url} failed with status ${response.status}: ${errBody}`
          );
        }

        const json = await response.json();
        return json as TResponse;
      } catch (err: any) {
        lastError = err;
        if (attempts <= this.config.maxRetries) {
          const backoff = this.config.retryDelayMs * Math.pow(2, attempts - 1);
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
    }

    throw lastError || new Error(`RPC call failed after ${attempts} attempts.`);
  }
}
