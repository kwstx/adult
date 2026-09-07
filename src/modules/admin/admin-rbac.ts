/**
 * ============================================================================
 * AUTHORITATIVE ADMIN ROLE-BASED ACCESS CONTROL (RBAC)
 * ============================================================================
 */

import { AdminRole, AdminPermission } from "./types";
import { UserRole } from "@prisma/client";

// Mapping of internal administration roles to their granted permissions
export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  SUPER_ADMIN: [
    "USERS_VIEW",
    "USERS_MANAGE",
    "USERS_FREEZE",
    "USERS_BAN",
    "CREATORS_VIEW",
    "CREATORS_MANAGE",
    "CREATORS_VERIFY",
    "REPORTS_VIEW",
    "REPORTS_RESOLVE",
    "CONTENT_VIEW",
    "CONTENT_MODERATE",
    "PAYMENTS_VIEW",
    "WALLETS_VIEW",
    "FINANCIAL_REFUND",
    "FINANCIAL_ADJUST",
    "CHARGEBACKS_VIEW",
    "CHARGEBACKS_RESOLVE",
    "PAYOUTS_VIEW",
    "PAYOUTS_REVIEW",
    "INCIDENTS_VIEW",
    "INCIDENTS_TERMINATE",
    "AUDIT_VIEW",
    "AUDIT_VERIFY",
    "SYSTEM_SETTINGS",
  ],
  COMPLIANCE_OFFICER: [
    "USERS_VIEW",
    "USERS_MANAGE",
    "USERS_FREEZE",
    "USERS_BAN",
    "CREATORS_VIEW",
    "CREATORS_MANAGE",
    "CREATORS_VERIFY",
    "REPORTS_VIEW",
    "REPORTS_RESOLVE",
    "CONTENT_VIEW",
    "CONTENT_MODERATE",
    "INCIDENTS_VIEW",
    "INCIDENTS_TERMINATE",
    "AUDIT_VIEW",
    "AUDIT_VERIFY",
  ],
  FINANCIAL_AUDITOR: [
    "USERS_VIEW",
    "CREATORS_VIEW",
    "PAYMENTS_VIEW",
    "WALLETS_VIEW",
    "FINANCIAL_REFUND",
    "FINANCIAL_ADJUST",
    "CHARGEBACKS_VIEW",
    "CHARGEBACKS_RESOLVE",
    "PAYOUTS_VIEW",
    "PAYOUTS_REVIEW",
    "AUDIT_VIEW",
    "AUDIT_VERIFY",
  ],
  CONTENT_MODERATOR: [
    "USERS_VIEW",
    "CREATORS_VIEW",
    "REPORTS_VIEW",
    "REPORTS_RESOLVE",
    "CONTENT_VIEW",
    "CONTENT_MODERATE",
    "INCIDENTS_VIEW",
    "INCIDENTS_TERMINATE",
    "AUDIT_VIEW",
  ],
  SUPPORT_LEAD: [
    "USERS_VIEW",
    "USERS_MANAGE",
    "CREATORS_VIEW",
    "REPORTS_VIEW",
    "CONTENT_VIEW",
    "PAYMENTS_VIEW",
    "WALLETS_VIEW",
    "FINANCIAL_REFUND",
    "AUDIT_VIEW",
  ],
};

/**
 * Maps standard Prisma `UserRole` to internal `AdminRole`.
 */
export function mapUserRoleToAdminRole(userRole: UserRole, email?: string): AdminRole {
  if (userRole === "ADMIN") {
    if (email?.includes("compliance")) return "COMPLIANCE_OFFICER";
    if (email?.includes("finance") || email?.includes("audit")) return "FINANCIAL_AUDITOR";
    return "SUPER_ADMIN";
  }
  if (userRole === "AUDITOR") {
    return "FINANCIAL_AUDITOR";
  }
  if (userRole === "MODERATOR") {
    return "CONTENT_MODERATOR";
  }
  throw new Error(`Role ${userRole} does not possess administrative access privileges.`);
}

/**
 * Resolves permissions granted for a given admin role.
 */
export function getPermissionsForRole(adminRole: AdminRole): AdminPermission[] {
  return ROLE_PERMISSIONS[adminRole] || [];
}

/**
 * Checks if a specific admin role is authorized for a permission.
 */
export function hasPermission(adminRole: AdminRole, permission: AdminPermission): boolean {
  const granted = ROLE_PERMISSIONS[adminRole] || [];
  return granted.includes(permission);
}

/**
 * Validates whether user role is permitted into the internal admin application.
 */
export function isAdministrativeRole(role: UserRole | string): boolean {
  return role === "ADMIN" || role === "AUDITOR" || role === "MODERATOR";
}
