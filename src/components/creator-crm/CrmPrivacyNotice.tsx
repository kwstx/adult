"use client";

import React, { useState } from "react";
import { ShieldCheck, Lock, EyeOff, Info, ChevronDown, ChevronUp } from "lucide-react";

export function CrmPrivacyNotice() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 backdrop-blur-xl shadow-lg transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-white tracking-wide">
                Authoritative 18+ Privacy & Asymmetric Data Protection Active
              </h4>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                Isolated Tenant
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Only interactions with <span className="text-zinc-200 font-semibold">your profile</span> are surfaced. Data minimization and anti-tracking rules strictly protect fan privacy.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white transition-colors"
        >
          <span>{isExpanded ? "Hide Details" : "Compliance Policy"}</span>
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-zinc-800/80 pt-3 animate-fadeIn">
          <div className="flex items-start gap-2.5 rounded-xl bg-zinc-900/50 p-3 border border-zinc-800/40">
            <Lock className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-white">Strict Tenant Boundary</p>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
                Creators cannot view fan activities or spend on other creators' profiles. Every CRM dataset is cryptographically isolated.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl bg-zinc-900/50 p-3 border border-zinc-800/40">
            <EyeOff className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-white">Data Minimization</p>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
                Real emails, billing credentials, physical locations, IP addresses, and KYC documents are never accessible in CRM responses.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl bg-zinc-900/50 p-3 border border-zinc-800/40">
            <Info className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-white">Suppression & Opt-Out</p>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
                Blocked users and fans with muted notifications are automatically filtered out from campaign broadcasts to prevent spam.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
