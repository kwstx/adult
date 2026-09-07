/**
 * ============================================================================
 * DEVICE FINGERPRINT & MULTI-ACCOUNT GRAPH SERVICE
 * ============================================================================
 * Collects, canonicalizes, and hashes client device signals, maintaining
 * an identity graph to detect device reuse across multiple accounts.
 */

import crypto from "crypto";
import prisma from "@/lib/db";
import { DeviceFingerprintData } from "../types";

export interface DeviceAnalysisResult {
  fingerprintHash: string;
  isKnownBlocked: boolean;
  blockReason?: string | null;
  trustScore: number;
  linkedUserCount: number;
  linkedUserIds: string[];
  isHeadlessBrowser: boolean;
  hasSuspiciousAttributes: boolean;
}

export class DeviceFingerprintService {
  /**
   * Generates a deterministic, canonical SHA-256 fingerprint hash
   * from client-provided telemetry signals.
   */
  static generateFingerprintHash(data: Partial<DeviceFingerprintData>): string {
    if (data.fingerprintHash && data.fingerprintHash.length >= 32) {
      return data.fingerprintHash;
    }

    const canonicalComponents = [
      data.userAgent || "",
      data.canvasHash || "",
      data.webglHash || "",
      data.audioHash || "",
      data.screenResolution || "",
      data.timezone || "",
      data.language || "",
      data.platform || "",
      data.hardwareConcurrency ? String(data.hardwareConcurrency) : "",
      data.deviceMemory ? String(data.deviceMemory) : "",
    ].join("||");

    return crypto.createHash("sha256").update(canonicalComponents).digest("hex");
  }

  /**
   * Evaluates and updates the identity linkage graph for a given device.
   */
  static async analyzeAndRecordDevice(
    userId: string | undefined,
    data: DeviceFingerprintData
  ): Promise<DeviceAnalysisResult> {
    const hash = this.generateFingerprintHash(data);
    const now = new Date();

    // Check for headless browser / automation signals
    const isHeadless =
      data.isHeadless === true ||
      (data.userAgent &&
        (data.userAgent.includes("HeadlessChrome") ||
          data.userAgent.includes("PhantomJS") ||
          data.userAgent.includes("Selenium") ||
          data.userAgent.includes("Playwright") ||
          data.userAgent.includes("Puppeteer"))) ||
      false;

    let trustScore = 100;
    if (isHeadless) trustScore -= 60;
    if (!data.canvasHash) trustScore -= 15;
    if (!data.webglHash) trustScore -= 10;
    if (data.hardwareConcurrency === undefined || data.hardwareConcurrency <= 0) trustScore -= 10;

    trustScore = Math.max(0, Math.min(100, trustScore));

    try {
      const existing = await prisma.deviceFingerprintRecord.findUnique({
        where: { fingerprintHash: hash },
      });

      if (existing) {
        let linkedUsers: string[] = [];
        try {
          linkedUsers = JSON.parse(existing.linkedUserIdsJson || "[]");
        } catch {
          linkedUsers = [];
        }

        if (userId && !linkedUsers.includes(userId)) {
          linkedUsers.push(userId);
        }

        // Update last seen and linked users
        await prisma.deviceFingerprintRecord.update({
          where: { id: existing.id },
          data: {
            lastSeenAt: now,
            userId: userId || existing.userId,
            linkedUserIdsJson: JSON.stringify(linkedUsers),
            trustScore: Math.min(existing.trustScore, trustScore),
          },
        });

        return {
          fingerprintHash: hash,
          isKnownBlocked: existing.isBlocked,
          blockReason: existing.blockReason,
          trustScore: existing.trustScore,
          linkedUserCount: linkedUsers.length,
          linkedUserIds: linkedUsers,
          isHeadlessBrowser: isHeadless,
          hasSuspiciousAttributes: trustScore < 60,
        };
      }

      // New fingerprint record
      const initialUsers = userId ? [userId] : [];
      const created = await prisma.deviceFingerprintRecord.create({
        data: {
          fingerprintHash: hash,
          userId: userId || null,
          rawTelemetryJson: JSON.stringify(data),
          canvasHash: data.canvasHash || null,
          webglHash: data.webglHash || null,
          userAgent: data.userAgent || null,
          language: data.language || null,
          screenResolution: data.screenResolution || null,
          timezone: data.timezone || null,
          isBlocked: false,
          trustScore,
          linkedUserIdsJson: JSON.stringify(initialUsers),
          firstSeenAt: now,
          lastSeenAt: now,
        },
      });

      return {
        fingerprintHash: hash,
        isKnownBlocked: false,
        trustScore: created.trustScore,
        linkedUserCount: initialUsers.length,
        linkedUserIds: initialUsers,
        isHeadlessBrowser: isHeadless,
        hasSuspiciousAttributes: trustScore < 60,
      };
    } catch (error) {
      console.warn("[DeviceFingerprintService] Database operation failed, fallback to memory analysis:", error);
      return {
        fingerprintHash: hash,
        isKnownBlocked: false,
        trustScore,
        linkedUserCount: userId ? 1 : 0,
        linkedUserIds: userId ? [userId] : [],
        isHeadlessBrowser: isHeadless,
        hasSuspiciousAttributes: trustScore < 60,
      };
    }
  }

  /**
   * Block a compromised or fraudulent device fingerprint.
   */
  static async blockDevice(fingerprintHash: string, reason: string): Promise<void> {
    await prisma.deviceFingerprintRecord.updateMany({
      where: { fingerprintHash },
      data: {
        isBlocked: true,
        blockReason: reason,
        trustScore: 0,
      },
    });
  }
}
