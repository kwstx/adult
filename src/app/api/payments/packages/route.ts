import { apiHandler, successResponse } from "@/lib/api-handler";
import { CREDIT_PACKAGES } from "@/modules/economic/payment.adapter";

/**
 * GET /api/payments/packages
 * Thin endpoint: returns available credit deposit packages.
 */
export const GET = apiHandler(async () => {
  return successResponse({ packages: CREDIT_PACKAGES });
});
