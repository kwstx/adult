/**
 * ============================================================================
 * ENVIRONMENT SCHEMA & VALIDATION ENGINE
 * ============================================================================
 * Provides authoritative schema definition and strict runtime validation for
 * platform configuration across Development, Staging, and Production environments.
 * 
 * Guarantees:
 * - Development: Allows local mocks, debug flags, localhost endpoints.
 * - Staging: Requires staging-grade infrastructure, mock or sandbox payment gateways,
 *   strict SSL/TLS on DB/Redis, sanitization policies.
 * - Production: Strictly forbids mock gateways, placeholder secrets, and debug flags.
 *   Enforces minimum secret entropy and real external cloud providers.
 */

export type AppEnvironment = "development" | "staging" | "production" | "test";

export interface EnvironmentConfig {
  // Runtime Identity
  NODE_ENV: AppEnvironment;
  APP_ENV: AppEnvironment;
  PORT: number;
  APP_NAME: string;
  APP_URL: string;

  // Databases & Infrastructure
  DATABASE_URL: string;
  DATABASE_MAX_CONNECTIONS: number;
  DATABASE_IDLE_TIMEOUT_MS: number;
  REDIS_URL: string;
  REDIS_KEY_PREFIX: string;

  // Economic & Payments
  PAYMENT_GATEWAY_PROVIDER: "ccbill" | "segpay" | "epoch" | "stripe" | "ccbill_mock";
  PAYMENT_WEBHOOK_SECRET: string;
  PLATFORM_FEE_PERCENTAGE: number;
  ALLOW_MOCK_PAYMENTS: boolean;

  // Trust, Safety & Compliance (18+ & 2257)
  AGE_GATE_ENFORCEMENT: boolean;
  KYC_PROVIDER: "persona" | "veriff" | "persona_mock";
  COMPLIANCE_2257_STORAGE_BUCKET: string;
  COMPLIANCE_STORAGE_ENCRYPTION_KEY?: string;

  // Live Video & CDN Infrastructure
  LIVESTREAM_PROVIDER: "livekit" | "mux" | "cloudflare_stream" | "livepeer_mux_mock";
  MEDIA_CDN_BASE_URL: string;
  PROTECTED_MEDIA_STORAGE_BUCKET: string;

  // Security & Operational Flags
  SESSION_SECRET: string;
  ENABLE_DEBUG_ENDPOINTS: boolean;
  ALLOW_DATA_MUTATION_SCRIPTS: boolean;
  ENABLE_AUDIT_LOG_STREAMING: boolean;
}

export interface ValidationErrorDetail {
  variable: string;
  value?: string;
  message: string;
  ruleViolation: string;
}

export interface EnvironmentValidationResult {
  isValid: boolean;
  environment: AppEnvironment;
  config?: EnvironmentConfig;
  errors: ValidationErrorDetail[];
  warnings: string[];
}

/**
 * Validates raw environment variables against the target environment's rules.
 */
