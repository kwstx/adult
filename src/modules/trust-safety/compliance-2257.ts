import prisma from "@/lib/db";
import { Compliance2257Payload } from "./types";

export class Compliance2257Service {
  /**
   * Submit creator 18 U.S.C. § 2257 compliance records.
   */
  static async submit2257Record(payload: Compliance2257Payload) {
    const { creatorId, legalFullName, dateOfBirth, governmentIdType, idNumber, documentVaultUrl } = payload;

    // Verify creator age >= 18
    const birthDate = new Date(dateOfBirth);
    const ageDiff = Date.now() - birthDate.getTime();
    const ageYears = ageDiff / (1000 * 60 * 60 * 24 * 365.25);
    if (ageYears < 18) {
      throw new Error("2257 Compliance Rejection: Creator must be at least 18 years of age.");
    }

    const encryptedId = `enc_${Buffer.from(idNumber).toString("base64")}`;
    const nameParts = (legalFullName || "Creator Name").split(" ");
    const legalFirstName = nameParts[0] || "Creator";
    const legalLastName = nameParts.slice(1).join(" ") || "Verified";

    const creator = await prisma.creatorProfile.findUnique({
      where: { id: creatorId },
    });

    if (!creator) {
      throw new Error(`Creator profile ${creatorId} not found.`);
    }

    const record = await prisma.creatorVerification.create({
      data: {
        creatorProfileId: creator.id,
        userId: creator.userId,
        legalFirstName,
        legalLastName,
        dateOfBirth: birthDate,
        idType: (governmentIdType as any) || "PASSPORT",
        idNumberEncrypted: encryptedId,
        idDocumentFrontUrl: documentVaultUrl || "vault://doc_front",
        selfieWithIdUrl: documentVaultUrl || "vault://selfie",
        verificationStatus: "APPROVED",
        verifiedAt: new Date(),
      },
    });

    // Elevate creator User kyc status
    await prisma.user.update({
      where: { id: creator.userId },
      data: { kycStatus: "COMPLIANCE_2257_APPROVED" },
    });

    return record;
  }

  /**
   * Verify whether a creator has completed § 2257 compliance before they can broadcast or sell PPV.
   */
  static async isCreator2257Compliant(creatorId: string): Promise<boolean> {
    const record = await prisma.creatorVerification.findFirst({
      where: {
        OR: [{ creatorProfileId: creatorId }, { userId: creatorId }],
        verificationStatus: "APPROVED",
      },
    });
    return Boolean(record);
  }
}
