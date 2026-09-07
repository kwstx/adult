import { apiHandler, successResponse } from "@/lib/api-handler";
import { MobileIapService } from "@/modules/mobile";

/**
 * GET /api/v1/wallet/packages
 * Returns storefront credit packages with Apple App Store Product IDs and Google Play SKUs.
 */
export const GET = apiHandler(async () => {
  const packages = MobileIapService.getPackages();
  return successResponse(packages);
});
