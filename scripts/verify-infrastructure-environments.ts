/**
 * ============================================================================
 * INFRASTRUCTURE ENVIRONMENTS VERIFICATION TEST SUITE
 * ============================================================================
 * Verifies all rules and technical constraints for:
 * 1. Development, Staging, and Production environment configuration & validation.
 * 2. Strict production safety gates (zero mock adapters, entropy checks, security controls).
 * 3. Version-controlled database migration guards & anti-drift integrity.
 * 4. Staging data sanitizer failsafes against production databases.
 * 5. Deployment orchestrator lifecycle, gates, health probes, and rollback triggers.
 * 6. IaC container and Kubernetes manifest completeness.
 */

import { validateEnvironment } from "../src/core/config/env-schema";
import { env } from "../src/core/config/environment";
import { MigrationGuard } from "../src/core/infra/migrations/migration-guard";
import { StagingDatabaseSanitizer } from "../src/core/infra/staging/db-sanitizer";
import { DeploymentOrchestrator } from "../src/core/infra/deployment/deployer";
import { withEnvironmentGuard, assertCanRunMockAdapter } from "../src/core/infra/guards/env-guards";
import fs from "fs";
import path from "path";

let passedTests = 0;
let totalTests = 0;

function assertTest(condition: boolean, testName: string, failureDetails?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    if (failureDetails) {
      console.error(`    Details: ${failureDetails}`);
    }
  }
}

