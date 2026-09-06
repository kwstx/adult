"use client";

import React, { useEffect, useRef } from "react";
import { Sparkles, Trophy, Flame, CheckCircle2, Lock, ArrowRight, X, Star } from "lucide-react";
import { GoalCompletedPayload } from "@/modules/realtime/types";

interface GoalCompletedCelebrationProps {
  payload: GoalCompletedPayload | null;
  isOpen: boolean;
  onClose: () => void;
  onEnterUnlock?: () => void;
}

export function GoalCompletedCelebration({
  payload,
  isOpen,
  onClose,
  onEnterUnlock,
}: GoalCompletedCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Play synthesized audio fanfare when opened
  useEffect(() => {
    if (!isOpen) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        // Victory fanfare arpeggio (C5 -> E5 -> G5 -> C6)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = idx === notes.length - 1 ? "triangle" : "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);

          gain.gain.setValueAtTime(0, now + idx * 0.12);
          gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.12 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + (idx === notes.length - 1 ? 1.5 : 0.4));

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + (idx === notes.length - 1 ? 1.6 : 0.45));
        });
      }
    } catch {
      // Audio context might be restricted before user interaction
    }
  }, [isOpen]);

  // Particle Canvas Burst Animation
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvasRef.current) return;
      width = canvasRef.current.width = window.innerWidth;
      height = canvasRef.current.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      decay: number;
      rotation: number;
      vRot: number;
    }> = [];

    const colors = ["#F59E0B", "#EC4899", "#8B5CF6", "#10B981", "#3B82F6", "#F43F5E", "#FFFFFF"];

    // Spawn 150 explosion particles
    for (let i = 0; i < 160; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 3;
      particles.push({
        x: width / 2,
        y: height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.008 + 0.004,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 10,
      });
    }

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // Gravity
        p.vx *= 0.98; // Drag
        p.alpha -= p.decay;
        p.rotation += p.vRot;

        if (p.alpha > 0) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });

      if (particles.some((p) => p.alpha > 0)) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  if (!isOpen || !payload) return null;

  const unlock = payload.unlock;
  const topContributors = payload.topContributors || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300">
      {/* Particle Confetti Canvas */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-0" />

      {/* Radial Neon Glow Orbs */}
      <div className="pointer-events-none absolute h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-amber-500/20 via-pink-600/30 to-purple-600/20 blur-[120px] animate-pulse" />

      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-amber-500/40 bg-zinc-950/95 p-6 sm:p-8 shadow-[0_0_80px_rgba(245,158,11,0.25)] ring-1 ring-white/10">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Ribbon / Milestone Announcement */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/50 bg-amber-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
            <Sparkles className="h-4 w-4 animate-spin text-amber-400" />
            <span>GOAL COMPLETED</span>
            <Sparkles className="h-4 w-4 animate-spin text-amber-400" />
          </div>

          <h2 className="mt-3 text-2xl sm:text-4xl font-black tracking-tight text-white uppercase drop-shadow-[0_2px_15px_rgba(255,255,255,0.3)]">
            {payload.title || "MIDNIGHT GOAL"}
          </h2>

          <div className="mt-2 flex items-center justify-center gap-2 text-sm sm:text-base font-bold text-amber-400">
            <Trophy className="h-5 w-5 text-amber-400 animate-bounce" />
            <span>
              {payload.finalProgress.toLocaleString()} / {payload.target.toLocaleString()} Tokens Reached!
            </span>
          </div>
        </div>

        {/* Predetermined Unlock Showcase Card */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-pink-500/30 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-5 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {unlock.mediaUrl && (
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-pink-500/40 shadow-[0_0_20px_rgba(236,72,153,0.3)]">
                <img
                  src={unlock.mediaUrl}
                  alt={unlock.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-1 left-1.5 flex items-center gap-1 text-[10px] font-black text-amber-300">
                  <Flame className="h-3 w-3" />
                  <span>UNLOCKED</span>
                </div>
              </div>
            )}

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Special Experience Active
                </span>
              </div>
              <h3 className="mt-1 text-lg sm:text-xl font-black text-white">
                {unlock.title}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-zinc-300 italic">
                “{unlock.description}”
              </p>
            </div>
          </div>
        </div>

        {/* Top Community Contributors Hall of Fame */}
        {topContributors.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2.5">
              <span>Top Community Patrons</span>
              <span>{payload.contributorCount} Total Contributors</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {topContributors.slice(0, 3).map((contributor) => (
                <div
                  key={contributor.fanId}
                  className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-pink-500/20 text-xs font-black text-amber-400 border border-amber-500/30">
                    {contributor.rank === 1 ? "👑" : contributor.rank === 2 ? "🥈" : "🥉"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-zinc-100">
                      {contributor.displayName}
                    </p>
                    <p className="text-[10px] font-medium text-amber-400/90">
                      {contributor.amountContributed.toLocaleString()} tokens
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-7 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => {
              if (onEnterUnlock) onEnterUnlock();
              onClose();
            }}
            className="w-full flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 px-6 py-4 text-sm font-black uppercase tracking-wider text-white shadow-[0_0_30px_rgba(244,63,94,0.4)] hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <span>{unlock.actionLabel || "Experience Unlock Now"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
