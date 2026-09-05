"use client";

import React, { useState } from "react";
import { X, ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react";
import { useUser } from "@/lib/user-context";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId?: string;
  creatorName?: string;
}

export function ReportModal({ isOpen, onClose, creatorId, creatorName }: ReportModalProps) {
  const { currentUser } = useUser();
  const [category, setCategory] = useState<string>("HARASSMENT");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/safety/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterId: currentUser.id,
          targetStreamId: creatorId,
          category,
          notes,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1500);
      }
    } catch {
      // Handled
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-7 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Trust & Safety Report</h3>
            <p className="text-xs text-zinc-400">Reporting {creatorName || "Content"}</p>
          </div>
        </div>

        {success ? (
          <div className="my-6 text-center text-emerald-400 space-y-2">
            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-400" />
            <p className="text-sm font-bold">Report Filed Successfully</p>
            <p className="text-xs text-zinc-400">Our 24/7 moderation team will review this immediately.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1.5">
                Report Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-white border border-zinc-800 focus:border-rose-500 focus:outline-none"
              >
                <option value="UNDERAGE_SUSPICION">Suspicion of Underage Content (Priority P0)</option>
                <option value="NON_CONSENSUAL">Non-Consensual Material</option>
                <option value="HARASSMENT">Harassment or Abuse</option>
                <option value="FRAUD">Fraud or Payment Abuse</option>
                <option value="COPYRIGHT">Copyright Infringement</option>
                <option value="OTHER">Other Policy Violation</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1.5">
                Details & Timestamps
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required
                rows={3}
                placeholder="Describe what occurred with timestamp if applicable..."
                className="w-full rounded-2xl bg-zinc-900 p-3 text-xs text-white border border-zinc-800 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-rose-600 py-3 font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 disabled:opacity-50 transition-all text-xs"
            >
              {isSubmitting ? "Submitting to Mod Queue..." : "Submit Confidential Report"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
