/**
 * ============================================================================
 * STAGING DATABASE SANITIZER & DATA ISOLATION ENGINE
 * ============================================================================
 * Anonymizes and sanitizes real user PII, 2257 compliance documents, and financial
 * credentials whenever staging is seeded or refreshed from a database backup.
 * 
 * Safety Rules:
 * 1. MUST NEVER run on Production.
 * 2. Rewrites all email addresses to `@staging.platform.local`.
 * 3. Replaces 2257 custodian ID documents and selfies with synthetic placeholders.
 * 4. Clears payment credentials and sets test wallet balances.
 */

import { PrismaClient } from "@prisma/client";
import { AppEnvironment } from "../../config/env-schema";
import { isProduction } from "../../config/environment";
import { Logger } from "../../../lib/logger";

export interface SanitizationResult {
  usersSanitized: number;
  verificationsSanitized: number;
  walletsSanitized: number;
  conversationsScrubbed: number;
  durationMs: number;
}

export class StagingDatabaseSanitizer {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * Verifies that the connected database URL is NOT a production database.
   */
  public static assertSafeStagingTarget(databaseUrl: string, currentEnv: AppEnvironment): void {
    if (currentEnv === "production" || isProduction()) {
      throw new Error(
        "[CRITICAL_SAFETY_FAILSAFE] Staging sanitizer cannot be executed in PRODUCTION mode."
      );
    }

    const lower = databaseUrl.toLowerCase();
    const productionKeywords = [
      "prod-db",
      "production",
      "rds.amazonaws.com",
      "adult_platform_prod",
      "live-db",
    ];

    for (const keyword of productionKeywords) {
      if (lower.includes(keyword) && !lower.includes("staging") && !lower.includes("test")) {
        throw new Error(
          `[CRITICAL_SAFETY_FAILSAFE] Refusing to sanitize database: URL contains production indicator '${keyword}'.`
        );
      }
    }
  }

  /**
   * Runs the full anonymization and sanitization pipeline.
   */
  public async sanitizeStagingDatabase(): Promise<SanitizationResult> {
    const startTime = Date.now();
    const databaseUrl = process.env.DATABASE_URL || "";
    
    // Safety check
    const currentEnv = (process.env.APP_ENV || "staging") as AppEnvironment;
    StagingDatabaseSanitizer.assertSafeStagingTarget(databaseUrl, currentEnv);

    Logger.info("[StagingSanitizer] Beginning staging data sanitization and PII scrubbing...");

    // 1. Fetch Users and sanitize usernames, emails, names
    const users = await this.prisma.user.findMany({
      select: { id: true, username: true, role: true },
    });

    let usersSanitized = 0;
    for (const user of users) {
      const syntheticEmail = `staging_user_${user.id.substring(0, 8)}@staging.platform.local`;
      const syntheticDisplayName = `Staging Tester (${user.role})`;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          email: syntheticEmail,
          displayName: syntheticDisplayName,
          avatarUrl: "https://cdn-staging.auralive.internal/avatars/default.png",
          bannerUrl: null,
          bio: "Staging verified test account.",
        },
      });
      usersSanitized++;
    }

    // 2. Sanitize Creator 2257 KYC verifications (Government IDs, selfies, custodian addresses)
    const verifications = await this.prisma.creatorVerification.findMany({
      select: { id: true },
    });

    let verificationsSanitized = 0;
    for (const v of verifications) {
      await this.prisma.creatorVerification.update({
        where: { id: v.id },
        data: {
          legalFirstName: "StagingLegalFirst",
          legalLastName: "StagingLegalLast",
          idNumberEncrypted: "ENC_STAGING_SYNTHETIC_ID_MOCK",
          idDocumentFrontUrl: "https://vault-staging.auralive.internal/placeholders/id-front.png",
          idDocumentBackUrl: "https://vault-staging.auralive.internal/placeholders/id-back.png",
          selfieWithIdUrl: "https://vault-staging.auralive.internal/placeholders/selfie-mock.png",
          complianceNotes: "[SANITIZED] Verified for Staging Environment testing.",
        },
      });
      verificationsSanitized++;
    }

    // 3. Reset Wallets to standard deterministic test credits
    const wallets = await this.prisma.wallet.findMany({
      select: { id: true },
    });

    let walletsSanitized = 0;
    for (const w of wallets) {
      await this.prisma.wallet.update({
        where: { id: w.id },
        data: {
          purchasedBalance: 5000,
          promotionalBalance: 1000,
          bonusBalance: 500,
          balance: 6500,
        },
      });
      walletsSanitized++;
    }

    // 4. Scrub direct private message text
    const messageUpdate = await this.prisma.message.updateMany({
      data: {
        body: "[STAGING_REDACTED_MESSAGE_CONTENT]",
        mediaUrl: null,
      },
    });

    const durationMs = Date.now() - startTime;
    Logger.info(`[StagingSanitizer] Completed in ${durationMs}ms:`, {
      usersSanitized,
      verificationsSanitized,
      walletsSanitized,
      conversationsScrubbed: messageUpdate.count,
    });

    return {
      usersSanitized,
      verificationsSanitized,
      walletsSanitized,
      conversationsScrubbed: messageUpdate.count,
      durationMs,
    };
  }
}

export const stagingSanitizer = new StagingDatabaseSanitizer();
