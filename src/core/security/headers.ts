/**
 * ============================================================================
 * AUTHORITATIVE SECURITY HEADERS & HTTPS ENFORCEMENT
 * ============================================================================
 * Production HTTP response security headers conforming to OWASP and modern
 * browser security standards:
 * - HSTS (Strict-Transport-Security)
 * - Content-Security-Policy (CSP)
 * - Frame / Sniff / Referrer / Permissions policies
 */

import { NextResponse } from "next/server";

export interface SecurityHeadersConfig {
  isProduction: boolean;
  contentSecurityPolicy?: string;
  enableHsts?: boolean;
}

export class SecurityHeaders {
  private static defaultCsp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "connect-src 'self' wss: https: blob:",
    "font-src 'self' data: https:",
    "frame-src 'self' https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  public static getHeaders(isProduction = process.env.NODE_ENV === "production"): Record<string, string> {
    const headers: Record<string, string> = {
      // 1. MIME Type Sniffing Prevention
      "X-Content-Type-Options": "nosniff",

      // 2. Clickjacking Prevention
      "X-Frame-Options": "DENY",

      // 3. Referrer Privacy Policy
      "Referrer-Policy": "strict-origin-when-cross-origin",

      // 4. Modern XSS Filter (Disable legacy buggy audit per OWASP)
      "X-XSS-Protection": "0",

      // 5. Browser Permissions Policy
      "Permissions-Policy": "camera=(self), microphone=(self), geolocation=(), payment=(self), usb=()",

      // 6. Content Security Policy
      "Content-Security-Policy": SecurityHeaders.defaultCsp,
    };

    // 7. Strict Transport Security (HSTS) - Only in HTTPS environments
    if (isProduction) {
      headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload";
    }

    return headers;
  }

  /**
   * Applies production security headers to an outgoing NextResponse.
   */
  public static apply(response: NextResponse | Response, isProduction = process.env.NODE_ENV === "production"): void {
    const headers = SecurityHeaders.getHeaders(isProduction);
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }
  }
}
