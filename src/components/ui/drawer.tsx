"use client";

import React, { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type DrawerPlacement = "bottom" | "right" | "left" | "top";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  placement?: DrawerPlacement;
  title?: React.ReactNode;
  description?: React.ReactNode;
  showHandle?: boolean;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEsc?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Drawer({
  isOpen,
  onClose,
  placement = "bottom",
  title,
  description,
  showHandle = true,
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEsc = true,
  className,
  children,
}: DrawerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === "Escape") {
        onClose();
      }
    },
    [closeOnEsc, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const placementClasses: Record<DrawerPlacement, string> = {
    bottom:
      "bottom-0 inset-x-0 max-h-[88vh] rounded-t-xl animate-drawer-bottom border-t border-white/[0.12]",
    right:
      "top-0 right-0 bottom-0 w-full max-w-md h-full rounded-l-xl animate-drawer-right border-l border-white/[0.12]",
    left:
      "top-0 left-0 bottom-0 w-full max-w-md h-full rounded-r-xl animate-drawer-left border-r border-white/[0.12]",
    top:
      "top-0 inset-x-0 max-h-[80vh] rounded-b-xl animate-modal-in border-b border-white/[0.12]",
  };

  return (
    <div
      className="fixed inset-0 z-55 flex overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-200"
        onClick={() => {
          if (closeOnBackdropClick) onClose();
        }}
      />

      {/* Drawer Container */}
      <div
        className={cn(
          "fixed bg-surface-elevated shadow-2xl flex flex-col z-10",
          placementClasses[placement],
          className
        )}
      >
        {/* Drag Pill Handle (primarily for bottom sheet) */}
        {placement === "bottom" && showHandle && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1.5 w-12 rounded-full bg-zinc-700/80 hover:bg-zinc-600 transition-colors" />
          </div>
        )}

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
            <div className="flex flex-col space-y-0.5">
              {title && (
                <h3 className="text-base font-bold text-zinc-100">{title}</h3>
              )}
              {description && (
                <p className="text-xs text-zinc-400">{description}</p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-white/[0.08] hover:text-white transition-colors"
                aria-label="Close drawer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function DrawerHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1 border-b border-white/[0.08] px-5 py-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function DrawerBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-5 overflow-y-auto", className)} {...props}>
      {children}
    </div>
  );
}

export function DrawerFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 border-t border-white/[0.08] bg-surface-base/50 px-5 py-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
