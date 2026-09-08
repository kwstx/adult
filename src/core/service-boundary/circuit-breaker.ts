/**
 * Resilient Circuit Breaker
 * 
 * Prevents cascading failures when invoking remote out-of-process services.
 * Automatically trips to OPEN when failures exceed threshold, allows test traffic
 * in HALF_OPEN after cooldown, and falls back gracefully.
 */

import { CircuitBreakerConfig, CircuitState } from "./types";

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttempt: number = Date.now();
  private readonly config: CircuitBreakerConfig;

  constructor(
    public readonly name: string,
    config?: Partial<CircuitBreakerConfig>
  ) {
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      resetTimeoutMs: config?.resetTimeoutMs ?? 10000,
      timeoutMs: config?.timeoutMs ?? 5000,
      halfOpenMaxTrials: config?.halfOpenMaxTrials ?? 2,
    };
  }

  public getState(): CircuitState {
    if (this.state === "OPEN" && Date.now() >= this.nextAttempt) {
      this.state = "HALF_OPEN";
      this.successCount = 0;
    }
    return this.state;
  }

  public async execute<T>(
    action: () => Promise<T>,
    fallback?: (err: Error) => Promise<T> | T
  ): Promise<T> {
    const currentState = this.getState();

    if (currentState === "OPEN") {
      const openErr = new Error(
        `[CircuitBreaker:${this.name}] Circuit is OPEN. Fast failing request.`
      );
      if (fallback) {
        return fallback(openErr);
      }
      throw openErr;
    }

    try {
      // Execute with timeout promise
      const result = await this.executeWithTimeout(action, this.config.timeoutMs);
      this.onSuccess();
      return result;
    } catch (err: any) {
      this.onFailure();
      if (fallback) {
        return fallback(err);
      }
      throw err;
    }
  }

  private async executeWithTimeout<T>(
    action: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    let timer: NodeJS.Timeout | null = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new Error(
            `[CircuitBreaker:${this.name}] Execution timed out after ${timeoutMs}ms`
          )
        );
      }, timeoutMs);
    });

    try {
      return await Promise.race([action(), timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private onSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.config.halfOpenMaxTrials) {
        this.state = "CLOSED";
        this.failureCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.config.failureThreshold || this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + this.config.resetTimeoutMs;
    }
  }

  public reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
  }

  public getMetrics() {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttemptInMs: Math.max(0, this.nextAttempt - Date.now()),
    };
  }
}
