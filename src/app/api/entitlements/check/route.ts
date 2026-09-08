import { apiHandler, successResponse } from "@/lib/api-handler";
import { EntitlementService } from "@/modules/entitlements/entitlement.service";

/**
 * POST /api/entitlements/check
 *
 * Dedicated endpoint for verifying a specific entitlement.
 * Returns authoritative boolean resolution with reason and expiration.
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const body = await req.json();
    const { key, scope, creatorProfileId, resourceId, minimumTierLevel } = body;

    const result = await EntitlementService.checkEntitlement({
      userId: ctx.user!.id,
      key,
      scope,
      creatorProfileId,
      resourceId,
      minimumTierLevel,
      context: {
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    });

    return successResponse(result, result.statusCode);
  },
  { requireAuth: true }
);
