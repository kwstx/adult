import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import prisma from "@/lib/db";
import { EntitlementService } from "@/modules/entitlements/entitlement.service";

/**
 * GET /api/content/joint-ppv/[jointProductId]
 * 
 * Retrieves Joint PPV product details, 2257 verified co-stars, and fan unlock entitlement status.
 */
export const GET = apiHandler(async (req, ctx) => {
  const jointProductId = ctx.params?.jointProductId;

  if (!jointProductId) {
    throw new ApiError(400, "jointProductId parameter is required.", "MISSING_ID");
  }

  const product = await prisma.jointProduct.findUnique({
    where: { id: jointProductId },
    include: {
      primaryProducer: { include: { user: true } },
      coCreators: { include: { creatorProfile: { include: { user: true } } } },
    },
  });

  if (!product) {
    throw new ApiError(404, "Joint PPV product not found.", "PRODUCT_NOT_FOUND");
  }

  const viewerUserId = ctx.user?.id;
  let isUnlocked = false;

  if (viewerUserId) {
    // Check entitlement
    const check = await EntitlementService.checkEntitlement({
      userId: viewerUserId,
      key: "CONTENT_ACCESS",
      scope: "CONTENT",
      resourceId: product.id,
    });
    isUnlocked = check.hasEntitlement;
  }

  return successResponse({
    product: {
      id: product.id,
      title: product.title,
      description: product.description,
      contentType: product.contentType,
      priceCredits: product.priceCredits,
      previewUrl: product.previewUrl,
      mediaUrl: isUnlocked ? product.mediaUrl : null,
      mediaDurationSeconds: product.mediaDurationSeconds,
      status: product.status,
      is2257Compliant: product.is2257Compliant,
      publishedAt: product.publishedAt,
      primaryProducer: {
        creatorProfileId: product.primaryProducer.id,
        stageName: product.primaryProducer.stageName || product.primaryProducer.user.displayName,
        avatarUrl: product.primaryProducer.user.avatarUrl,
      },
      coCreators: product.coCreators.map((c: any) => ({
        creatorProfileId: c.creatorProfile.id,
        stageName: c.creatorProfile.stageName || c.creatorProfile.user.displayName,
        avatarUrl: c.creatorProfile.user.avatarUrl,
        role: c.role,
        splitPercentage: Number(c.revenueSplitPercentage),
        approvalStatus: c.approvalStatus,
        is2257Verified: c.is2257Verified,
      })),
      isUnlocked,
    },
  });
});
