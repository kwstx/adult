"use client";

import React, { useState } from "react";
import {
  X,
  Crown,
  Diamond,
  Flame,
  Star,
  Users,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { SocialSeatTier, VirtualRoomLayout } from "@/types/seat";
import { SEAT_TIER_CONFIGS } from "@/modules/seats/seat-entitlement.service";
import { SeatBadge } from "./SeatBadge";

interface SeatClaimSheetProps {
  isOpen: boolean;
  onClose: () => void;
  layout: VirtualRoomLayout | null;
  onClaimSeat: (tier: SocialSeatTier, seatIndex?: number) => Promise<boolean>;
  onOpenWalletModal?: () => void;
  onOpenSubscriptionModal?: () => void;
}

export function SeatClaimSheet({
  isOpen,
  onClose,
  layout,
  onClaimSeat,
  onOpenWalletModal,
  onOpenSubscriptionModal,
}: SeatClaimSheetProps) {
  const [selectedTier, setSelectedTier] = useState<SocialSeatTier>("FRONT_ROW");
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStatusMsg, setClaimStatusMsg] = useState<string | null>(null);

  if (!isOpen || !layout) return null;

  const entitlement = layout.callerEntitlement;
  const currentSeat = layout.callerSeat;

  const handleClaim = async (tier: SocialSeatTier) => {
    setIsClaiming(true);
    setClaimStatusMsg(null);
    try {
      const success = await onClaimSeat(tier);
      if (success) {
        setClaimStatusMsg("Seat successfully claimed! Your social position is now active.");
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setClaimStatusMsg("Unable to claim seat. Please verify your entitlement requirements.");
      }
    } catch {
      setClaimStatusMsg("An error occurred while claiming seat.");
    } finally {
      setIsClaiming(false);
    }
  };

  const TIERS: SocialSeatTier[] = [
    "CREATOR_SELECTED_GUEST",
    "INNER_CIRCLE",
    "VIP",
    "FRONT_ROW",
    "STANDARD_VIEWER",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-white/10 bg-zinc-950 p-5 sm:p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-600 to-purple-600 text-white shadow-lg">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-wide text-white">
                Audience Social Positions & Seats
              </h3>
              <p className="text-xs text-zinc-400">
                Live Virtual Room Proximity & Chat Stardom
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current Occupied Seat Banner */}
        <div className="mb-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-zinc-900/60 to-black/60 p-3 border border-purple-500/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Your Current Status
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <SeatBadge tier={currentSeat ? currentSeat.tier : entitlement.highestEntitledTier} variant="pill" />
              {currentSeat && (
                <span className="text-xs text-emerald-400 font-bold">
                  (Seated in {currentSeat.label})
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-300 mt-1">
              {entitlement.entitlementReason}
            </p>
          </div>
        </div>

        {/* Status Message */}
        {claimStatusMsg && (
          <div className="mb-4 rounded-xl bg-pink-500/10 border border-pink-500/30 p-2.5 text-center text-xs font-bold text-pink-300">
            {claimStatusMsg}
          </div>
        )}

        {/* Tier Selection Cards */}
        <div className="space-y-2.5 mb-5">
          {TIERS.map((tier) => {
            const config = SEAT_TIER_CONFIGS[tier];
            const isEntitled =
              tier === "STANDARD_VIEWER" ||
              (tier === "FRONT_ROW" && entitlement.isEligibleForFrontRow) ||
              (tier === "VIP" && entitlement.isEligibleForVip) ||
              (tier === "INNER_CIRCLE" && entitlement.isEligibleForInnerCircle) ||
              (tier === "CREATOR_SELECTED_GUEST" && entitlement.isEligibleForGuest);

            const isSelected = selectedTier === tier;
            const isCurrentlySeatedHere = currentSeat?.tier === tier;

            const upgradeRequirement = entitlement.availableUpgradeTiers.find(
              (u) => u.tier === tier
            )?.requirement;

            return (
              <div
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`relative rounded-2xl p-3.5 border transition-all cursor-pointer ${
                  isSelected
                    ? `${config.borderClass} ${config.bgClass} ${config.glowClass} scale-[1.01]`
                    : "border-white/5 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr ${config.auraGradient} text-white shadow-md shrink-0`}>
                      {tier === "CREATOR_SELECTED_GUEST" && <Star className="h-4 w-4 fill-white" />}
                      {tier === "INNER_CIRCLE" && <Crown className="h-4 w-4 fill-white" />}
                      {tier === "VIP" && <Diamond className="h-4 w-4 fill-white" />}
                      {tier === "FRONT_ROW" && <Flame className="h-4 w-4 fill-white" />}
                      {tier === "STANDARD_VIEWER" && <Users className="h-4 w-4 text-white" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black tracking-wide ${config.textColor}`}>
                          {config.label}
                        </span>
                        <span className="rounded bg-black/50 px-1.5 py-0.2 text-[9px] text-zinc-300 font-semibold border border-white/5">
                          Proximity: {config.distanceToCreator}m
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                        {config.description}
                      </p>
                    </div>
                  </div>

                  {/* Entitlement Badge */}
                  <div className="shrink-0 text-right">
                    {isCurrentlySeatedHere ? (
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                        Active Seat
                      </span>
                    ) : isEntitled ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Unlocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                        <Lock className="h-2.5 w-2.5" /> Locked
                      </span>
                    )}
                  </div>
                </div>

                {/* Requirement / How to Unlock if locked */}
                {!isEntitled && upgradeRequirement && (
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-400">
                    <span>Unlock Requirement:</span>
                    <span className="font-semibold text-amber-300">
                      {upgradeRequirement}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Button Area */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          {selectedTier === "VIP" && !entitlement.isEligibleForVip && onOpenSubscriptionModal && (
            <button
              onClick={onOpenSubscriptionModal}
              className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3 text-xs font-black text-white shadow-lg shadow-cyan-600/30 hover:brightness-110 transition-all"
            >
              Subscribe for VIP Seat Access
            </button>
          )}

          {selectedTier === "FRONT_ROW" && !entitlement.isEligibleForFrontRow && onOpenWalletModal && (
            <button
              onClick={onOpenWalletModal}
              className="flex-1 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 py-3 text-xs font-black text-white shadow-lg shadow-amber-600/30 hover:brightness-110 transition-all"
            >
              Get Tokens to Tip & Qualify
            </button>
          )}

          <button
            disabled={
              isClaiming ||
              (selectedTier === "CREATOR_SELECTED_GUEST" && !entitlement.isEligibleForGuest) ||
              (selectedTier === "INNER_CIRCLE" && !entitlement.isEligibleForInnerCircle) ||
              (selectedTier === "VIP" && !entitlement.isEligibleForVip) ||
              (selectedTier === "FRONT_ROW" && !entitlement.isEligibleForFrontRow)
            }
            onClick={() => handleClaim(selectedTier)}
            className="flex-1 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 py-3 text-xs font-black text-white shadow-xl shadow-pink-600/30 hover:from-pink-500 hover:to-purple-500 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {isClaiming ? (
              <span>Authorizing Seat...</span>
            ) : currentSeat?.tier === selectedTier ? (
              <span>Re-affirm Seat Position</span>
            ) : (
              <>
                <span>Take {SEAT_TIER_CONFIGS[selectedTier].shortLabel} Seat</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
