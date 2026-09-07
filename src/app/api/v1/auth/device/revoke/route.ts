import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString } from "@/lib/validator";
import { MobileContextService, MobileDeviceService } from "@/modules/mobile";

/**
 * POST /api/v1/auth/device/revoke
 * Revokes a device session and invalidates its refresh tokens & push registrations.
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const context = MobileContextService.extractContext(req);
    const userId = ctx.user!.id;

    const body = await Validator.validateBody(req, {
      deviceId: vString(),
    });

    const targetDeviceId = body.deviceId || context.deviceId;
    const result = await MobileDeviceService.revokeDevice(userId, targetDeviceId);

    return successResponse(result);
  },
  { requireAuth: true }
);
