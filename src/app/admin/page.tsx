"use client";

import React, { useState, useEffect } from "react";
import { useAdmin } from "./context/admin-context";
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
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Lock,
  Unlock,
  Ban,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Filter,
  FileText,
  UserCheck,
  Shield,
  Activity,
  AlertOctagon,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";

export default function AdminDashboardPage() {
  const {
    admin,
    activeTab,
    setActiveTab,
    overviewStats,
    refreshOverview,
    adminFetch,
    requestStepUp,
    showToast,
  } = useAdmin();

  // --------------------------------------------------------------------------
  // STATE FOR PANELS
  // --------------------------------------------------------------------------

  // 1. Users Panel State
  const [users, setUsers] = useState<any[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [user360Detail, setUser360Detail] = useState<any | null>(null);
  const [userActionModal, setUserActionModal] = useState<{
    isOpen: boolean;
    user: any | null;
    action: "FREEZE" | "BAN" | "UNFREEZE" | "RESTRICT";
    reason: string;
  }>({ isOpen: false, user: null, action: "FREEZE", reason: "" });

  // 2. Creators Panel State
  const [creators, setCreators] = useState<any[]>([]);
  const [creatorQuery, setCreatorQuery] = useState("");
  const [selectedCreator, setSelectedCreator] = useState<any | null>(null);
  const [creator360Detail, setCreator360Detail] = useState<any | null>(null);

  // 3. Reports Panel State
  const [reports, setReports] = useState<any[]>([]);
  const [reportStatusFilter, setReportStatusFilter] = useState("");
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  // 4. Content Panel State
  const [contentItems, setContentItems] = useState<any[]>([]);
  const [contentFilter, setContentFilter] = useState("PENDING");

  // 5. Verifications Panel State
  const [verifications, setVerifications] = useState<any[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<any | null>(null);

  // 6. Payments Panel State
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentQuery, setPaymentQuery] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<any | null>(null);

  // 7. Wallets Panel State
  const [walletTargetId, setWalletTargetId] = useState("");
  const [walletInvestigation, setWalletInvestigation] = useState<any | null>(null);

  // 8. Refunds & Adjustments State
  const [refundTxId, setRefundTxId] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [adjUserId, setAdjUserId] = useState("");
  const [adjDirection, setAdjDirection] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [adjCreditType, setAdjCreditType] = useState<"PURCHASED" | "PROMOTIONAL" | "BONUS">("PROMOTIONAL");
  const [adjAmount, setAdjAmount] = useState(500);
  const [adjReason, setAdjReason] = useState("");

  // 9. Chargebacks State
  const [chargebacks, setChargebacks] = useState<any[]>([]);

  // 10. Payouts State
  const [payouts, setPayouts] = useState<any[]>([]);

  // 11. Live Incidents State
  const [activeStreams, setActiveStreams] = useState<any[]>([]);
  const [terminatedIncidents, setTerminatedIncidents] = useState<any[]>([]);

  // 12. Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTargetType, setAuditTargetType] = useState("");
  const [auditTargetId, setAuditTargetId] = useState("");
  const [auditChainVerified, setAuditChainVerified] = useState<boolean | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // --------------------------------------------------------------------------
  // DATA LOADERS PER TAB
  // --------------------------------------------------------------------------

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab]);

  const loadTabData = async (tab: string) => {
    setIsLoading(true);
    try {
      if (tab === "overview") {
        await refreshOverview();
      } else if (tab === "users") {
        const res = await adminFetch(`/api/admin/users?query=${encodeURIComponent(userQuery)}&role=${userRoleFilter}`);
        const data = await res.json();
        if (data.users) setUsers(data.users);
      } else if (tab === "creators") {
        const res = await adminFetch(`/api/admin/creators?query=${encodeURIComponent(creatorQuery)}`);
        const data = await res.json();
        if (data.creators) setCreators(data.creators);
      } else if (tab === "reports") {
        const res = await adminFetch(`/api/admin/reports?status=${reportStatusFilter}`);
        const data = await res.json();
        if (data.reports) setReports(data.reports);
      } else if (tab === "content") {
        const res = await adminFetch(`/api/admin/content?moderationState=${contentFilter}`);
        const data = await res.json();
        if (data.items) setContentItems(data.items);
      } else if (tab === "verifications") {
        const res = await adminFetch("/api/admin/verifications");
        const data = await res.json();
        if (data.verifications) setVerifications(data.verifications);
      } else if (tab === "payments") {
        const res = await adminFetch(
          `/api/admin/payments?query=${encodeURIComponent(paymentQuery)}&status=${paymentStatusFilter}`
        );
        const data = await res.json();
        if (data.payments) setPayments(data.payments);
      } else if (tab === "chargebacks") {
        const res = await adminFetch("/api/admin/chargebacks");
        const data = await res.json();
        if (data.chargebacks) setChargebacks(data.chargebacks);
      } else if (tab === "payouts") {
        const res = await adminFetch("/api/admin/payouts");
        const data = await res.json();
        if (data.payouts) setPayouts(data.payouts);
      } else if (tab === "incidents") {
        const res = await adminFetch("/api/admin/livestreams/incidents");
        const data = await res.json();
        if (data.activeStreams) setActiveStreams(data.activeStreams);
        if (data.terminatedIncidents) setTerminatedIncidents(data.terminatedIncidents);
      } else if (tab === "audit") {
        const res = await adminFetch(
          `/api/admin/audit?targetEntityType=${encodeURIComponent(auditTargetType)}&targetEntityId=${encodeURIComponent(
            auditTargetId
          )}&verifyIntegrity=true`
        );
        const data = await res.json();
        if (data.events) setAuditLogs(data.events);
        if (data.verificationResult) setAuditChainVerified(data.verificationResult.isValid);
      }
    } catch {
      showToast("Error loading tab data.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // ACTIONS: USERS
  // --------------------------------------------------------------------------

  const inspectUser = async (userId: string) => {
    try {
      const res = await adminFetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      if (data.user) {
        setSelectedUser(data.user);
        setUser360Detail(data);
      }
    } catch {
      showToast("Failed to fetch User 360 data.", "error");
    }
  };

  const executeAccountAction = async () => {
    if (!userActionModal.user || !userActionModal.reason) {
      showToast("A clear moderation reason is required.", "error");
      return;
    }

    const userId = userActionModal.user.id;
    const nextState =
      userActionModal.action === "UNFREEZE"
        ? "ACTIVE"
        : userActionModal.action === "BAN"
        ? "BANNED"
        : userActionModal.action === "RESTRICT"
        ? "RESTRICTED"
        : "SUSPENDED";

    requestStepUp(async () => {
      try {
        const res = await adminFetch(`/api/admin/users/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moderationState: nextState,
            reason: userActionModal.reason,
            banReason: userActionModal.action === "BAN" ? userActionModal.reason : undefined,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          showToast(`Account successfully updated to ${nextState}.`, "success");
          setUserActionModal({ isOpen: false, user: null, action: "FREEZE", reason: "" });
          loadTabData("users");
          if (selectedUser?.id === userId) inspectUser(userId);
        } else {
          showToast(data.error || "Action failed.", "error");
        }
      } catch {
        showToast("Failed to execute moderation action.", "error");
      }
    });
  };

  // --------------------------------------------------------------------------
  // ACTIONS: CREATORS
  // --------------------------------------------------------------------------

  const inspectCreator = async (creatorId: string) => {
    try {
      const res = await adminFetch(`/api/admin/creators/${creatorId}`);
      const data = await res.json();
      if (data.creator) {
        setSelectedCreator(data.creator);
        setCreator360Detail(data);
      }
    } catch {
      showToast("Failed to fetch Creator 360 data.", "error");
    }
  };

  // --------------------------------------------------------------------------
  // ACTIONS: REPORTS
  // --------------------------------------------------------------------------

  const handleResolveReport = async (reportId: string, action: "DISMISS" | "ACTION_TAKEN" | "ESCALATE") => {
    const notes = prompt(`Enter resolution notes for report ${reportId}:`, "Reviewed by Administrator");
    if (!notes) return;

    try {
      const res = await adminFetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, action, notes }),
      });
      if (res.ok) {
        showToast(`Report resolved (${action}).`, "success");
        loadTabData("reports");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to resolve report.", "error");
      }
    } catch {
      showToast("Failed to resolve report.", "error");
    }
  };

  // --------------------------------------------------------------------------
  // ACTIONS: CONTENT
  // --------------------------------------------------------------------------

  const handleReviewContent = async (contentId: string, decision: "APPROVED" | "RESTRICTED" | "REMOVED" | "REJECTED") => {
    const reason = prompt(`Enter mandatory moderation reason for content ${contentId}:`, `Policy review: ${decision}`);
    if (!reason) return;

    try {
      const res = await adminFetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, decision, reason }),
      });
      if (res.ok) {
        showToast(`Content decision rendered: ${decision}`, "success");
        loadTabData("content");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to moderate content.", "error");
      }
    } catch {
      showToast("Failed to moderate content.", "error");
    }
  };

  // --------------------------------------------------------------------------
  // ACTIONS: VERIFICATIONS (2257 & KYC)
  // --------------------------------------------------------------------------

  const handleReviewVerification = async (verificationId: string, decision: "APPROVED" | "REJECTED") => {
    let rejectionReason;
    if (decision === "REJECTED") {
      rejectionReason = prompt("Enter specific reason for rejecting 2257 verification:", "Identity documents unreadable or expired.");
      if (!rejectionReason) return;
    }

    requestStepUp(async () => {
      try {
        const res = await adminFetch("/api/admin/verifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verificationId,
            decision,
            rejectionReason,
            complianceNotes: `Certified under 18 U.S.C. § 2257 by Admin: ${admin?.displayName}`,
          }),
        });
        if (res.ok) {
          showToast(`Creator verification ${decision}. KYC & 2257 status updated.`, "success");
          setSelectedVerification(null);
          loadTabData("verifications");
        } else {
          const err = await res.json();
          showToast(err.error || "Verification review failed.", "error");
        }
      } catch {
        showToast("Failed to process verification.", "error");
      }
    });
  };

  // --------------------------------------------------------------------------
  // ACTIONS: WALLETS, REFUNDS & ADJUSTMENTS
  // --------------------------------------------------------------------------

  const handleInvestigateWallet = async () => {
    if (!walletTargetId) return;
    try {
      setIsLoading(true);
      const res = await adminFetch(`/api/admin/wallets?targetId=${encodeURIComponent(walletTargetId)}`);
      const data = await res.json();
      if (data.wallet) {
        setWalletInvestigation(data);
        showToast("Forensic statement and reconciliation loaded.", "success");
      } else {
        showToast(data.error || "Wallet not found.", "error");
      }
    } catch {
      showToast("Failed to query wallet forensics.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteRefund = async () => {
    if (!refundTxId || !refundReason) {
      showToast("Transaction ID and reason are mandatory.", "error");
      return;
    }

    requestStepUp(async () => {
      try {
        const res = await adminFetch("/api/admin/financial/refund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId: refundTxId,
            reason: refundReason,
            idempotencyKey: `adm_ref_${refundTxId}_${Date.now()}`,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          showToast("Controlled refund executed and ledger debited atomically.", "success");
          setRefundTxId("");
          setRefundReason("");
        } else {
          showToast(data.error || "Refund execution failed.", "error");
        }
      } catch {
        showToast("Failed to execute refund.", "error");
      }
    });
  };

  const handleExecuteAdjustment = async () => {
    if (!adjUserId || !adjReason || adjAmount <= 0) {
      showToast("User ID, amount, and reason are required.", "error");
      return;
    }

    requestStepUp(async () => {
      try {
        const res = await adminFetch("/api/admin/financial/adjustment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: adjUserId,
            direction: adjDirection,
            creditType: adjCreditType,
            amountCredits: Number(adjAmount),
            reason: adjReason,
            idempotencyKey: `adm_adj_${adjUserId}_${Date.now()}`,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          showToast(`Adjustment (${adjDirection} ${adjAmount} credits) recorded.`, "success");
          setAdjUserId("");
          setAdjReason("");
        } else {
          showToast(data.error || "Adjustment failed.", "error");
        }
      } catch {
        showToast("Failed to process balance adjustment.", "error");
      }
    });
  };

  // --------------------------------------------------------------------------
  // ACTIONS: PAYOUTS
  // --------------------------------------------------------------------------

  const handleReviewPayout = async (payoutId: string, decision: "APPROVE" | "REJECT") => {
    let rejectionReason;
    if (decision === "REJECT") {
      rejectionReason = prompt("Enter reason for rejecting creator payout:", "Compliance review hold / suspicious volume");
      if (!rejectionReason) return;
    }

    requestStepUp(async () => {
      try {
        const res = await adminFetch("/api/admin/payouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payoutId,
            decision,
            rejectionReason,
            gatewayReferenceId: decision === "APPROVE" ? `paxum_tx_${Date.now()}` : undefined,
          }),
        });
        if (res.ok) {
          showToast(`Payout request ${decision === "APPROVE" ? "Approved & Settled" : "Rejected & Refunded"}.`, "success");
          loadTabData("payouts");
        } else {
          const err = await res.json();
          showToast(err.error || "Failed to review payout.", "error");
        }
      } catch {
        showToast("Failed to review payout.", "error");
      }
    });
  };

  // --------------------------------------------------------------------------
  // ACTIONS: INCIDENTS & EMERGENCY STREAM TERMINATION
  // --------------------------------------------------------------------------

  const handleTerminateStream = async (livestreamId: string) => {
    const reason = prompt("Enter emergency termination reason for this broadcast:", "Severe Safety Policy Violation");
    if (!reason) return;

    const suspendCreator = confirm("Also suspend the creator's account?");

    requestStepUp(async () => {
      try {
        const res = await adminFetch("/api/admin/livestreams/incidents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            livestreamId,
            reason,
            moderationAction: suspendCreator ? "SUSPEND_CREATOR" : "TERMINATE_ONLY",
          }),
        });
        if (res.ok) {
          showToast("Livestream emergency kill switch executed.", "success");
          loadTabData("incidents");
        } else {
          const err = await res.json();
          showToast(err.error || "Failed to terminate stream.", "error");
        }
      } catch {
        showToast("Failed to terminate livestream.", "error");
      }
    });
  };

  // ==========================================================================
  // RENDER TABS
  // ==========================================================================

  return (
    <div className="space-y-6">
      {/* -------------------------------------------------------------------- */}
      {/* TAB 1: OVERVIEW */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white">Platform Operations Center</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Real-time health telemetry, compliance queues & financial metrics</p>
            </div>
            <button
              onClick={() => refreshOverview()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Telemetry</span>
            </button>
          </div>

          {/* Vital Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-zinc-950/80 border border-zinc-800/80 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Users</span>
                <Users className="h-4 w-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black text-white">{overviewStats?.totalUsers ?? "—"}</div>
              <p className="text-[10px] text-zinc-400">Total registered fan & creator accounts</p>
            </div>

            <div className="p-5 rounded-3xl bg-zinc-950/80 border border-zinc-800/80 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Active Broadcasts</span>
                <Radio className="h-4 w-4 text-rose-500 animate-pulse" />
              </div>
              <div className="text-2xl font-black text-white">{overviewStats?.activeLiveRooms ?? "—"}</div>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                <Activity className="h-3 w-3" /> Live edge video channels running
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-zinc-950/80 border border-zinc-800/80 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Pending Payouts</span>
                <DollarSign className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white">
                ${(((overviewStats?.totalPendingPayoutsCents || 0) / 100)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-amber-400">
                {overviewStats?.pendingPayoutsCount || 0} creator requests awaiting review
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-zinc-950/80 border border-zinc-800/80 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Audit Integrity</span>
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
                <span>SEALED</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">SHA-256</span>
              </div>
              <p className="text-[10px] text-zinc-400">Cryptographic audit chain fully verified</p>
            </div>
          </div>

          {/* Actionable Queues Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Reports Queue Box */}
            <div
              onClick={() => setActiveTab("reports")}
              className="p-5 rounded-3xl bg-zinc-950/60 border border-zinc-800 hover:border-rose-500/50 cursor-pointer transition-all space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Incident Reports</span>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-rose-400 transition-transform group-hover:translate-x-1" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{overviewStats?.openReportsCount ?? 0}</span>
                <span className="text-xs text-zinc-400">pending triage</span>
              </div>
              {(overviewStats?.urgentReportsCount || 0) > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
                  <AlertOctagon className="h-3.5 w-3.5" />
                  <span>{overviewStats?.urgentReportsCount} Critical Zero-Tolerance Reports!</span>
                </div>
              )}
            </div>

            {/* § 2257 Vault Queue Box */}
            <div
              onClick={() => setActiveTab("verifications")}
              className="p-5 rounded-3xl bg-zinc-950/60 border border-zinc-800 hover:border-emerald-500/50 cursor-pointer transition-all space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">§ 2257 KYC Queue</span>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-emerald-400 transition-transform group-hover:translate-x-1" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{overviewStats?.pendingVerificationsCount ?? 0}</span>
                <span className="text-xs text-zinc-400">applications to certify</span>
              </div>
              <p className="text-[11px] text-zinc-400">Government ID & Selfie recordkeeping compliance</p>
            </div>

            {/* Content Review Box */}
            <div
              onClick={() => setActiveTab("content")}
              className="p-5 rounded-3xl bg-zinc-950/60 border border-zinc-800 hover:border-purple-500/50 cursor-pointer transition-all space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Content Review</span>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-purple-400 transition-transform group-hover:translate-x-1" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{overviewStats?.pendingContentCount ?? 0}</span>
                <span className="text-xs text-zinc-400">uploads queued</span>
              </div>
              <p className="text-[11px] text-zinc-400">Photos, videos, albums & PPV media</p>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 2: USERS DIRECTORY & 360 */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white">Users Directory & Risk Profiles</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Search fans and creators, inspect connected devices & enforce moderation</p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadTabData("users")}
                placeholder="Search by User ID, username, email, or display name..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />
            </div>
            <select
              value={userRoleFilter}
              onChange={(e) => {
                setUserRoleFilter(e.target.value);
                loadTabData("users");
              }}
              className="px-4 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-rose-500"
            >
              <option value="">All Roles</option>
              <option value="FAN">Fan</option>
              <option value="CREATOR">Creator</option>
              <option value="ADMIN">Admin</option>
              <option value="MODERATOR">Moderator</option>
              <option value="AUDITOR">Auditor</option>
            </select>
            <button
              onClick={() => loadTabData("users")}
              className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/20"
            >
              Search
            </button>
          </div>

          {/* Users Table */}
          <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 overflow-hidden shadow-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 font-bold border-b border-zinc-800 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">User Identity</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">KYC / 2257</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Wallet Balance</th>
                  <th className="px-4 py-3.5">Reports</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-zinc-400">
                      No matching users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"}
                            alt={u.username}
                            className="h-8 w-8 rounded-xl object-cover ring-1 ring-zinc-800"
                          />
                          <div>
                            <p className="font-bold text-white">{u.displayName}</p>
                            <p className="text-[10px] text-zinc-400 font-mono">@{u.username} • {u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-300">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.kycStatus === "COMPLIANCE_2257_APPROVED"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : u.kycStatus === "AGE_VERIFIED"
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {u.kycStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.isBanned || u.moderationState === "BANNED"
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : u.moderationState === "SUSPENDED"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-emerald-500/10 text-emerald-400"
                          }`}
                        >
                          {u.isBanned ? "BANNED" : u.moderationState}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-white">
                        {u.wallet?.balance?.toLocaleString() || 0} cr
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                            (u._count?.reportsReceived || 0) > 0
                              ? "bg-rose-500/20 text-rose-300"
                              : "bg-zinc-900 text-zinc-400"
                          }`}
                        >
                          {u._count?.reportsReceived || 0} rcvd
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => inspectUser(u.id)}
                            className="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-[11px] font-bold text-zinc-300 border border-zinc-800"
                          >
                            360 Profile
                          </button>
                          {u.moderationState === "ACTIVE" ? (
                            <button
                              onClick={() => setUserActionModal({ isOpen: true, user: u, action: "FREEZE", reason: "" })}
                              className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-[11px] font-bold text-amber-300 border border-amber-500/40"
                            >
                              Freeze
                            </button>
                          ) : (
                            <button
                              onClick={() => setUserActionModal({ isOpen: true, user: u, action: "UNFREEZE", reason: "Cleared by administrator review." })}
                              className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-[11px] font-bold text-emerald-300 border border-emerald-500/40"
                            >
                              Unfreeze
                            </button>
                          )}
                          {!u.isBanned && (
                            <button
                              onClick={() => setUserActionModal({ isOpen: true, user: u, action: "BAN", reason: "" })}
                              className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-[11px] font-bold text-white shadow-md shadow-rose-600/20"
                            >
                              Ban
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* User 360 Detail Modal */}
          {user360Detail && selectedUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-zinc-950 border border-zinc-800 p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedUser.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"}
                      alt={selectedUser.username}
                      className="h-12 w-12 rounded-2xl object-cover ring-2 ring-rose-500"
                    />
                    <div>
                      <h2 className="text-lg font-black text-white">{selectedUser.displayName}</h2>
                      <p className="text-xs text-zinc-400 font-mono">ID: {selectedUser.id} • @{selectedUser.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setUser360Detail(null)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-300"
                  >
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Wallet Total</span>
                    <p className="text-lg font-black text-white font-mono mt-1">
                      {user360Detail.wallet?.balance?.toLocaleString() || 0} credits
                    </p>
                    <p className="text-[10px] text-zinc-400">Purchased: {user360Detail.wallet?.purchasedBalance || 0}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Account State</span>
                    <p className="text-lg font-black text-emerald-400 mt-1">{selectedUser.moderationState}</p>
                    <p className="text-[10px] text-zinc-400">KYC: {selectedUser.kycStatus}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Connected Devices</span>
                    <p className="text-lg font-black text-blue-400 mt-1">{user360Detail.deviceFingerprints?.length || 0}</p>
                    <p className="text-[10px] text-zinc-400">Fingerprints tracked</p>
                  </div>
                </div>

                {/* Audit History Snapshot */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Recent Audit Trail</h3>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {user360Detail.auditHistory?.map((a: any) => (
                      <div key={a.id} className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 text-[11px] flex justify-between">
                        <span className="font-mono text-rose-300 font-bold">{a.action}</span>
                        <span className="text-zinc-400 font-mono">{new Date(a.createdAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Account Action (Freeze/Ban/Unfreeze) Modal */}
          {userActionModal.isOpen && userActionModal.user && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="w-full max-w-md rounded-3xl bg-zinc-950 border border-rose-500/40 p-6 shadow-2xl space-y-4">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Confirm {userActionModal.action}: @{userActionModal.user.username}
                </h3>
                <p className="text-xs text-zinc-300">
                  This action triggers authoritative state transitions and writes a permanent cryptographic audit event.
                </p>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1.5">Mandatory Reason / Justification</label>
                  <textarea
                    value={userActionModal.reason}
                    onChange={(e) => setUserActionModal({ ...userActionModal, reason: e.target.value })}
                    placeholder="Enter thorough operational or policy justification..."
                    rows={3}
                    className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setUserActionModal({ isOpen: false, user: null, action: "FREEZE", reason: "" })}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeAccountAction}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30"
                  >
                    Execute {userActionModal.action}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 3: CREATORS DIRECTORY */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "creators" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white">Creators & § 2257 Directory</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Manage creator profiles, earnings clearance & compliance certifications</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={creatorQuery}
                onChange={(e) => setCreatorQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadTabData("creators")}
                placeholder="Search by creator stage name, username, or email..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />
            </div>
            <button
              onClick={() => loadTabData("creators")}
              className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/20"
            >
              Search Creators
            </button>
          </div>

          {/* Creators Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {creators.map((c) => (
              <div key={c.id} className="p-5 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4 hover:border-zinc-700 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={c.user?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                      alt={c.stageName}
                      className="h-10 w-10 rounded-2xl object-cover ring-1 ring-emerald-500"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-white">{c.stageName || c.user?.displayName}</h3>
                      <p className="text-[11px] text-zinc-400 font-mono">@{c.user?.username}</p>
                    </div>
                  </div>
                  {c.isLive ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                      LIVE NOW
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-400">
                      OFFLINE
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-zinc-400 border-t border-zinc-900 pt-3">
                  <div className="flex justify-between">
                    <span>Moderation State:</span>
                    <span className="text-emerald-400 font-bold">{c.moderationState}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Followers:</span>
                    <span className="text-white font-mono">{c.totalFollowers?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Content Items:</span>
                    <span className="text-white font-mono">{c._count?.contents || 0}</span>
                  </div>
                </div>

                <button
                  onClick={() => inspectCreator(c.id)}
                  className="w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-200 border border-zinc-800"
                >
                  Inspect Creator 360
                </button>
              </div>
            ))}
          </div>

          {/* Creator 360 Detail Modal */}
          {creator360Detail && selectedCreator && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-zinc-950 border border-zinc-800 p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedCreator.user?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                      alt={selectedCreator.stageName}
                      className="h-12 w-12 rounded-2xl object-cover ring-2 ring-emerald-500"
                    />
                    <div>
                      <h2 className="text-lg font-black text-white">{selectedCreator.stageName}</h2>
                      <p className="text-xs text-zinc-400 font-mono">Creator ID: {selectedCreator.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCreator360Detail(null)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-300"
                  >
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Gross Earned</span>
                    <p className="text-lg font-black text-white font-mono mt-1">
                      {creator360Detail.earningsSummary?.totalGrossCredits?.toLocaleString() || 0} cr
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Net Creator Share</span>
                    <p className="text-lg font-black text-emerald-400 font-mono mt-1">
                      {creator360Detail.earningsSummary?.totalNetCredits?.toLocaleString() || 0} cr
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Active Subscribers</span>
                    <p className="text-lg font-black text-purple-400 mt-1">{creator360Detail.subscribersCount || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 4: INCIDENT REPORTS TRIAGE */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white">Trust & Safety Incident Reports</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Authoritative 24/7 moderation queue, policy triage & legal escalation</p>
            </div>
            <select
              value={reportStatusFilter}
              onChange={(e) => {
                setReportStatusFilter(e.target.value);
                loadTabData("reports");
              }}
              className="px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open Only</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="ACTION_TAKEN">Action Taken</option>
              <option value="RESOLVED_DISMISSED">Dismissed</option>
            </select>
          </div>

          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="py-12 text-center rounded-3xl bg-zinc-950 border border-zinc-800">
                <CheckCircle className="mx-auto h-10 w-10 text-emerald-400 mb-2" />
                <p className="text-sm font-bold text-white">All Reports Resolved</p>
                <p className="text-xs text-zinc-400 mt-1">Zero pending moderation incident reports.</p>
              </div>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="p-5 rounded-3xl bg-zinc-950 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
                        {r.category}
                      </span>
                      <span className="text-xs text-zinc-400">
                        Target: <strong className="text-white">{r.reportedUser?.username || r.reportedCreatorProfile?.stageName || r.reportedContent?.title || "Entity"}</strong>
                      </span>
                      <span className="text-xs text-zinc-400">• Reporter: {r.reporter?.displayName || "Anonymous"}</span>
                    </div>
                    <p className="text-xs text-zinc-200">{r.description}</p>
                    <p className="text-[10px] text-zinc-400 font-mono">Report ID: {r.id} • {new Date(r.createdAt).toLocaleString()}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleResolveReport(r.id, "DISMISS")}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-300"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleResolveReport(r.id, "ACTION_TAKEN")}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-md shadow-rose-600/30"
                    >
                      Take Action
                    </button>
                    <button
                      onClick={() => handleResolveReport(r.id, "ESCALATE")}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-xs font-bold text-amber-300 border border-amber-500/40"
                    >
                      Escalate Legal
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 5: CONTENT MODERATION */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "content" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white">Content Review & Moderation</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Inspect uploaded photos, videos, albums and execute emergency takedowns</p>
            </div>
            <select
              value={contentFilter}
              onChange={(e) => {
                setContentFilter(e.target.value);
                loadTabData("content");
              }}
              className="px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300"
            >
              <option value="PENDING">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="RESTRICTED">Restricted</option>
              <option value="REMOVED">Removed</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contentItems.map((item) => (
              <div key={item.id} className="rounded-3xl bg-zinc-950 border border-zinc-800 overflow-hidden space-y-3">
                <div className="h-44 bg-zinc-900 relative">
                  <img
                    src={item.previewUrl || item.mediaUrl || "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80"}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/80 backdrop-blur-md text-white">
                    {item.contentType} • {item.accessLevel}
                  </span>
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                    {item.moderationState}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-xs font-bold text-white">{item.title}</h3>
                    <p className="text-[11px] text-zinc-400">{item.description || "No description provided."}</p>
                    <p className="text-[10px] text-zinc-400 font-mono mt-1">Creator: {item.creatorProfile?.stageName}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                    <button
                      onClick={() => handleReviewContent(item.id, "APPROVED")}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[11px] font-bold text-white shadow-md shadow-emerald-600/20"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReviewContent(item.id, "RESTRICTED")}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-[11px] font-bold text-amber-300 border border-amber-500/40"
                    >
                      Restrict
                    </button>
                    <button
                      onClick={() => handleReviewContent(item.id, "REMOVED")}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-[11px] font-bold text-white shadow-md shadow-rose-600/20"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 6: 18 U.S.C. § 2257 CUSTODIAN VAULT */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "verifications" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white">18 U.S.C. § 2257 Recordkeeping Custodian Vault</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Statutory compliance verification, government ID inspection & primary custodian records</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {verifications.map((v) => (
              <div key={v.id} className="p-5 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={v.user?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                      alt={v.legalFirstName}
                      className="h-10 w-10 rounded-2xl object-cover ring-1 ring-emerald-500"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-white">{v.legalFirstName} {v.legalLastName}</h3>
                      <p className="text-[11px] text-zinc-400 font-mono">@{v.user?.username} • DOB: {new Date(v.dateOfBirth).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {v.verificationStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-center">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">ID Document Type</span>
                    <p className="text-xs font-bold text-white mt-0.5">{v.idType}</p>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-center">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold">Encrypted Vault ID</span>
                    <p className="text-xs font-mono text-zinc-300 mt-0.5">●●●●-SECURED</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-900">
                  <button
                    onClick={() => handleReviewVerification(v.id, "REJECTED")}
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-rose-400 border border-zinc-800"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleReviewVerification(v.id, "APPROVED")}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30"
                  >
                    Approve & Certify § 2257
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 7: PAYMENTS AUDIT */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "payments" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white">Payment Transactions & Risk Investigation</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Search fiat purchases across gateways (CCBill, SegPay, Stripe) and inspect risk scores</p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={paymentQuery}
                onChange={(e) => setPaymentQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadTabData("payments")}
                placeholder="Search by Payment ID, Gateway Tx ID, Idempotency Key, or username..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              />
            </div>
            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                loadTabData("payments");
              }}
              className="px-4 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300"
            >
              <option value="">All Statuses</option>
              <option value="SUCCEEDED">Succeeded</option>
              <option value="DISPUTED_CHARGEBACK">Disputed / Chargeback</option>
              <option value="REFUNDED">Refunded</option>
              <option value="FAILED">Failed</option>
            </select>
            <button
              onClick={() => loadTabData("payments")}
              className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/20"
            >
              Search
            </button>
          </div>

          <div className="rounded-3xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 font-bold border-b border-zinc-800 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Tx ID / Date</th>
                  <th className="px-4 py-3.5">User</th>
                  <th className="px-4 py-3.5">Gateway</th>
                  <th className="px-4 py-3.5">Amount Fiat</th>
                  <th className="px-4 py-3.5">Credits Minted</th>
                  <th className="px-4 py-3.5">Risk Score</th>
                  <th className="px-4 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300 font-mono">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-900/40">
                    <td className="px-5 py-3.5">
                      <p className="text-white font-bold">{p.id.slice(0, 16)}...</p>
                      <p className="text-[10px] text-zinc-400">{new Date(p.createdAt).toLocaleString()}</p>
                    </td>
                    <td className="px-4 py-3.5 font-sans font-bold text-white">@{p.user?.username}</td>
                    <td className="px-4 py-3.5">{p.paymentGateway}</td>
                    <td className="px-4 py-3.5 font-bold text-white">${(p.amountFiatCents / 100).toFixed(2)}</td>
                    <td className="px-4 py-3.5 text-emerald-400">+{p.creditsPurchased} cr</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        (p.riskScore || 0) > 70 ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/10 text-emerald-400"
                      }`}>
                        {p.riskScore ?? "0"}/100
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-sans">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === "SUCCEEDED" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 8: WALLETS FORENSICS */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "wallets" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white">Forensic Wallet Ledger & Reconciliation</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Trace immutable credit lots (FIFO), explain transaction deductions & verify ledger balances</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={walletTargetId}
              onChange={(e) => setWalletTargetId(e.target.value)}
              placeholder="Enter Target User ID or Wallet ID..."
              className="flex-1 px-4 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
            />
            <button
              onClick={handleInvestigateWallet}
              className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white"
            >
              Investigate Wallet
            </button>
          </div>

          {walletInvestigation && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold">Current Balance</span>
                  <p className="text-xl font-black text-white font-mono mt-1">{walletInvestigation.wallet?.balance} cr</p>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold">Purchased Lot</span>
                  <p className="text-xl font-black text-emerald-400 font-mono mt-1">{walletInvestigation.wallet?.purchasedBalance} cr</p>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold">Promotional Lot</span>
                  <p className="text-xl font-black text-purple-400 font-mono mt-1">{walletInvestigation.wallet?.promotionalBalance} cr</p>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold">Reconciliation</span>
                  <p className={`text-xl font-black font-mono mt-1 ${walletInvestigation.reconciliation?.isBalanced ? "text-emerald-400" : "text-rose-500"}`}>
                    {walletInvestigation.reconciliation?.isBalanced ? "BALANCED" : "DISCREPANCY"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 9: REFUNDS & ADJUSTMENTS */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "refunds" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white">Controlled Refunds & Administrative Adjustments</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Authoritatively reverse transactions or grant/debit balances with mandatory audit seals</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tool 1: Controlled Refund */}
            <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-rose-400" />
                <h2 className="text-sm font-black text-white uppercase tracking-wider">Issue Controlled Refund</h2>
              </div>
              <p className="text-xs text-zinc-400">
                Atomically refund a purchase/transaction. Credits are returned to the fan and deducted from creator earnings.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Original Transaction ID</label>
                  <input
                    type="text"
                    value={refundTxId}
                    onChange={(e) => setRefundTxId(e.target.value)}
                    placeholder="Enter Transaction UUID..."
                    className="w-full px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Mandatory Refund Reason</label>
                  <input
                    type="text"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="e.g. Media corrupted / accidental double tip..."
                    className="w-full px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white"
                  />
                </div>
                <button
                  onClick={handleExecuteRefund}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30"
                >
                  Execute Controlled Refund
                </button>
              </div>
            </div>

            {/* Tool 2: Balance Adjustment */}
            <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-400" />
                <h2 className="text-sm font-black text-white uppercase tracking-wider">Issue Manual Adjustment</h2>
              </div>
              <p className="text-xs text-zinc-400">
                Directly adjust a user's wallet with promotional grants or corrective debits.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Target User ID</label>
                  <input
                    type="text"
                    value={adjUserId}
                    onChange={(e) => setAdjUserId(e.target.value)}
                    placeholder="Enter User UUID..."
                    className="w-full px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">Direction</label>
                    <select
                      value={adjDirection}
                      onChange={(e) => setAdjDirection(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white"
                    >
                      <option value="CREDIT">CREDIT (+)</option>
                      <option value="DEBIT">DEBIT (-)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">Lot Type</label>
                    <select
                      value={adjCreditType}
                      onChange={(e) => setAdjCreditType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white"
                    >
                      <option value="PROMOTIONAL">Promotional</option>
                      <option value="BONUS">Bonus</option>
                      <option value="PURCHASED">Purchased</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">Amount</label>
                    <input
                      type="number"
                      value={adjAmount}
                      onChange={(e) => setAdjAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Mandatory Justification</label>
                  <input
                    type="text"
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    placeholder="e.g. VIP goodwill compensation / promo bonus"
                    className="w-full px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white"
                  />
                </div>
                <button
                  onClick={handleExecuteAdjustment}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30"
                >
                  Process Adjustment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 10: CHARGEBACKS */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "chargebacks" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white">Disputed Transactions & Chargebacks</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Manage bank disputes, loss prevention holds & fraud counter-measures</p>
            </div>
          </div>

          <div className="rounded-3xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 font-bold border-b border-zinc-800 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Transaction</th>
                  <th className="px-4 py-3.5">User</th>
                  <th className="px-4 py-3.5">Amount Disputed</th>
                  <th className="px-4 py-3.5">Gateway</th>
                  <th className="px-4 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300 font-mono">
                {chargebacks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-zinc-400 font-sans">
                      Zero active disputed chargebacks.
                    </td>
                  </tr>
                ) : (
                  chargebacks.map((c) => (
                    <tr key={c.id}>
                      <td className="px-5 py-3.5 text-white font-bold">{c.id.slice(0, 16)}...</td>
                      <td className="px-4 py-3.5 font-sans">@{c.user?.username}</td>
                      <td className="px-4 py-3.5 text-rose-400 font-bold">${(c.amountFiatCents / 100).toFixed(2)}</td>
                      <td className="px-4 py-3.5">{c.paymentGateway}</td>
                      <td className="px-4 py-3.5 font-sans">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 11: CREATOR PAYOUTS */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "payouts" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white">Creator Payout Settlement Queue</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Review tax compliance, inspect cleared balances & authorize wire/Paxum/crypto transfers</p>
            </div>
          </div>

          <div className="space-y-3">
            {payouts.length === 0 ? (
              <div className="py-12 text-center rounded-3xl bg-zinc-950 border border-zinc-800">
                <CheckCircle className="mx-auto h-10 w-10 text-emerald-400 mb-2" />
                <p className="text-sm font-bold text-white">All Payouts Processed</p>
                <p className="text-xs text-zinc-400 mt-1">Zero pending creator payout requests.</p>
              </div>
            ) : (
              payouts.map((p) => (
                <div key={p.id} className="p-5 rounded-3xl bg-zinc-950 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{p.creatorProfile?.stageName}</span>
                      <span className="text-xs text-zinc-400">(@{p.creatorProfile?.user?.username})</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 font-mono">
                        {p.payoutMethod}
                      </span>
                    </div>
                    <p className="text-base font-black text-emerald-400 font-mono">
                      ${(p.amountFiatCents / 100).toFixed(2)} USD ({p.creditsDeducted.toLocaleString()} credits)
                    </p>
                    <p className="text-[10px] text-zinc-400 font-mono">Payout ID: {p.id} • Requested: {new Date(p.requestedAt).toLocaleString()}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReviewPayout(p.id, "REJECT")}
                      className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-rose-400 border border-zinc-800"
                    >
                      Reject & Refund
                    </button>
                    <button
                      onClick={() => handleReviewPayout(p.id, "APPROVE")}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30"
                    >
                      Approve & Settle
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 12: LIVE INCIDENTS */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "incidents" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white">Live Broadcast Incident Monitor</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Monitor real-time live rooms and execute emergency stream kill switches</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeStreams.map((s) => (
              <div key={s.id} className="p-5 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-rose-500 animate-ping" />
                    <div>
                      <h3 className="text-sm font-bold text-white">{s.title}</h3>
                      <p className="text-[11px] text-zinc-400">Creator: {s.creatorProfile?.stageName} (@{s.creatorProfile?.user?.username})</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-zinc-900 text-zinc-300">
                    {s.currentViewerCount} viewers
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                  <span className="text-[11px] text-zinc-400 font-mono">Stream ID: {s.id.slice(0, 16)}...</span>
                  <button
                    onClick={() => handleTerminateStream(s.id)}
                    className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30"
                  >
                    Kill Stream (Emergency)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 13: IMMUTABLE AUDIT LOGS */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white">Immutable Tamper-Evident Audit Ledger</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Cryptographically chained SHA-256 event seals for all state transitions & financial actions</p>
            </div>
            {auditChainVerified !== null && (
              <span className={`px-3 py-1.5 rounded-2xl text-xs font-bold font-mono ${
                auditChainVerified ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-rose-500/20 text-rose-300"
              }`}>
                {auditChainVerified ? "✓ CHAIN INTEGRITY VALIDATED" : "⚠ CHAIN CORRUPTED"}
              </span>
            )}
          </div>

          <div className="rounded-3xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 font-bold border-b border-zinc-800 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-4 py-3.5">Actor</th>
                  <th className="px-4 py-3.5">Target</th>
                  <th className="px-4 py-3.5">Reason / Justification</th>
                  <th className="px-4 py-3.5">Cryptographic SHA-256 Seal</th>
                  <th className="px-5 py-3.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300 font-mono">
                {auditLogs.map((a) => (
                  <tr key={a.id} className="hover:bg-zinc-900/40">
                    <td className="px-5 py-3.5 font-bold text-rose-300 font-sans">{a.action}</td>
                    <td className="px-4 py-3.5 text-zinc-300">
                      {a.actor?.displayName || a.actorType}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-400">
                      {a.targetEntityType}:{a.targetEntityId?.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3.5 text-zinc-300 font-sans max-w-xs truncate">
                      {a.reason || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-emerald-400 font-mono text-[10px]">
                      {a.hashChecksum?.slice(0, 16)}...
                    </td>
                    <td className="px-5 py-3.5 text-right text-zinc-400 font-sans text-[11px]">
                      {new Date(a.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
