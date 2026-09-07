import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString, vNumber, vBoolean } from "@/lib/validator";
import { CreatorService } from "@/modules/creator/creator.service";

/**
 * GET /api/creators/[creatorId]
 * Thin endpoint: retrieves creator profile and interactive menu.
 */
export const GET = apiHandler<{ creatorId: string }>(async (req, ctx) => {
  const creator = await CreatorService.getCreator(ctx.params.creatorId, ctx.user?.id);
  return successResponse(creator);
});

/**
 * PATCH /api/creators/[creatorId]
 * Thin endpoint: validates settings -> updates creator configurations.
 */
export const PATCH = apiHandler<{ creatorId: string }>(
  async (req, ctx) => {
    const body = await Validator.validateBody(req, {
      stageName: vString({ min: 2, max: 50 }),
      bio: vString({ max: 500 }),
      category: vString(),
      tags: vString(),
      defaultMinTip: vNumber({ integer: true, min: 0 }),
      paidMessagesEnabled: vBoolean(),
      messagePriceCredits: vNumber({ integer: true, min: 0 }),
      subscriptionTier1Price: vNumber({ integer: true, min: 0 }),
      subscriptionTier2Price: vNumber({ integer: true, min: 0 }),
      subscriptionTier3Price: vNumber({ integer: true, min: 0 }),
      customRules: vString({ max: 2000 }),
      allowFreeSubscribers: vBoolean(),
      allowFreeVip: vBoolean(),
      customWelcomeMessage: vString({ max: 500 }),
    });

    const updated = await CreatorService.updateSettings(ctx.params.creatorId, body);
    return successResponse(updated);
  },
  { requireAuth: true }
);
