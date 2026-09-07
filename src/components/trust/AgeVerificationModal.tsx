"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  FileBadge,
  Sparkles,
  Info,
} from "lucide-react";
import { useUser } from "@/lib/user-context";

interface AgeVerificationModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onVerified?: () => void;
  initialJurisdiction?: string;
  requiredEntitlementName?: string;
}

export function AgeVerificationModal({
  isOpen,
  onClose,
  onVerified,
  initialJurisdiction = "DEFAULT",
  requiredEntitlementName = "Adult Live Video & Interactive Features",
}: AgeVerificationModalProps) {
  const { currentUser, setAgeVerified } = useUser();
  const [jurisdiction, setJurisdiction] = useState(initialJurisdiction);
  const [selectedMethod, setSelectedMethod] = useState<
    "ID_DOCUMENT_KYC" | "CREDIT_CARD_ASSURANCE" | "FACIAL_AGE_ESTIMATION"
  >("ID_DOCUMENT_KYC");
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [providerReference, setProviderReference] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<
    "IDLE" | "PENDING" | "APPROVED" | "REJECTED"
  >("IDLE");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartProviderFlow = async () => {
    setIsStartingSession(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/safety/age-verify/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          method: selectedMethod,
          jurisdictionCode: jurisdiction,
          redirectUrl: window.location.href,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start verification with identity provider.");
      }

      setSessionUrl(data.hostedVerificationUrl);
      setProviderReference(data.providerReference);
      setVerificationStatus("PENDING");

      // Open hosted provider window/modal
      const popup = window.open(
        data.hostedVerificationUrl,
        "AgeVerificationPopup",
        "width=560,height=720,status=yes,toolbar=no,menubar=no,location=no"
      );

      // Poll backend for provider webhook decision
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `/api/safety/age-verify/status?userId=${encodeURIComponent(currentUser.id)}&jurisdiction=${jurisdiction}`
          );
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.isVerified) {
              clearInterval(pollInterval);
              setVerificationStatus("APPROVED");
              setAgeVerified(true);
              if (popup && !popup.closed) popup.close();
              if (onVerified) onVerified();
            } else if (statusData.status === "REJECTED") {
              clearInterval(pollInterval);
              setVerificationStatus("REJECTED");
              setErrorMessage(
                statusData.rejectionReason ||
                  "Verification was declined by the identity provider."
              );
            }
          }
        } catch {
          // Continue polling
        }
      }, 2500);

      // Timeout after 5 minutes
      setTimeout(() => clearInterval(pollInterval), 300000);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred starting age assurance.");
      setVerificationStatus("IDLE");
    } finally {
      setIsStartingSession(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 text-left shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 text-pink-400 ring-1 ring-pink-500/40">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Age Assurance Entitlement (18+)</h2>
              <p className="text-xs text-zinc-400">Authoritative Identity & Safety Gate</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-white transition-colors text-sm font-semibold p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Reason Banner */}
        <div className="mb-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 p-3.5 text-xs text-zinc-300">
          <p className="font-semibold text-white mb-1 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-pink-400" />
            Access to: {requiredEntitlementName}
          </p>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            In compliance with statutory age assurance mandates (e.g. UK Online Safety Act, US state laws, EU AVMSD), users must verify age through an accredited verification provider.
          </p>
        </div>

        {/* Zero-PII Privacy Notice */}
        <div className="mb-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 p-3 text-[11px] text-emerald-300 flex items-start gap-2">
          <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p>
            <strong className="text-emerald-200">Zero-PII Privacy Protection:</strong> We do NOT store your ID photos, biometric scans, or document numbers on our servers. Verification is processed by certified SOC2 providers returning an anonymous verification reference.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl bg-rose-950/60 border border-rose-500/40 p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Verification Status Feedback */}
        {verificationStatus === "APPROVED" ? (
          <div className="my-6 rounded-2xl bg-emerald-950/50 border border-emerald-500/50 p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-white">Age Entitlement Granted</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Your 18+ age verification status has been verified by the provider and active entitlements are enabled.
            </p>
            <button
              onClick={() => {
                if (onClose) onClose();
                if (onVerified) onVerified();
              }}
              className="mt-4 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 text-xs transition-all"
            >
              Continue to Platform
            </button>
          </div>
        ) : verificationStatus === "PENDING" ? (
          <div className="my-6 rounded-2xl bg-zinc-900 border border-zinc-800 p-6 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mx-auto" />
            <h3 className="text-sm font-bold text-white">Awaiting Provider Confirmation</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Complete the verification prompt in the provider window. Your backend status will update automatically once verified.
            </p>
            {sessionUrl && (
              <a
                href={sessionUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 font-semibold underline underline-offset-2"
              >
                Reopen Verification Window <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Jurisdiction Selector */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
                Your Jurisdiction
              </label>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="w-full rounded-xl bg-zinc-900 px-3.5 py-2.5 text-xs text-white border border-zinc-800 focus:border-pink-500 focus:outline-none"
              >
                <option value="DEFAULT">Standard Global (General 18+ Access)</option>
                <option value="US-TX">United States — Texas (HB 1181 ID Law)</option>
                <option value="US-UT">United States — Utah (SB 287 Verified ID)</option>
                <option value="US-VA">United States — Virginia (SB 1515 ID Law)</option>
                <option value="GB">United Kingdom (Online Safety Act 2023)</option>
                <option value="DE">Germany (JMStV § 4 Adult User Group)</option>
                <option value="EU">European Union (AVMSD Standard)</option>
              </select>
            </div>

            {/* Verification Method Options */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-2">
                Select Verification Method
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setSelectedMethod("ID_DOCUMENT_KYC")}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    selectedMethod === "ID_DOCUMENT_KYC"
                      ? "border-pink-500 bg-pink-500/10 ring-1 ring-pink-500"
                      : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <FileBadge className="w-5 h-5 text-pink-400 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">Government ID + 3D Liveness</div>
                      <div className="text-[11px] text-zinc-400">
                        Passport, Driver&apos;s License, or National ID. Compliant in all strict jurisdictions.
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-pink-500/20 text-pink-300 font-mono px-2 py-0.5 rounded">
                    Level 3 High
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod("CREDIT_CARD_ASSURANCE")}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    selectedMethod === "CREDIT_CARD_ASSURANCE"
                      ? "border-pink-500 bg-pink-500/10 ring-1 ring-pink-500"
                      : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">Credit Card AVS Token Check</div>
                      <div className="text-[11px] text-zinc-400">
                        Zero-charge $0.00 authentication via payment card network.
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 font-mono px-2 py-0.5 rounded">
                    Level 2 AVS
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod("FACIAL_AGE_ESTIMATION")}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    selectedMethod === "FACIAL_AGE_ESTIMATION"
                      ? "border-pink-500 bg-pink-500/10 ring-1 ring-pink-500"
                      : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">Facial Age Estimation (Yoti/Persona)</div>
                      <div className="text-[11px] text-zinc-400">
                        Camera selfie estimated via certified AI without storing document photos.
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded">
                    Level 1 Fast
                  </span>
                </button>
              </div>
            </div>

            {/* Launch Button */}
            <button
              onClick={handleStartProviderFlow}
              disabled={isStartingSession}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 py-3.5 px-6 font-bold text-white shadow-xl shadow-pink-600/20 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
            >
              {isStartingSession ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting to Certified Provider...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Verify Age with Certified Provider
                </>
              )}
            </button>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>SOC2 / ISO 27001 Certified Partner</span>
          <span>Zero Platform PII Vault</span>
        </div>
      </div>
    </div>
  );
}
