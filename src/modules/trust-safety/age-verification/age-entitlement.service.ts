/**
 * ============================================================================
 * AGE ENTITLEMENT SERVICE (AUTHORITATIVE AGE ASSURANCE ENGINE)
 * ============================================================================
 * 
 * Central domain service governing age verification, entitlement evaluations,
 * provider session lifecycles, and zero-PII compliance.
 * 
 * CORE PRINCIPLES:
 * 1. Verification is treated strictly as a backend Entitlement.
 * 2. The platform stores ONLY the provider reference, status, assurance level,
 *    and cryptographic hash (ZERO RAW PII OR BIOMETRICS).
 * 3. Feature access is granted conditionally upon provider status and jurisdiction rules.
 */

import * as crypto from "crypto";
import prisma from "@/lib/db";

import {
  AgeAssuranceLevel,
  AgeEntitlement,
  AgeEntitlementEvaluation,
  AgeVerificationMethod,
  AgeVerificationProviderName,
  AgeVerificationStatus,
  CanonicalVerificationUpdate,
  ProviderSessionResponse,
  UserAgeEntitlementsSummary,
} from "./types";
import { AgeVerificationProviderFactory } from "./provider-factory";
import { JurisdictionPolicyService } from "./jurisdiction-policy";
import { AuditService } from "../audit.service";

export interface InitiateSessionInput {
  userId: string;
  method: AgeVerificationMethod;
  jurisdictionCode?: string;
  redirectUrl?: string;
  clientIp?: string;
  providerName?: AgeVerificationProviderName;
}

export class AgeEntitlementService {
  private static readonly IP_SALT =
    process.env.AGE_GATE_SALT || "platform_age_assurance_hmac_salt_sec_2026";

  /**
   * One-way cryptographic hash for client IP address.
   * Ensures data minimization: We never store the user's raw IP in age records.
   */
  static hashClientIp(ipAddress?: string): string | null {
    if (!ipAddress) return null;
    return crypto
      .createHmac("sha256", this.IP_SALT)
      .update(ipAddress.trim())
      .digest("hex")
      .substring(0, 32);
  }

