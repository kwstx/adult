import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import prisma from "@/lib/db";
import { JointComplianceService } from "@/modules/content/joint-compliance.service";

/**
 * POST /api/content/joint-ppv
 * 
 * Creates a new Joint PPV item with co-stars and predefined revenue split matrix.
 */
export const POST = apiHandler(async (req, ctx) => {
  const body = await req.json();
  const {
    title,
    description,
    contentType = "VIDEO",
    priceCredits,
    previewUrl,
    mediaUrl,
    mediaDurationSeconds,
    coCreators, // [{ creatorProfileId, role, revenueSplitPercentage }]
  } = body;

  let primaryProducerId = ctx.user?.creatorProfileId || body.primaryProducerId;

  if (!primaryProducerId) {
    throw new ApiError(401, "Authenticated creator profile required.", "UNAUTHORIZED");
  }

  if (!title || !mediaUrl || priceCredits === undefined) {
    throw new ApiError(400, "title, mediaUrl, and priceCredits are required.", "INVALID_INPUT");
  }

  if (!coCreators || !Array.isArray(coCreators) || coCreators.length === 0) {
    throw new ApiError(400, "coCreators array is required with at least one co-star.", "MISSING_CO_CREATORS");
  }

  // Validate 2257 compliance of all creators
  const allCreatorIds = [primaryProducerId, ...coCreators.map((c: any) => c.creatorProfileId)];
  const compliance = await JointComplianceService.validateCoCreatorsCompliance(allCreatorIds);

  if (!compliance.allCompliant) {
    const nonCompliant = compliance.details.filter((d) => !d.is2257Approved);
    throw new ApiError(
      403,
      `Cannot create joint PPV: Participating creators lack approved 2257 records: ${nonCompliant.map((n) => n.stageName).join(", ")}`,
      "COMPLIANCE_2257_REQUIRED"
    );
  }

  const producerSplit = 1.0 - coCreators.reduce((sum: number, c: any) => sum + Number(c.revenueSplitPercentage), 0);
  if (producerSplit <= 0) {
    throw new ApiError(400, "Co-creator split percentages exceed 100%. Producer must have a positive share.", "INVALID_SPLIT_PERCENTAGE");
  }

  const jointProduct = await prisma.$transaction(async (tx: any) => {
    const p = await tx.jointProduct.create({
      data: {
        primaryProducerId,
        title,
        description,
        contentType,
        priceCredits: Number(priceCredits),
        previewUrl,
        mediaUrl,
        mediaDurationSeconds,
        status: "PENDING_APPROVAL",
        is2257Compliant: false, // will become true when all co-stars digitally sign
      },
    });

    // Add Primary Producer
    await tx.jointProductCoCreator.create({
      data: {
        jointProductId: p.id,
        creatorProfileId: primaryProducerId,
        role: "PRIMARY_PRODUCER",
        revenueSplitPercentage: Number(producerSplit.toFixed(2)),
        approvalStatus: "APPROVED",
        is2257Verified: true,
        approvedAt: new Date(),
      },
    });

    // Add Co-Stars
    for (const coStar of coCreators) {
      await tx.jointProductCoCreator.create({
        data: {
          jointProductId: p.id,
          creatorProfileId: coStar.creatorProfileId,
          role: coStar.role || "CO_STAR",
          revenueSplitPercentage: Number(coStar.revenueSplitPercentage),
          approvalStatus: "PENDING",
          is2257Verified: false,
        },
      });
    }

    return p;
  });

  return successResponse({ jointProduct }, 201);
});

/**
 * GET /api/content/joint-ppv
 * 
 * Lists published Joint PPV items.
 */
export const GET = apiHandler(async (req) => {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  const products = await prisma.jointProduct.findMany({
    where: { status: "PUBLISHED" },
    take: limit,
    orderBy: { publishedAt: "desc" },
    include: {
      primaryProducer: { include: { user: true } },
      coCreators: { include: { creatorProfile: { include: { user: true } } } },
    },
  });

  return successResponse({ products });
});
