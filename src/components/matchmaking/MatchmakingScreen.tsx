"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Sparkles,
  Tv,
  Crown,
  Lock,
  Compass,
  Zap,
  Users,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Flame,
  Volume2,
  Sliders,
  Radio,
  Clock,
  Heart,
  ExternalLink,
} from "lucide-react";
import { useUser } from "@/lib/user-context";
import {
  MatchCandidate,
  MatchDecision,
  MatchmakingIntent,
} from "@/modules/matchmaking/types";
import { MATCHMAKING_INTENTS } from "@/modules/matchmaking/matchmaking.engine";

interface IntentCardDef {
  intent: MatchmakingIntent;
  label: string;
  tagline: string;
  icon: React.ElementType;
  gradient: string;
  glowColor: string;
  badge: string;
  description: string;
}

const INTENT_CARDS: IntentCardDef[] = [
  {
    intent: "CHAT",
    label: "Chat",
    tagline: "Intimate conversations & fast live chat",
    icon: MessageSquare,
    gradient: "from-sky-500/20 via-blue-500/10 to-transparent",
    glowColor: "border-sky-500/40 text-sky-400 group-hover:border-sky-400",
    badge: "Fast Response",
    description: "Attentive creators in active chat rooms with low message delay.",
  },
  {
    intent: "INTERACTIVE",
    label: "Interactive",
    tagline: "Real-time toy control, vibration triggers & goals",
    icon: Sparkles,
    gradient: "from-pink-500/20 via-rose-500/10 to-transparent",
    glowColor: "border-pink-500/40 text-pink-400 group-hover:border-pink-400",
    badge: "Live Triggers",
    description: "Direct control: tip triggers, vibration toys, wheel spins & collective goals.",
  },
  {
    intent: "WATCH",
    label: "Watch",
    tagline: "High-production broadcasts & performances",
    icon: Tv,
    gradient: "from-purple-500/20 via-indigo-500/10 to-transparent",
    glowColor: "border-purple-500/40 text-purple-400 group-hover:border-purple-400",
    badge: "4K Broadcast",
    description: "Sit back and enjoy high-definition DJ sets, dance, and live spectacles.",
  },
  {
    intent: "VIP",
    label: "VIP",
    tagline: "Subscriber lounges & front-row stage seats",
    icon: Crown,
    gradient: "from-amber-500/20 via-yellow-500/10 to-transparent",
    glowColor: "border-amber-500/40 text-amber-400 group-hover:border-amber-400",
    badge: "Exclusive",
    description: "Subscriber-only lounges, tier-gated perks, and VIP front-row seating.",
  },
  {
    intent: "PRIVATE",
    label: "Private",
    tagline: "1-on-1 instant sessions & confidential calls",
    icon: Lock,
    gradient: "from-rose-500/20 via-red-500/10 to-transparent",
    glowColor: "border-rose-500/40 text-rose-400 group-hover:border-rose-400",
    badge: "1-on-1",
    description: "Direct video shows, custom bookings, and personalized confidential sessions.",
  },
  {
    intent: "DISCOVER",
    label: "Discover",
    tagline: "Rising creators & serendipitous finds",
    icon: Compass,
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    glowColor: "border-emerald-500/40 text-emerald-400 group-hover:border-emerald-400",
    badge: "Trending",
    description: "Algorithmic discovery promoting fresh talent and new favorites.",
  },
];

const EVALUATION_GATES_LIST = [
  { name: "Availability", desc: "Verifying live broadcast & session state" },
  { name: "Category & Capabilities", desc: "Checking active interaction menus & triggers" },
  { name: "Language & Locale", desc: "Matching stream spoken language" },
  { name: "User Preferences", desc: "Aligning tag affinities & budget" },
  { name: "Permissions & 2257", desc: "Validating age assurance & compliance KYC" },
  { name: "Relationship Progression", desc: "Factoring fan tier, streak & XP level" },
  { name: "Historical Interaction", desc: "Analyzing watch time & tipping history" },
  { name: "Room Capacity & Latency", desc: "Optimizing audience size & queue wait" },
];

