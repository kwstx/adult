"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Trophy,
  Crown,
  Flame,
  Shield,
  HeartHandshake,
  Coins,
  Clock,
  Zap,
  ArrowRight,
  User,
  Layers,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
  Gift,
  Volume2,
  Play,
} from "lucide-react";
import {
  DEMO_CREATOR_LUNA,
  DEMO_CREATOR_ELENA,
  DEMO_CREATOR_CHLOE,
  generateMockRelationshipDetail,
  generateMockMultiCreatorMatrix,
  generateMockRelationshipTree,
} from "@/modules/relationship/mock-data";
import { RelationshipBadge } from "@/components/relationship/RelationshipBadge";
import { RelationshipTreeModal } from "@/components/relationship/RelationshipTreeModal";
import { FanRelationshipMatrixView } from "@/components/relationship/FanRelationshipMatrixView";
import { calculateProgressionFromXp, RELATIONSHIP_TIERS } from "@/modules/relationship/tier-definitions";
import { AwardXPResult, CreatorFanRelationshipDetail, RelationshipTierCode } from "@/modules/relationship/types";

export default function RelationshipsPage() {
  const [selectedCreator, setSelectedCreator] = useState(DEMO_CREATOR_CHLOE);
  const [currentXp, setCurrentXp] = useState(0); // Starts at 0 XP for "ALEX × CHLOE" as requested!
  const [isTreeModalOpen, setIsTreeModalOpen] = useState(false);
  const [levelUpModalData, setLevelUpModalData] = useState<AwardXPResult | null>(null);
  const [viewTab, setViewTab] = useState<"tree" | "matrix">("tree");

  // Multi-creator XP states
  const [lunaXp, setLunaXp] = useState(DEMO_CREATOR_LUNA.initialXp); // 52,400 XP (Elite)
  const [elenaXp, setElenaXp] = useState(DEMO_CREATOR_ELENA.initialXp); // 8,200 XP (VIP)
  const [chloeXp, setChloeXp] = useState(0); // 0 XP (New Fan)

  // Current active relationship detail
  const activeXp =
    selectedCreator.id === DEMO_CREATOR_LUNA.id
      ? lunaXp
      : selectedCreator.id === DEMO_CREATOR_ELENA.id
      ? elenaXp
      : chloeXp;

  const relationshipDetail = generateMockRelationshipDetail(selectedCreator, activeXp);
  const treeData = generateMockRelationshipTree(selectedCreator, activeXp);

  // Dynamic matrix
  const matrixData = generateMockMultiCreatorMatrix();
  matrixData.relationships[0].totalXp = lunaXp;
  matrixData.relationships[0].relationshipTier = calculateProgressionFromXp(lunaXp).tier;
  matrixData.relationships[0].tierName = calculateProgressionFromXp(lunaXp).tierDef.name;

  matrixData.relationships[1].totalXp = elenaXp;
  matrixData.relationships[1].relationshipTier = calculateProgressionFromXp(elenaXp).tier;
  matrixData.relationships[1].tierName = calculateProgressionFromXp(elenaXp).tierDef.name;

  matrixData.relationships[2].totalXp = chloeXp;
  matrixData.relationships[2].relationshipTier = calculateProgressionFromXp(chloeXp).tier;
  matrixData.relationships[2].tierName = calculateProgressionFromXp(chloeXp).tierDef.name;

  const handleSimulateAction = (
    action: "TIP_50" | "TIP_500" | "WATCH_30M" | "CHAT_10" | "SUB_VIP" | "CUSTOM",
    customXp = 0
  ) => {
    let xpGain = 0;
    if (action === "TIP_50") xpGain = 500;
    else if (action === "TIP_500") xpGain = 5000;
    else if (action === "WATCH_30M") xpGain = 150;
    else if (action === "CHAT_10") xpGain = 20;
    else if (action === "SUB_VIP") xpGain = 2500;
    else xpGain = customXp || 100;

    const prevXp = activeXp;
    const newXp = prevXp + xpGain;

    const prevProg = calculateProgressionFromXp(prevXp);
    const newProg = calculateProgressionFromXp(newXp);
    const didLevelUp = prevProg.tier !== newProg.tier;

    if (selectedCreator.id === DEMO_CREATOR_LUNA.id) setLunaXp(newXp);
    else if (selectedCreator.id === DEMO_CREATOR_ELENA.id) setElenaXp(newXp);
    else setChloeXp(newXp);

    if (didLevelUp) {
      const updatedRel = generateMockRelationshipDetail(selectedCreator, newXp);
      setLevelUpModalData({
        previousXp: prevXp,
        newXp,
        xpAwarded: xpGain,
        previousTier: prevProg.tier,
        newTier: newProg.tier,
        didLevelUpTier: true,
        previousLevel: prevProg.level,
        newLevel: newProg.level,
        relationship: updatedRel,
        unlockedPerks: newProg.tierDef.perks,
      });
    }
  };

  const handleResetProgress = () => {
    if (selectedCreator.id === DEMO_CREATOR_LUNA.id) setLunaXp(DEMO_CREATOR_LUNA.initialXp);
    else if (selectedCreator.id === DEMO_CREATOR_ELENA.id) setElenaXp(DEMO_CREATOR_ELENA.initialXp);
    else setChloeXp(0);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-pink-500 selection:text-white pb-20">
      {/* Top Banner / Navigation */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider uppercase text-white">
                Creator Relationship Tree System
              </h1>
              <p className="text-[11px] text-zinc-400">
                Authoritative Creator-Specific Fan Progression Engine
              </p>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-2xl">
            <button
              onClick={() => setViewTab("tree")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewTab === "tree"
                  ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Relationship Tree
            </button>
            <button
              onClick={() => setViewTab("matrix")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                viewTab === "matrix"
                  ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Multi-Creator Matrix
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Concept Introduction Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950/40 via-zinc-900/60 to-pink-950/40 border border-zinc-800 p-6 sm:p-8">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-pink-500/10 border border-pink-500/30 px-3 py-1 text-xs font-bold text-pink-400">
              <Sparkles className="h-3.5 w-3.5" />
              Creator-Specific Loyalty Progression
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Every Creator Gets a Dedicated Relationship Tree
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Instead of a generic platform badge, fans build deep, individual relationship
              milestones with each creator. A fan can be{" "}
              <strong className="text-amber-400">Elite with Luna</strong>,{" "}
              <strong className="text-purple-400">VIP with Elena</strong>, and{" "}
              <strong className="text-zinc-300">New Fan with Chloe</strong>.
            </p>
          </div>
        </div>

        {/* Creator Selector Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">
              Select Creator Experience (Test Different Progression States)
            </h3>
            <span className="text-xs text-zinc-500">Fan: Alex Patron</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                creator: DEMO_CREATOR_CHLOE,
                label: "New Fan Example (0 / 500 XP)",
                xp: chloeXp,
                tier: calculateProgressionFromXp(chloeXp).tier,
              },
              {
                creator: DEMO_CREATOR_ELENA,
                label: "VIP Supporter Example",
                xp: elenaXp,
                tier: calculateProgressionFromXp(elenaXp).tier,
              },
              {
                creator: DEMO_CREATOR_LUNA,
                label: "Elite Legend Example",
                xp: lunaXp,
                tier: calculateProgressionFromXp(lunaXp).tier,
              },
            ].map(({ creator, label, xp, tier }) => {
              const isSelected = selectedCreator.id === creator.id;
              const prog = calculateProgressionFromXp(xp);

              return (
                <button
                  key={creator.id}
                  onClick={() => setSelectedCreator(creator)}
                  className={`relative p-4 rounded-3xl text-left border transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-zinc-900 border-pink-500 ring-2 ring-pink-500/30 shadow-xl shadow-pink-500/10"
                      : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={creator.avatarUrl}
                      alt={creator.stageName}
                      className="h-12 w-12 rounded-2xl object-cover ring-2 ring-zinc-800"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">
                          {creator.stageName}
                        </span>
                        <RelationshipBadge tier={tier} level={prog.level} size="xs" />
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                        {prog.xpInCurrentTier.toLocaleString()} /{" "}
                        {prog.xpRequiredForNextTier.toLocaleString()} XP ({prog.progressPercent}%)
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* View Tab 1: Relationship Tree View */}
        {viewTab === "tree" && (
          <div className="space-y-6">
            {/* Active Co-Branded Card Header (e.g. ALEX × LUNA) */}
            <div className="relative overflow-hidden rounded-3xl bg-zinc-900/90 border border-zinc-800 p-6 sm:p-8 space-y-6">
              {/* Co-Branded Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-zinc-800/80 pb-6">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-4 items-center">
                    <img
                      src={relationshipDetail.fanAvatarUrl}
                      alt={relationshipDetail.fanDisplayName}
                      className="h-16 w-16 rounded-3xl object-cover ring-4 ring-zinc-950 shadow-xl"
                    />
                    <div className="h-8 w-8 rounded-full bg-pink-500 text-white font-black text-xs flex items-center justify-center ring-4 ring-zinc-950 z-10 shadow-lg">
                      ×
                    </div>
                    <img
                      src={relationshipDetail.creatorAvatarUrl}
                      alt={relationshipDetail.creatorStageName}
                      className="h-16 w-16 rounded-3xl object-cover ring-4 ring-pink-500/40 shadow-xl"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white uppercase">
                        {relationshipDetail.coBrandTitle}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <RelationshipBadge
                        tier={relationshipDetail.relationshipTier}
                        level={relationshipDetail.currentLevel}
                        size="sm"
                      />
                      <span className="text-xs text-zinc-400">
                        {relationshipDetail.progress.currentTier.subtitle}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Open Modal Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetProgress}
                    className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs font-bold flex items-center gap-2 transition-all"
                    title="Reset XP for this creator"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset
                  </button>
                  <button
                    onClick={() => setIsTreeModalOpen(true)}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black text-xs shadow-lg shadow-pink-600/30 hover:from-pink-500 hover:to-purple-500 transition-all flex items-center gap-2"
                  >
                    <Trophy className="h-4 w-4" />
                    Open Tree Modal
                  </button>
                </div>
              </div>

              {/* Live XP Progression Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-bold font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300">
                      Current Tier:{" "}
                      <strong className="text-white text-base">
                        {relationshipDetail.tierName}
                      </strong>
                    </span>
                    <span className="text-pink-400">
                      ({relationshipDetail.progress.xpInCurrentTier.toLocaleString()} /{" "}
                      {relationshipDetail.progress.xpRequiredForNextTier.toLocaleString()} XP)
                    </span>
                  </div>
                  <span className="text-zinc-400">
                    {relationshipDetail.progress.progressPercent}% to{" "}
                    {relationshipDetail.progress.nextTier
                      ? relationshipDetail.progress.nextTier.name
                      : "Max Tier"}
                  </span>
                </div>

                <div className="h-4 w-full rounded-full bg-zinc-950 p-1 border border-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-amber-400 transition-all duration-700 shadow-[0_0_15px_rgba(236,72,153,0.6)]"
                    style={{
                      width: `${Math.max(
                        3,
                        relationshipDetail.progress.progressPercent
                      )}%`,
                    }}
                  />
                </div>

                {relationshipDetail.progress.nextTier && (
                  <p className="text-xs text-zinc-400 flex items-center gap-1.5 pt-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span>
                      Earn{" "}
                      <strong className="text-white font-mono">
                        {relationshipDetail.progress.xpRemainingToNextTier.toLocaleString()}
                      </strong>{" "}
                      more XP to level up to{" "}
                      <strong className="text-pink-400">
                        {relationshipDetail.progress.nextTier.name}
                      </strong>
                    </span>
                  </p>
                )}
              </div>

              {/* Simulation Toolbar for Live Testing */}
              <div className="pt-4 border-t border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                    <Zap className="h-4 w-4" />
                    Simulate Fan Engagement (Watch XP & Tiers Level Up Live)
                  </div>
                  <span className="text-xs font-mono text-zinc-500">
                    Total XP: {relationshipDetail.totalXp.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <button
                    onClick={() => handleSimulateAction("TIP_50")}
                    className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/50 hover:bg-amber-950/20 transition-all text-center group"
                  >
                    <Coins className="h-5 w-5 text-amber-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-black text-white">Tip 50 Tokens</div>
                    <div className="text-[10px] text-amber-400 font-mono font-bold">+500 XP</div>
                  </button>

                  <button
                    onClick={() => handleSimulateAction("TIP_500")}
                    className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-pink-500/50 hover:bg-pink-950/20 transition-all text-center group"
                  >
                    <Gift className="h-5 w-5 text-pink-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-black text-white">Major 500 Tip</div>
                    <div className="text-[10px] text-pink-400 font-mono font-bold">+5,000 XP</div>
                  </button>

                  <button
                    onClick={() => handleSimulateAction("WATCH_30M")}
                    className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-blue-500/50 hover:bg-blue-950/20 transition-all text-center group"
                  >
                    <Clock className="h-5 w-5 text-blue-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-black text-white">Watch 30 Mins</div>
                    <div className="text-[10px] text-blue-400 font-mono font-bold">+150 XP</div>
                  </button>

                  <button
                    onClick={() => handleSimulateAction("CHAT_10")}
                    className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-950/20 transition-all text-center group"
                  >
                    <Sparkles className="h-5 w-5 text-emerald-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-black text-white">10 Chat Msgs</div>
                    <div className="text-[10px] text-emerald-400 font-mono font-bold">+20 XP</div>
                  </button>

                  <button
                    onClick={() => handleSimulateAction("SUB_VIP")}
                    className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-purple-500/50 hover:bg-purple-950/20 transition-all text-center group"
                  >
                    <Crown className="h-5 w-5 text-purple-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-black text-white">VIP Subscription</div>
                    <div className="text-[10px] text-purple-400 font-mono font-bold">+2,500 XP</div>
                  </button>
                </div>
              </div>
            </div>

            {/* 6-Tier Progression Hierarchy Overview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-pink-400" />
                  Creator Tier Milestones & Unlocked Perks
                </h3>
                <span className="text-xs text-zinc-400">6 Official Loyalty Tiers</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {RELATIONSHIP_TIERS.map((tierDef, idx) => {
                  const currentTierIndex = RELATIONSHIP_TIERS.findIndex(
                    (t) => t.tier === relationshipDetail.relationshipTier
                  );
                  const isCurrent = tierDef.tier === relationshipDetail.relationshipTier;
                  const isUnlocked = idx <= currentTierIndex;

                  return (
                    <div
                      key={tierDef.tier}
                      className={`rounded-3xl p-5 border transition-all space-y-4 ${
                        isCurrent
                          ? "bg-zinc-900 border-pink-500 ring-2 ring-pink-500/30 shadow-xl shadow-pink-500/10"
                          : isUnlocked
                          ? "bg-zinc-950/80 border-emerald-500/30"
                          : "bg-zinc-950/40 border-zinc-800/80 opacity-70"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-10 w-10 rounded-2xl flex items-center justify-center ${
                              isUnlocked
                                ? "bg-gradient-to-br " + tierDef.gradientClass
                                : "bg-zinc-800 text-zinc-600"
                            }`}
                          >
                            <Trophy className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white">
                              {tierDef.name}
                            </h4>
                            <span className="text-[10px] font-mono text-zinc-400">
                              {tierDef.minXp.toLocaleString()} XP Req.
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                            isCurrent
                              ? "bg-pink-500/20 text-pink-300 border-pink-500/40"
                              : isUnlocked
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : "bg-zinc-800 text-zinc-500 border-zinc-700"
                          }`}
                        >
                          {isCurrent ? "Current" : isUnlocked ? "Unlocked" : "Locked"}
                        </span>
                      </div>

                      {/* Tier Perks */}
                      <div className="space-y-2 pt-1 border-t border-zinc-800/60">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                          Tier Perks:
                        </span>
                        {tierDef.perks.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-start gap-2 text-xs"
                          >
                            {isUnlocked ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-zinc-700 shrink-0 mt-1.5 ml-1 mr-1" />
                            )}
                            <span
                              className={
                                isUnlocked ? "text-zinc-200" : "text-zinc-500"
                              }
                            >
                              {p.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* View Tab 2: Multi-Creator Matrix View */}
        {viewTab === "matrix" && (
          <FanRelationshipMatrixView
            matrix={matrixData}
            selectedCreatorId={selectedCreator.id}
            onSelectCreator={(id) => {
              if (id === DEMO_CREATOR_LUNA.id) setSelectedCreator(DEMO_CREATOR_LUNA);
              else if (id === DEMO_CREATOR_ELENA.id) setSelectedCreator(DEMO_CREATOR_ELENA);
              else setSelectedCreator(DEMO_CREATOR_CHLOE);
              setViewTab("tree");
            }}
          />
        )}
      </main>

      {/* Relationship Tree Interactive Modal */}
      <RelationshipTreeModal
        isOpen={isTreeModalOpen}
        onClose={() => setIsTreeModalOpen(false)}
        relationship={relationshipDetail}
        treeData={treeData}
        onSimulateAction={handleSimulateAction}
      />

      {/* Level Up Celebration Dialog */}
      {levelUpModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="relative w-full max-w-md bg-zinc-950 border-2 border-pink-500 rounded-3xl p-6 shadow-[0_0_50px_rgba(236,72,153,0.3)] text-center space-y-6">
            <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 flex items-center justify-center shadow-lg shadow-pink-500/40 animate-bounce">
              <Trophy className="h-10 w-10 text-white" />
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400 block">
                Relationship Tier Upgraded! 🎉
              </span>
              <h3 className="text-2xl font-black text-white">
                You are now a{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-amber-300">
                  {levelUpModalData.relationship.tierName}
                </span>
                !
              </h3>
              <p className="text-xs text-zinc-400">
                Your bond with {levelUpModalData.relationship.creatorStageName} has reached a new milestone.
              </p>
            </div>

            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 space-y-2 text-left">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                Newly Unlocked Perks:
              </span>
              {levelUpModalData.unlockedPerks?.map((perk) => (
                <div key={perk.id} className="flex items-center gap-2 text-xs text-white">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{perk.title}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setLevelUpModalData(null)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black text-xs shadow-lg shadow-pink-600/30 hover:from-pink-500 hover:to-purple-500 transition-all"
            >
              Continue Celebrating
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
