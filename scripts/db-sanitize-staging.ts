/**
 * ============================================================================
 * STAGING DATABASE REFRESH & SANITIZATION SCRIPT
 * ============================================================================
 * Usage:
 *   npx tsx scripts/db-sanitize-staging.ts
 */

import { StagingDatabaseSanitizer } from "../src/core/infra/staging/db-sanitizer";
import { AppEnvironment } from "../src/core/config/env-schema";

async function main() {
  const currentEnv = (process.env.APP_ENV || "staging") as AppEnvironment;
  const databaseUrl = process.env.DATABASE_URL || "";

  console.log(`\n================================================================`);
  console.log(`[STAGING SANITIZER] Environment: ${currentEnv.toUpperCase()}`);
  console.log(`================================================================\n`);

  try {
    StagingDatabaseSanitizer.assertSafeStagingTarget(databaseUrl, currentEnv);
  } catch (err: any) {
    console.error(`❌ [SAFETY ABORT] ${err.message}`);
    process.exit(1);
  }

  const sanitizer = new StagingDatabaseSanitizer();
  try {
    const result = await sanitizer.sanitizeStagingDatabase();
    console.log(`\n✅ Staging Sanitization Complete!`);
    console.log(`   - Users Scrubbed: ${result.usersSanitized}`);
    console.log(`   - 2257 KYC Records Sanitized: ${result.verificationsSanitized}`);
    console.log(`   - Wallets Reset to Test Balances: ${result.walletsSanitized}`);
    console.log(`   - Messages Anonymized: ${result.conversationsScrubbed}`);
    console.log(`   - Elapsed Time: ${result.durationMs}ms\n`);
  } catch (err: any) {
    console.error(`❌ Sanitization failed:`, err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
