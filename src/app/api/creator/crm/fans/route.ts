import { apiHandler, successResponse } from "@/lib/api-handler";
import { CreatorCrmService } from "@/modules/creator-crm/creator-crm.service";
import { CrmFanCohort } from "@/modules/creator-crm/types";
import { FanStatusTier } from "@/types/fan-status";
import prisma from "@/lib/db";

/**
 * GET /api/creator/crm/fans
 * 
 * Queries and segments audience fans for the authenticated creator with
 * cohort filtering, search, relationship tier filtering, sorting, and pagination.
 */
export const GET = apiHandler(async (req, ctx) => {
  const { searchParams } = new URL(req.url);

  const cohort = (searchParams.get("cohort") as CrmFanCohort | "ALL") || "ALL";
  const search = searchParams.get("search") || undefined;
  const relationshipTier = (searchParams.get("relationshipTier") as FanStatusTier | "ALL") || undefined;
  const isSubscribedParam = searchParams.get("isSubscribed");
  const isSubscribed = isSubscribedParam !== null ? isSubscribedParam === "true" : undefined;
  const minSpendCredits = searchParams.get("minSpendCredits") ? Number(searchParams.get("minSpendCredits")) : undefined;
  const maxSpendCredits = searchParams.get("maxSpendCredits") ? Number(searchParams.get("maxSpendCredits")) : undefined;
  const minStreakDays = searchParams.get("minStreakDays") ? Number(searchParams.get("minStreakDays")) : undefined;
  const sortBy = (searchParams.get("sortBy") as any) || "totalCreditsSpent";
  const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

  let creatorProfileId = ctx.user?.creatorProfileId || searchParams.get("creatorProfileId");

  if (!creatorProfileId) {
    const defaultProfile = await prisma.creatorProfile.findFirst({
      select: { id: true },
    });
    creatorProfileId = defaultProfile?.id || "creator_luna_profile";
  }

  const result = await CreatorCrmService.queryFans(creatorProfileId, {
    cohort,
    search,
    relationshipTier,
    isSubscribed,
    minSpendCredits,
    maxSpendCredits,
    minStreakDays,
    sortBy,
    sortOrder,
    page,
    limit,
  });

  return successResponse(result);
});
