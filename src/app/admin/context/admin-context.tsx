"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { AdminRole, AdminPermission, DashboardOverviewStats } from "@/modules/admin/types";

export interface AdminUser {
  adminId: string;
  username: string;
  displayName: string;
  email: string;
  adminRole: AdminRole;
  permissions: AdminPermission[];
  token?: string;
}

interface AdminContextType {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  overviewStats: DashboardOverviewStats | null;
  refreshOverview: () => Promise<void>;
  login: (identifier: string) => Promise<boolean>;
  logout: () => void;
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  showStepUpModal: boolean;
  requestStepUp: (onConfirm: () => void) => void;
  closeStepUpModal: () => void;
  confirmStepUp: () => void;
  stepUpConfirmed: boolean;
  toastMessage: { text: string; type: "success" | "error" | "info" } | null;
  showToast: (text: string, type?: "success" | "error" | "info") => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const PRESET_ADMINS = [
  {
    id: "admin_sarah",
    username: "compliance_officer",
    displayName: "Sarah Connor (Compliance Lead)",
    email: "compliance@auralive.internal",
    adminRole: "SUPER_ADMIN" as AdminRole,
  },
  {
    id: "admin_finance",
    username: "finance_auditor",
    displayName: "Marcus Vance (Financial Auditor)",
    email: "finance@auralive.internal",
    adminRole: "FINANCIAL_AUDITOR" as AdminRole,
  },
  {
    id: "mod_lead",
    username: "mod_sentinel",
    displayName: "Elena Rostova (Safety Moderator)",
    email: "moderation@auralive.internal",
    adminRole: "CONTENT_MODERATOR" as AdminRole,
  },
];

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [overviewStats, setOverviewStats] = useState<DashboardOverviewStats | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showStepUpModal, setShowStepUpModal] = useState<boolean>(false);
  const [stepUpConfirmed, setStepUpConfirmed] = useState<boolean>(false);
  const [pendingStepUpAction, setPendingStepUpAction] = useState<(() => void) | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Auto-login default admin for internal testing environment
  useEffect(() => {
    const savedToken = typeof window !== "undefined" ? localStorage.getItem("adm_token") : null;
    const initialIdentifier = savedToken || PRESET_ADMINS[0].username;
    login(initialIdentifier).finally(() => setIsLoading(false));
  }, []);

  const login = async (identifier: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });

      const data = await res.json();
      if (res.ok && data.session) {
        setAdmin({
          adminId: data.session.adminId,
          username: data.session.username,
          displayName: data.session.displayName,
          email: data.session.email,
          adminRole: data.session.adminRole,
          permissions: data.session.permissions,
          token: data.session.token,
        });
        setToken(data.session.token);
        if (typeof window !== "undefined") {
          localStorage.setItem("adm_token", data.session.token);
        }
        setIsAuthenticated(true);
        refreshOverview(data.session.token);
        showToast(`Authenticated as ${data.session.displayName} (${data.session.adminRole})`, "success");
        return true;
      } else {
        showToast(data.error || "Administrative authentication failed.", "error");
        return false;
      }
    } catch {
      showToast("Network error authenticating admin.", "error");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAdmin(null);
    setToken(null);
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("adm_token");
    }
    showToast("Logged out of internal administration.", "info");
  };

  const adminFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set("x-admin-token", token);
    }
    if (admin?.adminId) {
      headers.set("x-admin-user-id", admin.adminId);
    }
    if (stepUpConfirmed) {
      headers.set("x-admin-step-up-confirmed", "true");
    }

    return await fetch(url, {
      ...options,
      headers,
    });
  };

  const refreshOverview = async (customToken?: string) => {
    try {
      const headers: Record<string, string> = {};
      const authToken = customToken || token;
      if (authToken) headers["x-admin-token"] = authToken;
      if (admin?.adminId) headers["x-admin-user-id"] = admin.adminId;

      const res = await fetch("/api/admin/overview", { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.stats) setOverviewStats(data.stats);
      }
    } catch {
      // Non-blocking
    }
  };

  const requestStepUp = (onConfirm: () => void) => {
    if (stepUpConfirmed) {
      onConfirm();
      return;
    }
    setPendingStepUpAction(() => onConfirm);
    setShowStepUpModal(true);
  };

  const confirmStepUp = () => {
    setStepUpConfirmed(true);
    setShowStepUpModal(false);
    if (pendingStepUpAction) {
      pendingStepUpAction();
      setPendingStepUpAction(null);
    }
    showToast("Step-up authorization verified for high-impact operation.", "success");
  };

  const closeStepUpModal = () => {
    setShowStepUpModal(false);
    setPendingStepUpAction(null);
  };

  return (
    <AdminContext.Provider
      value={{
        admin,
        isAuthenticated,
        isLoading,
        activeTab,
        setActiveTab,
        overviewStats,
        refreshOverview,
        login,
        logout,
        adminFetch,
        showStepUpModal,
        requestStepUp,
        closeStepUpModal,
        confirmStepUp,
        stepUpConfirmed,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used within an AdminProvider");
  return context;
}
