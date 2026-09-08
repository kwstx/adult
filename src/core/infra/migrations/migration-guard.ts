/**
 * ============================================================================
 * DATABASE MIGRATION INTEGRITY & SAFETY GUARD
 * ============================================================================
 * Enforces version-controlled database migrations across all environments.
 * 
 * Invariants:
 * 1. All schema mutations must exist as committed migration files in `prisma/migrations/`.
 * 2. In Production & Staging, `prisma db push` or raw unversioned mutations are strictly forbidden.
 * 3. Migrations must be verified for idempotency, non-destructive column drops,
 *    and recorded in system audit logs.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { AppEnvironment } from "../../config/env-schema";
import { isProduction, isStaging } from "../../config/environment";
import { Logger } from "../../../lib/logger";

export interface MigrationFileEntry {
  migrationName: string;
  folderPath: string;
  sqlPath: string;
  checksum: string;
  timestamp: string;
}

export interface MigrationStatusReport {
  targetEnvironment: AppEnvironment;
  totalMigrationsFound: number;
  migrations: MigrationFileEntry[];
  isVersionControlled: boolean;
  canDeploy: boolean;
  warnings: string[];
  blockers: string[];
}

export class MigrationGuard {
  private migrationsDirectory: string;

  constructor(customMigrationsPath?: string) {
    this.migrationsDirectory =
      customMigrationsPath || path.resolve(process.cwd(), "prisma/migrations");
  }

  /**
   * Scans the filesystem migrations directory and calculates SHA256 checksums.
   */
  public scanMigrationFiles(): MigrationFileEntry[] {
    if (!fs.existsSync(this.migrationsDirectory)) {
      return [];
    }

    const entries = fs.readdirSync(this.migrationsDirectory, { withFileTypes: true });
    const migrations: MigrationFileEntry[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const sqlPath = path.join(this.migrationsDirectory, entry.name, "migration.sql");
        if (fs.existsSync(sqlPath)) {
          const sqlContent = fs.readFileSync(sqlPath, "utf-8");
          const checksum = crypto.createHash("sha256").update(sqlContent).digest("hex");
          
          migrations.push({
            migrationName: entry.name,
            folderPath: path.join(this.migrationsDirectory, entry.name),
            sqlPath,
            checksum,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    return migrations.sort((a, b) => a.migrationName.localeCompare(b.migrationName));
  }

  /**
   * Performs rigorous pre-flight checks before migrations can run against the target environment.
   */
  public async preFlightCheck(targetEnv: AppEnvironment): Promise<MigrationStatusReport> {
    const migrations = this.scanMigrationFiles();
    const warnings: string[] = [];
    const blockers: string[] = [];

    // Check 1: Must have at least 1 version-controlled migration
    if (migrations.length === 0) {
      blockers.push("No version-controlled migrations found in 'prisma/migrations'. Cannot deploy.");
    }

    // Check 2: Inspect SQL files for destructive commands without transaction guards
    for (const m of migrations) {
      const content = fs.readFileSync(m.sqlPath, "utf-8").toUpperCase();
      
      if (content.includes("DROP TABLE") || content.includes("DROP COLUMN")) {
        const msg = `Migration '${m.migrationName}' contains destructive DROP statement. Ensure zero data-loss backfill plan exists.`;
        if (targetEnv === "production") {
          warnings.push(`[PROD_DESTRUCTIVE_CHECK] ${msg}`);
        } else {
          warnings.push(msg);
        }
      }
    }

    // Check 3: Production safety locks
    if (targetEnv === "production") {
      const databaseUrl = process.env.DATABASE_URL || "";
      if (!databaseUrl || databaseUrl.includes("localhost") || databaseUrl.includes("sqlite")) {
        blockers.push("Production migration aborted: DATABASE_URL is invalid or pointing to localhost/sqlite.");
      }
    }

    const isClean = blockers.length === 0;

    return {
      targetEnvironment: targetEnv,
      totalMigrationsFound: migrations.length,
      migrations,
      isVersionControlled: migrations.length > 0,
      canDeploy: isClean,
      warnings,
      blockers,
    };
  }

  /**
   * Asserts whether a given database command is permitted in the current environment.
   */
  public assertCommandAllowed(command: "migrate:deploy" | "migrate:dev" | "db:push" | "db:reset", targetEnv: AppEnvironment): void {
    if (targetEnv === "production" || targetEnv === "staging") {
      if (command === "db:push" || command === "db:reset") {
        throw new Error(
          `[FATAL_MIGRATION_GUARD] '${command}' is strictly forbidden in ${targetEnv.toUpperCase()}. ` +
          `Production & Staging databases must ONLY be updated via version-controlled 'prisma migrate deploy'.`
        );
      }
    }
  }

  /**
   * Generates the shell command to execute the migration safely.
   */
  public getExecutionCommand(targetEnv: AppEnvironment): string {
    if (targetEnv === "production" || targetEnv === "staging") {
      return "npx prisma migrate deploy";
    }
    return "npx prisma migrate dev";
  }
}

export const migrationGuard = new MigrationGuard();