async function runTestSuite() {
  console.log("\n==================================================================");
  console.log("INFRASTRUCTURE ENVIRONMENTS & REPEATABLE DEPLOYMENT TEST SUITE");
  console.log("==================================================================\n");

  // --------------------------------------------------------------------------
  // 1. CONFIGURATION VALIDATION: DEVELOPMENT
  // --------------------------------------------------------------------------
  console.log("[1/6] Testing Development Environment Configuration...");
  const devEnv = {
    APP_ENV: "development",
    NODE_ENV: "development",
    PORT: "3000",
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/adult_platform?schema=public",
    REDIS_URL: "redis://localhost:6379",
    PAYMENT_GATEWAY_PROVIDER: "ccbill_mock",
    PAYMENT_WEBHOOK_SECRET: "whsec_dev_local_testing_secret_key_12345678",
    KYC_PROVIDER: "persona_mock",
    LIVESTREAM_PROVIDER: "livepeer_mux_mock",
    COMPLIANCE_2257_STORAGE_BUCKET: "vault-2257-compliance-local",
    MEDIA_CDN_BASE_URL: "http://localhost:3000/media-mock",
    PROTECTED_MEDIA_STORAGE_BUCKET: "protected-ppv-media-local",
    SESSION_SECRET: "dev_session_secret_local_only_abcdef12345678",
    ENABLE_DEBUG_ENDPOINTS: "true",
    ALLOW_DATA_MUTATION_SCRIPTS: "true",
  };

  const devValidation = validateEnvironment(devEnv);
  assertTest(devValidation.isValid, "Development environment configuration is valid with local mocks");
  assertTest(devValidation.config?.ALLOW_MOCK_PAYMENTS === false || devValidation.config?.ALLOW_MOCK_PAYMENTS === true, "Development parsed allow mock settings");

  // --------------------------------------------------------------------------
  // 2. CONFIGURATION VALIDATION: STAGING
  // --------------------------------------------------------------------------
  console.log("\n[2/6] Testing Staging Environment Configuration...");
  const stagingEnv = {
    APP_ENV: "staging",
    NODE_ENV: "production",
    PORT: "3000",
    NEXT_PUBLIC_APP_URL: "https://staging.auralive.internal",
    DATABASE_URL: "postgresql://db_staging:staging_pass@db-staging.internal:5432/adult_platform_staging?sslmode=require",
    REDIS_URL: "rediss://redis-staging.internal:6379",
    PAYMENT_GATEWAY_PROVIDER: "ccbill",
    PAYMENT_WEBHOOK_SECRET: "whsec_staging_ccbill_sandbox_secret_99887766554433221100",
    KYC_PROVIDER: "persona",
    LIVESTREAM_PROVIDER: "livekit",
    COMPLIANCE_2257_STORAGE_BUCKET: "vault-2257-compliance-staging",
    MEDIA_CDN_BASE_URL: "https://cdn-staging.auralive.internal",
    PROTECTED_MEDIA_STORAGE_BUCKET: "protected-ppv-media-staging",
    SESSION_SECRET: "staging_session_hmac_secret_key_strictly_non_prod_32char",
    ENABLE_DEBUG_ENDPOINTS: "false",
    ALLOW_DATA_MUTATION_SCRIPTS: "true",
  };

  const stagingValidation = validateEnvironment(stagingEnv);
  assertTest(stagingValidation.isValid, "Staging environment configuration is valid with sandbox endpoints");

  // --------------------------------------------------------------------------
  // 3. STRICT PRODUCTION SAFETY GATES (ZERO MOCK & ENTROPY)
  // --------------------------------------------------------------------------
  console.log("\n[3/6] Testing Strict Production Safety Gates & Zero-Mock Enforcement...");

  const validProdEnv = {
    APP_ENV: "production",
    NODE_ENV: "production",
    PORT: "3000",
    NEXT_PUBLIC_APP_URL: "https://auralive.com",
    DATABASE_URL: "postgresql://db_prod_app:SuperSecureProdPassw0rd99@prod-db.us-east-1.rds.amazonaws.com:5432/adult_platform_prod?sslmode=require",
    REDIS_URL: "rediss://prod-redis.cluster.us-east-1.cache.amazonaws.com:6379",
    PAYMENT_GATEWAY_PROVIDER: "ccbill",
    PAYMENT_WEBHOOK_SECRET: "whsec_live_production_high_entropy_secret_994411883322",
    KYC_PROVIDER: "persona",
    LIVESTREAM_PROVIDER: "livekit",
    COMPLIANCE_2257_STORAGE_BUCKET: "auralive-prod-2257-vault-compliance",
    MEDIA_CDN_BASE_URL: "https://cdn.auralive.com",
    PROTECTED_MEDIA_STORAGE_BUCKET: "auralive-prod-ppv-protected-media",
    SESSION_SECRET: "prod_session_secret_hmac_key_strictly_32_characters_long",
    ENABLE_DEBUG_ENDPOINTS: "false",
    ALLOW_DATA_MUTATION_SCRIPTS: "false",
  };

  const prodValidation = validateEnvironment(validProdEnv);
  assertTest(prodValidation.isValid, "Clean production configuration passes validation");

  // Gate A: Reject Mock Payment Gateway in Production
  const mockPaymentProd = { ...validProdEnv, PAYMENT_GATEWAY_PROVIDER: "ccbill_mock" };
  const mockPaymentRes = validateEnvironment(mockPaymentProd);
  assertTest(
    !mockPaymentRes.isValid && mockPaymentRes.errors.some((e) => e.ruleViolation === "FORBIDDEN_MOCK_PAYMENT_IN_PROD"),
    "Production strictly rejects 'ccbill_mock' payment provider"
  );

  // Gate B: Reject Placeholder Secrets in Production
  const placeholderSecretProd = { ...validProdEnv, PAYMENT_WEBHOOK_SECRET: "whsec_adult_platform_live_secret_key" };
  const placeholderRes = validateEnvironment(placeholderSecretProd);
  assertTest(
    !placeholderRes.isValid && placeholderRes.errors.some((e) => e.ruleViolation === "DEFAULT_SECRET_IN_PROD"),
    "Production strictly rejects known placeholder webhook secrets"
  );

  // Gate C: Reject Localhost Database in Production
  const localhostDbProd = { ...validProdEnv, DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/adult_platform" };
  const localDbRes = validateEnvironment(localhostDbProd);
  assertTest(
    !localDbRes.isValid && localDbRes.errors.some((e) => e.ruleViolation === "FORBIDDEN_LOCAL_DB_IN_PROD"),
    "Production strictly rejects localhost DATABASE_URL"
  );

  // Gate D: Reject Debug Endpoints & Data Mutation Scripts in Production
  const debugProd = { ...validProdEnv, ENABLE_DEBUG_ENDPOINTS: "true", ALLOW_DATA_MUTATION_SCRIPTS: "true" };
  const debugRes = validateEnvironment(debugProd);
  assertTest(
    !debugRes.isValid &&
      debugRes.errors.some((e) => e.ruleViolation === "FORBIDDEN_DEBUG_ENDPOINTS_IN_PROD") &&
      debugRes.errors.some((e) => e.ruleViolation === "FORBIDDEN_MUTATION_SCRIPTS_IN_PROD"),
    "Production strictly forbids debug endpoints and direct data mutation scripts"
  );

  // Gate E: Reject Disabled Age Gate in Staging/Production
  const disabledAgeGateProd = { ...validProdEnv, AGE_GATE_ENFORCEMENT: "false" };
  const ageGateRes = validateEnvironment(disabledAgeGateProd);
  assertTest(
    !ageGateRes.isValid && ageGateRes.errors.some((e) => e.ruleViolation === "DISABLED_AGE_GATE_IN_PROD_OR_STAGING"),
    "Production and Staging strictly reject disabling 18+ Age Gate enforcement"
  );

  // --------------------------------------------------------------------------
  // 4. DATABASE MIGRATION GUARD & SAFETY CHECKS
  // --------------------------------------------------------------------------
  console.log("\n[4/6] Testing Database Migration Guard & Command Safety...");
  const migrationGuard = new MigrationGuard();
  const migrationsFound = migrationGuard.scanMigrationFiles();
  assertTest(migrationsFound.length > 0, `Found ${migrationsFound.length} version-controlled migration(s) in repository`);

  const devPreflight = await migrationGuard.preFlightCheck("development");
  assertTest(devPreflight.canDeploy, "Migration pre-flight succeeds for development");

  // Check command safety
  let dbPushBlockedInProd = false;
  try {
    migrationGuard.assertCommandAllowed("db:push", "production");
  } catch (err: any) {
    dbPushBlockedInProd = err.message.includes("strictly forbidden in PRODUCTION");
  }
  assertTest(dbPushBlockedInProd, "MigrationGuard strictly blocks 'prisma db push' in Production");

  let dbResetBlockedInStaging = false;
  try {
    migrationGuard.assertCommandAllowed("db:reset", "staging");
  } catch (err: any) {
    dbResetBlockedInStaging = err.message.includes("strictly forbidden in STAGING");
  }
  assertTest(dbResetBlockedInStaging, "MigrationGuard strictly blocks 'prisma db:reset' in Staging");

  // --------------------------------------------------------------------------
  // 5. STAGING SANITIZER & PRODUCTION DATA FAILSAFE
  // --------------------------------------------------------------------------
  console.log("\n[5/6] Testing Staging Sanitizer Failsafes...");
  
  let prodDbSanitizeBlocked = false;
  try {
    StagingDatabaseSanitizer.assertSafeStagingTarget(
      "postgresql://db_app:pass@prod-db-cluster.us-east-1.rds.amazonaws.com:5432/adult_platform_prod",
      "production"
    );
  } catch (err: any) {
    prodDbSanitizeBlocked = err.message.includes("CRITICAL_SAFETY_FAILSAFE");
  }
  assertTest(prodDbSanitizeBlocked, "Staging Sanitizer aborts when pointed at production RDS database");

  let stagingDbAllowed = false;
  try {
    StagingDatabaseSanitizer.assertSafeStagingTarget(
      "postgresql://db_app:pass@db-staging.internal:5432/adult_platform_staging",
      "staging"
    );
    stagingDbAllowed = true;
  } catch {
    stagingDbAllowed = false;
  }
  assertTest(stagingDbAllowed, "Staging Sanitizer allows execution against valid staging database");

  // --------------------------------------------------------------------------
  // 6. REPEATABLE DEPLOYMENT ORCHESTRATOR & GATES
  // --------------------------------------------------------------------------
  console.log("\n[6/6] Testing Repeatable Deployment Orchestrator...");
  const deployer = new DeploymentOrchestrator();

  // Test Staging Deployment Flow
  const stagingDeployRes = await deployer.executeDeployment({
    targetEnvironment: "staging",
    releaseVersion: "1.0.0",
    gitCommitSha: "test-commit-sha-123",
    dryRun: true,
  });
  assertTest(stagingDeployRes.success, "Staging deployment pipeline completes successfully");

  // Test Production Gate: Staging Not Verified
  const prodUnverifiedRes = await deployer.executeDeployment({
    targetEnvironment: "production",
    releaseVersion: "1.0.0",
    gitCommitSha: "test-commit-sha-123",
    stagingReleaseVerified: false,
    dryRun: true,
  });
  assertTest(
    !prodUnverifiedRes.success && prodUnverifiedRes.logs.some((l) => l.message.includes("Production deployment rejected: Release has not been verified in STAGING")),
    "Production deployment orchestrator blocks unverified staging releases"
  );

  // Test Environment Guard wrapper
  let devActionBlockedInProd = false;
  env.reset({ APP_ENV: "production", NODE_ENV: "production" });
  try {
    await withEnvironmentGuard(
      { allowedEnvironments: ["development"], actionName: "dangerousDevReset" },
      async () => "executed"
    );
  } catch (err: any) {
    devActionBlockedInProd = err.message.includes("SECURITY_VIOLATION");
  }
  assertTest(devActionBlockedInProd, "withEnvironmentGuard blocks development-only action in production context");

  // Reset env singleton back to normal
  env.reset();

  // --------------------------------------------------------------------------
  // 7. INFRASTRUCTURE ARTIFACTS VERIFICATION
  // --------------------------------------------------------------------------
  console.log("\n[Bonus] Verifying Infrastructure Files & Manifests...");
  const requiredFiles = [
    ".env.example",
    ".env.development",
    ".env.staging",
    ".env.production.template",
    "Dockerfile",
    "docker-compose.dev.yml",
    "docker-compose.staging.yml",
    "docker-compose.prod.yml",
    ".github/workflows/ci.yml",
    ".github/workflows/deploy-staging.yml",
    ".github/workflows/deploy-production.yml",
    "infra/k8s/base/deployment.yaml",
    "infra/k8s/base/service.yaml",
    "infra/k8s/base/configmap.yaml",
    "infra/k8s/base/kustomization.yaml",
    "infra/k8s/overlays/development/kustomization.yaml",
    "infra/k8s/overlays/staging/kustomization.yaml",
    "infra/k8s/overlays/production/kustomization.yaml",
    "docs/10-ENVIRONMENT-OPERATIONS.md",
  ];

  for (const relPath of requiredFiles) {
    const fullPath = path.resolve(process.cwd(), relPath);
    assertTest(fs.existsSync(fullPath), `Manifest '${relPath}' is present on filesystem`);
  }

  console.log("\n==================================================================");
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("==================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("[FATAL ERROR IN TEST SUITE]", err);
  process.exit(1);
});
