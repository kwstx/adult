/**
 * ============================================================================
 * AUTHORITATIVE MODERATION CASE & APPEAL MANAGEMENT ENGINE
 * ============================================================================
 * 
 * Core Requirement:
 * The moderation system creates cases.
 * A case contains:
 * - Reported object
 * - Reporter
 * - Reason
 * - Evidence
 * - Automated signals
 * - Reviewer
 * - Decision
 * - Decision time
 * - Appeal status
 * 
 * Everything important gets an audit event.
 */

import * as crypto from "crypto";
import prisma from "@/lib/db";

import {
  CreateCaseInput,
  RenderDecisionInput,
  SubmitAppealInput,
  ReviewAppealInput,
  SecurityContext,
  AutomatedSignals,
  EvidenceItem,
} from "./types";
import { AutomatedSignalsService } from "./automated-signals.service";
import { AuditService } from "./audit.service";
import { ContentModerationService } from "./content-moderation.service";
import { AccountModerationService } from "./account-moderation.service";
import { CreatorModerationService } from "./creator-moderation.service";

export class CaseService {
  /**
   * Generates a unique, standardized Case Reference Number: CASE-YYYY-XXXXXX
   */
  private static generateCaseNumber(): string {
    const year = new Date().getFullYear();
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `CASE-${year}-${randomHex}`;
  }

  /**
   * Create a new authoritative Moderation Case with automated signal enrichment and evidence vaulting.
   */
  static async createCase(input: CreateCaseInput, context?: SecurityContext) {
    const caseNumber = this.generateCaseNumber();

    // 1. Resolve polymorphic foreign keys
    let contentId: string | null = null;
    let userId: string | null = null;
    let creatorProfileId: string | null = null;

    if (input.reportedObjectType === "CONTENT") {
      contentId = input.reportedObjectId;
    } else if (input.reportedObjectType === "ACCOUNT") {
      userId = input.reportedObjectId;
    } else if (input.reportedObjectType === "CREATOR") {
      creatorProfileId = input.reportedObjectId;
    }

    // 2. Generate multi-layer automated signals if not already provided
    let signals: AutomatedSignals;
    if (input.automatedSignals && input.automatedSignals.compositeRiskScore !== undefined) {
      signals = input.automatedSignals as AutomatedSignals;
    } else {
      signals = await AutomatedSignalsService.generateSignals({
        category: input.reasonCategory,
        description: input.reason,
        reportedObjectId: input.reportedObjectId,
        targetUserId: userId || undefined,
        reporterId: input.reporterId,
      });
    }

    const priority = input.priority || signals.recommendedPriority;
    const evidenceJson = input.evidenceItems ? JSON.stringify(input.evidenceItems) : null;
    const automatedSignalsJson = JSON.stringify(signals);

    // 3. Persist Moderation Case
    const moderationCase = await prisma.moderationCase.create({
      data: {
        caseNumber,
        sourceReportId: input.sourceReportId || null,
        reportedObjectType: input.reportedObjectType,
        reportedObjectId: input.reportedObjectId,
        reportedContentId: contentId,
        reportedUserId: userId,
        reportedCreatorProfileId: creatorProfileId,
        reporterId: input.reporterId || null,
        reporterType: input.reporterType || "USER",
        reasonCategory: input.reasonCategory,
        reason: input.reason,
        evidence: evidenceJson,
        automatedSignals: automatedSignalsJson,
        priority,
        status: "OPEN",
        appealStatus: "NONE",
      },
      include: {
        reportedContent: true,
        reportedUser: true,
        reportedCreatorProfile: true,
        reporter: {
          select: { id: true, username: true, displayName: true },
        },
      },
    });

    // 4. Authoritative Audit Event
    await AuditService.logEvent(
      {
        action: "MODERATION_CASE_CREATED",
        targetEntityType: "ModerationCase",
        targetEntityId: moderationCase.id,
        newState: "OPEN",
        reason: `Case created for ${input.reportedObjectType}:${input.reportedObjectId}`,
        metadata: {
          caseNumber: moderationCase.caseNumber,
          priority: moderationCase.priority,
          reasonCategory: moderationCase.reasonCategory,
          compositeRiskScore: signals.compositeRiskScore,
        },
      },
      context
    );

    // 5. Emergency Auto-Containment for Critical Zero-Tolerance Violations
    if (priority === "CRITICAL_URGENT_UNDERAGE") {
      if (input.reportedObjectType === "CONTENT" && contentId) {
        await ContentModerationService.transitionState(
          contentId,
          "REMOVED",
          "Immediate Auto-Quarantine: Critical Underage/Safety Risk Detected",
          { actorType: "SYSTEM_AUTOMATION" }
        );
      } else if (input.reportedObjectType === "ACCOUNT" && userId) {
        await AccountModerationService.transitionState(
          userId,
          "SUSPENDED",
          "Immediate Auto-Quarantine: Critical Safety Investigation",
          { actorType: "SYSTEM_AUTOMATION" }
        );
      }
    }

    return moderationCase;
  }

