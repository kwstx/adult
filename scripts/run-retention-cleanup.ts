/**
 * Automated Data Retention Cleanup Script / Background Job
 * Run via: npx tsx scripts/run-retention-cleanup.ts
 */

import { RetentionPolicyService } from "../src/core/privacy/retention-policy.service";

async function main() {
  console.log("================================================================");
  console.log("🧹 RUNNING AUTOMATED PRIVACY DATA RETENTION CLEANUP");
  console.log("================================================================");

  const report = await RetentionPolicyService.pruneExpiredRecords();

  console.log(`• Timestamp:                 ${report.timestamp}`);
  console.log(`• Age Tokens Pruned:         ${report.ageTokensPruned}`);
  console.log(`• Device Fingerprints Pruned:${report.deviceFingerprintsPruned}`);
  console.log(`• Notifications Pruned:      ${report.notificationsPruned}`);

  if (report.errors.length > 0) {
    console.error(`\n⚠️ Encountered ${report.errors.length} warnings/errors:`);
    for (const err of report.errors) {
      console.error(`  - ${err}`);
    }
  } else {
    console.log("\n✅ Data retention pruning completed with zero errors.");
  }
}

main().catch((err) => {
  console.error("Retention runner crashed:", err);
  process.exit(1);
});
