"use client";

import React, { useState } from "react";
import { ShieldCheck, AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { useUser } from "@/lib/user-context";

interface AgeGateModalProps {
  isOpen: boolean;
  onVerified: () => void;
}

export function AgeGateModal({ isOpen, onVerified }: AgeGateModalProps) {
  const { currentUser, setAgeVerified } = useUser();
  const [dob, setDob] = useState("2000-01-01");
  const [method, setMethod] = useState<"CREDIT_CARD_ASSURANCE" | "ID_DOCUMENT_KYC">(
    "CREDIT_CARD_ASSURANCE"
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = async () => {
    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/safety/age-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          method,
          dob,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Age assurance verification failed.");
      }

      setAgeVerified(true);
      onVerified();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to verify age.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-500/20 text-pink-400 mb-4 ring-1 ring-pink-500/40">
          <ShieldCheck className="h-7 w-7" />
        </div>

        <h2 className="text-2xl font-black text-white">Age Assurance Required (18+)</h2>
        <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
          This platform contains adult live streaming and interactive creator performances.
          By proceeding, you attest under penalty of law that you are at least 18 years of age (or age of majority in your jurisdiction).
        </p>

        {errorMsg && (
          <div className="my-4 rounded-xl bg-rose-950/60 border border-rose-500/40 p-3 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Verification Method Selector */}
        <div className="mt-5 text-left space-y-3">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Assurance Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMethod("CREDIT_CARD_ASSURANCE")}
              className={`p-3 rounded-2xl border text-xs font-semibold text-left transition-all ${
                method === "CREDIT_CARD_ASSURANCE"
                  ? "border-pink-500 bg-pink-500/15 text-pink-300 ring-1 ring-pink-500"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-900"
              }`}
            >
              Card Assurance
            </button>
            <button
              type="button"
              onClick={() => setMethod("ID_DOCUMENT_KYC")}
              className={`p-3 rounded-2xl border text-xs font-semibold text-left transition-all ${
                method === "ID_DOCUMENT_KYC"
                  ? "border-pink-500 bg-pink-500/15 text-pink-300 ring-1 ring-pink-500"
                  : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-900"
              }`}
            >
              Government ID KYC
            </button>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
              Date of Birth
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-white border border-zinc-800 focus:border-pink-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 py-3.5 px-6 font-bold text-white shadow-xl shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 transition-all"
        >
          {isVerifying ? "Verifying Age Assurance..." : "I am 18+ — Enter Platform"}
        </button>

        <p className="mt-3 text-[10px] text-zinc-500">
          Compliant with 18 U.S.C. § 2257 Record-Keeping Requirements.
        </p>
      </div>
    </div>
  );
}
