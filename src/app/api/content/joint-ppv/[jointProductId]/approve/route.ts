import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import { JointComplianceService } from "@/modules/content/joint-compliance.service";

/**
 * POST /api/content/joint-ppv/[jointProductId]/approve
 * 
 * Co-creator formally signs 2257 compliance consent and accepts revenue split for a joint PPV item.
 */
export const POST = apiHandler(async (req, ctx) => {
  const jointProductId = ctx.params?.jointProductId;

  if (!jointProductId) {
    throw new ApiError(400, "jointProductId parameter is required.", "MISSING_ID");
  }

  const body = await req.json();
  let coCreatorProfileId = ctx.user?.creatorProfileId || body.coCreatorProfileId;

  if (!coCreatorProfileId) {
    throw new ApiError(401, "Authenticated creator profile required.", "UNAUTHORIZED");
  }

  const updated = await JointComplianceService.approveJointProductConsent({
    jointProductId,
    coCreatorProfileId,
    signedConsentText: body.signedConsentText,
  });

  return successResponse({ coCreator: updated });
});
