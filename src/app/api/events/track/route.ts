import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import { EventStreamService } from "@/modules/events/event-stream.service";
import { BehavioralEventType } from "@/modules/events/types";

/**
 * POST /api/events/track
 *
 * Ingestion endpoint for client-side user behavioral telemetry.
 * Dispatches verified events to the backend Event Stream.
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const body = await req.json();
    const { type, payload, creatorProfileId, livestreamId, entityId } = body;

    if (!type) {
      throw new ApiError(400, "Missing required field: type");
    }

    const actor = {
      userId: ctx.user!.id,
      username: ctx.user!.username,
      displayName: ctx.user!.displayName || ctx.user!.username,
      role: ctx.user!.role,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    };

    const envelope = EventStreamService.emit(type as BehavioralEventType, payload || {}, {
      actor,
      creatorProfileId,
      livestreamId,
      entityId,
    });

    return successResponse({ eventId: envelope.id, timestamp: envelope.timestamp }, 202);
  },
  { requireAuth: true }
);

/**
 * GET /api/events/track
 *
 * Returns live event stream processing metrics for observability dashboards.
 */
export const GET = apiHandler(
  async (_req, _ctx) => {
    const metrics = EventStreamService.getMetrics();
    return successResponse(metrics);
  },
  { requireAuth: true, requiredRoles: ["ADMIN"] }
);
