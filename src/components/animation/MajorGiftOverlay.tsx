"use client";

import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Crown, Trophy, DollarSign, X, Zap, Heart } from "lucide-react";
import { MajorGiftAnimationPayload } from "@/modules/animation/types";

interface MajorGiftOverlayProps {
  payload: MajorGiftAnimationPayload | null;
  currentUserId?: string;
  isCreator?: boolean;
  onDismiss?: () => void;
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

export function MajorGiftOverlay({
  payload,
  currentUserId,
  isCreator = false,
  onDismiss,
}: MajorGiftOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activePayload, setActivePayload] = useState<MajorGiftAnimationPayload | null>(null);

  const isSender = activePayload?.sender.userId === currentUserId;
  const isLegendary = activePayload?.gift.tier === "LEGENDARY";

  useEffect(() => {
    if (!payload) {
      setActivePayload(null);
      return;
    }

    setActivePayload(payload);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = isLegendary
      ? ["#F59E0B", "#FCD34D", "#EC4899", "#8B5CF6", "#38BDF8", "#FFFFFF"]
      : ["#EC4899", "#F43F5E", "#FB7185", "#FBBF24", "#FFFFFF"];

    const particleCount = isSender || isCreator
      ? isLegendary ? 140 : 75
      : isLegendary ? 70 : 30;

    const particles: Particle[] = [];
    const originX = window.innerWidth / 2;
    const originY = window.innerHeight * (isLegendary ? 0.42 : 0.25);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (isLegendary ? 12 : 8) + 3;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isLegendary ? 2.5 : 1),
        size: Math.random() * (isLegendary ? 7 : 5) + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 8,
        shape: isLegendary
          ? (["diamond", "star", "spark", "circle"] as const)[Math.floor(Math.random() * 4)]
          : (["circle", "spark"] as const)[Math.floor(Math.random() * 2)],
      });
    }

    let animationFrameId: number;
    const startTime = performance.now();
    const duration = payload.durationMs || (isLegendary ? 4200 : 3200);

    const render = (time: number) => {
      const elapsed = time - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22; // gravity
        p.vx *= 0.985; // drag
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
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [payload, currentUserId, isCreator, isLegendary, isSender]);

  if (!activePayload) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden select-none">
      {/* 2D Particle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* 1. SENDER VIEW: Hero Celebratory Card */}
      {isSender && (
        <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-250">
          <div className="relative flex flex-col items-center text-center p-8 rounded-3xl bg-zinc-950/95 border-2 border-amber-400/80 shadow-[0_0_50px_rgba(245,158,11,0.4)] max-w-md mx-4">
            {/* Radiant Ambient Glow */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 opacity-50 blur-xl animate-pulse" />

            <button
              onClick={onDismiss}
              className="absolute top-3 right-3 p-1.5 text-zinc-400 hover:text-white rounded-full bg-zinc-800/60 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative flex flex-col items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 text-white shadow-2xl mb-4 text-4xl transform animate-bounce">
                {activePayload.gift.icon || "💎"}
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
                <Crown className="h-3.5 w-3.5" />
                {isLegendary ? "Legendary Gift Delivered!" : "Major Gift Sent!"}
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight">
                You sent <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-pink-400">{activePayload.gift.name}</span>
              </h2>

              <p className="text-sm font-extrabold text-amber-300 mt-1">
                +{activePayload.gift.creditAmount.toLocaleString()} Tokens
              </p>

              {activePayload.gift.customMessage && (
                <p className="text-xs text-zinc-300 italic mt-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 max-w-xs">
                  &ldquo;{activePayload.gift.customMessage}&rdquo;
                </p>
              )}

              <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-zinc-400">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                <span>Leaderboard rank & creator progression updated!</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CREATOR VIEW: Top Stream Alert with Earnings */}
      {!isSender && isCreator && (
        <div className="pointer-events-auto absolute top-14 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center animate-in slide-in-from-top-6 duration-250">
          <div className="flex items-center gap-4 rounded-2xl bg-zinc-950/95 border-2 border-amber-400/90 px-6 py-3.5 shadow-[0_0_30px_rgba(245,158,11,0.35)] backdrop-blur-2xl">
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
                  +{activePayload.gift.creditAmount.toLocaleString()} Tokens
                </span>
                {activePayload.creatorEarningsDelta && (
                  <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    +${(activePayload.creatorEarningsDelta.netCredits * 0.08).toFixed(2)} Net (+{activePayload.creatorEarningsDelta.netCredits} creds)
                  </span>
                )}
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

      {/* 3. SPECTATOR VIEW: Minimalist Top Overlay */}
      {!isSender && !isCreator && (
        <div className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-3 rounded-full bg-zinc-950/90 border border-amber-400/60 px-5 py-2.5 shadow-[0_0_25px_rgba(245,158,11,0.25)] backdrop-blur-xl">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-pink-600 via-rose-500 to-amber-400 text-white shadow-md text-base">
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
              <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-black text-amber-300">
                +{activePayload.gift.creditAmount} tokens
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
