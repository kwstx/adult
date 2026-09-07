import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString, vNumber, vEnum, vBoolean } from "@/lib/validator";
import { InteractionService } from "@/modules/interaction/interaction.service";

/**
 * GET /api/interactions?creatorProfileId=<id>
 * Thin endpoint: retrieves active interaction options for creator.
 */
export const GET = apiHandler(async (req) => {
  const query = Validator.validateQuery(req, {
    creatorProfileId: vString({ required: true }),
  });

  const interactions = await InteractionService.getActiveInteractions(query.creatorProfileId!);
  return successResponse({ interactions });
});

/**
 * POST /api/interactions
 * Thin endpoint: Creator creates and publishes a new interactive experience.
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const creatorProfileId = ctx.user!.creatorProfileId;
    if (!creatorProfileId) {
      throw new Error("Only verified creators can publish interactions.");
    }

    const body = await Validator.validateBody(req, {
      type: vEnum([
        "QUESTION",
        "ACTIVITY",
        "CHALLENGE",
        "PRIORITY_INTERACTION",
        "CUSTOM_EXPERIENCE",
      ] as const, { required: true }),
      name: vString({ required: true, min: 2, max: 100 }),
      description: vString({ max: 500 }),
      price: vNumber({ required: true, integer: true, min: 10, max: 500000 }),
      duration: vNumber({ required: true, integer: true, min: 5, max: 3600 }),
      quantity: vNumber({ integer: true, min: 1 }),
      whoCanPurchase: vEnum(["ALL", "FOLLOWERS", "SUBSCRIBERS_ONLY", "MIN_FAN_LEVEL_5"] as const, {
        defaultValue: "ALL",
      }),
      requiresAcceptance: vBoolean({ defaultValue: false }),
      entersQueue: vBoolean({ defaultValue: true }),
      icon: vString(),
    });

    const result = await InteractionService.createAndPublishInteraction({
      creatorProfileId,
      input: body as any,
    });

    return successResponse(result, 201);
  },
  { requireAuth: true }
);
