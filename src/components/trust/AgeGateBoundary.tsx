"use client";

import React, { useState } from "react";
import { Lock, ShieldAlert } from "lucide-react";
import { useAgeEntitlement } from "@/hooks/useAgeEntitlement";
import { AgeVerificationModal } from "./AgeVerificationModal";

interface AgeGateBoundaryProps {
  children: React.ReactNode;
  featureName?: string;
  fallback?: React.ReactNode;
  inlinePrompt?: boolean;
}

export function AgeGateBoundary({
  children,
  featureName = "18+ Adult Content",
  fallback,
  inlinePrompt = true,
}: AgeGateBoundaryProps) {
  const { isVerified, isLoading, refreshEntitlements } = useAgeEntitlement();
  const [showModal, setShowModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-zinc-950/60 rounded-2xl border border-zinc-800 animate-pulse">
        <div className="text-xs text-zinc-500 font-mono">Checking age assurance entitlements...</div>
      </div>
    );
  }

  if (isVerified) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!inlinePrompt) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center p-8 rounded-3xl border border-pink-500/20 bg-zinc-950/80 backdrop-blur-md text-center shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-3">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">Age Verification Required</h3>
        <p className="text-xs text-zinc-400 max-w-sm mb-5 leading-relaxed">
          Access to <span className="text-pink-300 font-medium">{featureName}</span> is restricted to verified adults (18+) pursuant to statutory requirements.
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-pink-600/30 transition-all"
        >
          <Lock className="w-3.5 h-3.5" />
          Verify Age with Provider
        </button>
      </div>

      <AgeVerificationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onVerified={() => {
          setShowModal(false);
          refreshEntitlements();
        }}
        requiredEntitlementName={featureName}
      />
    </>
  );
}
