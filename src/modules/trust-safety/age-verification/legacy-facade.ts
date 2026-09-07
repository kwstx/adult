/**
 * ============================================================================
 * AGE VERIFICATION SERVICE (LEGACY FACADE)
 * ============================================================================
 */

import prisma from "@/lib/db";
import { AgeEntitlement, AgeVerificationMethod, AgeVerificationResult } from "./types";
import { AgeEntitlementService } from "./age-entitlement.service";


export class AgeVerificationService {
  /**
   * Completes age assurance verification for a user.
   */
  static async verifyUserAge(params: {
    userId: string;
    method: AgeVerificationMethod;
    dob?: string;
    providerVerificationId?: string;
    jurisdictionCode?: string;
  }): Promise<AgeVerificationResult> {
    const { userId, method, providerVerificationId, jurisdictionCode = "DEFAULT" } = params;

    const token =
      providerVerificationId ||
      `age_tok_${Buffer.from(`${userId}:${Date.now()}:verified`).toString("base64url")}`;
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year

    await prisma.$transaction([
      prisma.ageAssuranceRecord.create({
        data: {
          userId,
          method: method as any,
          verificationToken: token,
          status: "APPROVED",
          expiresAt,
          countryCode: jurisdictionCode.split("-")[0] || "US",
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { kycStatus: "AGE_VERIFIED" },
      }),
    ]);

    return {
      verified: true,
      token,
      expiresAt,
      method,
    };
  }

  /**
   * Validates if a user has active valid age assurance.
   */
  static async isUserAgeVerified(userId: string, jurisdictionCode = "DEFAULT"): Promise<boolean> {
    const evaluation = await AgeEntitlementService.evaluateEntitlement(
      userId,
      AgeEntitlement.ADULT_MEDIA_PLAYBACK,
      { jurisdictionCode }
    );
    return evaluation.hasEntitlement;
  }
}