export function MatchmakingScreen() {
  const router = useRouter();
  const { currentUser } = useUser();

  const [selectedIntent, setSelectedIntent] = useState<MatchmakingIntent | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationStep, setEvaluationStep] = useState(0);
  const [decision, setDecision] = useState<MatchDecision | null>(null);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [showEngineDetails, setShowEngineDetails] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Trigger Decision Engine
  const runMatchmaking = async (
    intent: MatchmakingIntent,
    newExcluded: string[] = []
  ) => {
    setSelectedIntent(intent);
    setIsEvaluating(true);
    setDecision(null);
    setEvaluationStep(0);

    // Animate the 8 gates scanning effect
    const interval = setInterval(() => {
      setEvaluationStep((prev) => {
        if (prev < EVALUATION_GATES_LIST.length) {
          return prev + 1;
        }
        return prev;
      });
    }, 70);

    try {
      const res = await fetch("/api/matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          userId: currentUser.id,
          excludeCreatorIds: newExcluded,
          preferences: {
            languages: ["en"],
          },
        }),
      });

      const data = await res.json();

      setTimeout(() => {
        clearInterval(interval);
        setIsEvaluating(false);
        if (data.success && data.decision) {
          setDecision(data.decision);
        }
      }, 700);
    } catch (err) {
      console.error("Matchmaking request failed:", err);
      clearInterval(interval);
      setIsEvaluating(false);
    }
  };

  const handleNextMatch = () => {
    if (!decision || !selectedIntent) return;
    const nextExcluded = [...excludedIds, decision.matchedCandidate.creatorProfileId];
    setExcludedIds(nextExcluded);
    runMatchmaking(selectedIntent, nextExcluded);
  };

  const handleJoin = async () => {
    if (!decision) return;
    setIsJoining(true);

    try {
      const candidate = decision.matchedCandidate;
      const res = await fetch("/api/matchmaking/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorProfileId: candidate.creatorProfileId,
          userId: currentUser.id,
          username: candidate.username,
          intent: decision.intent,
        }),
      });

      const data = await res.json();
      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      } else {
        router.push(`/live/${candidate.username}`);
      }
    } catch {
      router.push(`/live/${decision.matchedCandidate.username}`);
    }
  };

  const resetMatchmaker = () => {
    setSelectedIntent(null);
    setDecision(null);
    setExcludedIds([]);
    setIsEvaluating(false);
  };

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8 lg:px-12 flex flex-col justify-center items-center relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-pink-600/15 via-purple-600/10 to-transparent blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute -bottom-40 right-10 w-[500px] h-[400px] bg-gradient-to-t from-rose-600/10 via-amber-600/5 to-transparent blur-[100px] rounded-full" />

      {/* Top Header Tag */}
      <div className="relative z-10 mb-6 flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/60 px-4 py-1.5 backdrop-blur-xl shadow-lg">
        <Zap className="h-4 w-4 text-pink-500 animate-pulse" />
        <span className="text-xs font-bold tracking-wider uppercase text-zinc-300">
          Backend Decision Engine
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span className="text-[10px] text-zinc-400">12 Live Creators Evaluated</span>
      </div>

      {/* =========================================================================
          STATE 1: INTENT SELECTION ("What are you looking for?")
          ========================================================================= */}
      {!selectedIntent && !decision && !isEvaluating && (
        <div className="relative z-10 max-w-4xl w-full text-center space-y-8 animate-fade-in">
          <div className="space-y-3">
            <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-white">
              What are you looking for?
            </h1>
            <p className="text-sm lg:text-base text-zinc-400 max-w-xl mx-auto">
              Matchmaking isn’t another search page. It’s an authoritative decision
              engine that routes you directly to the ideal creator room.
            </p>
          </div>

          {/* 6 Intent Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {INTENT_CARDS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.intent}
                  onClick={() => runMatchmaking(item.intent)}
                  className={`group relative text-left rounded-3xl border border-white/10 bg-zinc-950/70 p-6 backdrop-blur-2xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-2xl hover:border-white/25 overflow-hidden ${item.glowColor}`}
                >
                  {/* Subtle hover gradient background */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                  />

                  <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-white/10 group-hover:scale-110 transition-transform shadow-inner">
                        <Icon className="h-6 w-6 transition-colors" />
                      </div>
                      <span className="rounded-full border border-white/10 bg-zinc-900/80 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-300">
                        {item.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-white group-hover:text-pink-300 transition-colors">
                        {item.label}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 font-medium leading-relaxed">
                        {item.tagline}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-zinc-400 group-hover:text-white transition-colors">
                      <span>Find instant match</span>
                      <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform text-pink-400" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          STATE 2: DECISION ENGINE SCANNING RADAR
          ========================================================================= */}
      {isEvaluating && (
        <div className="relative z-10 max-w-xl w-full text-center space-y-6 animate-fade-in">
          {/* Radar Animation Ring */}
          <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-pink-500/30 animate-ping opacity-75" />
            <div className="absolute -inset-4 rounded-full border border-rose-500/20 animate-pulse" />
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-900 border border-pink-500/50 shadow-[0_0_30px_rgba(236,72,153,0.3)]">
              <Sparkles className="h-8 w-8 text-pink-400 animate-spin" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">
              Decision Engine Evaluating...
            </h2>
            <p className="text-xs text-zinc-400">
              Filtering candidates for{" "}
              <span className="text-pink-400 font-bold uppercase tracking-wider">
                {selectedIntent}
              </span>
            </p>
          </div>

          {/* 8-Gate Pipeline Progress Visualization */}
          <div className="rounded-3xl border border-white/10 bg-zinc-950/80 p-5 backdrop-blur-2xl text-left space-y-2.5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/5 text-[11px] font-bold text-zinc-400">
              <span>8-FACTOR EVALUATION PIPELINE</span>
              <span className="text-pink-400 font-mono">
                {Math.min(evaluationStep, 8)}/8 Passed
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {EVALUATION_GATES_LIST.map((gate, idx) => {
                const isPassed = idx < evaluationStep;
                return (
                  <div
                    key={gate.name}
                    className={`flex items-center gap-2 p-2 rounded-xl border transition-all duration-200 ${
                      isPassed
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-white/5 bg-zinc-900/40 text-zinc-500"
                    }`}
                  >
                    <CheckCircle2
                      className={`h-3.5 w-3.5 shrink-0 ${
                        isPassed ? "text-emerald-400" : "text-zinc-600"
                      }`}
                    />
                    <span className="truncate font-semibold text-[11px]">
                      {gate.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STATE 3: AUTHORITATIVE MATCH CARD RESULT
          ========================================================================= */}
      {decision && !isEvaluating && (
        <div className="relative z-10 max-w-2xl w-full space-y-5 animate-fade-in">
          {/* Top Bar Switcher / Intent Pill */}
          <div className="flex items-center justify-between">
            <button
              onClick={resetMatchmaker}
              className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
            >
              <span>← Change Intent</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-pink-300 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-pink-400" />
                {decision.intent} Match
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                {decision.evaluationMetrics.executionTimeMs}ms
              </span>
            </div>
          </div>

          {/* Main Decisive Creator Card */}
          <div className="rounded-3xl border border-white/15 bg-zinc-950/90 backdrop-blur-2xl p-6 lg:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden space-y-6">
            {/* Banner Background Preview */}
            {decision.matchedCandidate.bannerUrl && (
              <div
                className="absolute inset-0 h-36 bg-cover bg-center opacity-20 pointer-events-none"
                style={{
                  backgroundImage: `url(${decision.matchedCandidate.bannerUrl})`,
                }}
              />
            )}

            {/* Top Match Profile Info */}
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Avatar with glowing live ring */}
                <div className="relative">
                  <img
                    src={decision.matchedCandidate.avatarUrl}
                    alt={decision.matchedCandidate.stageName}
                    className="h-20 w-20 rounded-3xl object-cover ring-2 ring-pink-500/60 shadow-xl"
                  />
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                    LIVE
                  </span>
                </div>

                {/* Name, Intent, Stats */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-white">
                      {decision.matchedCandidate.stageName}
                    </h2>
                    <span className="text-xs text-zinc-400 font-medium">
                      @{decision.matchedCandidate.username}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-300">
                    <span className="rounded-lg bg-pink-500/20 px-2 py-0.5 text-pink-300 font-bold border border-pink-500/30">
                      {decision.matchedCandidate.category}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="flex items-center gap-1 text-zinc-300">
                      <Radio className="h-3 w-3 text-rose-500 animate-pulse" />
                      Live now
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Users className="h-3 w-3 text-zinc-400" />
                      {decision.matchedCandidate.currentViewerCount.toLocaleString()}{" "}
                      watching
                    </span>
                  </div>

                  {decision.matchedCandidate.streamTitle && (
                    <p className="text-xs text-zinc-400 line-clamp-1 italic pt-0.5">
                      &quot;{decision.matchedCandidate.streamTitle}&quot;
                    </p>
                  )}
                </div>
              </div>

              {/* Confidence Score Pill */}
              <div className="flex flex-col items-end shrink-0">
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1.5 text-center shadow-lg">
                  <div className="text-xl font-black text-emerald-400">
                    {decision.matchedCandidate.matchPercentage}%
                  </div>
                  <div className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-300">
                    Decision Score
                  </div>
                </div>
              </div>
            </div>

            {/* Available Interactions Section */}
            {decision.matchedCandidate.availableInteractions.length > 0 && (
              <div className="relative z-10 space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-pink-400" />
                    Available Interactions (
                    {decision.matchedCandidate.availableInteractions.length})
                  </span>
                  <span className="text-[11px] text-zinc-500 font-medium">
                    Queue Wait: ~
                    {decision.matchedCandidate.estimatedQueueWaitSeconds}s
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {decision.matchedCandidate.availableInteractions
                    .slice(0, 4)
                    .map((act) => (
                      <div
                        key={act.id}
                        className="flex items-center justify-between p-3 rounded-2xl border border-white/5 bg-zinc-900/60 hover:border-pink-500/30 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-pink-500/15 text-pink-400 border border-pink-500/20 text-xs font-bold">
                            ⚡
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">
                              {act.title}
                            </p>
                            {act.description && (
                              <p className="text-[10px] text-zinc-400 truncate">
                                {act.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-lg bg-amber-400/10 px-2 py-1 text-[11px] font-black text-amber-300 border border-amber-400/20">
                          🪙 {act.priceCredits}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Active Goal Highlight Banner (If any) */}
            {decision.matchedCandidate.activeGoalTitle && (
              <div className="relative z-10 rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-purple-400" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
                      Active Stream Goal
                    </span>
                    <p className="text-xs font-bold text-white">
                      {decision.matchedCandidate.activeGoalTitle}
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono text-xs font-extrabold text-purple-300">
                  {decision.matchedCandidate.activeGoalProgressCredits} /{" "}
                  {decision.matchedCandidate.activeGoalTargetCredits} 🪙
                </div>
              </div>
            )}

            {/* Decision Rationale Badges */}
            <div className="relative z-10 space-y-2 pt-1">
              <div className="flex flex-wrap gap-2">
                {decision.matchedCandidate.matchReasons.map((reason, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-900/90 px-3 py-1 text-[11px] font-semibold text-zinc-300 shadow-sm"
                  >
                    <CheckCircle2 className="h-3 w-3 text-pink-400" />
                    {reason}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons: Join CTA & Next Match */}
            <div className="relative z-10 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 py-3.5 px-6 font-black text-white shadow-[0_0_25px_rgba(236,72,153,0.4)] hover:brightness-110 hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                {isJoining ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Connecting to Live Room...</span>
                  </>
                ) : (
                  <>
                    <Radio className="h-4 w-4" />
                    <span>Join {decision.matchedCandidate.stageName}&apos;s Room</span>
                  </>
                )}
              </button>

              <button
                onClick={handleNextMatch}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-zinc-900 py-3.5 px-5 font-bold text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                title="Evaluate next best candidate in this intent"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Next Match</span>
              </button>
            </div>

            {/* Engine Breakdown Toggle */}
            <div className="relative z-10 text-center pt-2">
              <button
                onClick={() => setShowEngineDetails(!showEngineDetails)}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors underline"
              >
                {showEngineDetails ? "Hide" : "Show"} 8-Gate Scoring Breakdown
              </button>
            </div>

            {/* Expandable 8-Gate Scoring Details */}
            {showEngineDetails && (
              <div className="relative z-10 pt-3 border-t border-white/5 space-y-2 text-xs font-mono animate-fade-in">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-zinc-900/80 border border-white/5">
                    <span className="text-zinc-500">Availability:</span>{" "}
                    <span className="text-emerald-400">100/100 (Passed)</span>
                  </div>
                  <div className="p-2 rounded-xl bg-zinc-900/80 border border-white/5">
                    <span className="text-zinc-500">Intent Fit:</span>{" "}
                    <span className="text-emerald-400">
                      {decision.matchedCandidate.scoring.intentFitScore}/100
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-zinc-900/80 border border-white/5">
                    <span className="text-zinc-500">Relationship:</span>{" "}
                    <span className="text-pink-400">
                      {decision.matchedCandidate.scoring.relationshipScore}/100
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-zinc-900/80 border border-white/5">
                    <span className="text-zinc-500">Queue Latency:</span>{" "}
                    <span className="text-emerald-400">
                      {decision.matchedCandidate.scoring.capacityResponsivenessScore}
                      /100
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
