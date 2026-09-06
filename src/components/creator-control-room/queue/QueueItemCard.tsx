"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Check,
  DollarSign,
  User,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import type { LiveQueueItem, QueueItemStatus } from "@/types/control-room";

interface QueueItemCardProps {
  item: LiveQueueItem;
  onAccept: (id: string, note?: string) => void;
  onStartProgress: (id: string) => void;
  onComplete: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onCancel: (id: string, reason: string) => void;
  onRefund: (id: string, reason: string, partialCredits?: number) => void;
}

export function QueueItemCard({
  item,
  onAccept,
  onStartProgress,
  onComplete,
  onReject,
  onCancel,
  onRefund,
}: QueueItemCardProps) {
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [creatorNote, setCreatorNote] = useState("");

  const status = item.status;
  const isPending = status === "PENDING" || status === "QUEUED";
  const isAccepted = status === "ACCEPTED";
  const isInProgress = status === "IN_PROGRESS" || status === "EXECUTING";
  const isCompleted = status === "COMPLETED";
  const isRejected = status === "REJECTED";
  const isCancelled = status === "CANCELLED" || status === "SKIPPED";
  const isRefunded = status === "REFUNDED" || item.potentialRefundState?.isRefunded;

  const handleConfirmReject = () => {
    onReject(item.id, rejectReason || "Declined by creator");
    setIsRejectModalOpen(false);
    setRejectReason("");
  };

  const handleConfirmRefund = () => {
    onRefund(item.id, refundReason || "Direct refund granted", item.credits);
    setIsRefundModalOpen(false);
    setRefundReason("");
  };

  return (
    <div
      className={`relative rounded-2xl border p-4 transition-all shadow-md ${
        isInProgress
          ? "bg-gradient-to-r from-amber-500/15 via-zinc-900 to-zinc-900 border-amber-400/80 ring-1 ring-amber-400/40"
          : isAccepted
          ? "bg-zinc-900/80 border-sky-500/40 hover:border-sky-500/70"
          : isPending
          ? "bg-zinc-900/70 border-zinc-800 hover:border-pink-500/30"
          : isCompleted
          ? "bg-zinc-950/80 border-emerald-500/30 opacity-80"
          : "bg-zinc-950/80 border-rose-500/30 opacity-80"
      }`}
    >
      {/* ------------------------------------------------------------- */}
      {/* HEADER: POSITION, FAN INFO & PRICE                            */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <img
              src={item.fanAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"}
              alt={item.fanName}
              className="h-11 w-11 rounded-2xl object-cover ring-2 ring-zinc-700"
            />
            {item.position > 0 && (
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-black text-[10px] font-black shadow">
                #{item.position}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold text-white truncate">{item.fanName}</span>
              {item.isVip && (
                <span className="rounded bg-pink-500/20 px-1.5 py-0.5 text-[9px] font-black text-pink-300 border border-pink-500/30">
                  VIP
                </span>
              )}
              {item.isSubscriber && (
                <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-black text-purple-300 border border-purple-500/30">
                  SUB
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-400 block truncate">
              {item.actionTitle} • {item.actionType}
            </span>
          </div>
        </div>

        {/* Price Tag */}
        <div className="text-right shrink-0">
          <span className="flex items-center justify-end gap-1 font-black text-amber-400 text-sm">
            +{item.credits} 🪙
          </span>
          <span className="text-[10px] text-zinc-400 font-medium block">
            ${((item.credits * 8) / 100).toFixed(2)} USD
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* CUSTOM MESSAGE FROM FAN                                       */}
      {/* ------------------------------------------------------------- */}
      {item.customMessage && (
        <div className="mt-2.5 rounded-xl bg-black/40 border border-white/5 p-2 text-xs text-amber-200/90 italic">
          &ldquo;{item.customMessage}&rdquo;
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STATE MACHINE VISUALIZER TRACK                                */}
      {/* ------------------------------------------------------------- */}
      <div className="mt-3 pt-3 border-t border-zinc-800/80">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
            Lifecycle State
          </span>
          <span
            className={`font-black uppercase tracking-wider px-2 py-0.5 rounded-md text-[10px] ${
              isInProgress
                ? "bg-amber-400 text-black animate-pulse"
                : isAccepted
                ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                : isPending
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : isCompleted
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
            }`}
          >
            {isPending
              ? "1. Pending"
              : isAccepted
              ? "2. Accepted"
              : isInProgress
              ? "3. In Progress"
              : isCompleted
              ? "4. Completed"
              : isRejected
              ? "Rejected"
              : isCancelled
              ? "Cancelled"
              : "Refunded"}
          </span>
        </div>

        {/* State Machine Step Stepper */}
        <div className="grid grid-cols-4 gap-1.5">
          {/* Step 1: Pending */}
          <div
            className={`h-1.5 rounded-full transition-all ${
              isPending || isAccepted || isInProgress || isCompleted
                ? "bg-amber-400"
                : "bg-zinc-800"
            }`}
            title="Step 1: Pending Purchase"
          />
          {/* Step 2: Accepted */}
          <div
            className={`h-1.5 rounded-full transition-all ${
              isAccepted || isInProgress || isCompleted
                ? "bg-sky-400"
                : isRejected || isCancelled
                ? "bg-rose-500/40"
                : "bg-zinc-800"
            }`}
            title="Step 2: Creator Accepted"
          />
          {/* Step 3: In Progress */}
          <div
            className={`h-1.5 rounded-full transition-all ${
              isInProgress || isCompleted
                ? "bg-amber-400"
                : "bg-zinc-800"
            }`}
            title="Step 3: Performing Live"
          />
          {/* Step 4: Completed */}
          <div
            className={`h-1.5 rounded-full transition-all ${
              isCompleted
                ? "bg-emerald-400"
                : isRefunded
                ? "bg-rose-400"
                : "bg-zinc-800"
            }`}
            title="Step 4: Completed / Terminal"
          />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* IN-PROGRESS COUNTDOWN TIMER                                   */}
      {/* ------------------------------------------------------------- */}
      {isInProgress && (
        <div className="mt-3 p-3 rounded-xl bg-black/60 border border-amber-400/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400 animate-spin" />
            <span className="text-xs font-mono font-bold text-white">
              Performing Live on Camera: {item.timeRemainingSeconds}s remaining
            </span>
          </div>
          <div className="h-2 w-24 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-1000"
              style={{
                width: `${Math.max(0, Math.min(100, (item.timeRemainingSeconds / (item.durationSeconds || 30)) * 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CREATOR DECISION & TIMESTAMPS                                 */}
      {/* ------------------------------------------------------------- */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400">
        <span className="truncate">
          Purchased: {item.timestamp || "Just now"}
          {item.startTime ? ` • Started: ${new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ""}
          {item.completionTime ? ` • Done: ${new Date(item.completionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ""}
        </span>
        {item.creatorDecision?.creatorNote && (
          <span className="text-zinc-300 italic truncate max-w-[180px]">
            &ldquo;{item.creatorDecision.creatorNote}&rdquo;
          </span>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* REFUND AUDIT STATE ALERT                                      */}
      {/* ------------------------------------------------------------- */}
      {isRefunded && item.potentialRefundState && (
        <div className="mt-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 p-2.5 flex items-start gap-2 text-xs text-rose-300">
          <RotateCcw className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="font-bold block">
              Refund Processed: {item.potentialRefundState.refundedAmountCredits || item.credits} credits restored to fan
            </span>
            <span className="text-[10px] text-zinc-400 block truncate">
              Tx: {item.potentialRefundState.refundTransactionId || "N/A"} • Reason: {item.potentialRefundState.refundReason || "Creator rejected"}
            </span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ACTION CONTROLS BASED ON CURRENT STATE                        */}
      {/* ------------------------------------------------------------- */}
      <div className="mt-3 flex items-center justify-end gap-2 flex-wrap">
        {/* State 1: PENDING -> [Accept] or [Reject] */}
        {isPending && (
          <>
            <button
              onClick={() => onAccept(item.id, creatorNote)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white px-3.5 py-1.5 text-xs font-bold shadow-md transition-all"
            >
              <Check className="h-3.5 w-3.5" />
              Accept
            </button>
            <button
              onClick={() => setIsRejectModalOpen(true)}
              className="flex items-center gap-1 rounded-xl bg-zinc-800 hover:bg-rose-900/40 hover:text-rose-300 text-zinc-400 px-3 py-1.5 text-xs font-semibold border border-zinc-700 transition-all"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject & Refund
            </button>
          </>
        )}

        {/* State 2: ACCEPTED -> [Start Progress] or [Cancel] */}
        {isAccepted && (
          <>
            <button
              onClick={() => onStartProgress(item.id)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white px-4 py-1.5 text-xs font-black shadow-lg shadow-pink-600/30 transition-all"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Perform Now (In Progress)
            </button>
            <button
              onClick={() => onCancel(item.id, "Creator cancelled before performing")}
              className="flex items-center gap-1 rounded-xl bg-zinc-800 hover:bg-rose-900/40 hover:text-rose-300 text-zinc-400 px-3 py-1.5 text-xs font-semibold border border-zinc-700 transition-all"
            >
              Cancel & Refund
            </button>
          </>
        )}

        {/* State 3: IN_PROGRESS -> [Done (Complete)] or [Cancel / Refund] */}
        {isInProgress && (
          <>
            <button
              onClick={() => onComplete(item.id)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 text-xs font-black shadow-lg shadow-emerald-600/30 transition-all"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark Completed
            </button>
            <button
              onClick={() => setIsRefundModalOpen(true)}
              className="flex items-center gap-1 rounded-xl bg-zinc-800 hover:bg-rose-900/40 hover:text-rose-300 text-zinc-400 px-3 py-1.5 text-xs font-semibold border border-zinc-700 transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Cancel & Refund
            </button>
          </>
        )}

        {/* State 4: COMPLETED -> Optional [Refund] */}
        {isCompleted && !isRefunded && (
          <button
            onClick={() => setIsRefundModalOpen(true)}
            className="flex items-center gap-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-300 px-2.5 py-1 text-[11px] font-semibold border border-zinc-800 transition-all"
          >
            <RotateCcw className="h-3 w-3" />
            Issue Courtesy Refund
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* REJECT & REFUND DIALOG MODAL                                  */}
      {/* ------------------------------------------------------------- */}
      {isRejectModalOpen && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between z-20 animate-fadeIn">
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              Reject & Refund Interaction
            </h4>
            <p className="text-xs text-zinc-400 mt-1">
              Rejecting will instantly return {item.credits} credits to {item.fanName}&apos;s wallet.
            </p>
            <input
              type="text"
              placeholder="Optional rejection reason for fan..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full mt-2 rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => setIsRejectModalOpen(false)}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-700"
            >
              Back
            </button>
            <button
              onClick={handleConfirmReject}
              className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-500 shadow-lg shadow-rose-600/30"
            >
              Confirm Rejection & Refund
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DIRECT REFUND DIALOG MODAL                                    */}
      {/* ------------------------------------------------------------- */}
      {isRefundModalOpen && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md rounded-2xl p-4 flex flex-col justify-between z-20 animate-fadeIn">
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-1.5">
              <RotateCcw className="h-4 w-4 text-rose-400" />
              Process Refund for Interaction
            </h4>
            <p className="text-xs text-zinc-400 mt-1">
              Refund {item.credits} credits to {item.fanName}&apos;s double-entry wallet ledger.
            </p>
            <input
              type="text"
              placeholder="Reason for refund (e.g. tech disruption)..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="w-full mt-2 rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={() => setIsRefundModalOpen(false)}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-700"
            >
              Back
            </button>
            <button
              onClick={handleConfirmRefund}
              className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-500 shadow-lg shadow-rose-600/30"
            >
              Execute Refund
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
