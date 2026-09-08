/**
 * ============================================================================
 * FULL CI/CD PIPELINE RUNNER CLI
 * ============================================================================
 * Usage:
 *   npx tsx scripts/run-pipeline.ts --env=staging --version=1.2.0 --sha=$(git rev-parse HEAD)
 *   npx tsx scripts/run-pipeline.ts --env=production --version=1.2.0 --sha=$(git rev-parse HEAD) --token=DEPLOY-PROD
 */

import { pipelineOrchestrator } from "../src/core/infra/deployment/pipeline-orchestrator";

async function main() {
  const args = process.argv.slice(2);
  const envArg = args.find((a) => a.startsWith("--env="))?.split("=")[1] || "staging";
  const versionArg = args.find((a) => a.startsWith("--version="))?.split("=")[1] || "1.0.0";
  const shaArg = args.find((a) => a.startsWith("--sha="))?.split("=")[1] || "local-head";
  const tokenArg = args.find((a) => a.startsWith("--token="))?.split("=")[1];

  console.log(`\n================================================================`);
  console.log(`🚀 EXECUTING CI/CD DEPLOYMENT PIPELINE`);
  console.log(`================================================================`);
  console.log(`Target:      ${envArg.toUpperCase()}`);
  console.log(`Version:     ${versionArg}`);
  console.log(`Commit SHA:  ${shaArg}`);
  console.log(`================================================================\n`);

  const result = await pipelineOrchestrator.executePipeline({
    gitCommitSha: shaArg,
    branch: envArg === "production" ? "main" : "develop",
    releaseVersion: versionArg,
    triggerEvent: envArg === "production" ? "release" : "push",
    requireProductionDeploy: envArg === "production",
    productionApprovalToken: tokenArg,
    skipEnvValidationForTest: false,
  });

  console.log(`\n----------------------------------------------------------------`);
  console.log(`📊 PIPELINE EXECUTION SUMMARY`);
  console.log(`----------------------------------------------------------------`);
  console.log(`Pipeline ID:         ${result.pipelineId}`);
  console.log(`Overall Status:      ${result.overallSuccess ? "✅ SUCCESS" : "❌ FAILED"}`);
  console.log(`Staging Verified:    ${result.stagingVerified ? "✓ YES" : "✗ NO"}`);
  console.log(`Production Deployed: ${result.productionDeployed ? "✓ YES" : "○ NO"}`);
  console.log(`Rollback Executed:   ${result.rollbackExecuted ? "⚠️ YES (ROLLED BACK)" : "○ NO"}`);
  console.log(`Total Duration:      ${result.totalDurationMs}ms\n`);

  console.log(`Stage Breakdown:`);
  result.steps.forEach((s) => {
    const icon = s.status === "SUCCESS" ? "✓" : s.status === "FAILED" ? "✗" : "○";
    console.log(`  [${icon}] [${s.category.padEnd(16)}] ${s.stepName.padEnd(42)} (${s.durationMs}ms)`);
    if (s.status === "FAILED") {
      console.log(`      ↳ Reason: ${s.message}`);
    }
  });

  if (!result.overallSuccess) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