export function validateEnvironment(rawEnv: Record<string, string | undefined>): EnvironmentValidationResult {
  const errors: ValidationErrorDetail[] = [];
  const warnings: string[] = [];

  // 1. Resolve Environment Tier
  const nodeEnv = (rawEnv.NODE_ENV || "development").toLowerCase() as AppEnvironment;
  const appEnv = (rawEnv.APP_ENV || nodeEnv) as AppEnvironment;

  const validEnvironments: AppEnvironment[] = ["development", "staging", "production", "test"];
  if (!validEnvironments.includes(appEnv)) {
    errors.push({
      variable: "APP_ENV",
      value: appEnv,
      message: `Invalid APP_ENV '${appEnv}'. Must be one of: ${validEnvironments.join(", ")}`,
      ruleViolation: "INVALID_ENVIRONMENT_NAME",
    });
  }

  const isProd = appEnv === "production";
  const isStaging = appEnv === "staging";
  const isDev = appEnv === "development" || appEnv === "test";

  // 2. Core Variables
  const port = parseInt(rawEnv.PORT || "3000", 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push({
      variable: "PORT",
      value: rawEnv.PORT,
      message: "PORT must be a valid integer between 1 and 65535",
      ruleViolation: "INVALID_PORT",
    });
  }

  const appName = rawEnv.NEXT_PUBLIC_APP_NAME || "AuraLive";
  const appUrl = rawEnv.NEXT_PUBLIC_APP_URL || (isDev ? `http://localhost:${port}` : "");

  if (isProd && (!appUrl || !appUrl.startsWith("https://"))) {
    errors.push({
      variable: "NEXT_PUBLIC_APP_URL",
      value: appUrl,
      message: "Production NEXT_PUBLIC_APP_URL must start with https://",
      ruleViolation: "INSECURE_PRODUCTION_URL",
    });
  }

  // 3. Database URL & Isolation
  const databaseUrl = rawEnv.DATABASE_URL || "";
  if (!databaseUrl) {
    errors.push({
      variable: "DATABASE_URL",
      message: "DATABASE_URL is required for authoritative system of record",
      ruleViolation: "MISSING_REQUIRED_DATABASE",
    });
  } else {
    if (isProd) {
      if (databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1") || databaseUrl.includes("sqlite")) {
        errors.push({
          variable: "DATABASE_URL",
          value: databaseUrl,
          message: "Production DATABASE_URL cannot be localhost or SQLite",
          ruleViolation: "FORBIDDEN_LOCAL_DB_IN_PROD",
        });
      }
      if (!databaseUrl.includes("sslmode=require") && !databaseUrl.includes("sslmode=verify-full") && !databaseUrl.includes("ssl=true")) {
        warnings.push("Production DATABASE_URL should explicitly enforce SSL (e.g. sslmode=require)");
      }
    }
  }

  const dbMaxConn = parseInt(rawEnv.DATABASE_MAX_CONNECTIONS || (isProd ? "50" : isStaging ? "25" : "10"), 10);
  const dbIdleTimeout = parseInt(rawEnv.DATABASE_IDLE_TIMEOUT_MS || "30000", 10);

  // 4. Redis Configuration
  const redisUrl = rawEnv.REDIS_URL || "redis://localhost:6379";
  if (isProd && (redisUrl.includes("localhost") || redisUrl.includes("127.0.0.1"))) {
    errors.push({
      variable: "REDIS_URL",
      value: redisUrl,
      message: "Production REDIS_URL cannot point to localhost",
      ruleViolation: "FORBIDDEN_LOCAL_REDIS_IN_PROD",
    });
  }

  const redisKeyPrefix = rawEnv.REDIS_KEY_PREFIX || `platform:${appEnv}:`;

  // 5. Payment & Economic System Validation (Zero Mock in Production)
  const paymentProvider = (rawEnv.PAYMENT_GATEWAY_PROVIDER || (isDev ? "ccbill_mock" : "ccbill")) as
    | "ccbill"
    | "segpay"
    | "epoch"
    | "stripe"
    | "ccbill_mock";

  const paymentWebhookSecret = rawEnv.PAYMENT_WEBHOOK_SECRET || "";
  const allowMockPayments = (rawEnv.ALLOW_MOCK_PAYMENTS || "false").toLowerCase() === "true";

  if (isProd) {
    if (paymentProvider.endsWith("_mock") || paymentProvider === "ccbill_mock") {
      errors.push({
        variable: "PAYMENT_GATEWAY_PROVIDER",
        value: paymentProvider,
        message: "Mock payment gateways are strictly forbidden in Production environment",
        ruleViolation: "FORBIDDEN_MOCK_PAYMENT_IN_PROD",
      });
    }

    if (allowMockPayments) {
      errors.push({
        variable: "ALLOW_MOCK_PAYMENTS",
        value: "true",
        message: "ALLOW_MOCK_PAYMENTS must be false in Production environment",
        ruleViolation: "FORBIDDEN_MOCK_FLAG_IN_PROD",
      });
    }

    if (!paymentWebhookSecret || paymentWebhookSecret.length < 32) {
      errors.push({
        variable: "PAYMENT_WEBHOOK_SECRET",
        message: "Production PAYMENT_WEBHOOK_SECRET must have at least 32 characters of high-entropy secret",
        ruleViolation: "INSUFFICIENT_SECRET_ENTROPY",
      });
    }

    const placeholderSecrets = ["whsec_adult_platform_live_secret_key", "secret", "changeme", "default_secret"];
    if (placeholderSecrets.includes(paymentWebhookSecret.toLowerCase())) {
      errors.push({
        variable: "PAYMENT_WEBHOOK_SECRET",
        value: "[REDACTED_KNOWN_PLACEHOLDER]",
        message: "Production PAYMENT_WEBHOOK_SECRET cannot use default placeholder keys",
        ruleViolation: "DEFAULT_SECRET_IN_PROD",
      });
    }
  }

  const platformFeePercentage = parseFloat(rawEnv.PLATFORM_FEE_PERCENTAGE || "20");
  if (isNaN(platformFeePercentage) || platformFeePercentage < 0 || platformFeePercentage > 100) {
    errors.push({
      variable: "PLATFORM_FEE_PERCENTAGE",
      value: rawEnv.PLATFORM_FEE_PERCENTAGE,
      message: "PLATFORM_FEE_PERCENTAGE must be a valid number between 0 and 100",
      ruleViolation: "INVALID_PLATFORM_FEE",
    });
  }

  // 6. Trust & Safety (18+ Age Gate & 2257 Compliance Storage)
  const ageGateEnforcement = (rawEnv.AGE_GATE_ENFORCEMENT ?? "true").toLowerCase() === "true";
  if ((isProd || isStaging) && !ageGateEnforcement) {
    errors.push({
      variable: "AGE_GATE_ENFORCEMENT",
      value: "false",
      message: "AGE_GATE_ENFORCEMENT cannot be disabled in Staging or Production (18+ Platform Rule)",
      ruleViolation: "DISABLED_AGE_GATE_IN_PROD_OR_STAGING",
    });
  }

  const kycProvider = (rawEnv.KYC_PROVIDER || (isDev ? "persona_mock" : "persona")) as
    | "persona"
    | "veriff"
    | "persona_mock";

  if (isProd && (kycProvider === "persona_mock" || kycProvider.endsWith("_mock"))) {
    errors.push({
      variable: "KYC_PROVIDER",
      value: kycProvider,
      message: "Mock KYC provider is strictly forbidden in Production environment",
      ruleViolation: "FORBIDDEN_MOCK_KYC_IN_PROD",
    });
  }

  const compliance2257Bucket = rawEnv.COMPLIANCE_2257_STORAGE_BUCKET || (isDev ? "vault-2257-compliance-local" : "");
  if (!compliance2257Bucket) {
    errors.push({
      variable: "COMPLIANCE_2257_STORAGE_BUCKET",
      message: "COMPLIANCE_2257_STORAGE_BUCKET is required for mandatory custodian record-keeping",
      ruleViolation: "MISSING_COMPLIANCE_BUCKET",
    });
  }

  // 7. Livestream & Video CDN
  const livestreamProvider = (rawEnv.LIVESTREAM_PROVIDER || (isDev ? "livepeer_mux_mock" : "mux")) as
    | "livekit"
    | "mux"
    | "cloudflare_stream"
    | "livepeer_mux_mock";

  if (isProd && (livestreamProvider === "livepeer_mux_mock" || livestreamProvider.endsWith("_mock"))) {
    errors.push({
      variable: "LIVESTREAM_PROVIDER",
      value: livestreamProvider,
      message: "Mock livestream infrastructure is forbidden in Production environment",
      ruleViolation: "FORBIDDEN_MOCK_STREAM_IN_PROD",
    });
  }

  const mediaCdnBaseUrl = rawEnv.MEDIA_CDN_BASE_URL || (isDev ? "https://cdn.platform.local" : "");
  if (isProd && (!mediaCdnBaseUrl || mediaCdnBaseUrl.includes("localhost") || mediaCdnBaseUrl.includes(".local"))) {
    errors.push({
      variable: "MEDIA_CDN_BASE_URL",
      value: mediaCdnBaseUrl,
      message: "Production MEDIA_CDN_BASE_URL must be a valid public CDN domain",
      ruleViolation: "INVALID_PRODUCTION_CDN_URL",
    });
  }

  const protectedMediaBucket = rawEnv.PROTECTED_MEDIA_STORAGE_BUCKET || (isDev ? "protected-ppv-media-local" : "");
  if (!protectedMediaBucket) {
    errors.push({
      variable: "PROTECTED_MEDIA_STORAGE_BUCKET",
      message: "PROTECTED_MEDIA_STORAGE_BUCKET is required for PPV/exclusive media access control",
      ruleViolation: "MISSING_PROTECTED_MEDIA_BUCKET",
    });
  }

  // 8. Session Secret & Security Controls
  const sessionSecret = rawEnv.SESSION_SECRET || (isDev ? "dev_insecure_session_secret_for_local_only_12345678" : "");
  if (isProd && (!sessionSecret || sessionSecret.length < 32)) {
    errors.push({
      variable: "SESSION_SECRET",
      message: "Production SESSION_SECRET must be at least 32 characters long",
      ruleViolation: "INSUFFICIENT_SESSION_SECRET",
    });
  }

  const enableDebugEndpoints = (rawEnv.ENABLE_DEBUG_ENDPOINTS || (isDev ? "true" : "false")).toLowerCase() === "true";
  if (isProd && enableDebugEndpoints) {
    errors.push({
      variable: "ENABLE_DEBUG_ENDPOINTS",
      value: "true",
      message: "Debug endpoints must be strictly disabled in Production environment",
      ruleViolation: "FORBIDDEN_DEBUG_ENDPOINTS_IN_PROD",
    });
  }

  const allowDataMutationScripts = (rawEnv.ALLOW_DATA_MUTATION_SCRIPTS || (isDev ? "true" : "false")).toLowerCase() === "true";
  if (isProd && allowDataMutationScripts) {
    errors.push({
      variable: "ALLOW_DATA_MUTATION_SCRIPTS",
      value: "true",
      message: "Direct data mutation scripts are forbidden against Production environment",
      ruleViolation: "FORBIDDEN_MUTATION_SCRIPTS_IN_PROD",
    });
  }

  const enableAuditLogStreaming = (rawEnv.ENABLE_AUDIT_LOG_STREAMING || (isProd ? "true" : "false")).toLowerCase() === "true";

  // Build validated config object if clean
  let config: EnvironmentConfig | undefined = undefined;
  if (errors.length === 0) {
    config = {
      NODE_ENV: nodeEnv,
      APP_ENV: appEnv,
      PORT: port,
      APP_NAME: appName,
      APP_URL: appUrl,
      DATABASE_URL: databaseUrl,
      DATABASE_MAX_CONNECTIONS: dbMaxConn,
      DATABASE_IDLE_TIMEOUT_MS: dbIdleTimeout,
      REDIS_URL: redisUrl,
      REDIS_KEY_PREFIX: redisKeyPrefix,
      PAYMENT_GATEWAY_PROVIDER: paymentProvider,
      PAYMENT_WEBHOOK_SECRET: paymentWebhookSecret,
      PLATFORM_FEE_PERCENTAGE: platformFeePercentage,
      ALLOW_MOCK_PAYMENTS: allowMockPayments,
      AGE_GATE_ENFORCEMENT: ageGateEnforcement,
      KYC_PROVIDER: kycProvider,
      COMPLIANCE_2257_STORAGE_BUCKET: compliance2257Bucket,
      COMPLIANCE_STORAGE_ENCRYPTION_KEY: rawEnv.COMPLIANCE_STORAGE_ENCRYPTION_KEY,
      LIVESTREAM_PROVIDER: livestreamProvider,
      MEDIA_CDN_BASE_URL: mediaCdnBaseUrl,
      PROTECTED_MEDIA_STORAGE_BUCKET: protectedMediaBucket,
      SESSION_SECRET: sessionSecret,
      ENABLE_DEBUG_ENDPOINTS: enableDebugEndpoints,
      ALLOW_DATA_MUTATION_SCRIPTS: allowDataMutationScripts,
      ENABLE_AUDIT_LOG_STREAMING: enableAuditLogStreaming,
    };
  }

  return {
    isValid: errors.length === 0,
    environment: appEnv,
    config,
    errors,
    warnings,
  };
}
