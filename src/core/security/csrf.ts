/**
 * ============================================================================
 * AUTHORITATIVE CSRF PROTECTION (DOUBLE SUBMIT CRYPTOGRAPHIC TOKEN)
 * ============================================================================
 * Defends state-changing browser requests (POST, PUT, PATCH, DELETE) against
 * Cross-Site Request Forgery using HMAC-SHA256 signed double-submit tokens.
 */

import * as crypto from "crypto";
import { NextRequest } from "next/server";
import { SecureCookies } from "./cookies";

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.SESSION_SECRET || "platform_csrf_protection_secret_2026_entropy";
const CSRF_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export class CsrfProtection {
  public static readonly COOKIE_NAME = SecureCookies.CSRF_COOKIE;
  public static readonly HEADER_NAME = "x-csrf-token";

  /**
   * Generates a cryptographically signed CSRF token: `timestamp.nonce.signature`
   */
  public static generateToken(): string {
    const timestamp = Date.now().toString(36);
    const nonce = crypto.randomBytes(16).toString("hex");
    const payload = `${timestamp}.${nonce}`;
    const signature = crypto
      .createHmac("sha256", CSRF_SECRET)
      .update(payload)
      .digest("base64url");

    return `${payload}.${signature}`;
  }

  /**
   * Verifies that the submitted CSRF token is cryptographically valid and not expired.
   */
  public static verifyToken(token?: string | null): boolean {
    if (!token) return false;
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const [timestampStr, nonce, signature] = parts;
    const payload = `${timestampStr}.${nonce}`;
    const expectedSig = crypto
      .createHmac("sha256", CSRF_SECRET)
      .update(payload)
      .digest("base64url");

    if (signature !== expectedSig) return false;

    const timestamp = parseInt(timestampStr, 36);
    if (isNaN(timestamp) || Date.now() - timestamp > CSRF_MAX_AGE_MS) {
      return false; // Expired
    }

    return true;
  }

  /**
   * Validates double-submit cookie and header match for incoming state-changing requests.
   */
  public static validateRequest(req: NextRequest): { isValid: boolean; reason?: string } {
    const method = req.method.toUpperCase();

    // Safe read-only HTTP methods are exempt from CSRF checks
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      return { isValid: true };
    }

    // Exemption: API requests using Bearer authentication header (XSS/Authorization protection applies)
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return { isValid: true };
    }

    // Exemption: Signed payment/KYC webhooks (e.g., CCBill, SegPay, Persona) verified via HMAC signatures
    const webhookSig = req.headers.get("x-signature") || req.headers.get("x-webhook-signature");
    if (webhookSig && req.nextUrl.pathname.includes("/webhook")) {
      return { isValid: true };
    }

    // Extract CSRF Token from Cookie and Header
    const cookies = SecureCookies.parse(req.headers.get("cookie"));
    const cookieToken =
      cookies[SecureCookies.resolveCookieName(CsrfProtection.COOKIE_NAME, process.env.NODE_ENV === "production")] ||
      cookies[CsrfProtection.COOKIE_NAME];

    const headerToken = req.headers.get(CsrfProtection.HEADER_NAME);

    if (!cookieToken) {
      return { isValid: false, reason: "Missing CSRF cookie." };
    }

    if (!headerToken) {
      return { isValid: false, reason: "Missing X-CSRF-Token request header." };
    }

    if (cookieToken !== headerToken) {
      return { isValid: false, reason: "CSRF token mismatch between cookie and header." };
    }

    if (!CsrfProtection.verifyToken(headerToken)) {
      return { isValid: false, reason: "Invalid or expired CSRF token cryptographic signature." };
    }

    return { isValid: true };
  }
}
