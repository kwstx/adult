import { apiHandler, successResponse, errorResponse } from "@/lib/api-handler";
import { Validator, vString, vEnum, vNumber } from "@/lib/validator";
import { ContentService } from "@/modules/content/content.service";
import prisma from "@/lib/db";

/**
 * GET /api/content?type=<type>&page=1&limit=20
 * Retrieves public content feed.
 */
export const GET = apiHandler(async (req, ctx) => {
  const query = Validator.validateQuery(req, {
    type: vEnum(["PHOTO", "VIDEO", "AUDIO", "ALBUM", "POST", "BUNDLE"] as const),
    page: vNumber({ integer: true, min: 1, defaultValue: 1 }),
    limit: vNumber({ integer: true, min: 1, max: 50, defaultValue: 20 }),
  });

  const where: any = {
    isPublished: true,
    isArchived: false,
    moderationState: "APPROVED",
  };
  if (query.type) where.contentType = query.type;

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.content.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        creatorProfile: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    }),
    prisma.content.count({ where }),
  ]);

  const sanitizedItems = items.map((item) => {
    const isOwner = ctx.user?.creatorProfileId === item.creatorProfileId;
    const isFree = item.accessLevel === "PUBLIC" || item.priceCredits === 0;

    return {
      ...item,
      mediaUrl: isOwner || isFree ? item.mediaUrl : null,
      isUnlocked: isOwner || isFree,
    };
  });

  return successResponse({
    items: sanitizedItems,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * POST /api/content
 * Thin endpoint: publishes new creator content (photo, video, audio) with protection gates.
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const creatorProfileId = ctx.user!.creatorProfileId;
    if (!creatorProfileId) {
      return errorResponse("Only verified creators can publish content.", 403, "CREATOR_PROFILE_REQUIRED");
    }

    const body = await Validator.validateBody(req, {
      title: vString({ required: true, min: 2, max: 150 }),
      description: vString({ max: 1000 }),
      contentType: vEnum(["PHOTO", "VIDEO", "AUDIO", "ALBUM", "POST", "BUNDLE"] as const, {
        defaultValue: "VIDEO",
      }),
      accessLevel: vEnum(["PUBLIC", "FOLLOWERS_ONLY", "SUBSCRIBERS_ONLY", "PPV_PURCHASE", "TIER_VIP_ONLY"] as const, {
        defaultValue: "PPV_PURCHASE",
      }),
      priceCredits: vNumber({ integer: true, min: 0, defaultValue: 0 }),
      previewUrl: vString(),
      mediaUrl: vString({ required: true }),
      mediaDurationSeconds: vNumber({ integer: true, min: 0 }),
    });

    const content = await ContentService.createContent(creatorProfileId, {
      title: body.title!,
      description: body.description,
      contentType: body.contentType as any,
      accessLevel: body.accessLevel as any,
      priceCredits: body.priceCredits,
      previewUrl: body.previewUrl,
      mediaUrl: body.mediaUrl!,
      mediaDurationSeconds: body.mediaDurationSeconds,
    });
    return successResponse(content, 201);
  },
  { requireAuth: true }
);