  /**
   * Assign a reviewer/moderator to investigate a case.
   */
  static async assignReviewer(
    caseId: string,
    reviewerId: string,
    context?: SecurityContext
  ) {
    const moderationCase = await prisma.moderationCase.findUnique({
      where: { id: caseId },
    });

    if (!moderationCase) {
      throw new Error(`Moderation case with ID ${caseId} not found.`);
    }

    const updatedCase = await prisma.moderationCase.update({
      where: { id: caseId },
      data: {
        reviewerId,
        status: "INVESTIGATING",
      },
      include: {
        reviewer: {
          select: { id: true, username: true, displayName: true, role: true },
        },
      },
    });

    await AuditService.logEvent(
      {
        action: "MODERATION_CASE_ASSIGNED",
        targetEntityType: "ModerationCase",
        targetEntityId: caseId,
        oldState: moderationCase.status,
        newState: "INVESTIGATING",
        reason: `Assigned to reviewer ${reviewerId}`,
        metadata: {
          caseNumber: moderationCase.caseNumber,
          reviewerId,
        },
      },
      context
    );

    return updatedCase;
  }

  /**
   * Authoritatively render and execute a moderation decision on a case.
   */
  static async renderDecision(
    input: RenderDecisionInput,
    context?: SecurityContext
  ) {
    const moderationCase = await prisma.moderationCase.findUnique({
      where: { id: input.caseId },
      include: {
        reportedContent: true,
        reportedUser: true,
        reportedCreatorProfile: true,
      },
    });

    if (!moderationCase) {
      throw new Error(`Moderation case with ID ${input.caseId} not found.`);
    }

    const decisionTime = new Date();

    // 1. Execute state transitions on target object based on decision
    if (moderationCase.reportedObjectType === "CONTENT" && moderationCase.reportedObjectId) {
      if (input.decision === "APPROVED" || input.decisionAction === "NONE") {
        await ContentModerationService.transitionState(
          moderationCase.reportedObjectId,
          "APPROVED",
          input.decisionNotes || "Moderator Approved Content",
          context
        );
      } else if (input.decision === "RESTRICTED") {
        await ContentModerationService.transitionState(
          moderationCase.reportedObjectId,
          "RESTRICTED",
          input.decisionNotes || "Content Restricted",
          context
        );
      } else if (input.decision === "REMOVED" || input.decisionAction === "PERMANENT_BAN") {
        await ContentModerationService.transitionState(
          moderationCase.reportedObjectId,
          "REMOVED",
          input.decisionNotes || "Content Removed for Policy Violations",
          context
        );
      } else if (input.decision === "REJECTED") {
        await ContentModerationService.transitionState(
          moderationCase.reportedObjectId,
          "REJECTED",
          input.decisionNotes || "Content Rejected",
          context
        );
      }
    } else if (moderationCase.reportedObjectType === "ACCOUNT" && moderationCase.reportedObjectId) {
      if (input.decision === "ACTIVE" || input.decisionAction === "NONE") {
        await AccountModerationService.transitionState(
          moderationCase.reportedObjectId,
          "ACTIVE",
          input.decisionNotes || "Account Cleared by Moderator",
          context
        );
      } else if (input.decision === "RESTRICTED" || input.decisionAction === "WARNING_MESSAGE") {
        await AccountModerationService.transitionState(
          moderationCase.reportedObjectId,
          "RESTRICTED",
          input.decisionNotes || "Account Privileges Restricted",
          context
        );
      } else if (input.decision === "SUSPENDED" || input.decisionAction === "TEMPORARY_SUSPENSION") {
        await AccountModerationService.transitionState(
          moderationCase.reportedObjectId,
          "SUSPENDED",
          input.decisionNotes || "Account Temporarily Suspended",
          context,
          input.actionDurationHours || 24
        );
      } else if (input.decision === "BANNED" || input.decisionAction === "PERMANENT_BAN") {
        await AccountModerationService.transitionState(
          moderationCase.reportedObjectId,
          "BANNED",
          input.decisionNotes || "Account Permanently Banned",
          context
        );
      }
    } else if (moderationCase.reportedObjectType === "CREATOR" && moderationCase.reportedObjectId) {
      if (input.decision === "VERIFIED") {
        await CreatorModerationService.transitionState(
          moderationCase.reportedObjectId,
          "VERIFIED",
          input.decisionNotes || "Creator Verified",
          context
        );
      } else if (input.decision === "MONETIZATION_ENABLED") {
        await CreatorModerationService.transitionState(
          moderationCase.reportedObjectId,
          "MONETIZATION_ENABLED",
          input.decisionNotes || "Creator Monetization Approved",
          context
        );
      } else if (input.decision === "RESTRICTED") {
        await CreatorModerationService.transitionState(
          moderationCase.reportedObjectId,
          "RESTRICTED",
          input.decisionNotes || "Creator Restricted",
          context
        );
      } else if (input.decision === "SUSPENDED") {
        await CreatorModerationService.transitionState(
          moderationCase.reportedObjectId,
          "SUSPENDED",
          input.decisionNotes || "Creator Suspended",
          context
        );
      }
    }

    // 2. Update Moderation Case with decision & appeal eligibility
    const updatedCase = await prisma.moderationCase.update({
      where: { id: input.caseId },
      data: {
        reviewerId: input.reviewerId,
        decision: input.decision,
        actionTaken: input.decisionAction,
        decisionNotes: input.decisionNotes,
        decisionTime,
        actionDurationHours: input.actionDurationHours || null,
        status: "CLOSED_RESOLVED",
        resolvedAt: decisionTime,
        appealStatus: "NONE", // Fresh decision ready for potential appeal
      },
    });

    // 3. Resolve source report if present
    if (moderationCase.sourceReportId) {
      await prisma.report.update({
        where: { id: moderationCase.sourceReportId },
        data: {
          status: input.decisionAction === "NONE" ? "RESOLVED_DISMISSED" : "ACTION_TAKEN",
          resolvedAt: decisionTime,
          assignedModeratorId: input.reviewerId,
          moderatorNotes: input.decisionNotes,
        },
      });
    }

    // 4. Authoritative Audit Event
    await AuditService.logEvent(
      {
        action: "MODERATION_CASE_DECIDED",
        targetEntityType: "ModerationCase",
        targetEntityId: moderationCase.id,
        oldState: moderationCase.status,
        newState: "CLOSED_RESOLVED",
        reason: input.decisionNotes,
        actorId: input.reviewerId,
        actorType: context?.actorType || "MODERATOR",
        metadata: {
          caseNumber: moderationCase.caseNumber,
          decision: input.decision,
          decisionAction: input.decisionAction,
          decisionTime: decisionTime.toISOString(),
          policyViolations: input.policyViolations || [],
        },
      },
      context
    );

    return updatedCase;
  }

