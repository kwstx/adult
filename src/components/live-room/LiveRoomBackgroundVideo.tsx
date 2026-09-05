"use client";

import React, { useRef, useEffect, useState } from "react";
import { Lock, Radio, Sparkles, Volume2, VolumeX } from "lucide-react";
import type { MediaPlaybackState } from "@/hooks/useLiveRoomSession";

interface LiveRoomBackgroundVideoProps {
  streamUrl?: string;
  posterUrl?: string;
  creatorName: string;
  isLive: boolean;
  isPrivateShow?: boolean;
  mediaState: MediaPlaybackState;
  isMuted: boolean;
  onToggleMute: () => void;
  onDoubleTapHeart?: () => void;
  onUnlockPrivateShow?: () => void;
}

export function LiveRoomBackgroundVideo({
  streamUrl,
  posterUrl,
  creatorName,
  isLive,
  isPrivateShow = false,
  mediaState,
  isMuted,
  onToggleMute,
  onDoubleTapHeart,
  onUnlockPrivateShow,
}: LiveRoomBackgroundVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastTapRef = useRef<number>(0);
  const [hasVideoFrame, setHasVideoFrame] = useState(false);
  const [heartBurst, setHeartBurst] = useState<{ x: number; y: number } | null>(null);

  // Synchronize video element with media state and mute settings
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (mediaState === "PLAYING") {
      video.muted = isMuted;
      video.play().catch(() => {
        // Fallback for browser autoplay policies: mute and play
        video.muted = true;
        video.play().catch(() => {});
      });
    } else if (mediaState === "PAUSED" || mediaState === "RESTRICTED") {
      video.pause();
    }
  }, [mediaState, isMuted]);

  // Handle double-tap anywhere on background to burst hearts
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setHeartBurst({ x, y });
      if (onDoubleTapHeart) onDoubleTapHeart();

      setTimeout(() => setHeartBurst(null), 800);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      className="absolute inset-0 h-full w-full select-none overflow-hidden bg-zinc-950 flex items-center justify-center cursor-pointer"
    >
      {/* 1. Live Video Stream */}
      {isLive && streamUrl && (
        <video
          ref={videoRef}
          src={streamUrl}
          poster={posterUrl}
          playsInline
          loop
          autoPlay
          muted={isMuted}
          onLoadedData={() => setHasVideoFrame(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            hasVideoFrame ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* 2. High-Resolution Poster Fallback */}
      <img
        src={
          posterUrl ||
          "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600&auto=format&fit=crop&q=80"
        }
        alt={creatorName}
        className={`absolute inset-0 h-full w-full object-cover object-center filter contrast-[1.05] brightness-95 transform transition-transform duration-1000 ${
          mediaState === "PLAYING" ? "scale-100 opacity-100" : "scale-105 opacity-80"
        }`}
      />

      {/* 3. Ambient Lighting Vignettes & Gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60 pointer-events-none" />

      {/* 4. Glowing Ambient Halo */}
      {mediaState === "PLAYING" && (
        <>
          <div className="absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-pink-600/15 blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute bottom-1/3 right-1/4 h-80 w-80 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
        </>
      )}

      {/* 5. Private Show Lockout Screen */}
      {isPrivateShow && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-500/20 text-pink-400 mb-4 ring-1 ring-pink-500/50 shadow-2xl shadow-pink-500/30 animate-bounce">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-white">Private Show in Progress</h2>
          <p className="text-sm text-zinc-300 max-w-sm mt-2 mb-6 leading-relaxed">
            {creatorName} is hosting an exclusive private broadcast. VIP Membership or Private Ticket is required for access.
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onUnlockPrivateShow) onUnlockPrivateShow();
            }}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 px-6 py-3 font-bold text-white shadow-xl shadow-pink-600/40 hover:scale-105 active:scale-95 transition-all"
          >
            <Sparkles className="h-4 w-4" />
            <span>Unlock Private Access (1,000 Tokens)</span>
          </button>
        </div>
      )}

      {/* 6. Offline Screen */}
      {!isLive && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md text-center p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-900 text-zinc-500 mb-3 ring-1 ring-zinc-800">
            <Radio className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-extrabold text-white">{creatorName} is Offline</h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
            Explore their interaction marketplace, stream goal, or unlock PPV vault content below while waiting for the next broadcast!
          </p>
        </div>
      )}

      {/* 7. Double-Tap Floating Heart Burst */}
      {heartBurst && (
        <div
          className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-1/2 animate-double-tap-pop text-6xl text-pink-500 drop-shadow-[0_0_25px_rgba(236,72,153,0.9)]"
          style={{ left: `${heartBurst.x}px`, top: `${heartBurst.y}px` }}
        >
          ❤️
        </div>
      )}
    </div>
  );
}
