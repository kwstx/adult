import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString } from "@/lib/validator";
import { InteractionPurchaseService } from "@/modules/interaction/interaction-purchase.service";

/**
 * POST /api/interactions/purchase
 * Authoritative Backend Validation & Zero-Trust Interaction Purchase Endpoint.
 *
 * Security Invariants:
 * 1. Price -> Server looks up interaction and determines actual price (e.g. 1,000 credits). Browser price is ignored.
 * 2. User ID -> Derived strictly from ctx.user.id (authenticated session).
 * 3. Creator ID -> Validated against interaction record.
 * 4. Balance -> Debited from authoritative wallet ledger atomically.
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const body = await Validator.validateZeroTrustBody(req, {
      creatorProfileId: vString({ required: true }),
      interactionId: vString({ required: true }),
      customPrompt: vString({ max: 500 }),
      idempotencyKey: vString(),
    });

    const result = await InteractionPurchaseService.purchaseInteraction({
      fanUserId: ctx.user!.id,
      creatorId: body.creatorProfileId!,
      interactionId: body.interactionId!,
      ignoreClientPrice: true, // Server authoritatively determines price
      customMessage: body.customPrompt,
      idempotencyKey: body.idempotencyKey,
    });

    return successResponse(result, 201);
  },
  { requireAuth: true }
);
