"use client";

import React, { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "fullscreen";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  size?: ModalSize;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEsc?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = "md",
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEsc = true,
  className,
  children,
}: ModalProps) {
  // Handle ESC key press
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === "Escape") {
        onClose();
      }
    },
    [closeOnEsc, onClose]
  );

  // Lock body scroll and listen for keys
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

  const sizeClasses: Record<ModalSize, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    fullscreen: "max-w-none w-screen h-screen rounded-none",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-200"
        onClick={() => {
          if (closeOnBackdropClick) onClose();
        }}
      />

      {/* Modal Dialog Box */}
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-lg bg-surface-elevated border border-white/[0.12] shadow-2xl z-10 animate-modal-in flex flex-col",
          sizeClasses[size],
          className
        )}
      >
        {/* Modal Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between border-b border-white/[0.08] p-5">
            <div className="flex flex-col space-y-1">
              {title && (
                <h2 className="text-lg font-bold tracking-[-0.015em] text-zinc-100">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 text-zinc-400 hover:bg-white/[0.08] hover:text-white transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Modal Body / Content */}
        <div className="p-5 overflow-y-auto max-h-[calc(100vh-160px)]">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ModalHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1 border-b border-white/[0.08] p-5", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function ModalBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-5", className)} {...props}>
      {children}
    </div>
  );
}

export function ModalFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 border-t border-white/[0.08] bg-surface-base/50 p-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
