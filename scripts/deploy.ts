/**
 * ============================================================================
 * DEPLOYMENT CLI SCRIPT
 * ============================================================================
 * Usage:
 *   npx tsx scripts/deploy.ts --env=staging --version=1.0.0 --sha=abcdef1
 *   npx tsx scripts/deploy.ts --env=production --version=1.0.0 --sha=abcdef1 --staging-verified
 */

import fs from "fs";
import path from "path";
import { AppEnvironment } from "../src/core/config/env-schema";
import { DeploymentOrchestrator } from "../src/core/infra/deployment/deployer";

function loadEnvFile(targetEnv: AppEnvironment) {
  const envFile = path.resolve(process.cwd(), `.env.${targetEnv}`);
  const defaultEnvFile = path.resolve(process.cwd(), ".env");
  const fileToLoad = fs.existsSync(envFile) ? envFile : fs.existsSync(defaultEnvFile) ? defaultEnvFile : null;

  if (fileToLoad) {
    const lines = fs.readFileSync(fileToLoad, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let value = trimmed.substring(idx + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const envArg = (args.find((a) => a.startsWith("--env="))?.split("=")[1] as AppEnvironment) || "staging";
  loadEnvFile(envArg);
  process.env.APP_ENV = envArg;
  const versionArg = args.find((a) => a.startsWith("--version="))?.split("=")[1] || "1.0.0";
  const shaArg = args.find((a) => a.startsWith("--sha="))?.split("=")[1] || "local-head";
  const isStagingVerified = args.includes("--staging-verified");
  const isDryRun = args.includes("--dry-run");

  console.log(`\n================================================================`);
  console.log(`[DEPLOYMENT RUNNER] Orchestrating Release`);
  console.log(`Target Environment: ${envArg.toUpperCase()}`);
  console.log(`Release Version:    ${versionArg}`);
  console.log(`Commit SHA:         ${shaArg}`);
  console.log(`================================================================\n`);

  const orchestrator = new DeploymentOrchestrator();
  const result = await orchestrator.executeDeployment({
    targetEnvironment: envArg,
    releaseVersion: versionArg,
    gitCommitSha: shaArg,
    stagingReleaseVerified: isStagingVerified || envArg !== "production",
    dryRun: isDryRun,
  });

  console.log(`\nDeployment Summary:`);
  console.log(`  - Status:   ${result.success ? "✅ SUCCESS" : "❌ FAILED"}`);
  console.log(`  - Stage:    ${result.finalStage}`);
  console.log(`  - Duration: ${result.durationMs}ms\n`);

  console.log(`Execution Trail:`);
  result.logs.forEach((log) => {
    const icon = log.status === "SUCCESS" ? "✓" : log.status === "WARNING" ? "⚠️" : "✗";
    console.log(`  [${icon}] [${log.stage}] ${log.message}`);
  });

  if (!result.success) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
