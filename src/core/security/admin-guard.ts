/**
 * ============================================================================
 * AUTHORITATIVE ADMINISTRATIVE API GUARDS & PERMISSION ENFORCEMENT
 * ============================================================================
 * Enforces fine-grained Role-Based Access Control (RBAC) and dual-authorization /
 * step-up elevation requirements for privileged administrative operations.
 */

import { UserRole } from "@prisma/client";
import { AdminPermission, AdminRole } from "@/modules/admin/types";
import { mapUserRoleToAdminRole, hasPermission } from "@/modules/admin/admin-rbac";
import { ApiError, AuthenticatedUser } from "@/lib/api-handler";
import { AuditLogger } from "@/core/privacy/audit-logger";

export interface AdminActionContext {
  adminUser: AuthenticatedUser;
  permission: AdminPermission;
  targetId?: string;
  resourceType: string;
  justification?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AdminGuard {
  /**
   * High-risk permissions requiring mandatory written justification for audit compliance.
   */
  public static readonly HIGH_RISK_PERMISSIONS: AdminPermission[] = [
    "USERS_BAN",
    "USERS_FREEZE",
    "CREATORS_VERIFY",
    "FINANCIAL_ADJUST",
    "FINANCIAL_REFUND",
    "CHARGEBACKS_RESOLVE",
    "INCIDENTS_TERMINATE",
    "SYSTEM_SETTINGS",
  ];

  /**
   * Asserts that the authenticated user possesses the required administrative permission.
   * Throws ApiError(403) if denied.
   */
  public static async assertAuthorized(context: AdminActionContext): Promise<{
    authorized: boolean;
    adminRole: AdminRole;
  }> {
    const { adminUser, permission, targetId, resourceType, justification, ipAddress, userAgent } = context;

    // 1. Verify User possesses administrative UserRole
    if (!["ADMIN", "AUDITOR", "MODERATOR"].includes(adminUser.role)) {
      throw new ApiError(
        403,
        `Access denied. Role ${adminUser.role} is not permitted to access administrative APIs.`,
        "ADMIN_ACCESS_DENIED",
        undefined,
        {
          userTitle: "Admin authorization required",
          userMessage: "You do not have administrative access rights.",
          action: "DISMISS",
          category: "AUTHORIZATION",
        }
      );
    }

    // 2. Resolve AdminRole and evaluate specific permission
    const adminRole = mapUserRoleToAdminRole(adminUser.role, adminUser.email);
    const isGranted = hasPermission(adminRole, permission);

    if (!isGranted) {
      throw new ApiError(
        403,
        `Administrative permission '${permission}' denied for role '${adminRole}'.`,
        "PERMISSION_DENIED",
        undefined,
        {
          userTitle: "Insufficient privileges",
          userMessage: `Action requires permission: ${permission}`,
          action: "DISMISS",
          category: "AUTHORIZATION",
        }
      );
    }

    // 3. Check justification requirement for high-risk destructive operations
    if (AdminGuard.HIGH_RISK_PERMISSIONS.includes(permission)) {
      if (!justification || justification.trim().length < 5) {
        throw new ApiError(
          400,
          `Operation '${permission}' requires a documented business justification (minimum 5 characters).`,
          "JUSTIFICATION_REQUIRED",
          undefined,
          {
            userTitle: "Justification required",
            userMessage: "Please provide a valid compliance reason for this administrative action.",
            action: "RETRY",
            category: "AUTHORIZATION",
          }
        );
      }
    }

    // 4. Log Immutable Administrative Audit Event
    await AuditLogger.logAdminAccess({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      actorRole: adminRole,
      action: permission,
      resourceType,
      targetId: targetId || "GLOBAL",
      justification: justification || "Standard administrative query",
      ipAddress,
      userAgent,
    });

    return {
      authorized: true,
      adminRole,
    };
  }
}
