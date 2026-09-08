import { apiHandler, successResponse } from "@/lib/api-handler";
import { EntitlementService } from "@/modules/entitlements/entitlement.service";

/**
 * GET /api/entitlements
 *
 * Consolidated entitlement lookup for the authenticated user.
 * Eliminates dozens of independent client-side permission checks.
 *
 * Query Params:
 * - creatorProfileId?: string
 * - livestreamId?: string
 * - contentId?: string
 */
export const GET = apiHandler(
  async (req, ctx) => {
    const { searchParams } = new URL(req.url);
    const creatorProfileId = searchParams.get("creatorProfileId") || undefined;
    const livestreamId = searchParams.get("livestreamId") || undefined;
    const contentId = searchParams.get("contentId") || undefined;

    const summary = await EntitlementService.getUserEntitlements({
      userId: ctx.user!.id,
      creatorProfileId,
      livestreamId,
      contentId,
    });

    return successResponse(summary);
  },
  { requireAuth: true }
);
