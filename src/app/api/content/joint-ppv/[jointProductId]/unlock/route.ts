import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import { JointSettlementService } from "@/modules/economic/joint-settlement.service";

/**
 * POST /api/content/joint-ppv/[jointProductId]/unlock
 * 
 * Fan purchases and unlocks Joint PPV media with atomic multi-creator revenue split settlement.
 */
export const POST = apiHandler(async (req, ctx) => {
  const jointProductId = ctx.params?.jointProductId;

  if (!jointProductId) {
    throw new ApiError(400, "jointProductId parameter is required.", "MISSING_ID");
  }

  const body = await req.json();
  const fanUserId = ctx.user?.id || body.fanUserId;

  if (!fanUserId) {
    throw new ApiError(401, "Authenticated fan user required to unlock content.", "UNAUTHORIZED");
  }

  const result = await JointSettlementService.purchaseJointPPV({
    fanUserId,
    jointProductId,
    idempotencyKey: body.idempotencyKey,
  });

  return successResponse(result);
});
