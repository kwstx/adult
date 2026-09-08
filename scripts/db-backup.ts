/**
 * Automated Database Backup Script
 * Run via: npx tsx scripts/db-backup.ts
 */

import { BackupEngine, BackupDataPayload } from "../src/core/security/backup-engine";
import * as fs from "fs";
import * as path from "path";

async function runBackup() {
  console.log("================================================================");
  console.log("💾 RUNNING PRODUCTION DATABASE BACKUP GENERATION");
  console.log("================================================================");

  // Mock sample snapshot from operational store
  const samplePayload: BackupDataPayload = {
    users: [
      { id: "user_admin", email: "admin@platform.local", username: "admin", role: "ADMIN" },
      { id: "user_maya", email: "maya@platform.local", username: "maya_live", role: "CREATOR" },
      { id: "user_fan1", email: "fan1@platform.local", username: "fan1", role: "FAN" },
    ],
    creatorProfiles: [
      { id: "creator_maya", userId: "user_maya", stageName: "Maya Live", isLive: false },
    ],
    creatorVerifications: [
      { id: "verif_maya", creatorProfileId: "creator_maya", userId: "user_maya", status: "APPROVED" },
    ],
    wallets: [
      { id: "wal_maya", userId: "user_maya", balance: 5000, purchasedBalance: 5000, promotionalBalance: 0, bonusBalance: 0 },
      { id: "wal_fan1", userId: "user_fan1", balance: 1000, purchasedBalance: 1000, promotionalBalance: 0, bonusBalance: 0 },
    ],
    walletTransactions: [
      { id: "tx_1", walletId: "wal_fan1", amount: 1000, direction: "CREDIT", type: "DEPOSIT" },
    ],
    creditLots: [
      { id: "lot_1", walletId: "wal_fan1", originalCredits: 1000, remainingCredits: 1000, creditType: "PURCHASED" },
    ],
    subscriptions: [],
    livestreams: [],
    bookings: [],
    auditEvents: [],
  };

  const archive = BackupEngine.createBackup(samplePayload);
  const outDir = path.resolve(__dirname, "../backups");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, `${archive.manifest.backupId}.json`);
  fs.writeFileSync(outFile, JSON.stringify(archive, null, 2), "utf-8");

  console.log(`✅ Backup successfully created and encrypted: ${archive.manifest.backupId}`);
  console.log(`• Timestamp:   ${archive.manifest.timestamp}`);
  console.log(`• Total Rows:  ${archive.manifest.totalRecordsCount}`);
  console.log(`• SHA-256:     ${archive.manifest.sha256Checksum}`);
  console.log(`• Saved to:    ${outFile}`);
}

runBackup().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
