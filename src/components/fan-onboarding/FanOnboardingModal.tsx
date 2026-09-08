"use client";

import React from "react";
import { X } from "lucide-react";
import { FanOnboardingFlow } from "./FanOnboardingFlow";
import { FanOnboardingStepKey } from "@/modules/fan-onboarding/types";

interface FanOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStep?: FanOnboardingStepKey;
  onCompleted?: (creatorId?: string) => void;
}

export function FanOnboardingModal({
  isOpen,
  onClose,
  initialStep = "LANDING",
  onCompleted,
}: FanOnboardingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-2xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900/90 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all shadow-xl"
          title="Close Onboarding"
        >
          <X className="h-5 w-5" />
        </button>

        <FanOnboardingFlow
          isModal
          initialStep={initialStep}
          onCompleted={(creatorId) => {
            if (onCompleted) {
              onCompleted(creatorId);
            }
            onClose();
          }}
        />
      </div>
    </div>
  );
}
