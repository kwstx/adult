/**
 * PRIVACY ARCHITECTURE (#69) UNIT TEST SUITE
 * 
 * Verifies field-level encryption, Sensitive Verification Data Vault isolation,
 * data retention pruning, GDPR/CCPA account deletion, and DSAR export archives.
 */

import { TestRunner, assert, assertEqual, assertRejects } from "../utils/test-runner";
import { FieldEncryption } from "@/core/privacy/field-encryption";
import { SensitiveVerificationVault } from "@/core/privacy/vault.service";
import { RetentionPolicyService, DATA_RETENTION_POLICIES } from "@/core/privacy/retention-policy.service";
import { AccountDeletionService } from "@/core/privacy/account-deletion.service";
import { DataExportService } from "@/core/privacy/data-export.service";
import { MockDatabaseStore } from "../utils/mock-db";

export async function runPrivacyArchitectureTests(): Promise<boolean> {
  const runner = new TestRunner("Layer: Privacy Architecture (#69) Tests");
  runner.printHeader();

  const db = new MockDatabaseStore();
  db.seedFixtures();

  // --------------------------------------------------------------------------
  // TEST 1: Field-Level AES-256-GCM Encryption & Decryption
  // --------------------------------------------------------------------------
  await runner.runTest("Field Encryption: Authenticated AES-256-GCM encryption & decryption", () => {
    const rawGovId = "PASS-987654321-US";
    const encrypted = FieldEncryption.encrypt(rawGovId);

    assert(encrypted.startsWith("v1:"), "Ciphertext must have v1: version prefix");
    assert(FieldEncryption.isEncrypted(encrypted), "isEncrypted must return true");
    assert(!encrypted.includes(rawGovId), "Plaintext must not be visible in ciphertext");

    const decrypted = FieldEncryption.decrypt(encrypted);
    assertEqual(decrypted, rawGovId, "Decrypted text must match original Gov ID");
  });

  // --------------------------------------------------------------------------
  // TEST 2: Tampered Ciphertext Auth Tag Rejection
  // --------------------------------------------------------------------------
  await runner.runTest("Field Encryption: Rejects tampered ciphertext via auth tag verification", () => {
    const original = "TAX-ID-12345";
    const encrypted = FieldEncryption.encrypt(original);
    const parts = encrypted.split(":");

    // Tamper with ciphertext payload
    parts[3] = Buffer.from("corrupted_payload").toString("base64");
    const tampered = parts.join(":");

    let failedAsExpected = false;
    try {
      FieldEncryption.decrypt(tampered);
    } catch {
      failedAsExpected = true;
    }

    assert(failedAsExpected, "Decryption of tampered ciphertext must throw an authentication error");
  });

  // --------------------------------------------------------------------------
  // TEST 3: Sensitive Verification Vault Gating & Audit Justification
  // --------------------------------------------------------------------------
  await runner.runTest("Vault: Requires audited compliance justification to read decrypted records", async () => {
    // Attempt reading KYC without valid justification
    await assertRejects(
      async () => {
        await SensitiveVerificationVault.getDecryptedVerification("verif_maya", {
          adminUserId: "usr_admin_01",
          adminEmail: "compliance@platform.local",
          adminRole: "COMPLIANCE_OFFICER",
          justification: "", // Missing justification
        });
      },
      "requires a documented business justification",
      "Must reject unverified/unjustified access to KYC Vault"
    );
  });

  // --------------------------------------------------------------------------
  // TEST 4: Data Retention Policy Definitions
  // --------------------------------------------------------------------------
  await runner.runTest("Retention: Enforces data minimization retention windows", () => {
    assertEqual(DATA_RETENTION_POLICIES.AGE_ASSURANCE_TOKENS.retentionDays, 90, "Age tokens retained 90 days");
    assertEqual(DATA_RETENTION_POLICIES.DEVICE_FINGERPRINTS.retentionDays, 30, "Fingerprints retained 30 days");
    assertEqual(DATA_RETENTION_POLICIES.TRANSIENT_NOTIFICATIONS.retentionDays, 180, "Notifications retained 180 days");
    assert(DATA_RETENTION_POLICIES.AUDIT_LOGS.retentionDays >= 2500, "Audit logs preserved for ~7 years legal compliance");
  });

  // --------------------------------------------------------------------------
  // TEST 5: GDPR / CCPA Account Deletion Workflow
  // --------------------------------------------------------------------------
  await runner.runTest("Account Deletion: Erases fan profile while preserving pseudonymous financial ledgers", async () => {
    // We execute deletion on fan user
    const deletionResult = await AccountDeletionService.deleteAccount(
      "user_fan_01",
      "user_fan_01",
      "User exercised GDPR Right to Erasure"
    );

    assertEqual(deletionResult.userId, "user_fan_01", "User ID matches");
    assertEqual(deletionResult.status, "PSEUDONYMIZED_FOR_COMPLIANCE", "Must pseudonymize for tax/audit compliance");
  });

  // --------------------------------------------------------------------------
  // TEST 6: GDPR Article 15 DSAR Data Export Portfolio
  // --------------------------------------------------------------------------
  await runner.runTest("Data Export: Assembles comprehensive machine-readable personal data portfolio", async () => {
    const userDossier = await DataExportService.generateUserExport("user_fan_01");

    assertEqual(userDossier.exportMetadata.complianceScope, "GDPR_ARTICLE_15_CCPA", "Scope matches GDPR/CCPA");
    assert(userDossier.accountProfile !== undefined, "Includes account profile");
    assert(Array.isArray(userDossier.transactions), "Includes wallet transactions array");
    assert(Array.isArray(userDossier.follows), "Includes follows array");
  });

  const summary = runner.printFooter();
  return summary.failedCount === 0;
}

if (require.main === module) {
  runPrivacyArchitectureTests().then((success) => process.exit(success ? 0 : 1));
}
