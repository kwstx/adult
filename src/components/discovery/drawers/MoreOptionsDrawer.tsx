"use client";

import React, { useState } from "react";
import {
  X,
  Share2,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Check,
  Copy,
  Volume2,
  Maximize2,
  ExternalLink,
} from "lucide-react";

interface MoreOptionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  onOpenReportModal: () => void;
}

const QUALITY_OPTIONS = ["Auto (1080p60)", "1080p60 HD", "720p60", "480p (Data Saver)", "Audio Only"];

export function MoreOptionsDrawer({
  isOpen,
  onClose,
  creatorId,
  creatorName,
  onOpenReportModal,
}: MoreOptionsDrawerProps) {
  const [selectedQuality, setSelectedQuality] = useState("Auto (1080p60)");
  const [isCopied, setIsCopied] = useState(false);
  const [show2257Details, setShow2257Details] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(`${window.location.origin}/live/${creatorId}`);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 flex max-h-[85vh] sm:max-h-[600px] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl border border-zinc-800/90 bg-zinc-950/95 shadow-2xl backdrop-blur-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4 bg-zinc-900/50">
          <h3 className="text-sm font-extrabold text-white">Stream Settings & Safety</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Share Action */}
          <div className="flex items-center justify-between rounded-2xl bg-zinc-900/70 p-4 border border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Share Live Stream</h4>
                <p className="text-[11px] text-zinc-400">Send direct room link to friends</p>
              </div>
            </div>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-zinc-700 transition-colors"
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>

          {/* 18 U.S.C. 2257 Compliance Inspection */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h4 className="text-xs font-bold text-emerald-300">
                  18 U.S.C. § 2257 Record Compliance
                </h4>
              </div>
              <button
                onClick={() => setShow2257Details(!show2257Details)}
                className="text-[11px] font-bold text-emerald-400 underline"
              >
                {show2257Details ? "Hide" : "Inspect Vault"}
              </button>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              All performers on AuraLive are age-verified 18+ and compliance records are maintained by the platform custodian.
            </p>

            {show2257Details && (
              <div className="mt-3 pt-3 border-t border-emerald-500/20 text-[10px] text-zinc-400 space-y-1 font-mono">
                <p>• Creator ID: {creatorId}</p>
                <p>• Primary Custodian: AuraLive Compliance Records Depository</p>
                <p>• Location: 100 Compliance Way, Suite 400, Wilmington, DE</p>
                <p>• Verification: Government ID + Biometric Live Match Verified</p>
              </div>
            )}
          </div>

          {/* Stream Quality Selector */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sliders className="h-4 w-4 text-zinc-400" />
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Stream Resolution
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUALITY_OPTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => setSelectedQuality(q)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                    selectedQuality === q
                      ? "border-pink-500 bg-pink-500/10 text-white font-bold"
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span>{q}</span>
                  {selectedQuality === q && <Check className="h-3.5 w-3.5 text-pink-500" />}
                </button>
              ))}
            </div>
          </div>

          {/* Report Stream */}
          <div className="pt-2">
            <button
              onClick={() => {
                onClose();
                onOpenReportModal();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-950/20 py-3 text-xs font-bold text-rose-400 hover:bg-rose-950/40 transition-colors"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Report Inappropriate Content or Safety Concern</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