  /**
   * Submit an appeal against an adverse moderation decision.
   */
  static async submitAppeal(input: SubmitAppealInput, context?: SecurityContext) {
    const moderationCase = await prisma.moderationCase.findUnique({
      where: { id: input.caseId },
    });

    if (!moderationCase) {
      throw new Error(`Moderation case with ID ${input.caseId} not found.`);
    }

    if (moderationCase.appealStatus === "PENDING") {
      throw new Error("An appeal is already actively under review for this case.");
    }

    if (!moderationCase.decisionTime) {
      throw new Error("Cannot appeal a case that has not yet had a decision rendered.");
    }

    const appealEvidenceJson = input.appealEvidenceItems
      ? JSON.stringify(input.appealEvidenceItems)
      : null;

    // If target was Content, transition to APPEALED state
    if (moderationCase.reportedObjectType === "CONTENT" && moderationCase.reportedObjectId) {
      await ContentModerationService.transitionState(
        moderationCase.reportedObjectId,
        "APPEALED",
        `Formal appeal submitted: ${input.appealReason}`,
        context
      );
    }

    // Update Moderation Case
    const updatedCase = await prisma.moderationCase.update({
      where: { id: input.caseId },
      data: {
        appealStatus: "PENDING",
        appealReason: input.appealReason,
        appealEvidence: appealEvidenceJson,
        status: "INVESTIGATING", // Re-open for appeal review
      },
    });

    // Authoritative Audit Log
    await AuditService.logEvent(
      {
        action: "MODERATION_APPEAL_SUBMITTED",
        targetEntityType: "ModerationCase",
        targetEntityId: input.caseId,
        oldState: moderationCase.appealStatus,
        newState: "PENDING",
        reason: input.appealReason,
        actorId: input.appellantUserId,
        actorType: "USER",
        metadata: {
          caseNumber: moderationCase.caseNumber,
          submittedAt: new Date().toISOString(),
        },
      },
      context
    );

    return updatedCase;
  }