  /**
   * Authoritative Gatekeeper:
   * Evaluate whether a user currently holds a specific age-related entitlement.
   */
  static async evaluateEntitlement(
    userId: string | null | undefined,
    entitlement: AgeEntitlement,
    context?: {
      jurisdictionCode?: string;
      clientIp?: string;
      bypassForAdmin?: boolean;
    }
  ): Promise<AgeEntitlementEvaluation> {
    const jurisdiction = context?.jurisdictionCode || "DEFAULT";
    const rule = JurisdictionPolicyService.getRuleForJurisdiction(jurisdiction);

    // 1. Unauthenticated users have no age entitlements
    if (!userId) {
      return {
        entitlement,
        hasEntitlement: false,
        status: "NOT_STARTED",
        assuranceLevel: null,
        jurisdiction,
        requiredLevel: rule.minimumAssuranceLevel,
        provider: null,
        providerReference: null,
        verifiedAt: null,
        expiresAt: null,
        isExpired: false,
        rejectionReason: "Authentication required to verify age entitlements.",
      };
    }

    // 2. Lookup user & active age assurance records
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ageAssuranceRecords: {
          orderBy: { verifiedAt: "desc" },
          take: 5,
        },
      },
    });

    if (!user) {
      return {
        entitlement,
        hasEntitlement: false,
        status: "NOT_STARTED",
        assuranceLevel: null,
        jurisdiction,
        requiredLevel: rule.minimumAssuranceLevel,
        provider: null,
        providerReference: null,
        verifiedAt: null,
        expiresAt: null,
        isExpired: false,
        rejectionReason: "User account not found.",
      };
    }

    // 3. Admin / Auditor Authority Bypass
    if ((context?.bypassForAdmin || true) && (user.role === "ADMIN" || user.role === "AUDITOR")) {
      return {
        entitlement,
        hasEntitlement: true,
        status: "APPROVED",
        assuranceLevel: AgeAssuranceLevel.LEVEL_4_GOVERNMENT_EID,
        jurisdiction,
        requiredLevel: rule.minimumAssuranceLevel,
        provider: "SANDBOX_MOCK",
        providerReference: "admin_override",
        verifiedAt: user.createdAt,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10),
        isExpired: false,
      };
    }

    // 4. Check banned or suspended state
    if (user.isBanned || user.moderationState === "SUSPENDED" || user.moderationState === "BANNED") {
      return {
        entitlement,
        hasEntitlement: false,
        status: "REVOKED",
        assuranceLevel: null,
        jurisdiction,
        requiredLevel: rule.minimumAssuranceLevel,
        provider: null,
        providerReference: null,
        verifiedAt: null,
        expiresAt: null,
        isExpired: false,
        rejectionReason: "Account is suspended or banned by Trust & Safety.",
      };
    }

    // 5. Creator Broadcast Entitlement requires 2257 custodian documentation
    if (entitlement === AgeEntitlement.CREATOR_BROADCAST_2257) {
      const is2257Approved = user.kycStatus === "COMPLIANCE_2257_APPROVED";
      if (!is2257Approved) {
        return {
          entitlement,
          hasEntitlement: false,
          status: user.kycStatus === "PENDING" ? "IN_REVIEW" : "NOT_STARTED",
          assuranceLevel: AgeAssuranceLevel.LEVEL_3_DOCUMENT_LIVENESS,
          jurisdiction,
          requiredLevel: AgeAssuranceLevel.LEVEL_3_DOCUMENT_LIVENESS,
          provider: null,
          providerReference: null,
          verifiedAt: null,
          expiresAt: null,
          isExpired: false,
          rejectionReason:
            "18 U.S.C. § 2257 government ID & compliance verification required to broadcast.",
        };
      }
    }

    // 6. Find most recent approved & valid age assurance record
    const now = new Date();
    const activeRecord = user.ageAssuranceRecords.find(
      (r) => r.status === "APPROVED" && new Date(r.expiresAt) > now
    );

    if (!activeRecord) {
      const lastRecord = user.ageAssuranceRecords[0];
      const isExpired = lastRecord ? new Date(lastRecord.expiresAt) <= now : false;
      const status: AgeVerificationStatus = isExpired
        ? "EXPIRED"
        : lastRecord
        ? (lastRecord.status as AgeVerificationStatus)
        : "NOT_STARTED";

      return {
        entitlement,
        hasEntitlement: false,
        status,
        assuranceLevel: null,
        jurisdiction,
        requiredLevel: rule.minimumAssuranceLevel,
        provider: null,
        providerReference: lastRecord?.verificationToken || null,
        verifiedAt: lastRecord?.verifiedAt || null,
        expiresAt: lastRecord?.expiresAt || null,
        isExpired,
        rejectionReason: isExpired
          ? "Age assurance verification has expired. Re-verification required."
          : `Age verification required by ${rule.statutoryReference}.`,
      };
    }

    // 7. Map record method to assurance level
    const assuranceLevel = this.mapMethodToLevel(activeRecord.method as AgeVerificationMethod);

    // 8. Validate statutory assurance level sufficiency for this jurisdiction
    const isSufficient = JurisdictionPolicyService.isAssuranceLevelSufficient(
      assuranceLevel,
      rule.minimumAssuranceLevel
    );

    if (!isSufficient) {
      return {
        entitlement,
        hasEntitlement: false,
        status: "APPROVED",
        assuranceLevel,
        jurisdiction,
        requiredLevel: rule.minimumAssuranceLevel,
        provider: null,
        providerReference: activeRecord.verificationToken,
        verifiedAt: activeRecord.verifiedAt,
        expiresAt: activeRecord.expiresAt,
        isExpired: false,
        rejectionReason: `Jurisdiction (${rule.jurisdictionName}) requires higher assurance level (${rule.minimumAssuranceLevel}). Current method is (${assuranceLevel}).`,
      };
    }

    // 9. All checks pass — Entitlement Granted!
    return {
      entitlement,
      hasEntitlement: true,
      status: "APPROVED",
      assuranceLevel,
      jurisdiction,
      requiredLevel: rule.minimumAssuranceLevel,
      provider: "PERSONA", // Canonical provider category
      providerReference: activeRecord.verificationToken,
      verifiedAt: activeRecord.verifiedAt,
      expiresAt: activeRecord.expiresAt,
      isExpired: false,
    };
  }

  /**
   * Get complete summary of all entitlements and verification state for a user.
   */
  static async getUserEntitlementsSummary(
    userId: string,
    jurisdictionCode = "DEFAULT"
  ): Promise<UserAgeEntitlementsSummary> {
    const entitlements = Object.values(AgeEntitlement);
    const evaluations: AgeEntitlementEvaluation[] = [];

    for (const ent of entitlements) {
      const evalResult = await this.evaluateEntitlement(userId, ent, { jurisdictionCode });
      evaluations.push(evalResult);
    }

    const firstEval = evaluations[0];
    const isFullyVerified = evaluations.every(
      (e) => e.entitlement === AgeEntitlement.CREATOR_BROADCAST_2257 || e.hasEntitlement
    );

    const entitlementsMap: Record<AgeEntitlement, boolean> = {
      [AgeEntitlement.AGE_VERIFIED_ENTRY]: evaluations.find(
        (e) => e.entitlement === AgeEntitlement.AGE_VERIFIED_ENTRY
      )?.hasEntitlement ?? false,
      [AgeEntitlement.ADULT_MEDIA_PLAYBACK]: evaluations.find(
        (e) => e.entitlement === AgeEntitlement.ADULT_MEDIA_PLAYBACK
      )?.hasEntitlement ?? false,
      [AgeEntitlement.INTERACTIVE_PARTICIPATION]: evaluations.find(
        (e) => e.entitlement === AgeEntitlement.INTERACTIVE_PARTICIPATION
      )?.hasEntitlement ?? false,
      [AgeEntitlement.PPV_PURCHASE]: evaluations.find(
        (e) => e.entitlement === AgeEntitlement.PPV_PURCHASE
      )?.hasEntitlement ?? false,
      [AgeEntitlement.PRIVATE_SESSION_ACCESS]: evaluations.find(
        (e) => e.entitlement === AgeEntitlement.PRIVATE_SESSION_ACCESS
      )?.hasEntitlement ?? false,
      [AgeEntitlement.CREATOR_BROADCAST_2257]: evaluations.find(
        (e) => e.entitlement === AgeEntitlement.CREATOR_BROADCAST_2257
      )?.hasEntitlement ?? false,
    };

    return {
      userId,
      isFullyVerified,
      primaryStatus: firstEval.status,
      highestAssuranceLevel: firstEval.assuranceLevel,
      jurisdiction: jurisdictionCode,
      verifiedAt: firstEval.verifiedAt,
      expiresAt: firstEval.expiresAt,
      entitlements: entitlementsMap,
      evaluations,
    };
  }

  /**
   * Initiate a verification session with the third-party provider.
   * Enforces jurisdiction rules and saves a pending reference.
   */
  static async initiateVerificationSession(
    input: InitiateSessionInput
  ): Promise<ProviderSessionResponse> {
    const {
      userId,
      method,
      jurisdictionCode = "DEFAULT",
      redirectUrl = "/discover",
      clientIp,
      providerName,
    } = input;

    // 1. Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error(`User with ID ${userId} not found.`);
    }

    // 2. Validate method against jurisdiction statutory rule
    const rule = JurisdictionPolicyService.getRuleForJurisdiction(jurisdictionCode);
    const isMethodAllowed = JurisdictionPolicyService.isMethodAllowedInJurisdiction(
      method,
      jurisdictionCode
    );

    if (!isMethodAllowed) {
      throw new Error(
        `Method '${method}' is not accepted in jurisdiction '${rule.jurisdictionName}'. Allowed: ${rule.allowedMethods.join(
          ", "
        )}`
      );
    }

    const assuranceLevel = this.mapMethodToLevel(method);
    const provider = AgeVerificationProviderFactory.getProvider(providerName);
    const ipHash = this.hashClientIp(clientIp);

    // 3. Request session from Provider
    const session = await provider.createSession({
      userId,
      email: user.email,
      method,
      assuranceLevel,
      jurisdictionCode,
      redirectUrl,
      webhookUrl: `${process.env.APP_URL || "http://localhost:3000"}/api/safety/age-verify/webhook`,
      clientIpHash: ipHash || undefined,
    });

    // 4. Upsert pending AgeAssuranceRecord in DB (Zero PII stored)
    await prisma.ageAssuranceRecord.create({
      data: {
        userId,
        method,
        verificationToken: session.providerReference,
        status: "PENDING",
        countryCode: jurisdictionCode.split("-")[0] || "US",
        ipHash: ipHash || undefined,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * rule.sessionValidityDays),
      },
    });

    // 5. Update user state to PENDING if currently UNVERIFIED
    if (user.kycStatus === "UNVERIFIED") {
      await prisma.user.update({
        where: { id: userId },
        data: { kycStatus: "PENDING" },
      });
    }

    // 6. Log audit event
    await AuditService.logEvent({
      actorId: userId,
      actorType: "USER",
      action: "AGE_VERIFICATION_SESSION_INITIATED",
      targetEntityType: "User",
      targetEntityId: userId,
      metadata: {
        provider: provider.name,
        providerReference: session.providerReference,
        method,
        jurisdictionCode,
        assuranceLevel,
      },
    });

    return session;
  }

  /**
   * Handle incoming signed webhook from third-party provider.
   * Atomically records status, updates user KYC, and invalidates/grants entitlements.
   */
  static async handleProviderWebhook(
    providerName: AgeVerificationProviderName,
    headers: Record<string, string | string[] | undefined>,
    rawBody: string
  ): Promise<CanonicalVerificationUpdate> {
    const provider = AgeVerificationProviderFactory.getProvider(providerName);

    // 1. Validate cryptographic webhook signature
    const isValidSignature = await provider.verifyWebhookSignature(headers, rawBody);
    if (!isValidSignature) {
      throw new Error(`Invalid HMAC signature for provider webhook [${providerName}]`);
    }

    // 2. Parse payload into canonical update format
    const payload = JSON.parse(rawBody);
    const update = await provider.parseWebhookPayload(payload);

    // 3. Locate user and existing record
    let record = await prisma.ageAssuranceRecord.findUnique({
      where: { verificationToken: update.providerReference },
    });

    if (!record && update.userId) {
      record = await prisma.ageAssuranceRecord.findFirst({
        where: { userId: update.userId },
        orderBy: { verifiedAt: "desc" },
      });
    }

    const targetUserId = record?.userId || update.userId;
    if (!targetUserId || targetUserId === "unknown" || targetUserId === "unknown_user") {
      console.warn(`[AgeAssurance Webhook] Unmapped provider reference: ${update.providerReference}`);
      return update;
    }

    const dbStatus = update.status === "APPROVED" ? "APPROVED" : update.status === "REJECTED" ? "REJECTED" : "PENDING";
    const expiresAt = update.expiresAt || new Date(Date.now() + 1000 * 60 * 60 * 24 * 365);

    // 4. Atomic database transaction updating assurance & user KYC status
    await prisma.$transaction(async (tx) => {
      if (record) {
        await tx.ageAssuranceRecord.update({
          where: { id: record.id },
          data: {
            status: dbStatus,
            expiresAt,
            verifiedAt: update.status === "APPROVED" ? new Date() : undefined,
          },
        });
      } else {
        await tx.ageAssuranceRecord.create({
          data: {
            userId: targetUserId,
            method: update.method,
            verificationToken: update.providerReference,
            status: dbStatus,
            countryCode: update.countryCode || "US",
            expiresAt,
            verifiedAt: update.status === "APPROVED" ? new Date() : undefined,
          },
        });
      }

      if (update.status === "APPROVED") {
        await tx.user.update({
          where: { id: targetUserId },
          data: { kycStatus: "AGE_VERIFIED" },
        });
      } else if (update.status === "REJECTED") {
        await tx.user.update({
          where: { id: targetUserId },
          data: { kycStatus: "REJECTED" },
        });
      }
    });

    // 5. Audit log
    await AuditService.logEvent({
      actorId: "SYSTEM_WEBHOOK",
      actorType: "SYSTEM_AUTOMATION",
      action: `AGE_VERIFICATION_STATUS_${update.status}`,
      targetEntityType: "User",
      targetEntityId: targetUserId,
      metadata: {
        provider: provider.name,
        providerReference: update.providerReference,
        status: update.status,
        rawStatus: update.rawProviderStatus,
        rejectionReason: update.rejectionReason,
      },
    });

    return update;
  }

  /**
   * Helper: Map verification method to standard assurance level.
   */
  private static mapMethodToLevel(method: AgeVerificationMethod): AgeAssuranceLevel {
    switch (method) {
      case "FACIAL_AGE_ESTIMATION":
        return AgeAssuranceLevel.LEVEL_1_ESTIMATION;
      case "CREDIT_CARD_ASSURANCE":
      case "OPEN_BANKING_AGE_CHECK":
        return AgeAssuranceLevel.LEVEL_2_CARD_AVS;
      case "ID_DOCUMENT_KYC":
        return AgeAssuranceLevel.LEVEL_3_DOCUMENT_LIVENESS;
      case "GOVERNMENT_EID":
        return AgeAssuranceLevel.LEVEL_4_GOVERNMENT_EID;
      default:
        return AgeAssuranceLevel.LEVEL_2_CARD_AVS;
    }
  }
}
