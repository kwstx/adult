"use client";

import React, { useState } from "react";
import {
  Zap,
  ShieldCheck,
  UserPlus,
  UserCheck,
  Coins,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { OptimisticFollowButton } from "@/components/common/OptimisticFollowButton";
import { ConservativeInteractionPurchaseCard } from "@/components/marketplace/ConservativeInteractionPurchaseCard";
import { serverCache } from "@/lib/state/server-cache";
import { useWalletBalance } from "@/hooks/state/useWalletBalance";

export function OptimisticVsConservativeDemo() {
  const fanUserId = "usr_fan_alex";
  const creatorId = "mayavelvet";
  const creatorName = "Maya Velvet ✨";

  // Wallet state for demo
  const { balance, refetch: refetchWallet } = useWalletBalance(fanUserId);

  // Local simulated test controls
  const [optimisticSimulatedFailure, setOptimisticSimulatedFailure] = useState(false);
  const [socialLogs, setSocialLogs] = useState<Array<{ id: string; time: string; text: string; type: "optimistic" | "network" | "rollback" | "success" }>>([]);
  const [financialLogs, setFinancialLogs] = useState<Array<{ id: string; time: string; text: string; type: "loading" | "backend" | "success" | "error" }>>([]);

  const addSocialLog = (text: string, type: "optimistic" | "network" | "rollback" | "success") => {
    setSocialLogs((prev) => [
      { id: Math.random().toString(), time: new Date().toLocaleTimeString(), text, type },
      ...prev.slice(0, 7),
    ]);
  };

  const addFinancialLog = (text: string, type: "loading" | "backend" | "success" | "error") => {
    setFinancialLogs((prev) => [
      { id: Math.random().toString(), time: new Date().toLocaleTimeString(), text, type },
      ...prev.slice(0, 7),
    ]);
  };

  // Seed demo wallet balance
  const setDemoBalance = (amount: number) => {
    serverCache.set(["wallet", fanUserId], {
      userId: fanUserId,
      balance: amount,
      currency: "CREDITS",
      isFrozen: false,
      lastUpdated: new Date().toISOString(),
    });
    addFinancialLog(`Adjusted demo wallet balance to ${amount.toLocaleString()} credits`, "backend");
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 p-4 md:p-8 font-sans">
      {/* Title & Architectural Rationale Header */}
      <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-6 md:p-8 shadow-2xl backdrop-blur-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-500/10 border border-pink-500/30 px-3 py-1 text-xs font-black uppercase tracking-wider text-pink-400">
              State Architecture Principle
            </span>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Optimistic UI vs. Conservative Financial State
            </h1>
            <p className="text-sm text-zinc-400 max-w-3xl">
              Different user actions require different state lifecycles. Low-risk social actions update instantly to ensure fluid responsiveness, whereas high-risk financial actions require authoritative backend confirmation before committing permanent success.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSocialLogs([]);
                setFinancialLogs([]);
              }}
              className="flex items-center gap-1.5 rounded-2xl bg-zinc-900 px-3.5 py-2 text-xs font-bold text-zinc-300 border border-zinc-800 hover:text-white transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Clear Activity Logs</span>
            </button>
          </div>
        </div>

        {/* Quick Rule Comparison Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-2xl bg-pink-950/20 border border-pink-500/30 p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-pink-300 font-bold">
              <Zap className="h-4 w-4 text-pink-400" />
              <span>Rule 1: Optimistic UI for Social Actions</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Pressing <strong className="text-zinc-200">Follow</strong> immediately changes to <strong className="text-pink-300">Following</strong> on the client while the request processes. If the network rejects, it rolls back smoothly with error feedback.
            </p>
          </div>

          <div className="rounded-2xl bg-amber-950/20 border border-amber-500/30 p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span>Rule 2: Conservative UI for Financial Actions</span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              When buying a <strong className="text-amber-300">1,000-credit interaction</strong>, show an immediate loading state, but <strong className="text-rose-400">never permanently display success</strong> until the backend ledger confirms the debit and queue placement.
            </p>
          </div>
        </div>
      </div>

      {/* Main Comparison Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ================================================================= */}
        {/* COLUMN 1: OPTIMISTIC UI (Follow -> Following)                     */}
        {/* ================================================================= */}
        <section className="lg:col-span-6 space-y-6">
          <div className="rounded-3xl border border-pink-500/30 bg-gradient-to-b from-pink-950/20 to-zinc-950 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-pink-500/20 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-600/30 text-pink-400 border border-pink-500/40">
                  <Zap className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-black text-pink-300">Optimistic UI</h2>
                  <p className="text-[11px] text-zinc-400">Low-Risk Social Actions (Follow / Like)</p>
                </div>
              </div>
              <span className="rounded-full bg-pink-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-pink-300 border border-pink-500/30">
                0 Latency Perceived
              </span>
            </div>

            {/* Interactive Component Showcase */}
            <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5 space-y-4 text-center">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Live Creator Profile Card</h3>
                <p className="text-xs text-zinc-400">Click the button below to test the instant transition:</p>
              </div>

              <div className="flex items-center justify-center gap-4 py-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500 to-amber-500 font-black text-white text-lg">
                  MV
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-black text-white">{creatorName}</h4>
                  <p className="text-xs text-zinc-400">Live Streaming Now</p>
                </div>

                <div className="ml-auto">
                  <OptimisticFollowButton
                    creatorId={creatorId}
                    creatorDisplayName={creatorName}
                    initialIsFollowing={false}
                    initialFollowerCount={1420}
                    showCount={true}
                    onFollowChange={(isFollowing, count) => {
                      addSocialLog(
                        `Optimistic state applied: ${isFollowing ? "FOLLOWING (count: " + count + ")" : "UNFOLLOWED"}`,
                        "optimistic"
                      );
                    }}
                  />
                </div>
              </div>

              {/* Behavior Diagnostic Explanation */}
              <div className="rounded-xl bg-zinc-950/70 p-3 text-left text-xs space-y-1.5 border border-zinc-800">
                <div className="flex items-center gap-1.5 text-pink-300 font-bold">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>State Flow on Click:</span>
                </div>
                <ol className="list-decimal list-inside text-[11px] text-zinc-400 space-y-1 pl-1">
                  <li><strong className="text-white">T + 0ms:</strong> UI switches from &ldquo;Follow&rdquo; to &ldquo;Following&rdquo; instantly.</li>
                  <li><strong className="text-white">T + 0ms:</strong> Follower count increments (+1) synchronously.</li>
                  <li><strong className="text-white">Background:</strong> Dispatches <code className="text-pink-300">POST /api/creators/mayavelvet/follow</code>.</li>
                  <li><strong className="text-white">On Failure:</strong> Automatically rolls back to &ldquo;Follow&rdquo; and notifies user.</li>
                </ol>
              </div>
            </div>

            {/* Social Action Timeline Logs */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                Optimistic Action Log:
              </span>
              <div className="rounded-2xl bg-zinc-950 border border-zinc-800/80 p-3 space-y-1.5 min-h-[110px] max-h-[160px] overflow-y-auto">
                {socialLogs.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic py-2 text-center">
                    Click &ldquo;Follow&rdquo; above to inspect instant state transitions.
                  </p>
                ) : (
                  socialLogs.map((log) => (
                    <div key={log.id} className="text-[11px] font-mono flex items-center justify-between text-zinc-300">
                      <span className="text-pink-400">[{log.time}]</span>
                      <span className="truncate max-w-[280px]">{log.text}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-pink-950 border border-pink-500/30 text-pink-300">
                        {log.type}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* COLUMN 2: CONSERVATIVE FINANCIAL UI (1,000-Credit Purchase)       */}
        {/* ================================================================= */}
        <section className="lg:col-span-6 space-y-6">
          <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-zinc-950 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-600/30 text-amber-400 border border-amber-500/40">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-black text-amber-300">Conservative Financial UI</h2>
                  <p className="text-[11px] text-zinc-400">1,000-Credit Interaction Purchase</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-300 border border-amber-500/30">
                Authoritative Confirmation
              </span>
            </div>

            {/* Balance Preset Controls */}
            <div className="flex items-center justify-between bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800 text-xs">
              <span className="text-zinc-400 font-medium">Test Wallet Presets:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDemoBalance(2500)}
                  className="rounded-xl bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 font-bold text-amber-300 border border-zinc-700 transition-all"
                >
                  2,500 Credits (Sufficient)
                </button>
                <button
                  type="button"
                  onClick={() => setDemoBalance(400)}
                  className="rounded-xl bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 font-bold text-rose-300 border border-zinc-700 transition-all"
                >
                  400 Credits (Insufficient)
                </button>
              </div>
            </div>

            {/* Live Conservative Purchase Component */}
            <ConservativeInteractionPurchaseCard
              creatorId={creatorId}
              creatorDisplayName={creatorName}
              fanUserId={fanUserId}
              fanDisplayName="Alex Patron"
              interaction={{
                id: "int_acoustic_1000",
                title: "Live Backstage Acoustic Song Request",
                description: "Dedicated on-camera acoustic performance requested by you live.",
                creditCost: 1000,
                actionType: "Live Performance",
                icon: "🎸",
              }}
              onSuccess={(receipt) => {
                addFinancialLog(
                  `Backend confirmed purchase: Position #${receipt.queuePosition}, Rem: ${receipt.fanRemainingBalance}c`,
                  "success"
                );
              }}
              onTopUpClick={() => setDemoBalance(3000)}
            />

            {/* Financial Action Timeline Logs */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                Financial Transaction Log:
              </span>
              <div className="rounded-2xl bg-zinc-950 border border-zinc-800/80 p-3 space-y-1.5 min-h-[110px] max-h-[160px] overflow-y-auto">
                {financialLogs.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic py-2 text-center">
                    Purchase the 1,000-credit interaction above to observe conservative confirmation.
                  </p>
                ) : (
                  financialLogs.map((log) => (
                    <div key={log.id} className="text-[11px] font-mono flex items-center justify-between text-zinc-300">
                      <span className="text-amber-400">[{log.time}]</span>
                      <span className="truncate max-w-[280px]">{log.text}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-950 border border-amber-500/30 text-amber-300">
                        {log.type}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