  /**
   * Review and resolve a submitted appeal.
   */
  static async reviewAppeal(input: ReviewAppealInput, context?: SecurityContext) {
    const moderationCase = await prisma.moderationCase.findUnique({
      where: { id: input.caseId },
    });

    if (!moderationCase) {
      throw new Error(`Moderation case with ID ${input.caseId} not found.`);
    }

    if (moderationCase.appealStatus !== "PENDING") {
      throw new Error("Case does not have an active pending appeal.");
    }

    const appealDecisionTime = new Date();
    const finalAppealStatus = input.overturnDecision ? "APPROVED" : "REJECTED";

    // 1. Execute restitution or uphold penalty
    if (moderationCase.reportedObjectType === "CONTENT" && moderationCase.reportedObjectId) {
      if (input.overturnDecision) {
        // Restore content to APPROVED
        await ContentModerationService.transitionState(
          moderationCase.reportedObjectId,
          "APPROVED",
          `Appeal Approved: ${input.decisionNotes}`,
          context
        );
      } else {
        // Uphold removal -> transition to REJECTED
        await ContentModerationService.transitionState(
          moderationCase.reportedObjectId,
          "REJECTED",
          `Appeal Denied (Upheld): ${input.decisionNotes}`,
          context
        );
      }
    } else if (moderationCase.reportedObjectType === "ACCOUNT" && moderationCase.reportedObjectId) {
      if (input.overturnDecision) {
        // Restore account to ACTIVE
        await AccountModerationService.transitionState(
          moderationCase.reportedObjectId,
          "ACTIVE",
          `Appeal Approved: ${input.decisionNotes}`,
          context
        );
      }
    } else if (moderationCase.reportedObjectType === "CREATOR" && moderationCase.reportedObjectId) {
      if (input.overturnDecision) {
        // Restore creator to MONETIZATION_ENABLED
        await CreatorModerationService.transitionState(
          moderationCase.reportedObjectId,
          "MONETIZATION_ENABLED",
          `Appeal Approved: ${input.decisionNotes}`,
          context
        );
      }
    }

    // 2. Update case record
    const updatedCase = await prisma.moderationCase.update({
      where: { id: input.caseId },
      data: {
        appealStatus: finalAppealStatus,
        appealReviewerId: input.reviewerId,
        appealDecisionTime,
        appealDecisionNotes: input.decisionNotes,
        status: "CLOSED_RESOLVED",
        resolvedAt: appealDecisionTime,
      },
    });

    // 3. Authoritative Audit Event
    await AuditService.logEvent(
      {
        action: "MODERATION_APPEAL_DECIDED",
        targetEntityType: "ModerationCase",
        targetEntityId: input.caseId,
        oldState: "PENDING",
        newState: finalAppealStatus,
        reason: input.decisionNotes,
        actorId: input.reviewerId,
        actorType: context?.actorType || "ADMIN",
        metadata: {
          caseNumber: moderationCase.caseNumber,
          overturned: input.overturnDecision,
          decisionTime: appealDecisionTime.toISOString(),
        },
      },
      context
    );

    return updatedCase;
  }

  /**
   * Fetch case details with full relations.
   */
  static async getCaseById(caseId: string) {
    return await prisma.moderationCase.findUnique({
      where: { id: caseId },
      include: {
        reportedContent: true,
        reportedUser: true,
        reportedCreatorProfile: true,
        reviewer: {
          select: { id: true, username: true, displayName: true, role: true },
        },
        reporter: {
          select: { id: true, username: true, displayName: true },
        },
        sourceReport: true,
      },
    });
  }

  /**
   * List moderation cases with filters.
   */
  static async listCases(params: {
    status?: string;
    priority?: string;
    reportedObjectType?: string;
    appealStatus?: string;
    reviewerId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.priority) where.priority = params.priority;
    if (params.reportedObjectType) where.reportedObjectType = params.reportedObjectType;
    if (params.appealStatus) where.appealStatus = params.appealStatus;
    if (params.reviewerId) where.reviewerId = params.reviewerId;

    const [total, cases] = await Promise.all([
      prisma.moderationCase.count({ where }),
      prisma.moderationCase.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: params.limit || 50,
        skip: params.offset || 0,
        include: {
          reviewer: {
            select: { id: true, username: true, displayName: true },
          },
          reporter: {
            select: { id: true, username: true, displayName: true },
          },
        },
      }),
    ]);

    return {
      total,
      limit: params.limit || 50,
      offset: params.offset || 0,
      cases,
    };
  }
}
