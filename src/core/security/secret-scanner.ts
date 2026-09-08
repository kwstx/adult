/**
 * ============================================================================
 * AUTHORITATIVE SECRET SCANNER & SOURCE CONTROL AUDITOR
 * ============================================================================
 * Scans codebase files to ensure zero plaintext secrets, high-entropy API tokens,
 * private keys, or cloud credentials are committed into source control.
 */

import * as fs from "fs";
import * as path from "path";

export interface SecretFinding {
  filePath: string;
  lineNumber: number;
  rule: string;
  matchRedacted: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
}

export class SecretScanner {
  private static readonly SECRET_RULES = [
    {
      name: "AWS_ACCESS_KEY",
      pattern: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
      severity: "CRITICAL" as const,
    },
    {
      name: "RSA_PRIVATE_KEY",
      pattern: /-----BEGIN (?:RSA )?PRIVATE KEY-----/g,
      severity: "CRITICAL" as const,
    },
    {
      name: "STRIPE_LIVE_KEY",
      pattern: /sk_live_[0-9a-zA-Z]{24}/g,
      severity: "CRITICAL" as const,
    },
    {
      name: "HARDCODED_JWT_SECRET",
      pattern: /const\s+JWT_SECRET\s*=\s*["'][a-zA-Z0-9_\-]{32,}["']/g,
      severity: "HIGH" as const,
    },
    {
      name: "GITHUB_PERSONAL_ACCESS_TOKEN",
      pattern: /gh[pousr]_[0-9a-zA-Z]{36}/g,
      severity: "CRITICAL" as const,
    },
    {
      name: "GENERIC_HIGH_ENTROPY_API_KEY",
      pattern: /(?:api_key|apikey|secret_key|private_key)\s*[:=]\s*["'][0-9a-zA-Z]{40,}["']/gi,
      severity: "HIGH" as const,
    },
  ];

  private static readonly IGNORED_DIRECTORIES = [
    "node_modules",
    ".git",
    ".next",
    "dist",
    "build",
    "coverage",
    ".system_generated",
    "tests",
  ];

  /**
   * Scans a single string content for secret patterns.
   */
  public static scanContent(content: string, filePath = "buffer"): SecretFinding[] {
    const findings: SecretFinding[] = [];
    const lines = content.split("\n");

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      // Skip comments explicitly marked as mock or test fixture
      if (line.includes("mock") || line.includes("placeholder") || line.includes("test-fixture") || line.includes("example")) {
        continue;
      }

      for (const rule of SecretScanner.SECRET_RULES) {
        const matches = line.match(rule.pattern);
        if (matches) {
          for (const match of matches) {
            findings.push({
              filePath,
              lineNumber: lineIndex + 1,
              rule: rule.name,
              matchRedacted: match.substring(0, 4) + "****" + match.substring(Math.max(0, match.length - 4)),
              severity: rule.severity,
            });
          }
        }
      }
    }

    return findings;
  }

  /**
   * Recursively scans a directory for secret violations.
   */
  public static scanDirectory(dirPath: string, customIgnoredDirs: string[] = []): SecretFinding[] {
    const allFindings: SecretFinding[] = [];
    const ignored = new Set([...SecretScanner.IGNORED_DIRECTORIES, ...customIgnoredDirs]);

    const walk = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (ignored.has(entry.name)) {
          continue;
        }

        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && /\.(ts|tsx|js|mjs|json|yml|yaml|env.*)$/.test(entry.name)) {
          // Avoid scanning .env files if ignored or sample
          if (entry.name === ".env.example" || entry.name.includes("mock")) continue;

          try {
            const content = fs.readFileSync(fullPath, "utf-8");
            const findings = SecretScanner.scanContent(content, fullPath);
            allFindings.push(...findings);
          } catch {
            // Ignore unreadable files
          }
        }
      }
    };

    if (fs.existsSync(dirPath)) {
      walk(dirPath);
    }

    return allFindings;
  }
}
