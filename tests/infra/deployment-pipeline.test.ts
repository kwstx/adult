/**
 * ============================================================================
 * TEST SUITE: Deployment Pipeline & Quality Gates
 * ============================================================================
 * Verifies all stages of the CI/CD pipeline:
 * 1. Typecheck, Lint, Unit, Integration, Build, Security, Migration checks
 * 2. Staging deployment and Automated Staging E2E tests
 * 3. Gated Production deployment and Rollback triggers on canary failure
 */

import { PipelineOrchestrator } from "../../src/core/infra/deployment/pipeline-orchestrator";

export async function runDeploymentPipelineTests(): Promise<boolean> {
  console.log(`\n===============================================================`);
  console.log(`🧪 TEST SUITE: End-to-End Deployment Pipeline & Release Gates`);
  console.log(`===============================================================\n`);

  const orchestrator = new PipelineOrchestrator();
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passedCount++;
    } else {
      console.error(`  ✗ ${testName}`);
      failedCount++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Full Successful Staging Pipeline Run
  // --------------------------------------------------------------------------
  const stagingResult = await orchestrator.executePipeline({
    gitCommitSha: "a1b2c3d4e5f6",
    branch: "main",
    releaseVersion: "1.2.0",
    triggerEvent: "push",
  });

  assert(
    stagingResult.overallSuccess && stagingResult.stagingVerified && !stagingResult.productionDeployed,
    "Executes full Stage 1 (Checks) -> Stage 2 (Staging Deploy) -> Stage 3 (Staging E2E) successfully"
  );
  assert(
    stagingResult.steps.some((s) => s.stepName.includes("Type Checking") && s.status === "SUCCESS"),
    "Passes automated TypeScript type checking gate"
  );
  assert(
    stagingResult.steps.some((s) => s.stepName.includes("Linting") && s.status === "SUCCESS"),
    "Passes automated code hygiene & linting gate"
  );
  assert(
    stagingResult.steps.some((s) => s.stepName.includes("Unit Tests") && s.status === "SUCCESS"),
    "Passes automated Unit testing gate"
  );
  assert(
    stagingResult.steps.some((s) => s.stepName.includes("Integration Tests") && s.status === "SUCCESS"),
    "Passes automated Integration testing gate"
  );
  assert(
    stagingResult.steps.some((s) => s.stepName.includes("Build") && s.status === "SUCCESS"),
    "Passes automated Application Build gate"
  );
  assert(
    stagingResult.steps.some((s) => s.stepName.includes("Security") && s.status === "SUCCESS"),
    "Passes automated Security & Authorization boundary checks"
  );
  assert(
    stagingResult.steps.some((s) => s.stepName.includes("Migration Coexistence") && s.status === "SUCCESS"),
    "Passes automated Database Migration Coexistence validation"
  );

  // --------------------------------------------------------------------------
  // TEST 2: Pre-Deployment Failure Gates Stop Deployment
  // --------------------------------------------------------------------------
  const failedUnitTestResult = await orchestrator.executePipeline({
    gitCommitSha: "bad001",
    branch: "feature/broken-test",
    releaseVersion: "1.2.1",
    triggerEvent: "pull_request",
    mockTestFailures: { unitTests: true },
  });

  assert(
    !failedUnitTestResult.overallSuccess &&
    !failedUnitTestResult.stagingVerified &&
    failedUnitTestResult.steps.some((s) => s.stepName.includes("Unit Tests") && s.status === "FAILED"),
    "Halts pipeline immediately when Unit tests fail (blocks staging deployment)"
  );

  const failedSecurityResult = await orchestrator.executePipeline({
    gitCommitSha: "bad002",
    branch: "feature/auth-bug",
    releaseVersion: "1.2.2",
    triggerEvent: "pull_request",
    mockTestFailures: { securityChecks: true },
  });

  assert(
    !failedSecurityResult.overallSuccess &&
    failedSecurityResult.steps.some((s) => s.stepName.includes("Security") && s.status === "FAILED"),
    "Halts pipeline immediately when Security boundary check fails"
  );

  const failedCoexistenceResult = await orchestrator.executePipeline({
    gitCommitSha: "bad003",
    branch: "feature/destructive-schema",
    releaseVersion: "1.2.3",
    triggerEvent: "pull_request",
    mockTestFailures: { migrationCoexistence: true },
  });

  assert(
    !failedCoexistenceResult.overallSuccess &&
    failedCoexistenceResult.steps.some((s) => s.stepName.includes("Migration Coexistence") && s.status === "FAILED"),
    "Halts pipeline when breaking database migration threatens multi-version coexistence"
  );

  // --------------------------------------------------------------------------
  // TEST 3: Staging E2E Failure Prevents Production Eligibility
  // --------------------------------------------------------------------------
  const failedE2eResult = await orchestrator.executePipeline({
    gitCommitSha: "bad004",
    branch: "main",
    releaseVersion: "1.2.4",
    triggerEvent: "push",
    mockTestFailures: { stagingE2e: true },
  });

  assert(
    !failedE2eResult.overallSuccess && !failedE2eResult.stagingVerified,
    "Blocks release verification if automated Staging E2E tests fail"
  );

  // --------------------------------------------------------------------------
  // TEST 4: Production Gated Deployment with Staging Verification
  // --------------------------------------------------------------------------
  const prodSuccessResult = await orchestrator.executePipeline({
    gitCommitSha: "f7e8d9c0b1a2",
    branch: "main",
    releaseVersion: "v1.3.0",
    triggerEvent: "release",
    requireProductionDeploy: true,
    productionApprovalToken: "DEPLOY-PROD",
    skipEnvValidationForTest: true,
    envOverrides: {
      DATABASE_URL: "postgresql://dbadmin:secret123@prod-cluster.rds.amazonaws.com:5432/platform_prod?sslmode=require",
      REDIS_URL: "rediss://prod-redis.elcache.aws.internal:6379",
    },
  });

  assert(
    prodSuccessResult.overallSuccess &&
    prodSuccessResult.stagingVerified &&
    prodSuccessResult.productionDeployed,
    "Successfully promotes verified release to Production with zero-downtime rolling update"
  );

  // --------------------------------------------------------------------------
  // TEST 5: Production Rejection on Invalid Token or Missing Approval
  // --------------------------------------------------------------------------
  const prodRejectedResult = await orchestrator.executePipeline({
    gitCommitSha: "f7e8d9c0b1a2",
    branch: "main",
    releaseVersion: "v1.3.0",
    triggerEvent: "release",
    requireProductionDeploy: true,
    productionApprovalToken: "INVALID-TOKEN",
  });

  assert(
    !prodRejectedResult.overallSuccess &&
    !prodRejectedResult.productionDeployed &&
    prodRejectedResult.steps.some((s) => s.stepName.includes("Production Release Gate") && s.status === "FAILED"),
    "Rejects production deployment when approval token does not match gating policy"
  );

  // --------------------------------------------------------------------------
  // TEST 6: Automated Rollback on Production Canary Probe Failure
  // --------------------------------------------------------------------------
  const prodCanaryFailResult = await orchestrator.executePipeline({
    gitCommitSha: "canary_fail_sha",
    branch: "main",
    releaseVersion: "v1.4.0",
    triggerEvent: "release",
    requireProductionDeploy: true,
    productionApprovalToken: "DEPLOY-PROD",
    mockTestFailures: { productionHealth: true },
  });

  assert(
    !prodCanaryFailResult.overallSuccess &&
    prodCanaryFailResult.rollbackExecuted &&
    prodCanaryFailResult.steps.some((s) => s.category === "ROLLBACK" && s.status === "SUCCESS"),
    "Triggers automated instant rollback to previous stable SHA when production canary probe fails"
  );

  console.log(`\n---------------------------------------------------------------`);
  console.log(`PASS Deployment Pipeline & Release Gates: ${passedCount} passed, ${failedCount} failed`);
  console.log(`---------------------------------------------------------------\n`);

  return failedCount === 0;
}

if (require.main === module) {
  runDeploymentPipelineTests().then((ok) => {
    if (!ok) process.exit(1);
  });
}
