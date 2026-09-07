"use client";

import React, { useState, useEffect } from "react";
import {
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Play,
  Pause,
  Settings,
  ShieldCheck,
  Sparkles,
  Coins,
  Radio,
  Tv,
  Flag,
  Flame,
  Zap,
} from "lucide-react";

export interface DesktopLivePlayerControlsProps {
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  volume?: number;
  onVolumeChange?: (vol: number) => void;
  latency?: number;
  quality?: string;
  onQualityChange?: (quality: string) => void;
  isTheaterMode: boolean;
  onToggleTheaterMode: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  walletBalance: number;
  onOpenWalletModal: () => void;
  onQuickTip?: (credits: number) => void;
  onOpenReportModal: () => void;
  viewerCount: number;
  creatorName: string;
  isCreator?: boolean;
  creatorGrossCredits?: number;
  creatorNetUsd?: number;
}

const QUALITY_OPTIONS = ["1080p60 (Source)", "720p60", "480p", "Auto (LL-HLS)"];

export function DesktopLivePlayerControls({
  isPlaying = true,
  onTogglePlay,
  isMuted,
  onToggleMute,
  volume = 80,
  onVolumeChange,
  latency = 1.2,
  quality = "1080p60 (Source)",
  onQualityChange,
  isTheaterMode,
  onToggleTheaterMode,
  isFullscreen,
  onToggleFullscreen,
  walletBalance,
  onOpenWalletModal,
  onQuickTip,
  onOpenReportModal,
  viewerCount,
  creatorName,
  isCreator = false,
  creatorGrossCredits = 0,
  creatorNetUsd = 0,
}: DesktopLivePlayerControlsProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentLatency, setCurrentLatency] = useState(latency);

  // Heartbeat micro jitter simulation for authoritative live telemetry
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentLatency(Number((1.0 + Math.random() * 0.4).toFixed(1)));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer
      aria-label="Desktop Live Player Bar"
      className="relative z-30 h-14 w-full border-t border-zinc-800/90 bg-zinc-950/95 px-4 backdrop-blur-2xl flex items-center justify-between gap-4 select-none shrink-0 shadow-2xl"
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. LEFT ZONE: PLAYBACK & AUDIO CONTROLS                       */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Play / Pause Toggle */}
        <button
          onClick={onTogglePlay}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900/90 text-white hover:bg-zinc-800 transition-colors shadow-sm"
          title={isPlaying ? "Pause Stream" : "Play Stream"}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>

        {/* Volume & Mute Group */}
        <div className="flex items-center gap-2 group/vol">
          <button
            onClick={onToggleMute}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            title={isMuted ? "Unmute (M)" : "Mute (M)"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4 text-rose-400" />
            ) : volume < 50 ? (
              <Volume1 className="h-4 w-4 text-zinc-300" />
            ) : (
              <Volume2 className="h-4 w-4 text-zinc-200" />
            )}
          </button>

          {/* Volume Slider */}
          <input
            type="range"
            min={0}
            max={100}
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (onVolumeChange) onVolumeChange(val);
              if (isMuted && val > 0) onToggleMute();
            }}
            className="w-16 lg:w-24 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400 transition-all"
            title={`Volume: ${isMuted ? "Muted" : `${volume}%`}`}
          />
        </div>

        {/* Live Status & Ultra-Low Latency Heartbeat */}
        <div className="hidden xl:flex items-center gap-2 border-l border-zinc-800/80 pl-3">
          <span className="flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-black text-rose-400 uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
            Live
          </span>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {currentLatency}s latency
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. CENTER ZONE: RAPID TIP SHORTCUTS / BROADCASTER HUD         */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2">
        {isCreator ? (
          <div className="flex items-center gap-3 rounded-2xl bg-zinc-900/80 border border-pink-500/20 px-3.5 py-1">
            <div className="flex items-center gap-1 text-xs font-extrabold text-amber-400 font-mono">
              <Coins className="h-3.5 w-3.5" />
              <span>{creatorGrossCredits.toLocaleString()} Tokens</span>
            </div>
            <span className="text-zinc-600">•</span>
            <div className="text-xs font-bold text-emerald-400 font-mono">
              ≈ ${(creatorNetUsd).toFixed(2)} USD Net
            </div>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-1">
            <span className="text-[10px] font-bold text-zinc-400 px-2 uppercase tracking-wider">
              Quick Tip:
            </span>
            {[50, 100, 250].map((amt) => (
              <button
                key={amt}
                onClick={() => onQuickTip?.(amt)}
                className="flex items-center gap-1 rounded-xl bg-zinc-800/80 hover:bg-pink-600 hover:text-white px-2.5 py-1 text-[11px] font-extrabold text-amber-300 transition-all active:scale-95 shadow-sm"
              >
                <span>+{amt}</span>
                <Coins className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. RIGHT ZONE: WALLET, SETTINGS, THEATER & FULLSCREEN          */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-2.5">
        {/* Wallet Balance Pill */}
        <button
          onClick={onOpenWalletModal}
          className="flex items-center gap-1.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-black text-amber-300 hover:bg-amber-500/25 transition-all shadow-sm"
          title="Open Wallet & Top Up Tokens"
        >
          <Coins className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-mono">{walletBalance.toLocaleString()}</span>
          <span className="text-[10px] text-amber-400/80 font-bold hidden lg:inline">+ Top Up</span>
        </button>

        {/* 18 U.S.C. 2257 Verified Badge */}
        <div
          className="hidden 2xl:flex items-center gap-1 rounded-2xl bg-zinc-900/80 border border-zinc-800 px-2.5 py-1 text-[10px] font-bold text-zinc-300"
          title="18 U.S.C. 2257 Record-Keeping Requirements Compliant"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>2257 Verified</span>
        </div>

        {/* Stream Quality Settings Popover */}
        <div className="relative">
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
              isSettingsOpen ? "bg-white/20 text-white" : "bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            }`}
            title="Stream Settings & Quality"
          >
            <Settings className="h-4 w-4" />
          </button>

          {isSettingsOpen && (
            <div className="absolute bottom-12 right-0 z-50 w-52 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-2 shadow-2xl backdrop-blur-2xl animate-slide-up">
              <div className="px-2.5 py-1.5 border-b border-zinc-800/80 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Video Resolution
              </div>
              <div className="space-y-0.5 mt-1">
                {QUALITY_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      onQualityChange?.(opt);
                      setIsSettingsOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs font-semibold transition-colors ${
                      quality === opt
                        ? "bg-pink-500/20 text-pink-300 font-bold"
                        : "text-zinc-300 hover:bg-zinc-900"
                    }`}
                  >
                    <span>{opt}</span>
                    {quality === opt && <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />}
                  </button>
                ))}
              </div>

              <div className="mt-2 pt-2 border-t border-zinc-800/80">
                <button
                  onClick={() => {
                    setIsSettingsOpen(false);
                    onOpenReportModal();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Flag className="h-3.5 w-3.5" />
                  <span>Report Stream / 2257</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Theater Mode Toggle */}
        <button
          onClick={onToggleTheaterMode}
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
            isTheaterMode
              ? "bg-pink-600 text-white shadow-md shadow-pink-600/30"
              : "bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          }`}
          title={isTheaterMode ? "Exit Theater Mode (T)" : "Theater Mode (T)"}
        >
          <Tv className="h-4 w-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      </div>
    </footer>
  );
}
