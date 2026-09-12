import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import { SplitLedgerService } from "@/modules/economic/split-ledger.service";

/**
 * POST /api/livestreams/co-stream/[sessionId]/tip
 * 
 * Executes an authoritative atomic real-time split tip on a live co-stream broadcast.
 * Automatically debits fan wallet, applies platform rake, and credits all active co-hosts proportionally.
 */
export const POST = apiHandler(async (req, ctx) => {
  const sessionId = ctx.params?.sessionId;

  if (!sessionId) {
    throw new ApiError(400, "sessionId parameter is required.", "MISSING_SESSION_ID");
  }

  const body = await req.json();
  const {
    grossCredits,
    customMessage,
    interactionDefinitionId,
    idempotencyKey,
  } = body;

  const fanUserId = ctx.user?.id || body.fanUserId;

  if (!fanUserId) {
    throw new ApiError(401, "Authenticated user required to send tip.", "UNAUTHORIZED");
  }

  if (!grossCredits || Number(grossCredits) <= 0) {
    throw new ApiError(400, "grossCredits must be a positive integer.", "INVALID_AMOUNT");
  }

  const result = await SplitLedgerService.processCoStreamTip({
    fanUserId,
    coStreamSessionId: sessionId,
    grossCredits: Number(grossCredits),
    customMessage,
    interactionDefinitionId,
    idempotencyKey,
  });

  return successResponse(result);
});
