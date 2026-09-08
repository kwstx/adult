/**
 * INFRASTRUCTURE TEST SUITE: BACKUP GENERATION & RESTORATION DRILL
 * 
 * Verifies:
 * "Production databases should have backups.
 * Backups should be tested by restoring them.
 * That last point matters: having a backup that has never been restored
 * is not the same as knowing your backup works."
 */

import { TestRunner, assert, assertEqual } from "../utils/test-runner";
import { BackupEngine, BackupDataPayload } from "@/core/security/backup-engine";
import { BackupRestoreVerifier } from "@/core/security/backup-restore-verifier";

export async function runBackupRestoreTests(): Promise<boolean> {
  const runner = new TestRunner("Layer: Database Backup & Restoration Drill Tests");
  runner.printHeader();

  const mockPayload: BackupDataPayload = {
    users: [
      { id: "u_1", email: "admin@platform.local", username: "admin", role: "ADMIN" },
      { id: "u_2", email: "creator@platform.local", username: "creator", role: "CREATOR" },
      { id: "u_3", email: "fan@platform.local", username: "fan", role: "FAN" },
    ],
    creatorProfiles: [
      { id: "cp_1", userId: "u_2", stageName: "Star Creator", isLive: false },
    ],
    creatorVerifications: [
      { id: "cv_1", creatorProfileId: "cp_1", userId: "u_2", status: "APPROVED" },
    ],
    wallets: [
      { id: "w_1", userId: "u_2", balance: 10000, purchasedBalance: 10000, promotionalBalance: 0, bonusBalance: 0 },
      { id: "w_2", userId: "u_3", balance: 500, purchasedBalance: 500, promotionalBalance: 0, bonusBalance: 0 },
    ],
    walletTransactions: [
      { id: "tx_1", walletId: "w_2", amount: 500, direction: "CREDIT", type: "DEPOSIT" },
    ],
    creditLots: [
      { id: "lot_1", walletId: "w_2", originalCredits: 500, remainingCredits: 500, creditType: "PURCHASED" },
    ],
    subscriptions: [],
    livestreams: [],
    bookings: [],
    auditEvents: [],
  };

  // --------------------------------------------------------------------------
  // TEST 1: Encrypted Backup Generation & SHA-256 Checksumming
  // --------------------------------------------------------------------------
  let generatedArchive: any;
  await runner.runTest("Backup Engine: Generates encrypted AES-256-GCM snapshot with SHA-256 hash", () => {
    generatedArchive = BackupEngine.createBackup(mockPayload, "production");

    assert(generatedArchive.manifest.backupId.startsWith("bkp_"), "Backup ID format matches bkp_*");
    assertEqual(generatedArchive.manifest.encryptionAlgorithm, "AES-256-GCM", "Encryption must be AES-256-GCM");
    assertEqual(generatedArchive.manifest.totalRecordsCount, 9, "Total records must equal 9");
    assert(generatedArchive.manifest.sha256Checksum.length === 64, "SHA-256 checksum must be 64 hex characters");
    assert(generatedArchive.encryptedPayload !== JSON.stringify(mockPayload), "Payload must be encrypted");
  });

  // --------------------------------------------------------------------------
  // TEST 2: Backup Restoration Verification Drill
  // --------------------------------------------------------------------------
  await runner.runTest("Restoration Drill: Verifies database restoration, foreign keys, and ledger reconciliation", () => {
    const report = BackupRestoreVerifier.verifyBackupRestoration(generatedArchive);

    assertEqual(report.success, true, "Restoration drill must succeed completely");
    assertEqual(report.checksumVerified, true, "Checksum must match");
    assertEqual(report.recordsVerified, 9, "All 9 records verified");
    assertEqual(report.foreignKeysIntact, true, "Foreign keys intact");
    assertEqual(report.ledgerBalanced, true, "Financial ledger balanced");
    assertEqual(report.errors.length, 0, "Zero restoration errors");
  });

  // --------------------------------------------------------------------------
  // TEST 3: Restoration Drill Flags Corrupted & Imbalanced Backups
  // --------------------------------------------------------------------------
  await runner.runTest("Restoration Drill: Reliably detects financial imbalance in damaged backups", () => {
    // Create an imbalanced payload (wallet balance does not equal sum of lots)
    const corruptedPayload: BackupDataPayload = {
      ...mockPayload,
      wallets: [
        { id: "w_corrupted", userId: "u_3", balance: 5000, purchasedBalance: 100, promotionalBalance: 0, bonusBalance: 0 }, // Imbalance: 5000 != 100
      ],
    };

    const corruptedArchive = BackupEngine.createBackup(corruptedPayload);
    const report = BackupRestoreVerifier.verifyBackupRestoration(corruptedArchive);

    assertEqual(report.success, false, "Restoration drill must fail on financial imbalance");
    assertEqual(report.ledgerBalanced, false, "Ledger balanced must be false");
    assert(report.errors.length > 0, "Must report financial imbalance error");
  });

  const summary = runner.printFooter();
  return summary.failedCount === 0;
}

if (require.main === module) {
  runBackupRestoreTests().then((success) => process.exit(success ? 0 : 1));
}
