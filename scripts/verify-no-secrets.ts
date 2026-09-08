/**
 * CI/Pre-Commit Automated Secret Scanner
 * Run via: npx tsx scripts/verify-no-secrets.ts
 */

import { SecretScanner } from "../src/core/security/secret-scanner";
import * as path from "path";

async function main() {
  console.log("================================================================");
  console.log("🔒 RUNNING PRE-COMMIT / CI SECRET SCANNER");
  console.log("================================================================");

  const rootDir = path.resolve(__dirname, "..");
  const findings = SecretScanner.scanDirectory(rootDir);

  if (findings.length === 0) {
    console.log("✅ Zero committed secrets detected. Clean repository status.");
    process.exit(0);
  }

  console.error(`❌ FATAL: Found ${findings.length} potential secret(s) in source files:\n`);
  for (const f of findings) {
    console.error(`  [${f.severity}] ${f.filePath}:${f.lineNumber} -> Rule: ${f.rule} (${f.matchRedacted})`);
  }
  console.error("\nPlease remove plaintext credentials and externalize to environment variables.\n");
  process.exit(1);
}

main().catch((err) => {
  console.error("Scanner crashed:", err);
  process.exit(1);
});
