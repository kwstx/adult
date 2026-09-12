// ============================================================================
// AUTHORITATIVE JOINT 2257 COMPLIANCE & CONSENT SERVICE
// 18 U.S.C. § 2257 Co-Performer Records, Mutual Digital Consent & Eligibility
// ============================================================================

import prisma from "@/lib/db";
import { ApiError } from "@/lib/api-handler";
import { CreatorPermissionsGuard } from "@/modules/creator-verification/creator-permissions.guard";

export interface CoPerformerComplianceStatus {
  creatorProfileId: string;
  stageName: string;
  is2257Approved: boolean;
  kycStatus: string;
  hasApprovedConsent: boolean;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  verifiedAt: Date | null;
  missingRequirements: string[];
}

export class JointComplianceService {
  /**
   * 1. Validate 18 U.S.C. § 2257 Compliance for a Set of Co-Creators
   */
  public static async validateCoCreatorsCompliance(
    creatorProfileIds: string[]
  ): Promise<{ allCompliant: boolean; details: CoPerformerComplianceStatus[] }> {
    const details: CoPerformerComplianceStatus[] = [];
    let allCompliant = true;

    for (const profileId of creatorProfileIds) {
      let creator: any = null;
      try {
        creator = await prisma.creatorProfile.findUnique({
          where: { id: profileId },
          include: {
            user: true,
            verifications: {
              where: { verificationStatus: "APPROVED" },
              orderBy: { verifiedAt: "desc" },
              take: 1,
            },
          },
        });
      } catch {
        creator = null;
      }

      if (!creator) {
        allCompliant = false;
        details.push({
          creatorProfileId: profileId,
          stageName: "Unknown",
          is2257Approved: false,
          kycStatus: "UNVERIFIED",
          hasApprovedConsent: false,
          approvalStatus: "PENDING",
          verifiedAt: null,
          missingRequirements: ["Creator profile does not exist"],
        });
        continue;
      }

      const missingRequirements: string[] = [];
      const has2257 = creator.verifications.length > 0;
      const isMonetizationEnabled = creator.moderationState === "MONETIZATION_ENABLED";
      const isNotBanned = !creator.user.isBanned && creator.user.isActive;

      if (!has2257) {
        missingRequirements.push("18 U.S.C. § 2257 government ID and age verification record missing or unapproved");
      }
      if (!isMonetizationEnabled) {
        missingRequirements.push(`Monetization must be approved (current: ${creator.moderationState})`);
      }
      if (!isNotBanned) {
        missingRequirements.push("Account is suspended or banned");
      }

      const isCompliant = missingRequirements.length === 0;
      if (!isCompliant) allCompliant = false;

      details.push({
        creatorProfileId: creator.id,
        stageName: creator.stageName || creator.user.displayName,
        is2257Approved: has2257,
        kycStatus: creator.user.kycStatus,
        hasApprovedConsent: false,
        approvalStatus: "PENDING",
        verifiedAt: creator.verifications[0]?.verifiedAt || null,
        missingRequirements,
      });
    }

    return { allCompliant, details };
  }

  /**
   * 2. Co-Creator Formally Signs 2257 Digital Consent for Joint PPV Asset
   */
  public static async approveJointProductConsent(params: {
    jointProductId: string;
    coCreatorProfileId: string;
    signedConsentText?: string;
  }) {
    const { jointProductId, coCreatorProfileId, signedConsentText } = params;

    // Verify co-creator's 2257 compliance before permitting consent signing
    const compliance = await this.validateCoCreatorsCompliance([coCreatorProfileId]);
    if (!compliance.allCompliant) {
      throw new ApiError(
        403,
        `Cannot sign 2257 consent: Creator is not compliant. Reasons: ${compliance.details[0].missingRequirements.join(", ")}`,
        "COMPLIANCE_REQUIREMENTS_NOT_MET"
      );
    }

    const coCreatorRecord = await prisma.jointProductCoCreator.findUnique({
      where: {
        jointProductId_creatorProfileId: {
          jointProductId,
          creatorProfileId: coCreatorProfileId,
        },
      },
    });

    if (!coCreatorRecord) {
      throw new ApiError(404, "You are not listed as a co-creator on this joint product.", "NOT_A_CO_CREATOR");
    }

    const updated = await prisma.jointProductCoCreator.update({
      where: { id: coCreatorRecord.id },
      data: {
        approvalStatus: "APPROVED",
        is2257Verified: true,
        approvedAt: new Date(),
      },
    });

    // Check if ALL co-creators have now approved; if so, update JointProduct 2257 compliance flag
    const allCoCreators = await prisma.jointProductCoCreator.findMany({
      where: { jointProductId },
    });

    const allApproved = allCoCreators.every((c) => c.approvalStatus === "APPROVED" && c.is2257Verified);
    if (allApproved) {
      await prisma.jointProduct.update({
        where: { id: jointProductId },
        data: { is2257Compliant: true },
      });
    }

    return updated;
  }

