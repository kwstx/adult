/**
 * ============================================================================
 * MIGRATION COMPATIBILITY & MULTI-VERSION COEXISTENCE LINTER
 * ============================================================================
 * Usage:
 *   npx tsx scripts/verify-migration-compatibility.ts
 *   npx tsx scripts/verify-migration-compatibility.ts --strict
 */

import path from "path";
import { migrationCoexistenceGuard } from "../src/core/infra/migrations/migration-coexistence-guard";
import { migrationGuard } from "../src/core/infra/migrations/migration-guard";

async function main() {
  const args = process.argv.slice(2);
  const isStrict = args.includes("--strict");

  console.log(`\n================================================================`);
  console.log(`🔍 DATABASE MIGRATION COEXISTENCE & BACKWARD-COMPATIBILITY CHECK`);
  console.log(`================================================================\n`);

  const migrationsDir = path.resolve(process.cwd(), "prisma/migrations");
  const scanResults = migrationGuard.scanMigrationFiles();

  console.log(`Discovered ${scanResults.length} version-controlled migration(s):`);
  scanResults.forEach((m, idx) => {
    console.log(`  ${idx + 1}. [${m.migrationName}] (SHA256: ${m.checksum.substring(0, 12)}...)`);
  });

  const analysisResults = migrationCoexistenceGuard.analyzeMigrationsDirectory(migrationsDir);

  let totalBlockers = 0;
  let totalWarnings = 0;

  console.log(`\nAnalyzing schema modifications for zero-downtime coexistence...\n`);

  for (const res of analysisResults) {
    console.log(`📁 Migration: ${res.migrationName}`);
    console.log(`   Status: ${res.expandPhaseSummary}`);

    if (res.violations.length > 0) {
      for (const v of res.violations) {
        if (v.severity === "BLOCKER") {
          totalBlockers++;
          console.error(`   ❌ [BLOCKER] Line ${v.lineNumber || "?"}: ${v.type}`);
          console.error(`      Snippet:     ${v.snippet}`);
          console.error(`      Reason:      ${v.reason}`);
          console.error(`      Remediation: ${v.remediation}`);
        } else {
          totalWarnings++;
          console.warn(`   ⚠️  [WARNING] Line ${v.lineNumber || "?"}: ${v.type}`);
          console.warn(`      Snippet:     ${v.snippet}`);
          console.warn(`      Reason:      ${v.reason}`);
          console.warn(`      Remediation: ${v.remediation}`);
        }
      }
    }
    console.log("");
  }

  console.log(`----------------------------------------------------------------`);
  console.log(`Summary: ${totalBlockers} Blocker(s), ${totalWarnings} Warning(s) found.`);

  if (totalBlockers > 0) {
    console.error(`\n❌ FATAL: Migrations violate multi-version coexistence rules!`);
    console.error(`   During zero-downtime rolling deployments, Version N-1 and Version N`);
    console.error(`   will coexist. Destructive changes will crash running N-1 instances.`);
    process.exit(1);
  }

  if (totalWarnings > 0 && isStrict) {
    console.error(`\n❌ STRICT MODE: Migration warnings detected. Aborting.`);
    process.exit(1);
  }

  console.log(`\n✅ ALL MIGRATIONS PASS ZERO-DOWNTIME COEXISTENCE COMPATIBILITY!`);
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
