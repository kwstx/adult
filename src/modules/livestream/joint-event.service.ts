// ============================================================================
// AUTHORITATIVE JOINT EVENT MANAGEMENT SERVICE
// Co-Hosted Event Scheduling, Cross-Follower Reminders & Access Control Gate
// ============================================================================

import prisma from "@/lib/db";
import { ApiError } from "@/lib/api-handler";
import { eventBus } from "@/modules/realtime/event-bus";
import { NotificationService } from "@/modules/notifications/notification.service";
import { JointComplianceService } from "@/modules/content/joint-compliance.service";
import { sfuMediaAdapter } from "./sfu-media.adapter";

export interface CreateJointEventInput {
  primaryHostId: string;
  title: string;
  description?: string;
  ticketPriceCredits: number;
  coverImageUrl?: string;
  scheduledStartAt: Date;
  scheduledEndAt?: Date;
  coHosts: Array<{
    creatorProfileId: string;
    role?: "CO_HOST" | "SPECIAL_GUEST";
    splitPercentage: number;
  }>;
}

export class JointEventService {
  /**
   * 1. Schedule a New Joint Co-Hosted Event
   */
  public static async createJointEvent(input: CreateJointEventInput) {
    const {
      primaryHostId,
      title,
      description,
      ticketPriceCredits,
      coverImageUrl,
      scheduledStartAt,
      scheduledEndAt,
      coHosts,
    } = input;

    // Validate all creator IDs
    const allCreatorIds = [primaryHostId, ...coHosts.map((h) => h.creatorProfileId)];
    const compliance = await JointComplianceService.validateCoCreatorsCompliance(allCreatorIds);

    if (!compliance.allCompliant) {
      const nonCompliant = compliance.details.filter((d) => !d.is2257Approved);
      throw new ApiError(
        403,
        `Cannot create joint event: Some creators lack approved 18 U.S.C. § 2257 records: ${nonCompliant.map((n) => n.stageName).join(", ")}`,
        "COMPLIANCE_2257_REQUIRED"
      );
    }

    // Validate split percentages sum to exactly 1.00 (100%)
    const hostSplit = 1.0 - coHosts.reduce((sum, h) => sum + h.splitPercentage, 0);
    if (hostSplit <= 0) {
      throw new ApiError(400, "Co-host split percentages exceed 100%. Host must have a positive share.", "INVALID_SPLIT_PERCENTAGE");
    }

    const event = await prisma.$transaction(async (tx: any) => {
      const newEvent = await tx.jointEvent.create({
        data: {
          primaryHostId,
          title,
          description,
          ticketPriceCredits,
          coverImageUrl,
          scheduledStartAt,
          scheduledEndAt,
          status: "SCHEDULED",
          platformRakePercentage: 0.20,
        },
      });

      // Add primary host
      await tx.jointEventCoHost.create({
        data: {
          jointEventId: newEvent.id,
          creatorProfileId: primaryHostId,
          role: "PRIMARY_HOST",
          revenueSplitPercentage: Number(hostSplit.toFixed(2)),
          approvalStatus: "APPROVED",
          is2257Verified: true,
          approvedAt: new Date(),
        },
      });

      // Add co-hosts
      for (const host of coHosts) {
        await tx.jointEventCoHost.create({
          data: {
            jointEventId: newEvent.id,
            creatorProfileId: host.creatorProfileId,
            role: host.role || "CO_HOST",
            revenueSplitPercentage: host.splitPercentage,
            approvalStatus: "PENDING",
            is2257Verified: false,
          },
        });
      }

      return newEvent;
    });

    // Notify co-hosts
    for (const host of coHosts) {
      eventBus.publish(`creator:${host.creatorProfileId}`, {
        type: "CO_STREAM_INVITATION",
        payload: {
          jointEventId: event.id,
          title,
          scheduledStartAt: scheduledStartAt.toISOString(),
          offeredSplitPercentage: host.splitPercentage,
        },
      });
    }

    return event;
  }

