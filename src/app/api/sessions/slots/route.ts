import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString, vNumber } from "@/lib/validator";
import { PrivateBookingService } from "@/modules/private-sessions/booking.service";
import { SlotGeneratorService } from "@/modules/private-sessions/slot-generator.service";

/**
 * GET /api/sessions/slots?creatorId=<id>&date=YYYY-MM-DD&durationMinutes=30
 * Thin endpoint: returns available 1-on-1 private session slots for a creator.
 */
export const GET = apiHandler(async (req) => {
  const query = Validator.validateQuery(req, {
    creatorId: vString({ required: true }),
    date: vString({ defaultValue: new Date().toISOString().split("T")[0] }),
    durationMinutes: vNumber({ integer: true, min: 10, max: 120, defaultValue: 30 }),
  });

  const slots = PrivateBookingService.getAvailableSlots({
    creatorProfileId: query.creatorId!,
    date: query.date!,
    durationMinutes: query.durationMinutes ?? 30,
  });

  return successResponse({ slots });
});
