import { apiHandler, successResponse } from "@/lib/api-handler";
import { Validator, vString, vEnum, vArray } from "@/lib/validator";
import { ModerationService } from "@/modules/trust-safety/moderation.service";

/**
 * POST /api/moderation/report
 * Thin endpoint: submits user/creator/content safety report.
 */
export const POST = apiHandler(
  async (req, ctx) => {
    const body = await Validator.validateBody(req, {
      targetUserId: vString(),
      targetCreatorProfileId: vString(),
      targetContentId: vString(),
      targetStreamId: vString(),
      targetMessageId: vString(),
      category: vEnum([
        "UNDERAGE_SUSPICION",
        "NON_CONSENSUAL_CONTENT",
        "HARASSMENT_ABUSE",
        "VIOLENCE_THREATS",
        "COPYRIGHT_INFRINGEMENT",
        "FINANCIAL_FRAUD",
        "SPAM_SCAM",
        "OTHER",
      ] as const, { required: true }),
      notes: vString({ required: true, max: 1000 }),
      evidenceUrls: vArray(vString()),
    });

    const result = await ModerationService.submitReport({
      reporterId: ctx.user!.id,
      targetUserId: body.targetUserId,
      targetCreatorProfileId: body.targetCreatorProfileId,
      targetContentId: body.targetContentId,
      targetStreamId: body.targetStreamId,
      targetMessageId: body.targetMessageId,
      category: body.category!,
      notes: body.notes!,
      evidenceUrls: body.evidenceUrls ? (body.evidenceUrls.filter(Boolean) as string[]) : undefined,
    });

    return successResponse(result, 201);
  },
  { requireAuth: true }
);
