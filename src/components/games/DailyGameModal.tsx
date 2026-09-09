"use client";

import React, { useState, useEffect } from "react";
import { DailyWheelSpinner } from "./DailyWheelSpinner";
import {
  DailyGameStatus,
  FreeGameOutcome,
  FreeGamePrizeWedge,
  RewardFulfillmentResult,
  DAILY_WHEEL_WEDGES,
} from "@/modules/games/types";
import {
  X,
  Flame,
  Gift,
  ShieldCheck,
  Sparkles,
  Info,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface DailyGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  creatorProfileId?: string;
  creatorStageName?: string;
  onRewardClaimed?: (outcome: FreeGameOutcome, fulfillment: RewardFulfillmentResult) => void;
}

export const DailyGameModal: React.FC<DailyGameModalProps> = ({
  isOpen,
  onClose,
  userId = "usr_fan_alex",
  creatorProfileId,
  creatorStageName,
  onRewardClaimed,
}) => {
  const [status, setStatus] = useState<DailyGameStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [pendingOutcome, setPendingOutcome] = useState<FreeGameOutcome | null>(null);
  const [pendingFulfillment, setPendingFulfillment] = useState<RewardFulfillmentResult | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showOddsTable, setShowOddsTable] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch user daily status on mount or when opened
  const fetchStatus = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch(`/api/games/daily/status?userId=${userId}`);
      const json = await res.json();
      if (json.success) {
        setStatus(json.data);
      } else {
        setErrorMessage(json.error || "Failed to load daily game status.");
      }
    } catch (err: any) {
      setErrorMessage("Network error loading status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setShowCelebration(false);
      setPendingOutcome(null);
    }
  }, [isOpen, userId]);

  // Handle spin click (authoritative server-side call)
  const handleSpinClick = async () => {
    if (isSpinning || !status?.canPlay) return;

    try {
      setIsSpinning(true);
      setErrorMessage(null);
      setShowCelebration(false);

      const res = await fetch("/api/games/daily/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          gameType: "DAILY_SPIN_WHEEL",
          creatorProfileId,
          creatorStageName,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setPendingOutcome(json.data.outcome);
        setPendingFulfillment(json.data.fulfillment);
        if (json.data.statusAfter) {
          setStatus(json.data.statusAfter);
        }
      } else {
        setIsSpinning(false);
        setErrorMessage(json.error || "Server failed to resolve spin.");
      }
    } catch (err: any) {
      setIsSpinning(false);
      setErrorMessage("Failed to communicate with the game server.");
    }
  };

  // Called when wheel animation physically finishes decelerating
  const handleSpinComplete = () => {
    setIsSpinning(false);
    if (pendingOutcome && pendingFulfillment) {
      setShowCelebration(true);
      if (onRewardClaimed) {
        onRewardClaimed(pendingOutcome, pendingFulfillment);
      }
    }
  };

  if (!isOpen) return null;

  const wedges = status?.availablePrizes || DAILY_WHEEL_WEDGES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col items-center">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-amber-500/15 via-purple-500/10 to-transparent pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSpinning}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors z-30"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center z-10 mb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            100% Free Daily Reward
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Daily Cyber Spin
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Spin daily to earn Fan XP, relationship perks, badges & VIP seats!
          </p>
        </div>

        {/* Streak & Multiplier Banner */}
        {status && (
          <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 my-3 z-10 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                <Flame className="w-4 h-4 fill-orange-500 text-orange-400" />
              </div>
              <div>
                <span className="font-bold text-white">
                  {status.currentStreakDays} Day Streak
                </span>
                <span className="text-zinc-400 text-xs ml-1">
                  (Best: {status.longestStreakDays}d)
                </span>
              </div>
            </div>

            <div className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold text-xs">
              {status.streakBonusMultiplier}x XP Multiplier
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="w-full p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs text-center my-2">
            {errorMessage}
          </div>
        )}

        {/* Wheel Spinner Component */}
        <DailyWheelSpinner
          wedges={wedges}
          isSpinning={isSpinning}
          targetAngleDegrees={pendingOutcome?.animationSeed.targetAngleDegrees}
          spinDurationMs={pendingOutcome?.animationSeed.spinDurationMs}
          onSpinClick={handleSpinClick}
          onSpinComplete={handleSpinComplete}
          canSpin={Boolean(status?.canPlay)}
        />

        {/* Cooldown Timer (When already played today) */}
        {!status?.canPlay && !isSpinning && !showCelebration && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs mt-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>
              Next free spin in:{" "}
              <strong className="text-amber-300">
                {Math.ceil((status?.cooldownRemainingSeconds || 0) / 3600)} hours
              </strong>
            </span>
          </div>
        )}

        {/* Celebration Overlay Modal */}
        {showCelebration && pendingOutcome && pendingFulfillment && (
          <div className="absolute inset-0 z-40 bg-zinc-950/95 backdrop-blur-md rounded-3xl p-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(245,158,11,0.6)] mb-4 animate-bounce">
              {pendingOutcome.winningWedge.icon}
            </div>

            <span className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-1">
              🎉 Congratulations!
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              {pendingOutcome.winningWedge.label}
            </h3>

            <p className="text-sm text-zinc-300 max-w-xs mb-6">
              {pendingFulfillment.summaryText}
            </p>

            <div className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-left text-xs space-y-2 mb-6">
              <div className="flex justify-between text-zinc-400">
                <span>Reward Type:</span>
                <span className="text-white font-semibold">
                  {pendingOutcome.reward.rewardType}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Verification Signature:</span>
                <span className="text-zinc-500 font-mono text-[10px]">
                  {pendingOutcome.cryptographicSignature.substring(0, 16)}...
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowCelebration(false)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-black uppercase tracking-wider text-sm shadow-lg shadow-amber-500/30 transition-all cursor-pointer"
            >
              Claim & Return
            </button>
          </div>
        )}

        {/* Odds Breakdown Accordion (Greek/EU Transparency) */}
        <div className="w-full mt-4 border-t border-zinc-850 pt-3">
          <button
            onClick={() => setShowOddsTable(!showOddsTable)}
            className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-1 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-zinc-500" />
              Transparent Prize Probability Table
            </span>
            {showOddsTable ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showOddsTable && (
            <div className="mt-2 space-y-1.5 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs animate-in fade-in duration-200">
              {wedges.map((wedge) => (
                <div
                  key={wedge.id}
                  className="flex items-center justify-between text-zinc-300"
                >
                  <span className="flex items-center gap-1.5">
                    <span>{wedge.icon}</span>
                    <span>{wedge.label}</span>
                  </span>
                  <span className="font-mono text-amber-400 font-medium">
                    {wedge.probabilityPercentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Statutory Regulatory Disclaimer */}
        <div className="mt-4 flex items-start gap-2 p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-850 text-[10px] text-zinc-500 leading-tight">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <p>
            <strong>Greek / EU Non-Gambling Safeguard:</strong> 100% free promotional mechanic. No purchase necessary. Wagers and monetary credit rewards are strictly prohibited. Rewards consist purely of non-monetary progression and digital perks.
          </p>
        </div>
      </div>
    </div>
  );
};
