"use client";

import React from "react";
import { X } from "lucide-react";
import { CreatorOnboardingFlow } from "./CreatorOnboardingFlow";

interface CreatorOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatorOnboardingModal({ isOpen, onClose }: CreatorOnboardingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all shadow-xl"
          title="Close Onboarding"
        >
          <X className="h-5 w-5" />
        </button>

        <CreatorOnboardingFlow isModal onCompleted={onClose} />
      </div>
    </div>
  );
}
