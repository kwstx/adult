export type AgeVerificationMethod =
  | "CREDIT_CARD_ASSURANCE"
  | "ID_DOCUMENT_KYC"
  | "FACIAL_AGE_ESTIMATION";

export type KycStatus = "UNVERIFIED" | "AGE_VERIFIED" | "COMPLIANCE_2257_APPROVED";

export interface AgeVerificationResult {
  verified: boolean;
  token: string;
  expiresAt: Date;
  method: AgeVerificationMethod;
}

export interface Compliance2257Payload {
  creatorId: string;
  legalFullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  governmentIdType: "PASSPORT" | "DRIVERS_LICENSE" | "NATIONAL_ID";
  idNumber: string;
  documentVaultUrl: string;
}

export interface ModerationReportInput {
  reporterId: string;
  targetUserId?: string;
  targetStreamId?: string;
  category: "UNDERAGE_SUSPICION" | "NON_CONSENSUAL" | "HARASSMENT" | "FRAUD" | "COPYRIGHT" | "OTHER";
  notes: string;
}
