import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString } from "@/lib/validator";
import { PrivateBookingService } from "@/modules/private-sessions/booking.service";

/**
 * POST /api/sessions/authorize
 * Thin endpoint: authorizes 1-on-1 private media room entry and issues WebRTC media tokens.
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const body = await Validator.validateBody(req, {
      bookingId: vString({ required: true }),
    });

    const result = PrivateBookingService.authorizeRoomEntry({
      bookingId: body.bookingId!,
      userId: ctx.user!.id,
    });

    return successResponse(result);
  },
  { requireAuth: true }
);
