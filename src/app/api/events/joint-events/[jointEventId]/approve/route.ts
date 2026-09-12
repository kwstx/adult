import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import { JointComplianceService } from "@/modules/content/joint-compliance.service";

/**
 * POST /api/events/joint-events/[jointEventId]/approve
 * 
 * Co-host formally signs 2257 compliance consent and accepts participation in the joint event.
 */
export const POST = apiHandler(async (req, ctx) => {
  const jointEventId = ctx.params?.jointEventId;

  if (!jointEventId) {
    throw new ApiError(400, "jointEventId parameter is required.", "MISSING_ID");
  }

  const body = await req.json();
  let coHostProfileId = ctx.user?.creatorProfileId || body.coHostProfileId;

  if (!coHostProfileId) {
    throw new ApiError(401, "Authenticated creator profile required.", "UNAUTHORIZED");
  }

  const updated = await JointComplianceService.approveJointEventConsent({
    jointEventId,
    coHostProfileId,
  });

  return successResponse({ coHost: updated });
});
