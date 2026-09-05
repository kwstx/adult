import prisma from "@/lib/db";
import { ModerationReportInput } from "./types";
import { eventBus } from "@/modules/realtime/event-bus";

const BLOCKED_WORDS = ["chargeback", "hacked", "underage", "minor", "scam"];

export class ModerationService {
  /**
   * Filter and sanitize live chat message. Throws or masks prohibited language.
   */
  static sanitizeChatMessage(text: string): { cleanText: string; isFlagged: boolean } {
    let cleanText = text;
    let isFlagged = false;

    for (const word of BLOCKED_WORDS) {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      if (regex.test(cleanText)) {
        cleanText = cleanText.replace(regex, "****");
        isFlagged = true;
      }
    }

    return { cleanText, isFlagged };
  }

  /**
   * File a user or content safety report.
   */
  static async submitReport(input: ModerationReportInput) {
    const report = await prisma.moderationReport.create({
      data: {
        reporterId: input.reporterId,
        targetUserId: input.targetUserId,
        targetStreamId: input.targetStreamId,
        category: input.category,
        notes: input.notes,
        status: "OPEN",
      },
    });

    return report;
  }

  /**
   * Creator or Mod bans a user from a live room.
   */
  static async banUserFromRoom(creatorId: string, targetUserId: string, targetUsername: string) {
    eventBus.publish(`room:${creatorId}`, {
      type: "MODERATION_ACTION",
      payload: {
        action: "BAN",
        targetUserId,
        targetUsername,
        message: `${targetUsername} has been banned from the room by moderator.`,
      },
    });

    return { success: true };
  }
}
