import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import prisma from "@/lib/db";
import { JointEventService } from "@/modules/livestream/joint-event.service";

/**
 * POST /api/events/joint-events
 * 
 * Schedules a new Joint Ticketed Event with co-hosts and revenue split configuration.
 */
export const POST = apiHandler(async (req, ctx) => {
  const body = await req.json();
  const {
    title,
    description,
    ticketPriceCredits,
    coverImageUrl,
    scheduledStartAt,
    scheduledEndAt,
    coHosts,
  } = body;

  let primaryHostId = ctx.user?.creatorProfileId || body.primaryHostId;

  if (!primaryHostId) {
    throw new ApiError(401, "Authenticated creator profile required.", "UNAUTHORIZED");
  }

  if (!title || ticketPriceCredits === undefined || !scheduledStartAt) {
    throw new ApiError(400, "title, ticketPriceCredits, and scheduledStartAt are required.", "INVALID_INPUT");
  }

  if (!coHosts || !Array.isArray(coHosts) || coHosts.length === 0) {
    throw new ApiError(400, "coHosts array with at least one co-host is required.", "MISSING_CO_HOSTS");
  }

  const event = await JointEventService.createJointEvent({
    primaryHostId,
    title,
    description,
    ticketPriceCredits: Number(ticketPriceCredits),
    coverImageUrl,
    scheduledStartAt: new Date(scheduledStartAt),
    scheduledEndAt: scheduledEndAt ? new Date(scheduledEndAt) : undefined,
    coHosts,
  });

  return successResponse({ event }, 201);
});

/**
 * GET /api/events/joint-events
 * 
 * Lists upcoming scheduled joint events.
 */
export const GET = apiHandler(async (req) => {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  const events = await prisma.jointEvent.findMany({
    where: { status: { in: ["SCHEDULED", "COUNTDOWN_ACTIVE", "LIVE"] } },
    take: limit,
    orderBy: { scheduledStartAt: "asc" },
    include: {
      primaryHost: { include: { user: true } },
      coHosts: { include: { creatorProfile: { include: { user: true } } } },
    },
  });

  return successResponse({ events });
});
