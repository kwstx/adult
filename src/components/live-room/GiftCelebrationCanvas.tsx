"use client";

import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Crown, Flame, Gem, Star, Trophy, Heart } from "lucide-react";
import type { GiftSentPayload, GiftTier } from "@/modules/realtime/types";

interface GiftCelebrationCanvasProps {
  giftEvent: GiftSentPayload | null;
  currentUserId?: string;
  isCreator?: boolean;
  onAnimationEnd?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  vRot: number;
  shape: "circle" | "spark" | "diamond" | "star";
}

export function GiftCelebrationCanvas({
  giftEvent,
  currentUserId,
  isCreator = false,
  onAnimationEnd,
}: GiftCelebrationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activePayload, setActivePayload] = useState<GiftSentPayload | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  const isSender = activePayload?.sender.userId === currentUserId;
  const isLegendary = activePayload?.gift.tier === "LEGENDARY"; // 500+ credits
  const isMedium = activePayload?.gift.tier === "MEDIUM"; // 100-499 credits

  useEffect(() => {
    if (!giftEvent) return;

    setActivePayload(giftEvent);
    setShowBanner(true);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Particle Palette
    const colors = isLegendary
      ? ["#F59E0B", "#FCD34D", "#EC4899", "#8B5CF6", "#38BDF8", "#FFFFFF"]
      : isMedium
      ? ["#EC4899", "#F43F5E", "#FB7185", "#FBBF24", "#FFFFFF"]
      : ["#EC4899", "#A855F7", "#F472B6", "#FFFFFF"];

    const particleCount = isSender || isCreator
      ? isLegendary
        ? 160
        : 80
      : isLegendary
      ? 90
      : 35;

    const particles: Particle[] = [];
    const originX = window.innerWidth / 2;
    const originY = window.innerHeight * (isLegendary ? 0.45 : 0.25);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (isLegendary ? 14 : 9) + 3;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isLegendary ? 3 : 1),
        size: Math.random() * (isLegendary ? 8 : 5) + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 8,
        shape: isLegendary
          ? (["diamond", "star", "spark", "circle"] as const)[
              Math.floor(Math.random() * 4)
            ]
          : (["circle", "spark"] as const)[Math.floor(Math.random() * 2)],
      });
    }

    let animationFrameId: number;
    let startTime = performance.now();
    const duration = isLegendary ? 4500 : 3000;

    const render = (time: number) => {
      const elapsed = time - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.vx *= 0.98; // drag
        p.rotation += p.vRot;
        p.alpha = Math.max(0, 1 - elapsed / duration);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (p.shape === "diamond") {
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size, 0);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size, 0);
          ctx.closePath();
          ctx.fill();
        } else if (p.shape === "star") {
          ctx.beginPath();
          for (let j = 0; j < 5; j++) {
            ctx.lineTo(
              Math.cos(((18 + j * 72) * Math.PI) / 180) * p.size,
              -Math.sin(((18 + j * 72) * Math.PI) / 180) * p.size
            );
            ctx.lineTo(
              Math.cos(((54 + j * 72) * Math.PI) / 180) * (p.size / 2),
              -Math.sin(((54 + j * 72) * Math.PI) / 180) * (p.size / 2)
            );
          }
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      if (elapsed < duration) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setShowBanner(false);
        setActivePayload(null);
        if (onAnimationEnd) onAnimationEnd();
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [giftEvent, currentUserId, isCreator, isLegendary, isMedium, onAnimationEnd]);

  if (!activePayload || !showBanner) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden select-none">
      {/* 2D Canvas for Particle Explosion */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* ------------------------------------------------------------- */}
      {/* ROLE-AWARE VISUAL BRANCHING                                   */}
      {/* ------------------------------------------------------------- */}

      {/* 1. SENDER VIEW (SARAH): FULL-SCREEN HERO CELEBRATION */}
      {isSender && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
          <div className="relative flex flex-col items-center text-center p-8 rounded-3xl bg-gradient-to-b from-zinc-900/90 to-black/95 border border-pink-500/60 shadow-2xl shadow-pink-500/40 max-w-md mx-4 animate-bounce-short">
            {/* Glowing Halo */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 opacity-60 blur-xl animate-pulse" />

            <div className="relative flex flex-col items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 text-white shadow-2xl mb-4 text-4xl">
                {activePayload.gift.icon || "💎"}
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
                <Crown className="h-3.5 w-3.5" />
                {isLegendary ? "Legendary Gift Sent!" : "Gift Sent Successfully!"}
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight">
                You sent <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-amber-300">{activePayload.gift.name}</span>
              </h2>

              <p className="text-sm font-extrabold text-pink-300 mt-1">
                +{activePayload.gift.creditAmount} Tokens Contributed
              </p>

              {activePayload.gift.customMessage && (
                <p className="text-xs text-zinc-300 italic mt-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                  &ldquo;{activePayload.gift.customMessage}&rdquo;
                </p>
              )}

              <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-zinc-400">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                <span>Leaderboard rank updated & goal boosted!</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CREATOR VIEW: STREAMER EARNINGS & INTERACTION ALERT */}
      {!isSender && isCreator && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center animate-in slide-in-from-top-6 duration-300">
          <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-zinc-950/95 via-purple-950/90 to-zinc-950/95 border-2 border-amber-400/80 px-6 py-3.5 shadow-2xl shadow-amber-500/30 backdrop-blur-2xl">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-400 to-pink-500 text-white shadow-lg text-2xl">
              {activePayload.gift.icon || "💎"}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-amber-300">
                  {activePayload.sender.displayName}
                </span>
                <span className="rounded-md bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-black text-amber-300">
                  {activePayload.sender.badge || "FAN"}
                </span>
                <span className="text-xs font-bold text-zinc-300">sent</span>
                <span className="text-xs font-black text-pink-300">{activePayload.gift.name}</span>
              </div>

              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm font-extrabold text-white">
                  +{activePayload.gift.creditAmount} Tokens
                </span>
                <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  +{(activePayload.creatorEarningsDelta.netCredits * 0.08).toFixed(2)} USD Net (+{activePayload.creatorEarningsDelta.netCredits} creds)
                </span>
              </div>

              {activePayload.gift.customMessage && (
                <p className="text-xs text-zinc-300 italic mt-0.5 max-w-xs truncate">
                  &ldquo;{activePayload.gift.customMessage}&rdquo;
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. SPECTATOR VIEW (THE OTHER 1,999 VIEWERS): COMPACT STREAM OVERLAY */}
      {!isSender && !isCreator && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 rounded-full bg-zinc-950/90 border border-pink-500/60 px-5 py-2.5 shadow-2xl shadow-pink-500/30 backdrop-blur-xl">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-pink-600 via-rose-500 to-amber-400 text-white shadow-md text-lg">
              {activePayload.gift.icon || "💎"}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-black text-xs text-amber-300">
                {activePayload.sender.displayName}
              </span>
              <span className="text-[11px] text-zinc-400 font-semibold">sent</span>
              <span className="font-extrabold text-xs text-white">
                {activePayload.gift.name}
              </span>
              <span className="rounded-full bg-pink-500/30 px-2 py-0.5 text-[10px] font-black text-pink-200">
                +{activePayload.gift.creditAmount} tokens
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
