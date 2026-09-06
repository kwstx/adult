/**
 * ============================================================================
 * UNIFIED MODERATION SERVICE FACADE
 * ============================================================================
 */

import prisma from "@/lib/db";
import { CaseService } from "./case.service";
import { EnforcementService } from "./enforcement.service";
import { AutomatedSignalsService } from "./automated-signals.service";
import { AuditService } from "./audit.service";
import { ReportCategory, ReportedObjectType } from "./types";

export interface ModerationReportInput {
  reporterId: string;
  targetUserId?: string;
  targetCreatorProfileId?: string;
  targetContentId?: string;
  targetStreamId?: string;
  targetMessageId?: string;
  category: "UNDERAGE_SUSPICION" | "NON_CONSENSUAL_CONTENT" | "HARASSMENT_ABUSE" | "VIOLENCE_THREATS" | "COPYRIGHT_INFRINGEMENT" | "FINANCIAL_FRAUD" | "SPAM_SCAM" | "OTHER";
  notes: string;
  evidenceUrls?: string[];
}

export class ModerationService {
  /**
   * Filter and sanitize live chat message with real-time NLP safety scoring.
   */
  static sanitizeChatMessage(text: string): { cleanText: string; isFlagged: boolean; policyRiskScore: number } {
    const textSignal = AutomatedSignalsService.evaluateTextSafety(text);
    let cleanText = text;

    for (const kw of textSignal.flaggedKeywords) {
      const regex = new RegExp(`\\b${kw}\\b`, "gi");
      cleanText = cleanText.replace(regex, "****");
    }

    return {
      cleanText,
      isFlagged: textSignal.flaggedKeywords.length > 0 || textSignal.toxicityScore > 0.5,
      policyRiskScore: textSignal.toxicityScore,
    };
  }

  /**
   * File a user or content safety report, create a linked moderation case, and record audit trail.
   */
  static async submitReport(input: ModerationReportInput) {
    const evidenceUrlsJson = input.evidenceUrls ? JSON.stringify(input.evidenceUrls) : null;

    const report = await prisma.report.create({
      data: {
        reporterId: input.reporterId,
        reportedUserId: input.targetUserId || null,
        reportedCreatorProfileId: input.targetCreatorProfileId || null,
        reportedContentId: input.targetContentId || null,
        reportedLivestreamId: input.targetStreamId || null,
        reportedMessageId: input.targetMessageId || null,
        category: (input.category as ReportCategory) || "OTHER",
        description: input.notes || "Report filed by user",
        evidenceUrls: evidenceUrlsJson,
        status: "OPEN",
      },
    });

    let reportedObjectType: ReportedObjectType = "ACCOUNT";
    let reportedObjectId = input.targetUserId || input.reporterId;

    if (input.targetContentId) {
      reportedObjectType = "CONTENT";
      reportedObjectId = input.targetContentId;
    } else if (input.targetCreatorProfileId) {
      reportedObjectType = "CREATOR";
      reportedObjectId = input.targetCreatorProfileId;
    } else if (input.targetStreamId) {
      reportedObjectType = "LIVESTREAM";
      reportedObjectId = input.targetStreamId;
    } else if (input.targetMessageId) {
      reportedObjectType = "MESSAGE";
      reportedObjectId = input.targetMessageId;
    }

    const modCase = await CaseService.createCase(
      {
        sourceReportId: report.id,
        reportedObjectType,
        reportedObjectId,
        reporterId: input.reporterId,
        reporterType: "USER",
        reasonCategory: (input.category as ReportCategory) || "OTHER",
        reason: input.notes,
        evidenceItems: input.evidenceUrls
          ? input.evidenceUrls.map((url, idx) => ({
              id: `ev-${report.id}-${idx}`,
              type: "URL_LINK",
              url,
              capturedAt: new Date().toISOString(),
            }))
          : undefined,
      },
      {
        actorId: input.reporterId,
        actorType: "USER",
      }
    );

    return {
      report,
      case: modCase,
    };
  }

  /**
   * Creator or Mod bans/kicks a user from a live room.
   */
  static async banUserFromRoom(creatorProfileId: string, targetUserId: string, reason: string = "Room rule violation") {
    return await EnforcementService.kickUserFromRoom(creatorProfileId, targetUserId, reason, {
      actorType: "MODERATOR",
    });
  }
}
