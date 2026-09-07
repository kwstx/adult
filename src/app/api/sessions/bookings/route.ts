import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vEnum } from "@/lib/validator";
import { PrivateBookingService } from "@/modules/private-sessions/booking.service";

/**
 * GET /api/sessions/bookings?role=FAN
 * Thin endpoint: retrieves user's active/upcoming private bookings.
 */
export const GET = apiHandler(
  async (req, ctx) => {
    const query = Validator.validateQuery(req, {
      role: vEnum(["FAN", "CREATOR"] as const, { defaultValue: "FAN" }),
    });

    const bookings = PrivateBookingService.getBookings({
      userId: ctx.user!.id,
      role: query.role as "FAN" | "CREATOR" | undefined,
    });

    return successResponse({ bookings });
  },
  { requireAuth: true }
);