  /**
   * 2. Synchronized Reminders to Followers of ALL Participating Creators
   */
  public static async dispatchCrossFollowerReminders(
    jointEventId: string,
    reminderType: "30_MIN" | "5_MIN" | "LIVE_NOW"
  ) {
    const event = await prisma.jointEvent.findUnique({
      where: { id: jointEventId },
      include: {
        primaryHost: { include: { user: true } },
        coHosts: { include: { creatorProfile: { include: { user: true } } } },
      },
    });

    if (!event) return;

    const coHostNames = event.coHosts.map((h: any) => h.creatorProfile.stageName || h.creatorProfile.user.displayName).join(" & ");

    let messageTitle = `Upcoming Event: ${event.title}`;
    let messageBody = `Co-hosted by ${coHostNames}. Starting soon!`;

    if (reminderType === "30_MIN") {
      messageBody = `Starting in 30 minutes! Live co-hosted event by ${coHostNames}.`;
    } else if (reminderType === "5_MIN") {
      messageBody = `Starting in 5 minutes! Grab your pass for ${event.title}.`;
    } else if (reminderType === "LIVE_NOW") {
      messageTitle = `🔴 LIVE NOW: ${event.title}`;
      messageBody = `The live event with ${coHostNames} has started!`;
    }

    // Fan-out notifications to followers of each creator asynchronously
    for (const coHost of event.coHosts) {
      NotificationService.notifyCreatorWentLive({
        creatorProfileId: coHost.creatorProfileId,
        streamTitle: `[Joint Event] ${event.title}`,
        stageName: coHost.creatorProfile.stageName || coHost.creatorProfile.user.displayName,
        avatarUrl: coHost.creatorProfile.user.avatarUrl || undefined,
      }).catch((err) => console.error("[JointEventService] Reminder error:", err));
    }

    eventBus.publish(`event:${jointEventId}`, {
      type: "ROOM_STATUS",
      payload: {
        jointEventId,
        reminderType,
        messageTitle,
        messageBody,
      },
    });

    return { success: true, reminderType };
  }

  /**
   * 3. Authoritative Access Control Gate for Live Joint Event Room
   */
  public static async verifyEventAccess(params: {
    jointEventId: string;
    viewerUserId?: string;
  }): Promise<{ hasAccess: boolean; isHost: boolean; reason?: string; playbackToken?: string }> {
    const { jointEventId, viewerUserId } = params;

    const event = await prisma.jointEvent.findUnique({
      where: { id: jointEventId },
      include: {
        coHosts: true,
      },
    });

    if (!event) {
      return { hasAccess: false, isHost: false, reason: "Event not found" };
    }

    // Check if viewer is a co-host or primary host
    if (viewerUserId) {
      const viewerCreator = await prisma.creatorProfile.findUnique({
        where: { userId: viewerUserId },
      });

      if (viewerCreator) {
        const isHost = event.coHosts.some((h) => h.creatorProfileId === viewerCreator.id);
        if (isHost) {
          return { hasAccess: true, isHost: true };
        }
      }

      // Check ticket entitlement
      const ticket = await prisma.jointEventTicket.findUnique({
        where: {
          jointEventId_fanId: {
            jointEventId,
            fanId: viewerUserId,
          },
        },
      });

      if (ticket) {
        return {
          hasAccess: true,
          isHost: false,
          playbackToken: ticket.accessPassToken || undefined,
        };
      }
    }

    return {
      hasAccess: false,
      isHost: false,
      reason: "Ticket purchase required to enter this co-hosted live event.",
    };
  }

  /**
   * 4. Launch Live Joint Event
   */
  public static async startJointEvent(primaryHostId: string, jointEventId: string) {
    const event = await prisma.jointEvent.findUnique({
      where: { id: jointEventId },
      include: { coHosts: true },
    });

    if (!event) {
      throw new ApiError(404, "Joint Event not found.", "EVENT_NOT_FOUND");
    }

    if (event.primaryHostId !== primaryHostId) {
      throw new ApiError(403, "Only the primary host can launch the joint event.", "UNAUTHORIZED");
    }

    // Validate 2257 compliance
    await JointComplianceService.assertJointEventReadyForPublish(jointEventId);

    // Provision multi-publisher SFU room
    const sfuRoom = await sfuMediaAdapter.createMultiPublisherRoom(
      event.id,
      "SIDE_BY_SIDE",
      event.coHosts.length
    );

    const updated = await prisma.jointEvent.update({
      where: { id: jointEventId },
      data: {
        status: "LIVE",
        mediaRoomId: sfuRoom.roomId,
      },
    });

    // Send LIVE_NOW reminders to all followers
    this.dispatchCrossFollowerReminders(jointEventId, "LIVE_NOW").catch(console.error);

    return {
      event: updated,
      sfuRoom,
    };
  }

  /**
   * 5. End Joint Event
   */
  public static async endJointEvent(primaryHostId: string, jointEventId: string) {
    const event = await prisma.jointEvent.findUnique({
      where: { id: jointEventId },
    });

    if (!event) {
      throw new ApiError(404, "Joint Event not found.", "EVENT_NOT_FOUND");
    }

    if (event.primaryHostId !== primaryHostId) {
      throw new ApiError(403, "Only primary host can terminate the event.", "UNAUTHORIZED");
    }

    const updated = await prisma.jointEvent.update({
      where: { id: jointEventId },
      data: {
        status: "ENDED",
        scheduledEndAt: new Date(),
      },
    });

    return updated;
  }
}
