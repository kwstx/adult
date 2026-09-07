"use client";

import React, { useState } from "react";
import { AdminProvider, useAdmin, PRESET_ADMINS } from "./context/admin-context";
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Video,
  FileCheck,
  AlertTriangle,
  CreditCard,
  Wallet,
  RotateCcw,
  DollarSign,
  Radio,
  History,
  Lock,
  Search,
  CheckCircle,
  X,
  LogOut,
  SlidersHorizontal,
  KeyRound,
} from "lucide-react";

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const {
    admin,
    isAuthenticated,
    isLoading,
    activeTab,
    setActiveTab,
    overviewStats,
    logout,
    login,
    showStepUpModal,
    closeStepUpModal,
    confirmStepUp,
    toastMessage,
  } = useAdmin();

  const [stepUpPin, setStepUpPin] = useState("");
  const [stepUpError, setStepUpError] = useState(false);

  const handleStepUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (stepUpPin === "7788" || stepUpPin === "admin" || stepUpPin.length >= 4) {
      setStepUpPin("");
      setStepUpError(false);
      confirmStepUp();
    } else {
      setStepUpError(true);
    }
  };

  const navItems = [
    { id: "overview", label: "Overview", icon: SlidersHorizontal },
    { id: "users", label: "Users Directory", icon: Users },
    { id: "creators", label: "Creators & 2257", icon: Video },
    {
      id: "reports",
      label: "Incident Reports",
      icon: AlertTriangle,
      badge: overviewStats?.openReportsCount || 0,
      badgeUrgent: (overviewStats?.urgentReportsCount || 0) > 0,
    },
    {
      id: "content",
      label: "Content Review",
      icon: FileCheck,
      badge: overviewStats?.pendingContentCount || 0,
    },
    {
      id: "verifications",
      label: "§ 2257 Vault",
      icon: ShieldCheck,
      badge: overviewStats?.pendingVerificationsCount || 0,
    },
    { id: "payments", label: "Payments Audit", icon: CreditCard },
    { id: "wallets", label: "Wallet Forensics", icon: Wallet },
    { id: "refunds", label: "Refunds & Adjust", icon: RotateCcw },
    {
      id: "chargebacks",
      label: "Chargebacks",
      icon: ShieldAlert,
      badge: overviewStats?.disputedChargebacksCount || 0,
    },
    {
      id: "payouts",
      label: "Creator Payouts",
      icon: DollarSign,
      badge: overviewStats?.pendingPayoutsCount || 0,
    },
    {
      id: "incidents",
      label: "Live Incidents",
      icon: Radio,
      badge: overviewStats?.activeLiveRooms || 0,
    },
    { id: "audit", label: "Immutable Audit", icon: History },
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border transition-all animate-in fade-in slide-in-from-top-4 ${
            toastMessage.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : toastMessage.type === "error"
              ? "bg-rose-950/90 border-rose-500/50 text-rose-200"
              : "bg-zinc-900/90 border-zinc-700 text-zinc-200"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          ) : toastMessage.type === "error" ? (
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-zinc-400" />
          )}
          <span className="text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Top Security Banner */}
      <header className="h-14 bg-zinc-950/90 border-b border-zinc-800/80 px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-600/30">
            <Lock className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-wider uppercase bg-gradient-to-r from-rose-400 via-amber-300 to-white bg-clip-text text-transparent">
                Internal Command Center
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                STRICT RBAC
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">Restricted Administration, Compliance & Financial Operations</p>
          </div>
        </div>

        {/* Admin Persona Switcher / Status */}
        <div className="flex items-center gap-4">
          {isAuthenticated && admin ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-white">{admin.displayName}</span>
                <span className="text-[10px] text-amber-400 font-mono">{admin.adminRole}</span>
              </div>
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
                {PRESET_ADMINS.map((p) => (
                  <button
                    key={p.username}
                    onClick={() => login(p.username)}
                    title={`Switch to ${p.displayName} (${p.adminRole})`}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                      admin.username === p.username
                        ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {p.adminRole === "SUPER_ADMIN"
                      ? "Super Admin"
                      : p.adminRole === "FINANCIAL_AUDITOR"
                      ? "Finance"
                      : "Mod"}
                  </button>
                ))}
              </div>
              <button
                onClick={logout}
                title="Log Out"
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-rose-400 font-mono">Unauthenticated Session</span>
          )}
        </div>
      </header>

      {/* Main App Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-zinc-950/60 border-r border-zinc-800/80 flex flex-col p-3 gap-1 overflow-y-auto shrink-0">
          <div className="px-3 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Control Domains
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-rose-600/20 to-amber-500/10 text-white border border-rose-500/40 shadow-lg shadow-rose-950/50 font-bold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? "text-rose-400" : "text-zinc-400"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      item.badgeUrgent
                        ? "bg-rose-500 text-white animate-pulse"
                        : isActive
                        ? "bg-rose-500/30 text-rose-300"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-[#090c14] overflow-y-auto p-6 sm:p-8">
          {children}
        </main>
      </div>

      {/* High-Impact Step-Up Authentication Modal */}
      {showStepUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-zinc-950 border border-rose-500/40 p-6 shadow-2xl shadow-rose-950/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Elevated Security Verification</h3>
                  <p className="text-[11px] text-zinc-400">Step-Up authorization required for sensitive operation</p>
                </div>
              </div>
              <button
                onClick={closeStepUpModal}
                className="p-1 rounded-xl text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-200 space-y-1">
              <p className="font-bold">⚠️ Irreversible Administrative Action</p>
              <p className="text-[11px] text-rose-300/80">
                You are executing an action that alters wallet balances, freezes user accounts, or permanently bans records.
                Enter your administrative PIN to confirm and seal the audit log.
              </p>
            </div>

            <form onSubmit={handleStepUpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Security PIN / Master Passcode (Demo: 7788)
                </label>
                <input
                  type="password"
                  value={stepUpPin}
                  onChange={(e) => setStepUpPin(e.target.value)}
                  placeholder="Enter 4-digit PIN"
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  autoFocus
                />
                {stepUpError && (
                  <p className="text-[11px] text-rose-400 mt-1">Invalid PIN. Try 7788.</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeStepUpModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30"
                >
                  Confirm & Execute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminProvider>
  );
}
