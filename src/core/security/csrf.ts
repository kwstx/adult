/**
 * ============================================================================
 * AUTHORITATIVE CSRF PROTECTION (DOUBLE SUBMIT CRYPTOGRAPHIC TOKEN)
 * ============================================================================
 * Defends state-changing browser requests (POST, PUT, PATCH, DELETE) against
 * Cross-Site Request Forgery using HMAC-SHA256 signed double-submit tokens.
 */

import { NextRequest } from "next/server";
import { SecureCookies } from "./cookies";

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.SESSION_SECRET || "platform_csrf_protection_secret_2026_entropy";
const CSRF_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// Universal SHA-256 implementation
function sha256Bytes(ascii: string): Uint8Array {
  const rightRotate = (v: number, amt: number) => (v >>> amt) | (v << (32 - amt));
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const result: number[] = [];
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  let formatted = ascii + "\x80";
  while ((formatted.length % 64) !== 56) formatted += "\x00";
  for (let i = 0; i < formatted.length; i++) {
    const j = formatted.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length;) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15] || 0, w2 = w[i - 2] || 0;
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] = i < 16 ? (w[i] || 0) : ((w[i - 16] || 0) + s0 + (w[i - 7] || 0) + s1) | 0;

      const s1h = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + s1h + ch + k[i] + w[i]) | 0;
      const s0h = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0h + maj) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }
    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      result.push((hash[i] >> (8 * j)) & 255);
    }
  }
  return new Uint8Array(result);
}

function hmacSha256Base64Url(keyStr: string, message: string): string {
  const blockSize = 64;
  let keyBytes: Uint8Array = new Uint8Array(new TextEncoder().encode(keyStr));
  if (keyBytes.length > blockSize) {
    keyBytes = sha256Bytes(keyStr);
  }
  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(keyBytes);

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }

  const innerMsg = new Uint8Array(blockSize + message.length);
  innerMsg.set(iKeyPad);
  innerMsg.set(new TextEncoder().encode(message), blockSize);
  const innerHash = sha256Bytes(String.fromCharCode(...innerMsg));

  const outerMsg = new Uint8Array(blockSize + innerHash.length);
  outerMsg.set(oKeyPad);
  outerMsg.set(innerHash, blockSize);
  const outerHash = sha256Bytes(String.fromCharCode(...outerMsg));

  let binary = "";
  for (let i = 0; i < outerHash.length; i++) {
    binary += String.fromCharCode(outerHash[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function getRandomNonceHex(byteCount = 16): string {
  const array = new Uint8Array(byteCount);
  if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < byteCount; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export class CsrfProtection {
  public static readonly COOKIE_NAME = SecureCookies.CSRF_COOKIE;
  public static readonly HEADER_NAME = "x-csrf-token";

  /**
   * Generates a cryptographically signed CSRF token: `timestamp.nonce.signature`
   */
  public static generateToken(): string {
    const timestamp = Date.now().toString(36);
    const nonce = getRandomNonceHex(16);
    const payload = `${timestamp}.${nonce}`;
    const signature = hmacSha256Base64Url(CSRF_SECRET, payload);

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
    const expectedSig = hmacSha256Base64Url(CSRF_SECRET, payload);

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
