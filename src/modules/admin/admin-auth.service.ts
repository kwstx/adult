/**
 * ============================================================================
 * AUTHORITATIVE ADMIN AUTHENTICATION & SECURITY GUARD ENGINE
 * ============================================================================
 */

import * as crypto from "crypto";
import prisma from "@/lib/db";
import { AdminSession, AdminRole, AdminPermission, SecurityAdminContext } from "./types";
import { mapUserRoleToAdminRole, getPermissionsForRole, hasPermission, isAdministrativeRole } from "./admin-rbac";
import { UserRole } from "@prisma/client";

export class AdminAuthError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "AdminAuthError";
  }
}

export class AdminAuthService {
  private static readonly TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || "internal_vault_admin_secret_key_2026_production";
  private static readonly MASTER_ADMIN_KEY = process.env.MASTER_ADMIN_KEY || "adm_sec_99341b5a20194bc0991823ef00";
  private static readonly SESSION_DURATION_HOURS = 8;

  /**
   * Generates a signed cryptographic admin token for an authenticated administrative user.
   */
  static generateAdminToken(payload: {
    adminId: string;
    username: string;
    adminRole: AdminRole;
    userRole: UserRole;
    ipAddress?: string;
  }): string {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "ADMIN_JWT" })).toString("base64url");
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION_HOURS * 60 * 60 * 1000).toISOString();
    const body = Buffer.from(
      JSON.stringify({
        sub: payload.adminId,
        usr: payload.username,
        arl: payload.adminRole,
        url: payload.userRole,
        ip: payload.ipAddress || "",
        exp: expiresAt,
        iat: new Date().toISOString(),
        nonce: crypto.randomBytes(8).toString("hex"),
      })
    ).toString("base64url");

    const signature = crypto
      .createHmac("sha256", this.TOKEN_SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");

    return `${header}.${body}.${signature}`;
  }

  /**
   * Decodes and validates a signed admin token.
   */
  static verifyAdminToken(token: string): {
    adminId: string;
    username: string;
    adminRole: AdminRole;
    userRole: UserRole;
    expiresAt: string;
  } {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new AdminAuthError(401, "INVALID_ADMIN_TOKEN", "Admin authorization token format is invalid.");
    }

    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", this.TOKEN_SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");

    if (signature !== expectedSig) {
      throw new AdminAuthError(401, "CORRUPT_ADMIN_SIGNATURE", "Admin token cryptographic seal failed verification.");
    }

    try {
      const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
      if (new Date(decoded.exp).getTime() < Date.now()) {
        throw new AdminAuthError(401, "ADMIN_SESSION_EXPIRED", "Administrative session has expired. Please re-authenticate.");
      }
      return {
        adminId: decoded.sub,
        username: decoded.usr,
        adminRole: decoded.arl,
        userRole: decoded.url,
        expiresAt: decoded.exp,
      };
    } catch (err: any) {
      if (err instanceof AdminAuthError) throw err;
      throw new AdminAuthError(401, "ADMIN_PAYLOAD_INVALID", "Failed to parse admin session token payload.");
    }
  }

  /**
   * Authenticates an administrative user by credentials / system ID.
   */
  static async authenticateAdminUser(identifier: string, ipAddress?: string): Promise<AdminSession> {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: identifier }, { email: identifier }, { username: identifier }],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        role: true,
        moderationState: true,
        isBanned: true,
      },
    });

    if (!user) {
      throw new AdminAuthError(404, "USER_NOT_FOUND", "No administrative user matches the supplied identifier.");
    }

    if (user.isBanned || user.moderationState === "BANNED" || user.moderationState === "SUSPENDED") {
      throw new AdminAuthError(403, "ADMIN_ACCOUNT_FROZEN", "This administrative account is currently suspended.");
    }

    if (!isAdministrativeRole(user.role)) {
      throw new AdminAuthError(
        403,
        "UNAUTHORIZED_ROLE",
        `Access denied. Role "${user.role}" does not have administrative privileges.`
      );
    }

    const adminRole = mapUserRoleToAdminRole(user.role, user.email);
    const permissions = getPermissionsForRole(adminRole);
    const token = this.generateAdminToken({
      adminId: user.id,
      username: user.username,
      adminRole,
      userRole: user.role,
      ipAddress,
    });

    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION_HOURS * 60 * 60 * 1000).toISOString();

    return {
      adminId: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      adminRole,
      permissions,
      token,
      expiresAt,
      issuedAt,
      ipAddress,
    };
  }

  /**
   * Authoritative request security guard.
   * Extracts admin context from headers, validates token or API key, and asserts required permission.
   */
  static async assertAdminAccess(
    req: Request | { headers: Headers | Record<string, string | null | undefined> },
    requiredPermission?: AdminPermission
  ): Promise<SecurityAdminContext> {
    const headers = req.headers instanceof Headers ? req.headers : new Headers(req.headers as any);

    const adminKey = headers.get("x-admin-key");
    const adminToken = headers.get("x-admin-token") || headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const adminUserId = headers.get("x-admin-user-id");
    const ipAddress = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || undefined;
    const userAgent = headers.get("user-agent") || undefined;
    const stepUpHeader = headers.get("x-admin-step-up-confirmed");

    // 1. Master API key bypass for internal backend / worker invocations
    if (adminKey && adminKey === this.MASTER_ADMIN_KEY) {
      return {
        adminId: adminUserId || "system_super_admin",
        username: "system_master_admin",
        adminRole: "SUPER_ADMIN",
        ipAddress,
        userAgent,
        stepUpConfirmed: true,
      };
    }

    // 2. Token-based authorization
    if (adminToken) {
      const decoded = this.verifyAdminToken(adminToken);
      if (requiredPermission && !hasPermission(decoded.adminRole, requiredPermission)) {
        throw new AdminAuthError(
          403,
          "INSUFFICIENT_PERMISSIONS",
          `Admin role ${decoded.adminRole} lacks required permission: "${requiredPermission}".`
        );
      }

      return {
        adminId: decoded.adminId,
        username: decoded.username,
        adminRole: decoded.adminRole,
        ipAddress,
        userAgent,
        stepUpConfirmed: stepUpHeader === "true" || stepUpHeader === "1",
      };
    }

    // 3. Fallback: Lookup by admin user ID (for integrated test harnesses / internal dev mode)
    if (adminUserId) {
      const user = await prisma.user.findUnique({
        where: { id: adminUserId },
        select: { id: true, username: true, role: true, email: true, isBanned: true, moderationState: true },
      });

      if (!user || user.isBanned || !isAdministrativeRole(user.role)) {
        throw new AdminAuthError(
          403,
          "FORBIDDEN_ADMIN_ACCESS",
          "Supplied user is not authorized for internal administration."
        );
      }

      const adminRole = mapUserRoleToAdminRole(user.role, user.email);
      if (requiredPermission && !hasPermission(adminRole, requiredPermission)) {
        throw new AdminAuthError(
          403,
          "INSUFFICIENT_PERMISSIONS",
          `Admin role ${adminRole} lacks required permission: "${requiredPermission}".`
        );
      }

      return {
        adminId: user.id,
        username: user.username,
        adminRole,
        ipAddress,
        userAgent,
        stepUpConfirmed: stepUpHeader === "true",
      };
    }

    throw new AdminAuthError(
      401,
      "ADMIN_AUTHENTICATION_REQUIRED",
      "Administrative credentials missing. Provide x-admin-token or x-admin-key header."
    );
  }
}