  /**
   * 3. Co-Host Formally Signs 2257 Digital Consent for Joint Ticketed Event
   */
  public static async approveJointEventConsent(params: {
    jointEventId: string;
    coHostProfileId: string;
  }) {
    const { jointEventId, coHostProfileId } = params;

    const compliance = await this.validateCoCreatorsCompliance([coHostProfileId]);
    if (!compliance.allCompliant) {
      throw new ApiError(
        403,
        `Cannot sign event consent: Co-host is not 2257 compliant. Reasons: ${compliance.details[0].missingRequirements.join(", ")}`,
        "COMPLIANCE_REQUIREMENTS_NOT_MET"
      );
    }

    const coHostRecord = await prisma.jointEventCoHost.findUnique({
      where: {
        jointEventId_creatorProfileId: {
          jointEventId,
          creatorProfileId: coHostProfileId,
        },
      },
    });

    if (!coHostRecord) {
      throw new ApiError(404, "You are not listed as a co-host on this joint event.", "NOT_A_CO_HOST");
    }

    const updated = await prisma.jointEventCoHost.update({
      where: { id: coHostRecord.id },
      data: {
        approvalStatus: "APPROVED",
        is2257Verified: true,
        approvedAt: new Date(),
      },
    });

    // Check if all co-hosts have approved
    const allCoHosts = await prisma.jointEventCoHost.findMany({
      where: { jointEventId },
    });

    const allApproved = allCoHosts.every((h) => h.approvalStatus === "APPROVED" && h.is2257Verified);
    if (allApproved) {
      await prisma.jointEvent.update({
        where: { id: jointEventId },
        data: { is2257Compliant: true },
      });
    }

    return updated;
  }

  /**
   * 4. Asserts Joint Product is 100% 2257 Compliant before Publication / Monetization
   */
  public static async assertJointProductReadyForPublish(jointProductId: string) {
    const product = await prisma.jointProduct.findUnique({
      where: { id: jointProductId },
      include: {
        coCreators: {
          include: {
            creatorProfile: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new ApiError(404, "Joint product not found.", "PRODUCT_NOT_FOUND");
    }

    const unapproved = product.coCreators.filter((c) => c.approvalStatus !== "APPROVED" || !c.is2257Verified);
    if (unapproved.length > 0) {
      const names = unapproved.map((u) => u.creatorProfile.stageName || u.creatorProfile.user.displayName).join(", ");
      throw new ApiError(
        403,
        `Cannot publish or monetize Joint PPV: 18 U.S.C. § 2257 co-performer consent records are pending for: [${names}]. All appearing creators must sign 2257 verification.`,
        "PENDING_2257_CO_PERFORMER_APPROVAL"
      );
    }

    // Verify split percentages sum to exactly 1.0 (100%)
    const splitSum = product.coCreators.reduce((sum, c) => sum + Number(c.revenueSplitPercentage), 0);
    if (Math.abs(Number(splitSum.toFixed(2)) - 1.0) > 0.001) {
      throw new ApiError(
        400,
        `Revenue split matrix must sum to 100%. Current sum: ${(splitSum * 100).toFixed(1)}%`,
        "INVALID_SPLIT_MATRIX"
      );
    }

    return true;
  }

  /**
   * 5. Asserts Joint Event is 100% 2257 Compliant before Broadcast Launch
   */
  public static async assertJointEventReadyForPublish(jointEventId: string) {
    const event = await prisma.jointEvent.findUnique({
      where: { id: jointEventId },
      include: {
        coHosts: {
          include: {
            creatorProfile: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!event) {
      throw new ApiError(404, "Joint event not found.", "EVENT_NOT_FOUND");
    }

    const unapproved = event.coHosts.filter((h) => h.approvalStatus !== "APPROVED" || !h.is2257Verified);
    if (unapproved.length > 0) {
      const names = unapproved.map((u) => u.creatorProfile.stageName || u.creatorProfile.user.displayName).join(", ");
      throw new ApiError(
        403,
        `Cannot launch Joint Event: 18 U.S.C. § 2257 co-host consent records are pending for: [${names}]. All appearing co-hosts must sign 2257 verification.`,
        "PENDING_2257_CO_HOST_APPROVAL"
      );
    }

    const splitSum = event.coHosts.reduce((sum, h) => sum + Number(h.revenueSplitPercentage), 0);
    if (Math.abs(Number(splitSum.toFixed(2)) - 1.0) > 0.001) {
      throw new ApiError(
        400,
        `Event split matrix must sum to 100%. Current sum: ${(splitSum * 100).toFixed(1)}%`,
        "INVALID_SPLIT_MATRIX"
      );
    }

    return true;
  }
}
