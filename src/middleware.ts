import { NextRequest, NextResponse } from "next/server";
import { SecurityHeaders } from "@/core/security/headers";
import { RateLimiter, RATE_LIMIT_POLICIES } from "@/core/security/rate-limiter";
import { CsrfProtection } from "@/core/security/csrf";
import { SecureCookies } from "@/core/security/cookies";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isProduction = process.env.NODE_ENV === "production";

  // 1. HTTPS Enforcement: Redirect HTTP to HTTPS in production
  if (isProduction && req.headers.get("x-forwarded-proto") === "http") {
    return NextResponse.redirect(`https://${req.headers.get("host")}${pathname}`, 301);
  }

  // 2. Select Rate Limit Policy
  let policy = RATE_LIMIT_POLICIES.API_GENERAL;
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/admin/auth")) {
    policy = RATE_LIMIT_POLICIES.AUTH;
  } else if (pathname.startsWith("/api/payments") || pathname.startsWith("/api/wallet")) {
    policy = RATE_LIMIT_POLICIES.PAYMENTS;
  } else if (pathname.startsWith("/api/livestreams/interactions") || pathname.startsWith("/api/tips")) {
    policy = RATE_LIMIT_POLICIES.STREAM_INTERACTIONS;
  } else if (pathname.startsWith("/api/search") || pathname.startsWith("/api/feed")) {
    policy = RATE_LIMIT_POLICIES.SEARCH_DISCOVERY;
  }

  // Client IP for rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "127.0.0.1";
  const rateLimitResult = await RateLimiter.check(ip, policy);

  if (!rateLimitResult.allowed) {
    const res = NextResponse.json(
      {
        success: false,
        error: "Rate limit exceeded",
        message: `Too many requests. Please retry in ${rateLimitResult.resetSeconds} seconds.`,
        code: "RATE_LIMIT_EXCEEDED",
      },
      { status: 429 }
    );
    SecurityHeaders.apply(res, isProduction);
    const rateHeaders = RateLimiter.getHeaders(rateLimitResult);
    for (const [k, v] of Object.entries(rateHeaders)) {
      res.headers.set(k, v);
    }
    return res;
  }

  // 3. CSRF Verification for state-changing operations
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/webhooks")) {
    const csrfCheck = CsrfProtection.validateRequest(req);
    if (!csrfCheck.isValid) {
      const res = NextResponse.json(
        {
          success: false,
          error: "CSRF Validation Failed",
          message: csrfCheck.reason || "Invalid CSRF token.",
          code: "CSRF_ERROR",
        },
        { status: 403 }
      );
      SecurityHeaders.apply(res, isProduction);
      return res;
    }
  }

  // 4. Continue Request Pipeline
  const response = NextResponse.next();

  // Apply Security Headers (HSTS, CSP, X-Frame-Options, etc.)
  SecurityHeaders.apply(response, isProduction);

  // Apply Rate Limit Headers
  const rateHeaders = RateLimiter.getHeaders(rateLimitResult);
  for (const [k, v] of Object.entries(rateHeaders)) {
    response.headers.set(k, v);
  }

  // Ensure CSRF Cookie exists on browser for frontend double-submit
  const cookies = SecureCookies.parse(req.headers.get("cookie"));
  const existingCsrfCookie = cookies[CsrfProtection.COOKIE_NAME] || cookies[`__Secure-${CsrfProtection.COOKIE_NAME}`];
  if (!existingCsrfCookie) {
    const newCsrfToken = CsrfProtection.generateToken();
    response.headers.append(
      "Set-Cookie",
      SecureCookies.serialize(CsrfProtection.COOKIE_NAME, newCsrfToken, {
        maxAgeSeconds: 86400,
        sameSite: "lax",
        isProduction,
      })
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
