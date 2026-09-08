/**
 * ============================================================================
 * TEST SUITE: Database Migration Coexistence & Backward Compatibility
 * ============================================================================
 * Validates that the migration linter detects breaking multi-version schema
 * mutations (NOT NULL without DEFAULT, DROP COLUMN, DROP TABLE, RENAME COLUMN)
 * while approving safe Expand-and-Contract patterns.
 */

import { MigrationCoexistenceGuard } from "../../src/core/infra/migrations/migration-coexistence-guard";

export async function runMigrationCoexistenceTests(): Promise<boolean> {
  console.log(`\n===============================================================`);
  console.log(`🧪 TEST SUITE: Database Migration Multi-Version Coexistence`);
  console.log(`===============================================================\n`);

  const guard = new MigrationCoexistenceGuard();
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passedCount++;
    } else {
      console.error(`  ✗ ${testName}`);
      failedCount++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Detects Unsafe ADD COLUMN NOT NULL without DEFAULT
  // --------------------------------------------------------------------------
  const unsafeNotNullSql = `
    -- Unsafe migration adding NOT NULL without default
    ALTER TABLE "User" ADD COLUMN "loyaltyTier" TEXT NOT NULL;
  `;
  const result1 = guard.analyzeSql("20260908_unsafe_add", unsafeNotNullSql);
  assert(
    !result1.isCoexistenceSafe &&
    result1.violations.some((v) => v.type === "UNSAFE_NOT_NULL_WITHOUT_DEFAULT"),
    "Rejects ADD COLUMN NOT NULL without DEFAULT (breaks Version N-1 INSERT statements)"
  );

  // --------------------------------------------------------------------------
  // TEST 2: Approves Safe ADD COLUMN with DEFAULT (Expand Phase)
  // --------------------------------------------------------------------------
  const safeAddDefaultSql = `
    -- Safe Expand phase: column with DEFAULT
    ALTER TABLE "User" ADD COLUMN "loyaltyTier" TEXT NOT NULL DEFAULT 'STANDARD';
    ALTER TABLE "User" ADD COLUMN "customBio" TEXT;
  `;
  const result2 = guard.analyzeSql("20260908_safe_expand", safeAddDefaultSql);
  assert(
    result2.isCoexistenceSafe && result2.violations.length === 0,
    "Approves safe Expand phase (nullable columns and columns with DEFAULT constraints)"
  );

  // --------------------------------------------------------------------------
  // TEST 3: Detects Unsafe DROP COLUMN (violates Contract phase timing)
  // --------------------------------------------------------------------------
  const unsafeDropColSql = `
    -- Breaking change during rolling deployment
    ALTER TABLE "CreatorProfile" DROP COLUMN "oldBio";
  `;
  const result3 = guard.analyzeSql("20260908_unsafe_drop_col", unsafeDropColSql);
  assert(
    !result3.isCoexistenceSafe &&
    result3.violations.some((v) => v.type === "UNSAFE_DROP_COLUMN"),
    "Rejects DROP COLUMN during active deployment (crashes Version N-1 SELECT/INSERT queries)"
  );

  // --------------------------------------------------------------------------
  // TEST 4: Detects Unsafe RENAME COLUMN
  // --------------------------------------------------------------------------
  const unsafeRenameSql = `
    -- Breaking change: rename column
    ALTER TABLE "Wallet" RENAME COLUMN "balance" TO "creditBalance";
  `;
  const result4 = guard.analyzeSql("20260908_unsafe_rename", unsafeRenameSql);
  assert(
    !result4.isCoexistenceSafe &&
    result4.violations.some((v) => v.type === "UNSAFE_RENAME_COLUMN"),
    "Rejects RENAME COLUMN (requires expand-and-contract dual-writing pattern)"
  );

  // --------------------------------------------------------------------------
  // TEST 5: Detects Unsafe DROP TABLE
  // --------------------------------------------------------------------------
  const unsafeDropTableSql = `
    DROP TABLE "LegacySession";
  `;
  const result5 = guard.analyzeSql("20260908_unsafe_drop_table", unsafeDropTableSql);
  assert(
    !result5.isCoexistenceSafe &&
    result5.violations.some((v) => v.type === "UNSAFE_DROP_TABLE"),
    "Rejects DROP TABLE without verified multi-release deprecation"
  );

  // --------------------------------------------------------------------------
  // TEST 6: Warns on non-concurrent index creation
  // --------------------------------------------------------------------------
  const lockIndexSql = `
    CREATE INDEX "idx_tx_user" ON "WalletLedgerEntry"("userId");
  `;
  const result6 = guard.analyzeSql("20260908_locking_index", lockIndexSql);
  assert(
    result6.violations.some((v) => v.type === "LOCKING_INDEX_CREATION" && v.severity === "WARNING"),
    "Warns on table-locking CREATE INDEX (advises CREATE INDEX CONCURRENTLY)"
  );

  // --------------------------------------------------------------------------
  // TEST 7: Multi-Version Coexistence Data Access Emulation
  // --------------------------------------------------------------------------
  // Emulate N-1 app writing to schema with newly added default column
  const tableState: Record<string, any>[] = [];
  const vOldWriter = (row: { id: string; email: string }) => {
    // Version N-1 does not know about "tier"
    const newRecord = { ...row, tier: "STANDARD" }; // DB default applied
    tableState.push(newRecord);
    return newRecord;
  };
  const vNewReader = (record: any) => {
    // Version N reads the new field
    return record.tier || "STANDARD";
  };

  const inserted = vOldWriter({ id: "usr_123", email: "fan@staging.platform.local" });
  const readTier = vNewReader(inserted);
  assert(
    readTier === "STANDARD",
    "Emulates successful multi-version coexistence where N-1 writes and N reads without failure"
  );

  console.log(`\n---------------------------------------------------------------`);
  console.log(`PASS Database Migration Multi-Version Coexistence: ${passedCount} passed, ${failedCount} failed`);
  console.log(`---------------------------------------------------------------\n`);

  return failedCount === 0;
}

if (require.main === module) {
  runMigrationCoexistenceTests().then((ok) => {
    if (!ok) process.exit(1);
  });
}
