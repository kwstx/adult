/**
 * ============================================================================
 * DATABASE MIGRATION COEXISTENCE & BACKWARD COMPATIBILITY GUARD
 * ============================================================================
 * Enforces the Expand-and-Contract schema evolution pattern for zero-downtime
 * rolling deployments where Version N-1 (old) and Version N (new) application
 * containers temporarily coexist against the same PostgreSQL database.
 * 
 * Invariants Checked:
 * 1. NO direct `DROP COLUMN` in the same release as code migration (Contract phase rule).
 * 2. NO direct `RENAME COLUMN` (breaks N-1 queries; requires add + dual-write + drop).
 * 3. NO `ADD COLUMN ... NOT NULL` without `DEFAULT` (breaks N-1 INSERT statements).
 * 4. NO direct `DROP TABLE` without multi-release deprecation verification.
 * 5. NO blocking non-concurrent index creations on large transactional tables.
 * 6. NO destructive `ALTER COLUMN TYPE` that causes data loss or lock contention.
 */

import fs from "fs";
import path from "path";
import { Logger } from "../../../lib/logger";

export type MigrationSeverity = "BLOCKER" | "WARNING" | "INFO";

export type ViolationType =
  | "UNSAFE_NOT_NULL_WITHOUT_DEFAULT"
  | "UNSAFE_DROP_COLUMN"
  | "UNSAFE_DROP_TABLE"
  | "UNSAFE_RENAME_COLUMN"
  | "UNSAFE_TYPE_ALTERATION"
  | "LOCKING_INDEX_CREATION";

export interface MigrationViolation {
  migrationName: string;
  type: ViolationType;
  severity: MigrationSeverity;
  lineNumber?: number;
  snippet: string;
  reason: string;
  remediation: string;
}

export interface CoexistenceAnalysisResult {
  migrationName: string;
  isCoexistenceSafe: boolean;
  violations: MigrationViolation[];
  expandPhaseSummary: string;
}

export class MigrationCoexistenceGuard {
  private migrationsDirectory: string;

  constructor(customMigrationsPath?: string) {
    this.migrationsDirectory =
      customMigrationsPath || path.resolve(process.cwd(), "prisma/migrations");
  }

