import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import { JointSettlementService } from "@/modules/economic/joint-settlement.service";

/**
 * POST /api/events/joint-events/[jointEventId]/ticket
 * 
 * Fan purchases a ticket for a Joint Event with atomic revenue split settlement across all co-hosts.
 */
export const POST = apiHandler(async (req, ctx) => {
  const jointEventId = ctx.params?.jointEventId;

  if (!jointEventId) {
    throw new ApiError(400, "jointEventId parameter is required.", "MISSING_ID");
  }

  const body = await req.json();
  const fanUserId = ctx.user?.id || body.fanUserId;

  if (!fanUserId) {
    throw new ApiError(401, "Authenticated fan user required to purchase ticket.", "UNAUTHORIZED");
  }

  const result = await JointSettlementService.purchaseJointEventTicket({
    fanUserId,
    jointEventId,
    idempotencyKey: body.idempotencyKey,
  });

  return successResponse(result);
});
