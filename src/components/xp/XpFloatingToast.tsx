"use client";

import React, { useEffect } from "react";
import { Sparkles, Flame, X } from "lucide-react";

export interface FloatingXpToastItem {
  id: string;
  xpAwarded: number;
  sourceText: string;
  newTotalXp: number;
  streakDays?: number;
  createdAt: number;
}

interface XpFloatingToastContainerProps {
  toasts: FloatingXpToastItem[];
  onDismiss: (id: string) => void;
}

/**
 * XpFloatingToastContainer
 * 
 * Floating toast notifications displaying authoritative XP awarded by the backend.
 */
export const XpFloatingToastContainer: React.FC<XpFloatingToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  return (
    <div className="fixed bottom-24 right-6 z-40 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <SingleXpToast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const SingleXpToast: React.FC<{
  toast: FloatingXpToastItem;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4500);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-zinc-900/95 border border-purple-500/40 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md">
        <Sparkles className="w-4 h-4 text-white" />
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-extrabold text-emerald-400">
            +{toast.xpAwarded.toLocaleString()} XP
          </span>
          {toast.streakDays && toast.streakDays > 1 && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
              <Flame className="w-3 h-3 text-amber-400" />
              {toast.streakDays}d
            </span>
          )}
        </div>
        <span className="text-[11px] text-zinc-400 font-medium">
          {toast.sourceText} • Total {toast.newTotalXp.toLocaleString()} XP
        </span>
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-2 p-1 text-zinc-500 hover:text-zinc-300 rounded-md transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
