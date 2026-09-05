"use client";

import React, { useState } from "react";
import { X, Copy, Check, Radio, Tv, ShieldCheck, Key } from "lucide-react";
import type { IngestCredentials } from "@/types/control-room";

interface OBSCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: IngestCredentials;
}

export function OBSCredentialsModal({ isOpen, onClose, credentials }: OBSCredentialsModalProps) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedRtmp, setCopiedRtmp] = useState(false);
  const [copiedWhip, setCopiedWhip] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, type: "key" | "rtmp" | "whip") => {
    navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else if (type === "rtmp") {
      setCopiedRtmp(true);
      setTimeout(() => setCopiedRtmp(false), 2000);
    } else if (type === "whip") {
      setCopiedWhip(true);
      setTimeout(() => setCopiedWhip(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
              <Tv className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-black text-white">OBS & Streaming Ingest Config</h2>
              <p className="text-[11px] text-zinc-400">
                Authoritative RTMP and WebRTC WHIP media ingest endpoints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* RTMP Server URL */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              RTMP Ingest Server URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={credentials.rtmpIngestUrl}
                className="flex-1 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-zinc-300 font-mono border border-zinc-800 select-all"
              />
              <button
                onClick={() => copyToClipboard(credentials.rtmpIngestUrl, "rtmp")}
                className="flex items-center gap-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                {copiedRtmp ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copiedRtmp ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Stream Key */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              Private Stream Key (Keep Secret)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                readOnly
                value={credentials.streamKey}
                className="flex-1 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-zinc-300 font-mono border border-zinc-800"
              />
              <button
                onClick={() => copyToClipboard(credentials.streamKey, "key")}
                className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500"
              >
                {copiedKey ? <Check className="h-4 w-4" /> : <Key className="h-4 w-4" />}
                {copiedKey ? "Copied Key" : "Copy Key"}
              </button>
            </div>
          </div>

          {/* WebRTC WHIP Endpoint */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              Ultra-Low Latency WHIP URL (WebRTC Ingest)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={credentials.whipIngestUrl}
                className="flex-1 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-zinc-300 font-mono border border-zinc-800 select-all"
              />
              <button
                onClick={() => copyToClipboard(credentials.whipIngestUrl, "whip")}
                className="flex items-center gap-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                {copiedWhip ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copiedWhip ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* OBS Encoder Guide */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1 text-xs text-zinc-400">
            <p className="font-bold text-zinc-200">Recommended OBS Encoder Settings:</p>
            <p className="text-[11px] text-zinc-400">
              • Resolution: 1080p (1920x1080) at 60 FPS • Rate Control: CBR 6000-8000 kbps • Keyframe Interval: 2s
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="rounded-2xl bg-zinc-900 px-5 py-2 text-xs font-bold text-zinc-300 hover:text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
