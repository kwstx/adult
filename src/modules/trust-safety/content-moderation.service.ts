/**
 * ============================================================================
 * AUTHORITATIVE CONTENT MODERATION SERVICE
 * ============================================================================
 * 
 * Moderation States for Content:
 * - Pending
 * - Approved
 * - Restricted
 * - Removed
 * - Appealed
 * - Rejected
 * 
 * Enforces authoritative state transitions, automated pre-screen scanning,
 * viewing access controls, blurred preview gating, and complete audit trails.
 */

import prisma from "@/lib/db";
import {
  ContentModerationState,
  ContentAccessResult,
  SecurityContext,
} from "./types";
import { ContentStateMachine } from "./state-machine";
import { AuditService } from "./audit.service";
import { AutomatedSignalsService } from "./automated-signals.service";

export class ContentModerationService {
  /**
   * Authoritatively transition a content object to a new moderation state.
   */
  static async transitionState(
    contentId: string,
    targetState: ContentModerationState,
    reason: string,
    context?: SecurityContext,
    metadata?: Record<string, unknown>
  ) {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: { creatorProfile: true },
    });

    if (!content) {
      throw new Error(`Content with ID ${contentId} does not exist.`);
    }

    const currentState = content.moderationState;

    // Validate state transition through formal state machine
    ContentStateMachine.validateTransition(currentState, targetState, context, reason);

    // Update Content in database
    const updatedContent = await prisma.content.update({
      where: { id: contentId },
      data: {
        moderationState: targetState,
        moderationReason: reason,
        moderatedAt: new Date(),
        // If content is removed or rejected, automatically unpublish from discovery feed
        isPublished: targetState === "APPROVED" || targetState === "RESTRICTED",
      },
    });

    // Authoritative Audit Event
    await AuditService.logStateTransition({
      targetEntityType: "Content",
      targetEntityId: contentId,
      oldState: currentState,
      newState: targetState,
      reason,
      actionName: "CONTENT_MODERATION_STATE_CHANGE",
      context,
      metadata: {
        ...metadata,
        creatorProfileId: content.creatorProfileId,
        title: content.title,
        contentType: content.contentType,
      },
    });

    return updatedContent;
  }

  /**
   * Submit new user-generated content for intake & automated moderation pre-screening.
   */
  static async intakeContent(params: {
    creatorProfileId: string;
    title: string;
    description?: string;
    mediaUrl: string;
    previewUrl?: string;
    contentType?: "PHOTO" | "VIDEO" | "AUDIO" | "ALBUM" | "POST" | "BUNDLE";
    accessLevel?: "PUBLIC" | "FOLLOWERS_ONLY" | "SUBSCRIBERS_ONLY" | "PPV_PURCHASE" | "TIER_VIP_ONLY";
    priceCredits?: number;
    context?: SecurityContext;
  }) {
    // 1. Initial State starts at PENDING
    const initialModerationState: ContentModerationState = "PENDING";

    const content = await prisma.content.create({
      data: {
        creatorProfileId: params.creatorProfileId,
        title: params.title,
        description: params.description,
        mediaUrl: params.mediaUrl,
        previewUrl: params.previewUrl,
        contentType: params.contentType || "VIDEO",
        accessLevel: params.accessLevel || "PPV_PURCHASE",
        priceCredits: params.priceCredits || 0,
        moderationState: initialModerationState,
        isPublished: false, // Hidden until approved
      },
    });

    // 2. Audit initial creation
    await AuditService.logEvent(
      {
        action: "CONTENT_CREATED_PENDING",
        targetEntityType: "Content",
        targetEntityId: content.id,
        newState: initialModerationState,
        reason: "Content submitted for safety moderation pre-screening",
        metadata: {
          creatorProfileId: params.creatorProfileId,
          contentType: params.contentType,
        },
      },
      params.context
    );

    // 3. Run Automated Signals
    const signals = await AutomatedSignalsService.generateSignals({
      category: "OTHER",
      description: `${params.title} ${params.description || ""}`,
      mediaUrl: params.mediaUrl,
      previewUrl: params.previewUrl,
      reportedObjectId: content.id,
    });

    // 4. Automated Decision Pipeline
    if (signals.compositeRiskScore >= 90) {
      // Auto-quarantine to REMOVED
      await this.transitionState(
        content.id,
        "REMOVED",
        `Automated Zero-Tolerance Safety Block: ${signals.triggeredPolicyCodes.join(", ")}`,
        { actorType: "SYSTEM_AUTOMATION" },
        { signals }
      );
    } else if (signals.compositeRiskScore >= 60) {
      // Auto-quarantine to RESTRICTED pending human review
      await this.transitionState(
        content.id,
        "RESTRICTED",
        `High risk score (${signals.compositeRiskScore}) detected: ${signals.triggeredPolicyCodes.join(", ")}`,
        { actorType: "SYSTEM_AUTOMATION" },
        { signals }
      );
    } else {
      // Low risk - Auto-Approve to APPROVED
      await this.transitionState(
        content.id,
        "APPROVED",
        "Automated AI Safety Screening Cleared",
        { actorType: "SYSTEM_AUTOMATION" },
        { signals }
      );
    }

    return await prisma.content.findUnique({ where: { id: content.id } });
  }

  /**
   * Authoritative Access Guard: Determines whether a user is allowed to access/view content.
   */
  static evaluateAccess(
    content: {
      id: string;
      creatorProfileId: string;
      moderationState: ContentModerationState;
      accessLevel: string;
      isPublished: boolean;
    },
    viewer?: {
      userId?: string;
      role?: string;
      isCreatorOwner?: boolean;
    }
  ): ContentAccessResult {
    const isPrivileged = viewer?.role === "ADMIN" || viewer?.role === "MODERATOR";
    const isOwner = viewer?.isCreatorOwner;

    // Admins and Content Owners can always view regardless of state
    if (isPrivileged || isOwner) {
      return {
        isAccessible: true,
        requiresAgeGate: false,
        isBlurredPreview: false,
        moderationState: content.moderationState,
      };
    }

    switch (content.moderationState) {
      case "APPROVED":
        return {
          isAccessible: true,
          requiresAgeGate: true,
          isBlurredPreview: false,
          moderationState: "APPROVED",
        };

      case "RESTRICTED":
        return {
          isAccessible: true,
          requiresAgeGate: true,
          isBlurredPreview: true, // Preview is blurred / gated
          moderationState: "RESTRICTED",
        };

      case "PENDING":
        return {
          isAccessible: false,
          requiresAgeGate: true,
          isBlurredPreview: true,
          rejectionReason: "Content is currently pending Trust & Safety review.",
          moderationState: "PENDING",
        };

      case "APPEALED":
        return {
          isAccessible: false,
          requiresAgeGate: true,
          isBlurredPreview: true,
          rejectionReason: "Content is currently under appeal review.",
          moderationState: "APPEALED",
        };

      case "REMOVED":
        return {
          isAccessible: false,
          requiresAgeGate: false,
          isBlurredPreview: false,
          rejectionReason: "Content has been removed for policy violations.",
          moderationState: "REMOVED",
        };

      case "REJECTED":
        return {
          isAccessible: false,
          requiresAgeGate: false,
          isBlurredPreview: false,
          rejectionReason: "Content was rejected during moderation.",
          moderationState: "REJECTED",
        };

      default:
        return {
          isAccessible: false,
          requiresAgeGate: false,
          isBlurredPreview: false,
          rejectionReason: "Content unavailable.",
          moderationState: "REJECTED",
        };
    }
  }
}
