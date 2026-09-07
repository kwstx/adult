/**
 * ============================================================================
 * AGE ENTITLEMENT GUARDS & MIDDLEWARE
 * ============================================================================
 * 
 * Server-side guards enforcing age-verification entitlements before allowing
 * access to sensitive adult features (streams, chat, tipping, PPV unlocks, etc.).
 */

import { NextRequest, NextResponse } from "next/server";
import { AgeEntitlement, AgeEntitlementEvaluation } from "./types";
import { AgeEntitlementService } from "./age-entitlement.service";

export class AgeEntitlementGuardError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    public readonly evaluation: AgeEntitlementEvaluation,
    message: string
  ) {
    super(message);
    this.name = "AgeEntitlementGuardError";
  }
}

export class AgeEntitlementGuard {
  /**
   * Authoritative Assert Function: Throws AgeEntitlementGuardError if check fails.
   */
  static async assertAgeEntitlement(
    userId: string | null | undefined,
    entitlement: AgeEntitlement,
    context?: {
      jurisdictionCode?: string;
      clientIp?: string;
    }
  ): Promise<AgeEntitlementEvaluation> {
    const evaluation = await AgeEntitlementService.evaluateEntitlement(
      userId,
      entitlement,
      context
    );

    if (!evaluation.hasEntitlement) {
      const statusCode = !userId ? 401 : 403;
      throw new AgeEntitlementGuardError(
        statusCode,
        "AGE_ENTITLEMENT_REQUIRED",
        evaluation,
        evaluation.rejectionReason ||
          `Access to ${entitlement} requires verified age assurance (18+).`
      );
    }

    return evaluation;
  }

  /**
   * Express / Next.js Route Wrapper for enforcing age entitlement on an API route.
   */
  static withAgeGate(
    handler: (req: NextRequest, evalResult: AgeEntitlementEvaluation) => Promise<NextResponse>,
    requiredEntitlement: AgeEntitlement = AgeEntitlement.ADULT_MEDIA_PLAYBACK
  ) {
    return async (req: NextRequest) => {
      try {
        const userId =
          req.headers.get("x-user-id") ||
          req.nextUrl.searchParams.get("userId") ||
          undefined;

        const jurisdictionCode =
          req.headers.get("x-jurisdiction-code") ||
          req.headers.get("cf-ipcountry") ||
          "DEFAULT";

        const clientIp =
          req.headers.get("x-forwarded-for")?.split(",")[0] ||
          req.headers.get("x-real-ip") ||
          undefined;

        const evaluation = await this.assertAgeEntitlement(userId, requiredEntitlement, {
          jurisdictionCode,
          clientIp,
        });

        return await handler(req, evaluation);
      } catch (err: any) {
        if (err instanceof AgeEntitlementGuardError) {
          return NextResponse.json(
            {
              error: err.message,
              code: err.code,
              entitlement: err.evaluation.entitlement,
              requiredAssuranceLevel: err.evaluation.requiredLevel,
              jurisdiction: err.evaluation.jurisdiction,
              status: err.evaluation.status,
              verificationUrl: `/api/safety/age-verify/session`,
            },
            { status: err.statusCode }
          );
        }

        console.error("AgeEntitlementGuard unexpected error:", err);
        return NextResponse.json(
          { error: "Internal security authorization failure" },
          { status: 500 }
        );
      }
    };
  }
}
