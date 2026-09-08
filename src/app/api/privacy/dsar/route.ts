import { NextRequest } from "next/server";
import { apiHandler, successResponse, ApiError } from "@/lib/api-handler";
import { DataExportService } from "@/core/privacy/data-export.service";

export const GET = apiHandler(
  async (req: NextRequest, ctx) => {
    if (!ctx.user) {
      throw new ApiError(401, "Authentication required for data export.", "UNAUTHORIZED");
    }

    const exportData = await DataExportService.generateUserExport(ctx.user.id);
    return successResponse(exportData, 200, {
      "Content-Disposition": `attachment; filename="data-export-${ctx.user.id}.json"`,
    });
  },
  { requireAuth: true }
);
