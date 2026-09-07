"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Crown,
  Trophy,
  Flame,
  Gem,
  Zap,
  Volume2,
  VolumeX,
  ArrowRight,
  Play,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  FastForward,
} from "lucide-react";
import { useAnimationSystem } from "@/modules/animation";
import { AnimatedRelationshipBadge } from "@/components/animation/AnimatedRelationshipBadge";
import { GoalMetamorphosisCard } from "@/components/animation/GoalMetamorphosisCard";
import { FanStatusBadge } from "@/components/live-room/FanStatusBadge";

export default function AnimationsShowcasePage() {
  const {
    triggerMajorGift,
    triggerRelationshipLevelUp,
    triggerGoalMetamorphosis,
    triggerVipEntrance,
    setSoundEnabled,
  } = useAnimationSystem();

  const [soundOn, setSoundOn] = useState(true);
  const [badgeAscending, setBadgeAscending] = useState(false);
  const [interactiveGoalCredits, setInteractiveGoalCredits] = useState(85000);
  const goalTarget = 100000;

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  // 1. Major Gift Handlers
  const handleTriggerLegendaryGift = () => {
    triggerMajorGift({
      id: `gift_${Date.now()}`,
      creatorId: "c_sarah",
      sender: {
        userId: "u_neo",
        username: "cyber_neo",
        displayName: "Cyber Knight",
        fanLevel: 12,
        badge: "💎 VIP",
      },
      gift: {
        id: "g_diamond_dragon",
        name: "Diamond Dragon",
        icon: "🐉",
        creditAmount: 1500,
        tier: "LEGENDARY",
        customMessage: "Incredible stream tonight! Keep crushing it! 🔥",
      },
      creatorEarningsDelta: {
        grossCredits: 1500,
        netCredits: 1200,
        platformRakeCredits: 300,
      },
      durationMs: 4500,
    });
  };

  const handleTriggerMediumGift = () => {
    triggerMajorGift({
      id: `gift_${Date.now()}`,
      creatorId: "c_sarah",
      sender: {
        userId: "u_alex",
        username: "alex_r",
        displayName: "Alex Rivera",
        fanLevel: 5,
        badge: "🔥 SUPPORTER",
      },
      gift: {
        id: "g_vip_champagne",
        name: "VIP Champagne",
        icon: "🍾",
        creditAmount: 350,
        tier: "MEDIUM",
        customMessage: "Cheers to the milestone! 🥂",
      },
      creatorEarningsDelta: {
        grossCredits: 350,
        netCredits: 280,
        platformRakeCredits: 70,
      },
      durationMs: 3500,
    });
  };

  // 2. Relationship Level-Up Handler
  const handleTriggerLevelUp = () => {
    setBadgeAscending(true);
    triggerRelationshipLevelUp({
      id: `lvl_${Date.now()}`,
      creatorId: "c_sarah",
      creatorDisplayName: "Sarah Connor",
      fanUserId: "u_viewer",
      fanDisplayName: "You (Viewer)",
      previousLevel: 4,
      newLevel: 5,
      previousTier: "Supporter",
      newTier: "VIP Fan",
      tierCode: "VIP",
      didTierAscend: true,
      badgeColor: "#F59E0B",
      gradientClass: "from-amber-400 via-pink-500 to-purple-600",
      xpAwarded: 2500,
      totalXp: 12500,
      unlockedPerks: [
        { id: "p1", title: "VIP Chat Aura", description: "Luminous gold glow on every message sent in room." },
        { id: "p2", title: "Priority Interaction", description: "Your tip requests appear at the top of the queue." },
        { id: "p3", title: "Front Row Seat", description: "Reserved VIP seating in stream telemetry." },
      ],
      ledgerProofId: `PROOF-XP-LEDGER-${Date.now()}`,
      durationMs: 4500,
    });

    setTimeout(() => setBadgeAscending(false), 4500);
  };

  // 3. Goal 100% Metamorphosis Handler
  const handleTriggerGoalMetamorphosis = () => {
    setInteractiveGoalCredits(100000);
    triggerGoalMetamorphosis({
      id: `goal_meta_${Date.now()}`,
      goalId: "goal_midnight_100k",
      creatorId: "c_sarah",
      title: "MIDNIGHT 100K GOAL",
      targetCredits: 100000,
      finalCredits: 100000,
      contributorCount: 64,
      completedAt: new Date().toISOString(),
      unlock: {
        type: "SPECIAL_EXPERIENCE",
        title: "MIDNIGHT SPECIAL EXPERIENCE UNLOCKED!",
        description: "Community reached 100,000 tokens! The 4K VIP live room experience is now active.",
        actionLabel: "Enter Experience",
      },
      topContributors: [
        { fanId: "u1", displayName: "Sarah C.", username: "sarahc", amountContributed: 35000, rank: 1 },
        { fanId: "u2", displayName: "Alex R.", username: "alexr", amountContributed: 25000, rank: 2 },
        { fanId: "u3", displayName: "Cyber Knight", username: "cyberk", amountContributed: 18000, rank: 3 },
      ],
      durationMs: 5000,
    });
  };

  // 4. VIP Room Entrance Handlers
  const handleTriggerVipEntrance = (isInnerCircle: boolean = false) => {
    triggerVipEntrance({
      id: `vip_${Date.now()}`,
      roomId: "room_c_sarah",
      creatorId: "c_sarah",
      user: {
        userId: isInnerCircle ? "u_inner" : "u_vip_maria",
        username: isInnerCircle ? "chris_inner" : "maria_vip",
        displayName: isInnerCircle ? "Chris Vance" : "Maria Santos",
        fanLevel: isInnerCircle ? 15 : 8,
        seatTier: isInnerCircle ? "INNER_CIRCLE" : "VIP",
        vipTierCode: isInnerCircle ? "INNER_CIRCLE" : "VIP",
        avatarUrl: isInnerCircle
          ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop"
          : "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop",
      },
      entranceTitle: isInnerCircle
        ? "👑 Inner Circle VIP Chris Vance arrived"
        : "💎 VIP Maria Santos entered the room",
      joinedAt: new Date().toISOString(),
      durationMs: 3500,
    });
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-6 sm:p-10 max-w-6xl mx-auto space-y-12 pb-32">
      {/* Header & Core Philosophy */}
      <header className="space-y-4 border-b border-white/10 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-xs font-black text-amber-400 uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              Event-Driven Milestone System
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Platform Animation System
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleSound}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white transition"
            >
              {soundOn ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Harmonic Cues On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-zinc-500" />
                  <span>Muted</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Architectural Principles Callout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-amber-500/30">
            <h3 className="text-sm font-extrabold text-amber-300 flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-amber-400" />
              Meaningful Event Scarcity
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Animations communicate real authoritative domain milestones. Major gifts, relationship level-ups, 100% goal completions, and VIP room entries trigger high-impact visual celebrations.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-emerald-500/30">
            <h3 className="text-sm font-extrabold text-emerald-300 flex items-center gap-2 mb-1">
              <FastForward className="w-4 h-4 text-emerald-400" />
              Instant Navigation Standard
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Ordinary navigation is almost instant (0ms delay, GPU hardware acceleration, no sluggish page wipes). This makes the platform feel fast, responsive, and minimalist.
            </p>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 1. MAJOR GIFT CELEBRATIONS                                    */}
      {/* ------------------------------------------------------------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Gem className="w-5 h-5 text-pink-400" />
              1. Major Gift Sent Animations
            </h2>
            <p className="text-xs text-zinc-400">
              When someone sends a major gift, an authoritative multi-layered celebration appears.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between space-y-4">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-[10px] font-black text-amber-400 uppercase">
                Tier: Legendary (1,500 Tokens)
              </span>
              <h3 className="text-base font-bold text-white mt-2">Diamond Dragon (1,500 Tok)</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Full-screen particle shockwave, harmonic audio chord, role-aware visuals for sender, creator, and spectators.
              </p>
            </div>
            <button
              onClick={handleTriggerLegendaryGift}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              Trigger Legendary Gift Animation
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between space-y-4">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/30 text-[10px] font-black text-pink-400 uppercase">
                Tier: Medium (350 Tokens)
              </span>
              <h3 className="text-base font-bold text-white mt-2">VIP Champagne (350 Tok)</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Upper stream celebration pill, celebratory chime, and authoritative contributor ranking update.
              </p>
            </div>
            <button
              onClick={handleTriggerMediumGift}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 border border-pink-500/40 hover:border-pink-500 text-pink-300 font-extrabold text-xs uppercase tracking-wider shadow-lg hover:bg-zinc-800 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-pink-300" />
              Trigger Medium Gift Animation
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 2. RELATIONSHIP BADGE LEVEL-UP ANIMATIONS                     */}
      {/* ------------------------------------------------------------- */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            2. Relationship Badge Level-Up Animation
          </h2>
          <p className="text-xs text-zinc-400">
            When someone levels up, their relationship badge animates with glowing pulse halo, spark particles, and number ascension.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-zinc-400">Live Badges:</span>
              <AnimatedRelationshipBadge
                tier="VIP"
                level={badgeAscending ? 5 : 4}
                displayName="You (Viewer)"
                isAscending={badgeAscending}
                variant="pill"
              />
              <AnimatedRelationshipBadge
                tier="VIP"
                level={badgeAscending ? 5 : 4}
                displayName="You (Viewer)"
                isAscending={badgeAscending}
                variant="stacked"
              />
            </div>

            <button
              onClick={handleTriggerLevelUp}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition flex items-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              Trigger Level Up (Lv.4 → Lv.5 Ascension)
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. 100% GOAL METAMORPHOSIS COMPONENT                          */}
      {/* ------------------------------------------------------------- */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            3. Goal 100% Component Metamorphosis
          </h2>
          <p className="text-xs text-zinc-400">
            When the goal reaches 100%, the entire goal component transitions from an active progress bar into a celebratory unlocked experience card.
          </p>
        </div>

        <div className="space-y-4">
          {/* Interactive Goal Sandbox */}
          <GoalMetamorphosisCard
            title="MIDNIGHT 100K GOAL"
            targetCredits={goalTarget}
            currentCredits={interactiveGoalCredits}
            rewardDescription="“At 100,000 the special experience unlocks.”"
            unlockDetails={{
              type: "SPECIAL_EXPERIENCE",
              title: "Midnight Special Experience Live!",
              description: "Goal reached! 4K Private VIP Stream is now open to all participants.",
              actionLabel: "Enter Experience",
            }}
            topContributors={[
              { fanId: "u1", displayName: "Sarah Connor", amountContributed: 35000, rank: 1 },
              { fanId: "u2", displayName: "Alex Rivera", amountContributed: 25000, rank: 2 },
              { fanId: "u3", displayName: "Cyber Knight", amountContributed: 18000, rank: 3 },
            ]}
          />

          {/* Controls to toggle between 85% and 100% */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleTriggerGoalMetamorphosis}
              className="py-2.5 px-4 rounded-xl bg-amber-400 text-black font-black text-xs uppercase tracking-wider hover:bg-amber-300 active:scale-95 transition flex items-center gap-2"
            >
              <Trophy className="w-3.5 h-3.5" />
              Breach 100% Milestone (Trigger Metamorphosis)
            </button>

            <button
              onClick={() => setInteractiveGoalCredits(85000)}
              className="py-2.5 px-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-xs uppercase hover:bg-zinc-800 transition flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to 85,000 (Active State)
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. VIP ROOM ENTRANCE ACKNOWLEDGMENT                           */}
      {/* ------------------------------------------------------------- */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            4. VIP Room Entrance Acknowledgment
          </h2>
          <p className="text-xs text-zinc-400">
            When someone enters a VIP room, the UI acknowledges their status with a luxury banner ribbon and audio cue.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between space-y-4">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-[10px] font-black text-amber-300 uppercase">
                💎 VIP Tier
              </span>
              <h3 className="text-base font-bold text-white mt-2">VIP Maria Santos Arrives</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Luxury ribbon acknowledgment sliding across upper canvas.
              </p>
            </div>
            <button
              onClick={() => handleTriggerVipEntrance(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 border border-amber-400/40 text-amber-300 font-extrabold text-xs uppercase tracking-wider hover:bg-zinc-800 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-amber-300" />
              Trigger VIP Arrival (Maria Santos)
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between space-y-4">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400/20 to-purple-500/20 border border-amber-400/40 text-[10px] font-black text-amber-300 uppercase">
                👑 Inner Circle Tier
              </span>
              <h3 className="text-base font-bold text-white mt-2">Inner Circle Chris Vance Arrives</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Royal crown ribbon acknowledgment and harmonic luxury fanfare.
              </p>
            </div>
            <button
              onClick={() => handleTriggerVipEntrance(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 text-white font-extrabold text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              Trigger Inner Circle Arrival (Chris Vance)
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
