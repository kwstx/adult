import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString } from "@/lib/validator";
import { MobileContextService, MobileDeviceService } from "@/modules/mobile";

/**
 * POST /api/v1/auth/device/register
 * Registers a native device and binds its APNs / FCM push notification token.
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const context = MobileContextService.extractContext(req);
    const userId = ctx.user!.id;

    const body = await Validator.validateBody(req, {
      pushToken: vString(),
      pushProvider: vString(),
      deviceModel: vString(),
      osVersion: vString(),
      appVersion: vString(),
    });

    const result = await MobileDeviceService.registerDevice({
      userId,
      deviceId: context.deviceId,
      platform: context.platform,
      pushToken: body.pushToken || context.pushToken,
      pushProvider: (body.pushProvider as any) || context.pushProvider,
      deviceModel: body.deviceModel || context.deviceModel,
      osVersion: body.osVersion || context.osVersion,
      appVersion: body.appVersion || context.appVersion,
    });

    return successResponse(result);
  },
  { requireAuth: true }
);
