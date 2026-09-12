import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import prisma from "@/lib/db";
import { JointEventService } from "@/modules/livestream/joint-event.service";

/**
 * GET /api/events/joint-events/[jointEventId]
 * 
 * Retrieves Joint Event details, countdown, co-hosts, and viewer ticket access validation.
 */
export const GET = apiHandler(async (req, ctx) => {
  const jointEventId = ctx.params?.jointEventId;

  if (!jointEventId) {
    throw new ApiError(400, "jointEventId parameter is required.", "MISSING_ID");
  }

  const event = await prisma.jointEvent.findUnique({
    where: { id: jointEventId },
    include: {
      primaryHost: { include: { user: true } },
      coHosts: { include: { creatorProfile: { include: { user: true } } } },
    },
  });

  if (!event) {
    throw new ApiError(404, "Joint Event not found.", "EVENT_NOT_FOUND");
  }

  const viewerUserId = ctx.user?.id;
  const access = await JointEventService.verifyEventAccess({
    jointEventId,
    viewerUserId,
  });

  return successResponse({
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      ticketPriceCredits: event.ticketPriceCredits,
      coverImageUrl: event.coverImageUrl,
      scheduledStartAt: event.scheduledStartAt,
      scheduledEndAt: event.scheduledEndAt,
      status: event.status,
      is2257Compliant: event.is2257Compliant,
      totalTicketsSold: event.totalTicketsSold,
      primaryHost: {
        creatorProfileId: event.primaryHost.id,
        stageName: event.primaryHost.stageName || event.primaryHost.user.displayName,
        avatarUrl: event.primaryHost.user.avatarUrl,
      },
      coHosts: event.coHosts.map((h: any) => ({
        creatorProfileId: h.creatorProfile.id,
        stageName: h.creatorProfile.stageName || h.creatorProfile.user.displayName,
        avatarUrl: h.creatorProfile.user.avatarUrl,
        role: h.role,
        splitPercentage: Number(h.revenueSplitPercentage),
        approvalStatus: h.approvalStatus,
        is2257Verified: h.is2257Verified,
      })),
      access,
    },
  });
});
