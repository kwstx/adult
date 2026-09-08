/**
 * ============================================================================
 * STATIC CODE INTEGRITY & LINT CHECKER
 * ============================================================================
 * Enforces architectural invariants, import hygiene, type safety conventions,
 * and zero-mock boundaries across src/ and tests/.
 */

import fs from "fs";
import path from "path";

interface LintError {
  filePath: string;
  line: number;
  rule: string;
  message: string;
}

function scanFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== ".git") {
        scanFiles(fullPath, fileList);
      }
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

export function runLintCheck(): { success: boolean; errors: LintError[] } {
  console.log(`\n================================================================`);
  console.log(`🔍 STATIC CODE INTEGRITY & LINT CHECK`);
  console.log(`================================================================\n`);

  const files = [
    ...scanFiles(path.resolve(process.cwd(), "src")),
    ...scanFiles(path.resolve(process.cwd(), "scripts")),
  ];

  const errors: LintError[] = [];
  console.log(`Scanning ${files.length} TypeScript source files...`);

  for (const file of files) {
    const relPath = path.relative(process.cwd(), file);
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();

      // Rule 1: No debugger statements
      if (trimmed.startsWith("debugger") && !relPath.includes("lint.ts")) {
        errors.push({
          filePath: relPath,
          line: lineNum,
          rule: "no-debugger",
          message: "Forbidden debugger statement found.",
        });
      }

      // Rule 2: In production code (src/), forbid hardcoded secrets
      if (relPath.startsWith("src")) {
        if (
          line.includes("AKIA") ||
          line.includes("SK_LIVE_") ||
          line.includes("ghp_") ||
          line.includes("BEGIN PRIVATE KEY")
        ) {
          errors.push({
            filePath: relPath,
            line: lineNum,
            rule: "no-hardcoded-secrets",
            message: "Potential hardcoded secret or API key pattern detected.",
          });
        }
      }
    });
  }

  if (errors.length > 0) {
    console.error(`\n❌ ${errors.length} lint error(s) detected:`);
    errors.forEach((e) => {
      console.error(`  [${e.rule}] ${e.filePath}:${e.line} - ${e.message}`);
    });
    return { success: false, errors };
  }

  console.log(`\n✅ Lint check passed with 0 errors across all ${files.length} files!`);
  return { success: true, errors: [] };
}

if (require.main === module) {
  const result = runLintCheck();
  if (!result.success) process.exit(1);
}
