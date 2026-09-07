import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vEnum, vString } from "@/lib/validator";
import { CaseService } from "@/modules/trust-safety/case.service";

/**
 * POST /api/moderation/cases/[caseId]/decide
 * Thin endpoint: Officer records decision on a moderation case.
 */
export const POST = apiHandler<{ caseId: string }>(
  async (req, ctx) => {
    const body = await Validator.validateBody(req, {
      decision: vEnum(["TAKE_ACTION", "DISMISS", "ESCALATE"] as const, { required: true }),
      actionTaken: vEnum([
        "NONE",
        "WARNING_MESSAGE",
        "SHADOWBAN",
        "TEMPORARY_SUSPENSION",
        "PERMANENT_BAN",
        "COMPLIANCE_2257_REVOCATION",
        "NCMEC_LEGAL_ESCALATION",
      ] as const, { defaultValue: "NONE" }),
      resolutionNotes: vString({ required: true, max: 1000 }),
    });

    const result = await CaseService.renderDecision(
      {
        caseId: ctx.params.caseId,
        reviewerId: ctx.user!.id,
        decision: body.decision!,
        decisionAction: body.actionTaken as any,
        decisionNotes: body.resolutionNotes!,
      },
      {
        actorId: ctx.user!.id,
        actorType: "ADMIN",
        actorRole: ctx.user!.role,
      }
    );

    return successResponse(result);
  },
  { requiredRoles: ["ADMIN", "MODERATOR"] }
);
