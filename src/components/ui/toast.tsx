"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "default" | "success" | "error" | "warning" | "info" | "tip";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  amount?: number;
  avatarUrl?: string;
  senderName?: string;
}

interface ToastContextValue {
  toast: (options: Omit<ToastItem, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  tip: (options: { amount: number; senderName: string; message?: string; avatarUrl?: string }) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ duration = 4000, ...options }: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, duration, ...options };

      setToasts((prev) => [newToast, ...prev].slice(0, 5));

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  const success = useCallback(
    (title: string, description?: string) => toast({ title, description, variant: "success" }),
    [toast]
  );

  const error = useCallback(
    (title: string, description?: string) => toast({ title, description, variant: "error" }),
    [toast]
  );

  const info = useCallback(
    (title: string, description?: string) => toast({ title, description, variant: "info" }),
    [toast]
  );

  const warning = useCallback(
    (title: string, description?: string) => toast({ title, description, variant: "warning" }),
    [toast]
  );

  const tip = useCallback(
    ({ amount, senderName, message, avatarUrl }: { amount: number; senderName: string; message?: string; avatarUrl?: string }) => {
      toast({
        title: `${senderName} tipped ${amount.toLocaleString()} Tokens!`,
        description: message,
        variant: "tip",
        amount,
        senderName,
        avatarUrl,
        duration: 5000,
      });
    },
    [toast]
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning, tip, dismiss }}>
      {children}

      {/* Toast Notification Container (Fixed Top-Right) */}
      <div className="fixed top-4 right-4 z-60 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const isTip = item.variant === "tip";

  const icons: Record<ToastVariant, React.ReactNode> = {
    default: <Info className="h-4 w-4 text-zinc-400" />,
    success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
    error: <AlertCircle className="h-4 w-4 text-rose-400" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-400" />,
    info: <Info className="h-4 w-4 text-blue-400" />,
    tip: <Coins className="h-4 w-4 text-amber-400 animate-bounce" />,
  };

  const borderStyles: Record<ToastVariant, string> = {
    default: "border-white/[0.12] bg-surface-elevated/95",
    success: "border-emerald-500/40 bg-surface-elevated/95 shadow-[0_0_15px_rgba(16,185,129,0.15)]",
    error: "border-rose-500/40 bg-surface-elevated/95 shadow-[0_0_15px_rgba(244,37,103,0.15)]",
    warning: "border-amber-500/40 bg-surface-elevated/95 shadow-[0_0_15px_rgba(245,158,11,0.15)]",
    info: "border-blue-500/40 bg-surface-elevated/95",
    tip: "border-amber-500/60 bg-gradient-to-r from-surface-elevated via-zinc-900 to-amber-950/40 shadow-[0_0_20px_rgba(245,158,11,0.25)]",
  };

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border backdrop-blur-md shadow-2xl transition-all duration-200 animate-toast-enter",
        borderStyles[item.variant || "default"]
      )}
    >
      <div className="shrink-0 pt-0.5">{icons[item.variant || "default"]}</div>

      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between">
          <p
            className={cn(
              "text-xs font-semibold tracking-tight text-zinc-100",
              isTip && "text-amber-300 font-bold"
            )}
          >
            {item.title}
          </p>
        </div>

        {item.description && (
          <p className="mt-0.5 text-xs text-zinc-400 leading-relaxed truncate">
            {item.description}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
        aria-label="Dismiss toast"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
