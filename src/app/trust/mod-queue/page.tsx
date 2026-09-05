"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Lock,
  Search,
  UserCheck,
} from "lucide-react";

interface ReportItem {
  id: string;
  category: string;
  notes: string;
  status: string;
  createdAt: string;
  reporter?: { username: string; displayName: string };
  targetUser?: { username: string; displayName: string };
}

export default function TrustAndSafetyPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [activeTab, setActiveTab] = useState<"reports" | "2257" | "audit">("reports");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/safety/report")
      .then((res) => res.json())
      .then((data) => {
        if (data.reports) setReports(data.reports);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-black text-white">Trust & Safety Engine</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            24/7 Moderation Queue, Age Assurance & 18 U.S.C. § 2257 Recordkeeping Custodian Vault
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-2xl bg-zinc-900/80 p-1 border border-zinc-800">
          <button
            onClick={() => setActiveTab("reports")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "reports"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Incident Reports
          </button>
          <button
            onClick={() => setActiveTab("2257")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "2257"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            § 2257 Records Vault
          </button>
        </div>
      </div>

      {/* Tab: Incident Reports */}
      {activeTab === "reports" && (
        <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Pending Incident Reports
            </h2>
            <span className="rounded-full bg-rose-500/10 border border-rose-500/30 px-3 py-1 text-xs font-bold text-rose-400">
              Live Mod Queue
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-zinc-900/40 animate-pulse" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="py-12 text-center rounded-2xl bg-zinc-900/30 border border-zinc-800/60">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400 mb-2" />
              <p className="text-sm font-bold text-white">All Reports Resolved</p>
              <p className="text-xs text-zinc-400 mt-1">Zero pending critical safety violations.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                        {report.category}
                      </span>
                      <span className="text-xs text-zinc-400">
                        Reported by: <span className="text-white font-medium">{report.reporter?.displayName || "Anonymous"}</span>
                      </span>
                    </div>
                    <p className="text-xs text-zinc-200">{report.notes}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="rounded-xl bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-700">
                      Dismiss
                    </button>
                    <button className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-rose-600/30 hover:bg-rose-500">
                      Take Action
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: § 2257 Records Vault */}
      {activeTab === "2257" && (
        <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                18 U.S.C. § 2257 Record-Keeping Compliance Vault
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Mandatory government ID verification, primary custodian certificates, and cryptographic verification logs.
              </p>
            </div>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
              Custodian Certified
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Creator 1 Card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                    alt="Maya Velvet"
                    className="h-9 w-9 rounded-xl object-cover ring-1 ring-emerald-500"
                  />
                  <div>
                    <h3 className="text-xs font-bold text-white">Maya Velvet (mayavelvet)</h3>
                    <p className="text-[10px] text-zinc-400">Legal Name: Maya Elena Rostova</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                  APPROVED
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-zinc-400 border-t border-zinc-800 pt-3">
                <div className="flex justify-between">
                  <span>DOB & Age:</span>
                  <span className="text-zinc-200 font-mono">1998-04-14 (28 yrs old)</span>
                </div>
                <div className="flex justify-between">
                  <span>ID Verification:</span>
                  <span className="text-zinc-200">US Passport (Encrypted Vault)</span>
                </div>
                <div className="flex justify-between">
                  <span>Records Custodian:</span>
                  <span className="text-zinc-200">Platform Legal Compliance Dept</span>
                </div>
              </div>
            </div>

            {/* Creator 2 Card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80"
                    alt="Chloe Siren"
                    className="h-9 w-9 rounded-xl object-cover ring-1 ring-emerald-500"
                  />
                  <div>
                    <h3 className="text-xs font-bold text-white">Chloe Siren (chloesiren)</h3>
                    <p className="text-[10px] text-zinc-400">Legal Name: Chloe Amanda Vance</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                  APPROVED
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-zinc-400 border-t border-zinc-800 pt-3">
                <div className="flex justify-between">
                  <span>DOB & Age:</span>
                  <span className="text-zinc-200 font-mono">1999-08-22 (27 yrs old)</span>
                </div>
                <div className="flex justify-between">
                  <span>ID Verification:</span>
                  <span className="text-zinc-200">Driver License (Encrypted Vault)</span>
                </div>
                <div className="flex justify-between">
                  <span>Records Custodian:</span>
                  <span className="text-zinc-200">Platform Legal Compliance Dept</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
