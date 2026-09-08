/**
 * ============================================================================
 * AUTHORITATIVE SECURE COOKIE & SESSION BUILDER
 * ============================================================================
 * Production cookie management:
 * - Enforces HttpOnly (XSS protection)
 * - Enforces Secure (TLS transport only)
 * - Enforces SameSite=Lax/Strict (CSRF defense)
 * - Implements __Host- and __Secure- cookie prefixes for origin isolation
 */

export interface SecureCookieOptions {
  maxAgeSeconds?: number;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  domain?: string;
  isProduction?: boolean;
  useHostPrefix?: boolean;
}

export class SecureCookies {
  public static readonly AUTH_SESSION_COOKIE = "platform_session";
  public static readonly CSRF_COOKIE = "platform_csrf_token";
  public static readonly REFRESH_TOKEN_COOKIE = "platform_refresh";

  /**
   * Resolves standard cookie name with optional __Host- or __Secure- prefix.
   */
  public static resolveCookieName(baseName: string, isProduction = process.env.NODE_ENV === "production", useHostPrefix = false): string {
    if (isProduction) {
      if (useHostPrefix) {
        return `__Host-${baseName}`;
      }
      return `__Secure-${baseName}`;
    }
    return baseName;
  }

  /**
   * Serializes cookie name and value into standard Set-Cookie header value.
   */
  public static serialize(
    name: string,
    value: string,
    options: SecureCookieOptions = {}
  ): string {
    const isProd = options.isProduction ?? (process.env.NODE_ENV === "production" || process.env.APP_ENV === "staging");
    const sameSite = options.sameSite || "lax";
    const path = options.useHostPrefix ? "/" : options.path || "/";
    const cookieName = SecureCookies.resolveCookieName(name, isProd, options.useHostPrefix);

    const parts = [`${cookieName}=${encodeURIComponent(value)}`];

    // HttpOnly
    parts.push("HttpOnly");

    // Secure (HTTPS only in production/staging)
    if (isProd) {
      parts.push("Secure");
    }

    // SameSite
    parts.push(`SameSite=${sameSite.charAt(0).toUpperCase() + sameSite.slice(1)}`);

    // Path
    parts.push(`Path=${path}`);

    // Domain (Cannot be set if __Host- prefix is used per IETF RFC 6265bis)
    if (options.domain && !options.useHostPrefix) {
      parts.push(`Domain=${options.domain}`);
    }

    // Max-Age
    if (options.maxAgeSeconds !== undefined) {
      parts.push(`Max-Age=${Math.floor(options.maxAgeSeconds)}`);
    }

    return parts.join("; ");
  }

  /**
   * Creates an expired Set-Cookie header to delete a cookie.
   */
  public static serializeDeletion(name: string, options: SecureCookieOptions = {}): string {
    return SecureCookies.serialize(name, "", {
      ...options,
      maxAgeSeconds: 0,
    });
  }

  /**
   * Parses Cookie header string into key-value map.
   */
  public static parse(cookieHeader?: string | null): Record<string, string> {
    if (!cookieHeader) return {};
    const cookies: Record<string, string> = {};
    const pairs = cookieHeader.split(";");

    for (const pair of pairs) {
      const idx = pair.indexOf("=");
      if (idx < 0) continue;
      const key = pair.substring(0, idx).trim();
      const val = pair.substring(idx + 1).trim();
      try {
        cookies[key] = decodeURIComponent(val);
      } catch {
        cookies[key] = val;
      }
    }

    return cookies;
  }
}
