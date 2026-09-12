import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { ReferralAttributionService } from "@/modules/affiliate/referral-attribution.service";

export const POST = apiHandler(
  async (req: NextRequest, ctx) => {
    const body = await req.json();
    const {
      referralCode,
      anonymousSessionId,
      deviceFingerprintHash,
      landingPage,
      utmSource,
      utmMedium,
      utmCampaign,
    } = body;

    if (!referralCode || typeof referralCode !== "string") {
      return NextResponse.json(
        { success: false, error: "referralCode is required." },
        { status: 400 }
      );
    }

    const sessionId =
      anonymousSessionId ||
      req.cookies.get("__anon_sess")?.value ||
      `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await ReferralAttributionService.recordTouchpoint({
      referralCode,
      anonymousSessionId: sessionId,
      deviceFingerprintHash,
      ipAddress,
      userAgent,
      landingPage,
      utmSource,
      utmMedium,
      utmCampaign,
      targetUserId: ctx.user?.id,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        touchpointId: result.touchpointId,
        referralCode: result.referralCode,
        creatorProfileId: result.creatorProfileId,
        expiresAt: result.cookieExpiresAt,
      },
    });

    // Set first-party secure attribution cookie
    response.cookies.set("__att_ref", result.signedAttributionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: result.cookieExpiresAt,
      path: "/",
    });

    // Set anonymous session cookie if not already set
    if (!req.cookies.get("__anon_sess")) {
      response.cookies.set("__anon_sess", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      });
    }

    return response;
  },
  { requireAuth: false }
);
