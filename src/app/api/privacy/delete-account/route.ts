import { NextRequest } from "next/server";
import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import { AccountDeletionService } from "@/core/privacy/account-deletion.service";

export const POST = apiHandler(
  async (req: NextRequest, ctx) => {
    if (!ctx.user) {
      throw new ApiError(401, "Authentication required for account deletion.", "UNAUTHORIZED");
    }

    const body = await req.json().catch(() => ({}));
    const reason = body?.reason || "User requested account deletion via settings (GDPR/CCPA)";

    const result = await AccountDeletionService.deleteAccount(ctx.user.id, ctx.user.id, reason);
    return successResponse(result, 200);
  },
  { requireAuth: true }
);
