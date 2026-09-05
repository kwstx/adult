"use client";

import React from "react";
import {
  Play,
  Square,
  Shield,
  ShieldAlert,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Radio,
  Sliders,
  Tv,
  AlertTriangle,
  Lock,
  VolumeX,
} from "lucide-react";
import type { ModerationRuleConfig } from "@/types/control-room";

interface ControlRoomBottomBarProps {
  isLive: boolean;
  isCameraActive: boolean;
  isMicActive: boolean;
  moderationRules: ModerationRuleConfig;
  setModerationRules: React.Dispatch<React.SetStateAction<ModerationRuleConfig>>;
  onToggleBroadcast: () => void;
  onTogglePanicBlackout: () => void;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onOpenModerationModal: () => void;
  onOpenOBSModal: () => void;
}

export function ControlRoomBottomBar({
  isLive,
  isCameraActive,
  isMicActive,
  moderationRules,
  setModerationRules,
  onToggleBroadcast,
  onTogglePanicBlackout,
  onToggleCamera,
  onToggleMic,
  onOpenModerationModal,
  onOpenOBSModal,
}: ControlRoomBottomBarProps) {
  return (
    <footer className="w-full bg-zinc-950/95 border-t border-zinc-800/80 px-4 py-3 backdrop-blur-xl shrink-0 z-30 select-none">
      <div className="flex flex-wrap items-center justify-between gap-3 max-w-[1920px] mx-auto">
        {/* 1. Left Group: Master Start/Stop Live Broadcast & Panic Shield */}
        <div className="flex items-center gap-3">
          {/* Master Go Live Toggle */}
          <button
            onClick={onToggleBroadcast}
            className={`flex items-center gap-2 rounded-2xl px-6 py-2.5 text-xs font-black shadow-xl transition-all ${
              isLive
                ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 ring-1 ring-rose-500"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 ring-1 ring-emerald-500"
            }`}
          >
            {isLive ? (
              <>
                <Square className="h-4 w-4" />
                End Live Stream
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Go Live Now
              </>
            )}
          </button>

          {/* Emergency Panic Shield */}
          <button
            onClick={onTogglePanicBlackout}
            className={`flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-extrabold border transition-all ${
              moderationRules.isPanicBlackoutActive
                ? "bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/40 animate-pulse"
                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-rose-500/50 hover:text-rose-300"
            }`}
            title="Instantly covers camera with 'Be Right Back' slate & mutes audio"
          >
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            <span>
              {moderationRules.isPanicBlackoutActive ? "Shield Armed (BRB)" : "Panic Shield"}
            </span>
          </button>
        </div>

        {/* 2. Middle Group: Live Room Mode Quick Toggles */}
        <div className="hidden md:flex items-center gap-3">
          {/* Subscribers Only Chat Toggle */}
          <label className="flex items-center gap-2 rounded-2xl bg-zinc-900/80 border border-zinc-800 px-3.5 py-1.5 cursor-pointer hover:border-zinc-700 transition-all">
            <Lock className="h-3.5 w-3.5 text-pink-400" />
            <span className="text-xs font-bold text-zinc-300">Subscribers-Only Chat</span>
            <input
              type="checkbox"
              checked={moderationRules.isSubscribersOnlyChat}
              onChange={(e) =>
                setModerationRules((prev) => ({
                  ...prev,
                  isSubscribersOnlyChat: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded text-pink-600 focus:ring-pink-500 bg-zinc-950 border-zinc-700"
            />
          </label>

          {/* Slow Mode Selector */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 text-xs">
            <span className="text-zinc-400 font-bold">Slow:</span>
            {[0, 5, 10, 30].map((s) => (
              <button
                key={s}
                onClick={() =>
                  setModerationRules((prev) => ({ ...prev, slowModeSeconds: s }))
                }
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                  moderationRules.slowModeSeconds === s
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {s === 0 ? "Off" : `${s}s`}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Right Group: Hardware Toggles & Moderation Console */}
        <div className="flex items-center gap-2">
          {/* Camera / Mic hardware toggles */}
          <button
            onClick={onToggleMic}
            className={`flex h-9 w-9 items-center justify-center rounded-2xl border transition-all ${
              isMicActive
                ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
                : "bg-rose-600/20 border-rose-500/40 text-rose-400 shadow-sm"
            }`}
            title={isMicActive ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isMicActive ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </button>

          <button
            onClick={onToggleCamera}
            className={`flex h-9 w-9 items-center justify-center rounded-2xl border transition-all ${
              isCameraActive
                ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
                : "bg-rose-600/20 border-rose-500/40 text-rose-400 shadow-sm"
            }`}
            title={isCameraActive ? "Turn Off Camera" : "Turn On Camera"}
          >
            {isCameraActive ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </button>

          {/* OBS Stream Key Ingest Credentials */}
          <button
            onClick={onOpenOBSModal}
            className="flex items-center gap-1.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3.5 py-2 text-xs font-bold text-zinc-300 hover:text-white transition-all"
            title="Configure external OBS / RTMP Stream Ingest"
          >
            <Tv className="h-3.5 w-3.5 text-pink-400" />
            <span className="hidden sm:inline">OBS Ingest</span>
          </button>

          {/* Moderation Command Center */}
          <button
            onClick={onOpenModerationModal}
            className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-rose-950/60 to-zinc-900 border border-rose-500/40 hover:border-rose-500 px-4 py-2 text-xs font-bold text-rose-300 hover:text-rose-200 transition-all shadow-md"
          >
            <Shield className="h-3.5 w-3.5 text-rose-400" />
            <span>Moderation Center</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
