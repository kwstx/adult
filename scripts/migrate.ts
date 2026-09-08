/**
 * ============================================================================
 * SAFE DATABASE MIGRATION RUNNER SCRIPT
 * ============================================================================
 * Usage:
 *   npx tsx scripts/migrate.ts --env=development
 *   npx tsx scripts/migrate.ts --env=staging
 *   npx tsx scripts/migrate.ts --env=production --dry-run
 *   npx tsx scripts/migrate.ts --env=production
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { AppEnvironment } from "../src/core/config/env-schema";
import { MigrationGuard } from "../src/core/infra/migrations/migration-guard";

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
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const envArg = (args.find((a) => a.startsWith("--env="))?.split("=")[1] as AppEnvironment) || "development";
  loadEnvFile(envArg);
  process.env.APP_ENV = envArg;
  const isDryRun = args.includes("--dry-run");
  const isStatusOnly = args.includes("--status");

  console.log(`\n================================================================`);
  console.log(`[MIGRATION RUNNER] Target Environment: ${envArg.toUpperCase()}`);
  console.log(`================================================================\n`);

  const guard = new MigrationGuard();
  const preflight = await guard.preFlightCheck(envArg);

  console.log(`Found ${preflight.totalMigrationsFound} version-controlled migration(s):`);
  preflight.migrations.forEach((m, idx) => {
    console.log(`  ${idx + 1}. [${m.migrationName}] (SHA256: ${m.checksum.substring(0, 12)}...)`);
  });

  if (preflight.warnings.length > 0) {
    console.log(`\n[WARNINGS]:`);
    preflight.warnings.forEach((w) => console.warn(`  ⚠️  ${w}`));
  }

  if (preflight.blockers.length > 0) {
    console.error(`\n[BLOCKERS]:`);
    preflight.blockers.forEach((b) => console.error(`  ❌  ${b}`));
    console.error(`\n[FATAL] Migration pre-flight check failed for ${envArg}. Aborting.`);
    process.exit(1);
  }

  if (isStatusOnly) {
    console.log("\n[STATUS CHECK COMPLETE] All migrations are version-controlled and clean.");
    return;
  }

  const executionCommand = guard.getExecutionCommand(envArg);

  if (isDryRun) {
    console.log(`\n[DRY RUN] Would execute command: '${executionCommand}' against ${envArg.toUpperCase()}`);
    console.log("[DRY RUN] Pre-flight assertions passed. Zero mutations applied.");
    return;
  }

  console.log(`\nExecuting: '${executionCommand}'...`);
  try {
    execSync(executionCommand, { stdio: "inherit", env: process.env });
    console.log(`\n✅ Migration successfully applied to ${envArg.toUpperCase()}!`);
  } catch (err: any) {
    console.error(`\n❌ Migration failed:`, err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
