/**
 * ============================================================================
 * AUTHORITATIVE CREATOR MODERATION & ONBOARDING SERVICE
 * ============================================================================
 * 
 * Moderation States for Creators:
 * - Application
 * - Verification pending
 * - Verified
 * - Monetization enabled
 * - Restricted
 * - Suspended
 * 
 * Enforces 18+ age verification, 2257 records compliance approval, payout
 * clearance gates, livestream safety kill-switches, and audit trails.
 */

import prisma from "@/lib/db";
import {
  CreatorModerationState,
  CreatorMonetizationStatus,
  SecurityContext,
} from "./types";
import { CreatorStateMachine } from "./state-machine";
import { AuditService } from "./audit.service";
import { EnforcementService } from "./enforcement.service";

export class CreatorModerationService {
  /**
   * Authoritatively transition a creator profile to a new moderation state.
   */
  static async transitionState(
    creatorProfileId: string,
    targetState: CreatorModerationState,
    reason: string,
    context?: SecurityContext,
    metadata?: Record<string, unknown>
  ) {
    const creator = await prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      include: { user: true },
    });

    if (!creator) {
      throw new Error(`Creator profile with ID ${creatorProfileId} not found.`);
    }

    const currentState = creator.moderationState;

    // Validate transition via CreatorStateMachine
    CreatorStateMachine.validateTransition(currentState, targetState, context, reason);

    // Update Creator profile
    const updatedCreator = await prisma.creatorProfile.update({
      where: { id: creatorProfileId },
      data: {
        moderationState: targetState,
        // If suspended or restricted, turn off live status immediately
        isLive: targetState === "SUSPENDED" ? false : creator.isLive,
      },
    });

    // If Suspended, kill any active live stream immediately
    if (targetState === "SUSPENDED" && creator.isLive) {
      const activeLivestream = await prisma.livestream.findFirst({
        where: {
          creatorProfileId,
          status: "LIVE",
        },
      });

      if (activeLivestream) {
        await EnforcementService.terminateLivestream(
          activeLivestream.id,
          `Creator suspended: ${reason}`,
          context
        );
      }
    }

    // Authoritative Audit Log
    await AuditService.logStateTransition({
      targetEntityType: "CreatorProfile",
      targetEntityId: creatorProfileId,
      oldState: currentState,
      newState: targetState,
      reason,
      actionName: "CREATOR_MODERATION_STATE_CHANGE",
      context,
      metadata: {
        ...metadata,
        userId: creator.userId,
        stageName: creator.stageName,
      },
    });

    return updatedCreator;
  }

  /**
   * Evaluate whether a creator is authorized to go live and receive monetization.
   */
  static async evaluateMonetizationStatus(
    creatorProfileId: string
  ): Promise<CreatorMonetizationStatus> {
    const creator = await prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: {
        id: true,
        moderationState: true,
        verifications: {
          where: { verificationStatus: "APPROVED" },
          take: 1,
        },
      },
    });

    if (!creator) {
      return {
        canGoLive: false,
        canEarnCredits: false,
        canRequestPayout: false,
        monetizationState: "APPLICATION",
        restrictionReason: "Creator profile not found.",
      };
    }

    const hasApprovedKyc = creator.verifications.length > 0;

    switch (creator.moderationState) {
      case "MONETIZATION_ENABLED":
        return {
          canGoLive: true,
          canEarnCredits: true,
          canRequestPayout: true,
          monetizationState: "MONETIZATION_ENABLED",
        };

      case "VERIFIED":
        return {
          canGoLive: true,
          canEarnCredits: true,
          canRequestPayout: false, // Payout activation requires MONETIZATION_ENABLED
          monetizationState: "VERIFIED",
        };

      case "RESTRICTED":
        return {
          canGoLive: false,
          canEarnCredits: false,
          canRequestPayout: false,
          monetizationState: "RESTRICTED",
          restrictionReason: "Creator privileges restricted due to pending compliance inquiry.",
        };

      case "SUSPENDED":
        return {
          canGoLive: false,
          canEarnCredits: false,
          canRequestPayout: false,
          monetizationState: "SUSPENDED",
          restrictionReason: "Creator profile suspended for safety violations.",
        };

      case "VERIFICATION_PENDING":
        return {
          canGoLive: false,
          canEarnCredits: false,
          canRequestPayout: false,
          monetizationState: "VERIFICATION_PENDING",
          restrictionReason: "Creator 2257/KYC identity documents are currently under review.",
        };

      case "APPLICATION":
      default:
        return {
          canGoLive: false,
          canEarnCredits: false,
          canRequestPayout: false,
          monetizationState: "APPLICATION",
          restrictionReason: "Creator application has not yet completed verification submission.",
        };
    }
  }
}
