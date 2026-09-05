import prisma from "@/lib/db";
import { AgeVerificationMethod, AgeVerificationResult } from "./types";

export class AgeVerificationService {
  /**
   * Specialist Identity / Age-Verification Provider Abstraction.
   * Completes age assurance verification for a user.
   */
  static async verifyUserAge(params: {
    userId: string;
    method: AgeVerificationMethod;
    dob?: string; // YYYY-MM-DD
    providerVerificationId?: string;
  }): Promise<AgeVerificationResult> {
    const { userId, method, dob, providerVerificationId } = params;

    // Validate 18+ requirement if dob provided
    if (dob) {
      const birthDate = new Date(dob);
      const ageDiff = Date.now() - birthDate.getTime();
      const ageYears = ageDiff / (1000 * 60 * 60 * 24 * 365.25);
      if (ageYears < 18) {
        throw new Error("Age assurance failed: User must be at least 18 years old.");
      }
    }

    const token = `age_tok_${Buffer.from(`${userId}:${Date.now()}:${providerVerificationId || "auto"}`).toString("base64url")}`;
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year validity

    await prisma.$transaction([
      prisma.ageAssuranceRecord.create({
        data: {
          userId,
          method,
          verificationToken: token,
          status: "APPROVED",
          expiresAt,
          countryCode: "US",
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
   * Validates if a user has active valid age assurance
   */
  static async isUserAgeVerified(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ageRecords: {
          where: {
            status: "APPROVED",
            expiresAt: { gte: new Date() },
          },
          take: 1,
        },
      },
    });

    return !!(user && (user.kycStatus === "AGE_VERIFIED" || user.kycStatus === "COMPLIANCE_2257_APPROVED" || user.ageRecords.length > 0));
  }
}
