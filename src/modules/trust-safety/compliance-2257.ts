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

    const record = await prisma.compliance2257Record.upsert({
      where: { creatorId },
      update: {
        legalFullName,
        dateOfBirth,
        governmentIdType,
        idNumberEncrypted: encryptedId,
        documentVaultUrl,
        verificationStatus: "APPROVED",
        approvedAt: new Date(),
      },
      create: {
        creatorId,
        legalFullName,
        dateOfBirth,
        governmentIdType,
        idNumberEncrypted: encryptedId,
        documentVaultUrl,
        verificationStatus: "APPROVED",
        approvedAt: new Date(),
      },
      include: { creator: true },
    });

    // Elevate creator User kyc status
    await prisma.user.update({
      where: { id: record.creator.userId },
      data: { kycStatus: "COMPLIANCE_2257_APPROVED" },
    });

    return record;
  }

  /**
   * Verify whether a creator has completed § 2257 compliance before they can broadcast or sell PPV.
   */
  static async isCreator2257Compliant(creatorId: string): Promise<boolean> {
    const record = await prisma.compliance2257Record.findUnique({
      where: { creatorId },
    });
    return record?.verificationStatus === "APPROVED";
  }
}
