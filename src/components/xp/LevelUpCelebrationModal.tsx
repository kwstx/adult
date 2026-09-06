"use client";

import React, { useEffect, useState } from "react";
import { LevelUpEventPayload } from "@/modules/xp/types";
import {
  Sparkles,
  Trophy,
  Crown,
  CheckCircle2,
  ShieldCheck,
  Zap,
  ArrowRight,
  Volume2,
  X,
} from "lucide-react";

interface LevelUpCelebrationModalProps {
  payload: LevelUpEventPayload | null;
  onClose: () => void;
}

/**
 * LevelUpCelebrationModal
 * 
 * High-impact celebration animation triggered strictly by backend LEVEL_UP events.
 * The browser never determines levels or awards XP locally; it displays what the backend awarded.
 */
export const LevelUpCelebrationModal: React.FC<LevelUpCelebrationModalProps> = ({
  payload,
  onClose,
}) => {
  const [animatedLevel, setAnimatedLevel] = useState<number>(1);
  const [showPerks, setShowPerks] = useState<boolean>(false);

  // Play synthesized celebration sound and animate counter
  useEffect(() => {
    if (!payload) return;

    setAnimatedLevel(payload.previousLevel);

    // Audio synthesis for level-up fanfare
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        // Fanfare chord progression
        const freqs = payload.didTierUp
          ? [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6 (Tier Upgrade)
          : [440.0, 554.37, 659.25, 880.0]; // A4, C#5, E5, A5 (Level Up)

        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);

          gain.gain.setValueAtTime(0, now + idx * 0.12);
          gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.12 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.8);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.85);
        });
      }
    } catch {}

    // Number rollup animation
    const timer = setTimeout(() => {
      setAnimatedLevel(payload.newLevel);
    }, 400);

    const perksTimer = setTimeout(() => {
      setShowPerks(true);
    }, 700);

    return () => {
      clearTimeout(timer);
      clearTimeout(perksTimer);
    };
  }, [payload]);

  if (!payload) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      {/* Background Particle Flare Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-purple-600/30 via-pink-600/30 to-amber-500/30 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Main Celebration Card */}
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-3xl p-8 shadow-2xl overflow-hidden text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800/60 hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-semibold tracking-wider uppercase text-amber-400 mb-4 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          {payload.didTierUp ? "🎉 RELATIONSHIP TIER ASCENSION" : "⭐ RELATIONSHIP LEVEL UP"}
        </div>

        {/* Co-Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <img
            src={payload.fanAvatarUrl}
            alt={payload.fanDisplayName}
            className="w-12 h-12 rounded-full border-2 border-purple-500 object-cover shadow-md"
          />
          <span className="text-zinc-500 font-bold text-lg">×</span>
          <img
            src={payload.creatorAvatarUrl}
            alt={payload.creatorStageName}
            className="w-12 h-12 rounded-full border-2 border-pink-500 object-cover shadow-md"
          />
        </div>
        <h3 className="text-sm font-semibold tracking-widest text-zinc-400 uppercase mb-1">
          {payload.coBrandTitle}
        </h3>

        {/* Animated Level Transition Visual */}
        <div className="relative my-6 flex items-center justify-center gap-6">
          {/* Previous Level */}
          <div className="flex flex-col items-center opacity-60">
            <span className="text-xs text-zinc-400 uppercase font-medium">Was</span>
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl font-bold text-zinc-400">
              Lv.{payload.previousLevel}
            </div>
            <span className="text-xs text-zinc-500 mt-1">{payload.previousTier}</span>
          </div>

          <ArrowRight className="w-6 h-6 text-zinc-500 animate-pulse" />

          {/* New Level Badge */}
          <div className="flex flex-col items-center scale-110">
            <span className="text-xs text-amber-400 uppercase font-bold tracking-wider animate-bounce">
              Now
            </span>
            <div
              className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${payload.gradientClass} p-0.5 shadow-xl flex items-center justify-center`}
              style={{ boxShadow: `0 0 35px ${payload.badgeColor}88` }}
            >
              <div className="w-full h-full bg-zinc-950 rounded-[22px] flex flex-col items-center justify-center">
                <Crown className="w-5 h-5 text-amber-400 mb-0.5" />
                <span className="text-2xl font-extrabold text-white">Lv.{animatedLevel}</span>
              </div>
            </div>
            <span
              className="text-xs font-bold mt-1 px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${payload.badgeColor}33`, color: payload.badgeColor }}
            >
              {payload.newTierName}
            </span>
          </div>
        </div>

        {/* XP Awarded Stat Bar */}
        <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4 my-4 flex items-center justify-between text-left">
          <div>
            <p className="text-xs text-zinc-400">Awarded for {payload.sourceEventType.replace(/_/g, " ")}</p>
            <p className="text-lg font-bold text-emerald-400">+{payload.xpAwarded.toLocaleString()} XP</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-400">Authoritative Total</p>
            <p className="text-lg font-bold text-white">{payload.totalXp.toLocaleString()} XP</p>
          </div>
        </div>

        {/* Unlocked Perks Section */}
        {payload.unlockedPerks && payload.unlockedPerks.length > 0 && (
          <div
            className={`transition-all duration-500 text-left ${
              showPerks ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              New Perks Unlocked ({payload.newTierName})
            </h4>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {payload.unlockedPerks.map((perk) => (
                <div
                  key={perk.id}
                  className="flex items-start gap-2.5 p-2 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-xs text-zinc-300"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white">{perk.title}: </span>
                    <span className="text-zinc-400">{perk.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Immutable Proof & Authority Note */}
        <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <span className="flex items-center gap-1 text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Backend Authoritative System of Record
          </span>
          <span className="font-mono text-zinc-600 truncate max-w-[150px]">
            {payload.ledgerProofId}
          </span>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-bold shadow-lg hover:brightness-110 active:scale-[0.99] transition"
        >
          Continue Watching
        </button>
      </div>
    </div>
  );
};
