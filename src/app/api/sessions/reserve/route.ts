import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString, vNumber } from "@/lib/validator";
import { PrivateBookingService } from "@/modules/private-sessions/booking.service";
import { reservationLockService } from "@/modules/private-sessions/reservation-lock.service";

/**
 * POST /api/sessions/reserve
 * Thin endpoint: acquires temporary 10-minute slot reservation hold.
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const body = await Validator.validateBody(req, {
      creatorId: vString({ required: true }),
      startTimeUtc: vString({ required: true }),
      endTimeUtc: vString({ required: true }),
      displayTime: vString({ required: true }),
      durationMinutes: vNumber({ integer: true, min: 10, max: 120, defaultValue: 30 }),
    });

    const result = PrivateBookingService.reserveSlot({
      creatorProfileId: body.creatorId!,
      fanId: ctx.user!.id,
      startTimeUtc: body.startTimeUtc!,
      endTimeUtc: body.endTimeUtc!,
      displayTime: body.displayTime!,
      durationMinutes: body.durationMinutes!,
    });

    if (!result.success) {
      throw new Error(result.error || "Slot is already reserved or unavailable.");
    }

    return successResponse(
      {
        hold: result.hold,
        message: `Slot at ${body.displayTime} temporarily reserved for 10 minutes.`,
      },
      201
    );
  },
  { requireAuth: true }
);

/**
 * DELETE /api/sessions/reserve?reservationId=...
 * Thin endpoint: releases reservation hold.
 */
export const DELETE = apiHandler(
  async (req) => {
    const query = Validator.validateQuery(req, {
      reservationId: vString({ required: true }),
    });

    const released = reservationLockService.releaseHold(query.reservationId!);
    return successResponse({ released });
  },
  { requireAuth: true }
);
