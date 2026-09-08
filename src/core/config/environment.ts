/**
 * ============================================================================
 * ENVIRONMENT ACCESSOR & ISOLATION CONTEXT
 * ============================================================================
 * Centralized singleton providing validated environment properties, safety guards,
 * and environment assertions across the platform.
 */

import { AppEnvironment, EnvironmentConfig, validateEnvironment } from "./env-schema";

class EnvironmentManager {
  private static instance: EnvironmentManager;
  private _config: EnvironmentConfig | null = null;
  private _rawEnv: Record<string, string | undefined>;

  private constructor() {
    this._rawEnv = process.env;
  }

  public static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  /**
   * Resets internal state (useful for unit/integration testing different environments).
   */
  public reset(customEnv?: Record<string, string | undefined>): void {
    this._rawEnv = customEnv || process.env;
    this._config = null;
  }

  /**
   * Resolves the active environment name without performing full validation.
   */
  public getEnvironmentName(): AppEnvironment {
    const raw = (this._rawEnv.APP_ENV || this._rawEnv.NODE_ENV || "development").toLowerCase();
    if (["development", "staging", "production", "test"].includes(raw)) {
      return raw as AppEnvironment;
    }
    return "development";
  }

  /**
   * Retrieves the validated configuration singleton.
   * Throws fatal Error on startup if environment validation fails.
   */
  public getConfig(): EnvironmentConfig {
    if (!this._config) {
      const validation = validateEnvironment(this._rawEnv);
      if (!validation.isValid || !validation.config) {
        const errorMessages = validation.errors
          .map((e) => ` - [${e.ruleViolation}] ${e.variable}: ${e.message}`)
          .join("\n");
        throw new Error(
          `[FATAL] Environment Configuration Error for environment '${validation.environment}':\n${errorMessages}`
        );
      }
      this._config = validation.config;
    }
    return this._config;
  }

  public isDevelopment(): boolean {
    return this.getEnvironmentName() === "development";
  }

  public isStaging(): boolean {
    return this.getEnvironmentName() === "staging";
  }

  public isProduction(): boolean {
    return this.getEnvironmentName() === "production";
  }

  public isTest(): boolean {
    return this.getEnvironmentName() === "test";
  }

  /**
   * Guard preventing dangerous operations (e.g. database wipe, mock injection, raw seed) from running in production.
   */
  public assertNotProduction(actionName: string): void {
    if (this.isProduction()) {
      throw new Error(
        `[CRITICAL_SECURITY_GUARD] Action '${actionName}' is strictly prohibited in the PRODUCTION environment.`
      );
    }
  }

  /**
   * Enforces that the current environment is in the allowed list.
   */
  public assertEnvironment(allowedEnvironments: AppEnvironment[], actionName: string): void {
    const current = this.getEnvironmentName();
    if (!allowedEnvironments.includes(current)) {
      throw new Error(
        `[ENVIRONMENT_MISMATCH] Action '${actionName}' can only be executed in: [${allowedEnvironments.join(
          ", "
        )}]. Current environment: '${current}'.`
      );
    }
  }

  /**
   * Returns a sanitized view of the active environment suitable for logs and telemetry.
   */
  public getSanitizedMetadata() {
    const current = this.getEnvironmentName();
    return {
      environment: current,
      isProduction: this.isProduction(),
      isStaging: this.isStaging(),
      isDevelopment: this.isDevelopment(),
      appName: this._rawEnv.NEXT_PUBLIC_APP_NAME || "AuraLive",
      appUrl: this._rawEnv.NEXT_PUBLIC_APP_URL || (this.isDevelopment() ? "http://localhost:3000" : ""),
      paymentProvider: this._rawEnv.PAYMENT_GATEWAY_PROVIDER || (this.isDevelopment() ? "ccbill_mock" : "ccbill"),
      kycProvider: this._rawEnv.KYC_PROVIDER || (this.isDevelopment() ? "persona_mock" : "persona"),
      livestreamProvider: this._rawEnv.LIVESTREAM_PROVIDER || (this.isDevelopment() ? "livepeer_mux_mock" : "mux"),
      ageGateEnforced: (this._rawEnv.AGE_GATE_ENFORCEMENT ?? "true") === "true",
    };
  }
}

export const env = EnvironmentManager.getInstance();
export const getAppConfig = () => env.getConfig();
export const isDevelopment = () => env.isDevelopment();
export const isStaging = () => env.isStaging();
export const isProduction = () => env.isProduction();
export const isTest = () => env.isTest();
export const assertNotProduction = (action: string) => env.assertNotProduction(action);
export const assertEnvironment = (allowed: AppEnvironment[], action: string) =>
  env.assertEnvironment(allowed, action);

export default env;
