import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vEnum, vString } from "@/lib/validator";
import { StreamService } from "@/modules/livestream/stream.service";

/**
 * POST /api/live/broadcast
 * Thin endpoint: authenticates creator -> validates action -> starts/stops livestream.
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const body = await Validator.validateBody(req, {
      action: vEnum(["START", "STOP"] as const, { required: true }),
      title: vString({ max: 150 }),
      category: vString({ defaultValue: "Entertainment" }),
      streamMode: vEnum([
        "PUBLIC_BROADCAST",
        "SUBSCRIBERS_ONLY",
        "TICKETED_PPV",
        "PRIVATE_1ON1",
        "VIP_GROUP",
      ] as const, { defaultValue: "PUBLIC_BROADCAST" }),
    });

    if (body.action === "START") {
      const result = await StreamService.startBroadcast(
        ctx.user!.id,
        body.title || "Live Stream",
        body.category,
        body.streamMode
      );
      return successResponse(result, 201);
    } else {
      const result = await StreamService.endBroadcast(ctx.user!.id);
      return successResponse(result);
    }
  },
  { requireAuth: true }
);
