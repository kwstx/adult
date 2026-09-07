import { apiHandler, successResponse } from "@/lib/api-handler";
import { RelationshipService } from "@/modules/relationship/relationship.service";

/**
 * GET /api/progression/creator/[creatorId]
 * Thin endpoint: retrieves authenticated fan's relationship tier and perks with the specified creator.
 */
export const GET = apiHandler<{ creatorId: string }>(
  async (req, ctx) => {
    const creatorId = ctx.params?.creatorId;
    if (!creatorId) {
      return successResponse(null);
    }
    const relationship = await RelationshipService.getRelationship(
      ctx.user!.id,
      creatorId
    );
    return successResponse(relationship);
  },
  { requireAuth: true }
);