  /**
   * Analyzes raw SQL migration content for multi-version coexistence safety.
   */
  public analyzeSql(migrationName: string, sqlContent: string): CoexistenceAnalysisResult {
    const violations: MigrationViolation[] = [];
    const lines = sqlContent.split("\n");

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const cleanLine = line.trim();
      
      // Ignore comment lines
      if (cleanLine.startsWith("--") || cleanLine.startsWith("/*") || cleanLine.length === 0) {
        return;
      }

      const upper = cleanLine.toUpperCase();

      // 1. Check for ADD COLUMN ... NOT NULL without DEFAULT
      if (upper.includes("ADD COLUMN") || (upper.includes("ALTER TABLE") && upper.includes("ADD"))) {
        if (upper.includes("NOT NULL") && !upper.includes("DEFAULT")) {
          // Check if there's a DEFAULT anywhere in this statement
          violations.push({
            migrationName,
            type: "UNSAFE_NOT_NULL_WITHOUT_DEFAULT",
            severity: "BLOCKER",
            lineNumber: lineNum,
            snippet: cleanLine,
            reason: "Adding a NOT NULL column without a DEFAULT will cause Version N-1 applications to fail on INSERT because they do not supply this column.",
            remediation: "Add the column as NULLABLE first (Phase 1: Expand), or provide a sensible DEFAULT value: `ADD COLUMN column_name TYPE DEFAULT 'val' NOT NULL;`",
          });
        }
      }

      // 2. Check for DROP COLUMN
      if (upper.includes("DROP COLUMN")) {
        violations.push({
          migrationName,
          type: "UNSAFE_DROP_COLUMN",
          severity: "BLOCKER",
          lineNumber: lineNum,
          snippet: cleanLine,
          reason: "Dropping a column immediately crashes running Version N-1 application instances that still SELECT or INSERT into this column.",
          remediation: "Follow the Contract phase: First deploy Version N without referencing the column, verify all N-1 containers are drained, then drop the column in a subsequent release.",
        });
      }

      // 3. Check for DROP TABLE
      if (upper.includes("DROP TABLE")) {
        violations.push({
          migrationName,
          type: "UNSAFE_DROP_TABLE",
          severity: "BLOCKER",
          lineNumber: lineNum,
          snippet: cleanLine,
          reason: "Dropping a table immediately crashes Version N-1 instances currently serving active user traffic.",
          remediation: "Ensure the table has been deprecated and unused across all running versions for at least one full deployment cycle.",
        });
      }

      // 4. Check for RENAME COLUMN
      if (upper.includes("RENAME COLUMN") || (upper.includes("RENAME") && upper.includes("TO"))) {
        violations.push({
          migrationName,
          type: "UNSAFE_RENAME_COLUMN",
          severity: "BLOCKER",
          lineNumber: lineNum,
          snippet: cleanLine,
          reason: "Renaming a column breaks Version N-1 code expecting the old column name.",
          remediation: "Use Expand-and-Contract: Add new column, dual-write to both in Version N, backfill historical data, then drop old column in Version N+1.",
        });
      }

      // 5. Check for ALTER COLUMN TYPE
      if (upper.includes("ALTER COLUMN") && (upper.includes("TYPE") || upper.includes("SET DATA TYPE"))) {
        violations.push({
          migrationName,
          type: "UNSAFE_TYPE_ALTERATION",
          severity: "WARNING",
          lineNumber: lineNum,
          snippet: cleanLine,
          reason: "Altering column types in-place can acquire exclusive table locks and cause runtime serialization/parsing errors in Version N-1.",
          remediation: "Prefer adding a new column with the target type, migrating data incrementally, and swapping readers/writers.",
        });
      }

      // 6. Check for non-concurrent index creation on PostgreSQL
      if (upper.startsWith("CREATE INDEX") && !upper.includes("CONCURRENTLY")) {
        violations.push({
          migrationName,
          type: "LOCKING_INDEX_CREATION",
          severity: "WARNING",
          lineNumber: lineNum,
          snippet: cleanLine,
          reason: "CREATE INDEX without CONCURRENTLY locks the table against concurrent writes during creation.",
          remediation: "Use `CREATE INDEX CONCURRENTLY` in PostgreSQL to prevent write stalls on active tables during rolling rollout.",
        });
      }
    });

    const hasBlockers = violations.some((v) => v.severity === "BLOCKER");

    return {
      migrationName,
      isCoexistenceSafe: !hasBlockers,
      violations,
      expandPhaseSummary: hasBlockers
        ? "❌ FAILED: Destructive or non-coexistence-safe schema modifications detected."
        : violations.length > 0
        ? "⚠️ PASS WITH WARNINGS: Schema changes require careful monitoring during rolling update."
        : "✅ PASS: Schema modifications are fully backward & forward compatible (Expand-and-Contract safe).",
    };
  }

  /**
   * Scans and verifies all migration files in a given directory for multi-version coexistence.
   */
  public analyzeMigrationsDirectory(migrationsDir: string): CoexistenceAnalysisResult[] {
    if (!fs.existsSync(migrationsDir)) {
      return [];
    }

    const results: CoexistenceAnalysisResult[] = [];
    const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const sqlPath = path.join(migrationsDir, entry.name, "migration.sql");
        if (fs.existsSync(sqlPath)) {
          const content = fs.readFileSync(sqlPath, "utf-8");
          const result = this.analyzeSql(entry.name, content);
          results.push(result);
        }
      }
    }

    return results;
  }
}

export const migrationCoexistenceGuard = new MigrationCoexistenceGuard();
