/**
 * ============================================================================
 * AUTHORITATIVE DATA RETENTION & PRUNING POLICY SERVICE
 * ============================================================================
 * Enforces data minimization by defining and executing automated retention
 * pruning rules across ephemeral, compliance, and operational stores:
 * - Age verification tokens: 90 days TTL
 * - Expired sessions & device fingerprints: 30 days TTL
 * - Ephemeral notifications & messages: 180 days TTL
 * - Financial audit events: 7 years retention (Legal / Tax compliance)
 */

import prisma from "@/lib/db";
import { StructuredLogger } from "@/core/observability/structured-logger";

export interface RetentionPolicy {
  domain: string;
  retentionDays: number;
  description: string;
  legalBasis: string;
}

export const DATA_RETENTION_POLICIES: Record<string, RetentionPolicy> = {
  AGE_ASSURANCE_TOKENS: {
    domain: "AGE_ASSURANCE",
    retentionDays: 90,
    description: "Ephemeral tokens for 18+ age verification checks",
    legalBasis: "Data Minimization (GDPR Art. 5(1)(e))",
  },
  DEVICE_FINGERPRINTS: {
    domain: "FRAUD_PREVENTION",
    retentionDays: 30,
    description: "Transient device hashes for login fraud defense",
    legalBasis: "Legitimate Interest (Fraud Prevention)",
  },
  TRANSIENT_NOTIFICATIONS: {
    domain: "NOTIFICATIONS",
    retentionDays: 180,
    description: "User push and in-app system notifications",
    legalBasis: "Storage Limitation",
  },
  AUDIT_LOGS: {
    domain: "COMPLIANCE_AUDIT",
    retentionDays: 2555, // ~7 years
    description: "Immutable financial and administrative audit trail",
    legalBasis: "Legal Obligation (Tax & 2257 Compliance)",
  },
};

export interface RetentionPruneReport {
  timestamp: string;
  ageTokensPruned: number;
  deviceFingerprintsPruned: number;
  notificationsPruned: number;
  errors: string[];
}

export class RetentionPolicyService {
  /**
   * Executes scheduled retention pruning across all applicable database tables.
   */
  public static async pruneExpiredRecords(): Promise<RetentionPruneReport> {
    const report: RetentionPruneReport = {
      timestamp: new Date().toISOString(),
      ageTokensPruned: 0,
      deviceFingerprintsPruned: 0,
      notificationsPruned: 0,
      errors: [],
    };

    StructuredLogger.info("[RETENTION] Starting automated data retention pruning cycle...");

    // 1. Prune Expired Age Assurance Records older than 90 days
    try {
      const ageThreshold = new Date(Date.now() - DATA_RETENTION_POLICIES.AGE_ASSURANCE_TOKENS.retentionDays * 86400000);
      const result = await prisma.ageAssuranceRecord.deleteMany({
        where: {
          verifiedAt: { lt: ageThreshold },
          expiresAt: { lt: new Date() },
        },
      });
      report.ageTokensPruned = result.count;
    } catch (err: any) {
      report.errors.push(`Age assurance prune failed: ${err?.message}`);
    }

    // 2. Prune Device Fingerprints older than 30 days
    try {
      const deviceThreshold = new Date(Date.now() - DATA_RETENTION_POLICIES.DEVICE_FINGERPRINTS.retentionDays * 86400000);
      const result = await prisma.deviceFingerprintRecord.deleteMany({
        where: {
          lastSeenAt: { lt: deviceThreshold },
        },
      });
      report.deviceFingerprintsPruned = result.count;
    } catch (err: any) {
      report.errors.push(`Device fingerprint prune failed: ${err?.message}`);
    }

    // 3. Prune Read Notifications older than 180 days
    try {
      const notifThreshold = new Date(Date.now() - DATA_RETENTION_POLICIES.TRANSIENT_NOTIFICATIONS.retentionDays * 86400000);
      const result = await prisma.notification.deleteMany({
        where: {
          isRead: true,
          createdAt: { lt: notifThreshold },
        },
      });
      report.notificationsPruned = result.count;
    } catch (err: any) {
      report.errors.push(`Notification prune failed: ${err?.message}`);
    }

    StructuredLogger.info(
      `[RETENTION] Pruning cycle complete: ${report.ageTokensPruned} age tokens, ${report.deviceFingerprintsPruned} fingerprints, ${report.notificationsPruned} notifications removed.`
    );

    return report;
  }
}
