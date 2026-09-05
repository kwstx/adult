"use client";

import React, { useState, useRef, useEffect } from "react";
import { Lock, Radio, Sparkles, Volume2, VolumeX, ShieldCheck, Flame } from "lucide-react";

interface LiveStreamCanvasProps {
  streamUrl?: string;
  posterUrl?: string;
  creatorName: string;
  isLive: boolean;
  isPrivateShow?: boolean;
  isActive?: boolean;
  isPreloaded?: boolean;
  onDoubleTapLike?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

export function LiveStreamCanvas({
  posterUrl,
  creatorName,
  isLive,
  isPrivateShow = false,
  isActive = true,
  isPreloaded = false,
  onDoubleTapLike,
  isMuted = true,
  onToggleMute,
}: LiveStreamCanvasProps) {
  const lastTapRef = useRef<number>(0);
  const [showHeartBurst, setShowHeartBurst] = useState<{ x: number; y: number } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Preload high-res image asset into browser cache immediately if preloading
  useEffect(() => {
    if (posterUrl && (isActive || isPreloaded)) {
      const img = new Image();
      img.src = posterUrl;
      img.onload = () => setIsLoaded(true);
    }
  }, [posterUrl, isActive, isPreloaded]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected!
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setShowHeartBurst({ x, y });
      if (onDoubleTapLike) {
        onDoubleTapLike();
      }

      setTimeout(() => {
        setShowHeartBurst(null);
      }, 800);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      className="relative h-full w-full select-none overflow-hidden bg-zinc-950 flex items-center justify-center cursor-pointer"
    >
      {/* Background Video Simulation / High Resolution Stream Image */}
      {isLive ? (
        <>
          <img
            src={
              posterUrl ||
              "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=80"
            }
            alt={creatorName}
            className={`h-full w-full object-cover object-center filter contrast-[1.03] brightness-95 transform transition-all duration-700 ${
              isActive ? "scale-100 opacity-100" : "scale-105 opacity-90"
            }`}
            loading={isPreloaded ? "eager" : "lazy"}
          />

          {/* Dynamic Ambient Atmosphere Gradients (Top & Bottom Vignettes) */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/40 pointer-events-none" />

          {/* Subtle Live Stage Scanline & Neon Ambient Backlight */}
          {isActive && (
            <>
              <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-pink-600/15 blur-3xl pointer-events-none animate-pulse" />
              <div className="absolute bottom-1/3 right-1/4 h-72 w-72 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
            </>
          )}

          {/* Locked Overlay if Private Show */}
          {isPrivateShow && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-2xl p-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-500/20 text-pink-400 mb-4 ring-1 ring-pink-500/50 shadow-2xl shadow-pink-500/30 animate-bounce">
                <Lock className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-black text-white">Private Show in Progress</h3>
              <p className="text-xs text-zinc-300 max-w-xs mt-2 mb-5 leading-relaxed">
                This room is restricted to VIP Subscribers or Private Ticket Holders.
              </p>
              <button className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 px-6 py-3 font-bold text-white shadow-xl shadow-pink-600/40 hover:scale-105 active:scale-95 transition-all">
                <Sparkles className="h-4 w-4" />
                <span>Unlock Access (1,000 Tokens)</span>
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-900/90 text-center p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-800 text-zinc-500 mb-3 ring-1 ring-zinc-700">
            <Radio className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-white">{creatorName} is Offline</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs">
            Swipe up to discover another live stream or view their PPV Media Vault.
          </p>
        </div>
      )}

      {/* Double Tap Heart Pop Animation */}
      {showHeartBurst && (
        <div
          className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-1/2 animate-double-tap-pop text-6xl text-pink-500 drop-shadow-[0_0_20px_rgba(236,72,153,0.8)]"
          style={{ left: `${showHeartBurst.x}px`, top: `${showHeartBurst.y}px` }}
        >
          ❤️
        </div>
      )}
    </div>
  );
}
