import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vEnum, vNumber } from "@/lib/validator";
import { CaseService } from "@/modules/trust-safety/case.service";

/**
 * GET /api/moderation/cases?status=OPEN&page=1&limit=20
 * Thin endpoint: lists moderation investigation cases for safety officers.
 */
export const GET = apiHandler(
  async (req) => {
    const query = Validator.validateQuery(req, {
      status: vEnum(["OPEN", "INVESTIGATING", "AWAITING_ID_REAUTH", "ESCALATED_LEGAL", "CLOSED_RESOLVED"] as const),
      priority: vEnum(["LOW", "MEDIUM", "HIGH", "CRITICAL_URGENT_UNDERAGE"] as const),
      page: vNumber({ integer: true, min: 1, defaultValue: 1 }),
      limit: vNumber({ integer: true, min: 1, max: 50, defaultValue: 20 }),
    });

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const result = await CaseService.listCases({
      status: query.status,
      priority: query.priority,
      offset,
      limit,
    });

    return successResponse(result);
  },
  { requiredRoles: ["ADMIN", "MODERATOR", "AUDITOR"] }
);
