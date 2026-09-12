/**
 * ============================================================================
 * REFERRAL TOKEN ARCHITECTURE & CRYPTOGRAPHIC SIGNING SERVICE
 * ============================================================================
 * Generates and validates tamper-proof signed referral tokens and vanity URLs.
 */

import crypto from "crypto";
import {
  SignedReferralPayload,
  SignedReferralTokenResult,
} from "./types";

const TOKEN_SECRET = process.env.AFFILIATE_TOKEN_SECRET || "prod_affiliate_signing_secret_998877665544332211";
const BASE_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://platform.local";

export class ReferralTokenService {
  /**
   * Sanitizes and checks if a referral code satisfies vanity formatting rules:
   * Alphanumeric, underscores, hyphens, 3 to 32 characters.
   */
  static isValidReferralCode(code: string): boolean {
    if (!code || typeof code !== "string") return false;
    const sanitized = code.trim();
    const regex = /^[a-zA-Z0-9_-]{3,32}$/;
    return regex.test(sanitized);
  }

  /**
   * Normalizes a vanity code (uppercased, trimmed).
   */
  static normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  /**
   * Generates a cryptographically signed referral token (HMAC-SHA256).
   */
  static generateSignedToken(input: {
    creatorProfileId: string;
    code: string;
    campaignName?: string;
    commissionRatePercent?: number;
    spendWindowDays?: number;
    validDays?: number;
  }): SignedReferralTokenResult {
    const {
      creatorProfileId,
      code,
      campaignName,
      commissionRatePercent = 10.0,
      spendWindowDays = 30,
      validDays = 90,
    } = input;

    const normalized = this.normalizeCode(code);
    const now = Date.now();
    const expiresAtMs = now + validDays * 24 * 60 * 60 * 1000;
    const nonce = crypto.randomBytes(8).toString("hex");

    const payload: SignedReferralPayload = {
      code: normalized,
      creatorProfileId,
      campaignName,
      commissionRatePercent,
      spendWindowDays,
      issuedAt: now,
      expiresAt: expiresAtMs,
      nonce,
    };

    const payloadJson = JSON.stringify(payload);
    const payloadB64 = Buffer.from(payloadJson).toString("base64url");
    const signature = crypto
      .createHmac("sha256", TOKEN_SECRET)
      .update(payloadB64)
      .digest("base64url");

    const token = `ref_${payloadB64}.${signature}`;
    const vanityUrl = `${BASE_APP_URL}/r/${normalized}${
      campaignName ? `?utm_campaign=${encodeURIComponent(campaignName)}` : ""
    }`;

    return {
      token,
      code: normalized,
      creatorProfileId,
      vanityUrl,
      expiresAt: new Date(expiresAtMs),
    };
  }

  /**
   * Verifies an HMAC-SHA256 signed referral token.
   * Returns parsed payload if valid and not expired, null otherwise.
   */
  static verifySignedToken(token: string): SignedReferralPayload | null {
    try {
      if (!token || !token.startsWith("ref_")) return null;

      const raw = token.slice(4); // Remove "ref_"
      const parts = raw.split(".");
      if (parts.length !== 2) return null;

      const [payloadB64, signature] = parts;
      const expectedSignature = crypto
        .createHmac("sha256", TOKEN_SECRET)
        .update(payloadB64)
        .digest("base64url");

      // Constant time equality check to prevent timing attacks
      const isValidSig = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValidSig) {
        return null;
      }

      const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
      const payload: SignedReferralPayload = JSON.parse(payloadJson);

      // Check expiration
      if (Date.now() > payload.expiresAt) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Generates a vanity attribution URL.
   */
  static buildVanityUrl(code: string, campaignName?: string): string {
    const normalized = this.normalizeCode(code);
    return `${BASE_APP_URL}/r/${normalized}${
      campaignName ? `?utm_campaign=${encodeURIComponent(campaignName)}` : ""
    }`;
  }
}
