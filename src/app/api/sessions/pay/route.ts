import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString, vNumber } from "@/lib/validator";
import { PrivateBookingService } from "@/modules/private-sessions/booking.service";

/**
 * POST /api/sessions/pay
 * Thin endpoint: executes double-entry wallet payment and confirms booking atomically.
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const body = await Validator.validateBody(req, {
      reservationId: vString({ required: true }),
      creatorId: vString({ required: true }),
      priceCredits: vNumber({ required: true, integer: true, min: 1 }),
      durationMinutes: vNumber({ integer: true, min: 10, defaultValue: 30 }),
      customNote: vString({ max: 500 }),
    });

    const result = await PrivateBookingService.processPaymentAndConfirm({
      reservationId: body.reservationId!,
      fanUser: {
        id: ctx.user!.id,
        displayName: ctx.user!.displayName || "Fan",
        username: ctx.user!.username || "fan",
      },
      creatorUser: {
        id: body.creatorId!,
        displayName: "Creator",
        username: "creator",
      },
      paymentMethod: "WALLET_TOKENS",
      fanNotes: body.customNote,
    });

    return successResponse(result, 201);
  },
  { requireAuth: true }
);
