"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { Interactive1on1WebRTC } from "@/components/video/Interactive1on1WebRTC";
import { Sparkles, Coins, ShieldCheck, ArrowLeft } from "lucide-react";

export default function Private1on1SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = (params?.sessionId as string) || "session_default";
  const { currentUser } = useUser();

  const isCreator = currentUser.role === "CREATOR";
  const [completedSummary, setCompletedSummary] = useState<{
    durationSeconds: number;
    totalCredits: number;
  } | null>(null);

  const handleEnd = (summary: { durationSeconds: number; totalCredits: number }) => {
    setCompletedSummary(summary);
  };

  return (
    <main className="relative h-screen w-full bg-black p-4 flex flex-col justify-between select-none">
      {/* Top Header */}
      <header className="flex items-center justify-between z-10 px-2 py-1">
        <button
          onClick={() => router.push("/discover")}
          className="flex items-center gap-2 rounded-xl bg-zinc-900/80 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:text-white border border-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Exit Room
        </button>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-zinc-300 border border-white/10">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            2257 Verified & Age Assured
          </span>
        </div>
      </header>

      {/* Main Two-Way WebRTC Canvas */}
      <div className="relative flex-1 my-2 overflow-hidden">
        <Interactive1on1WebRTC
          sessionId={sessionId}
          currentUserId={currentUser.id}
          isCreator={isCreator}
          creditRatePerMinute={100}
          onEndSession={handleEnd}
        />
      </div>

      {/* Completion Settlement Modal */}
      {completedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4">
          <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-zinc-800 p-6 text-center shadow-2xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-600 to-amber-500 text-white mx-auto mb-3 shadow-lg shadow-pink-600/30">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-black text-white">1-on-1 Session Ended</h3>
            <p className="text-xs text-zinc-400 mt-1 mb-5">
              Authoritative ledger settlement completed.
            </p>

            <div className="space-y-2 rounded-2xl bg-zinc-900/80 p-4 border border-zinc-800 text-xs text-zinc-300 mb-6 text-left">
              <div className="flex justify-between">
                <span>Total Duration:</span>
                <span className="font-bold text-white">
                  {Math.floor(completedSummary.durationSeconds / 60)}m{" "}
                  {completedSummary.durationSeconds % 60}s
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tokens Settled:</span>
                <span className="font-bold text-amber-400">
                  {completedSummary.totalCredits} Tokens
                </span>
              </div>
            </div>

            <button
              onClick={() => router.push("/discover")}
              className="w-full rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 py-3 text-xs font-bold text-white shadow-xl shadow-pink-600/30"
            >
              Return to Discovery Feed
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
