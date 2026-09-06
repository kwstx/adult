"use client";

import React, { useState } from "react";
import {
  X,
  Star,
  Crown,
  Diamond,
  Flame,
  Users,
  Sparkles,
  Plus,
  UserCheck,
  Shield,
  Info,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  VirtualRoomLayout,
  VirtualSeatSlot,
  SeatOccupant,
  SocialSeatTier,
} from "@/types/seat";
import { SEAT_TIER_CONFIGS } from "@/modules/seats/seat-entitlement.service";
import { SeatBadge } from "./SeatBadge";

interface VirtualRoomStageOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  layout: VirtualRoomLayout | null;
  isCreator: boolean;
  currentUserId: string;
  onSelectOccupant: (occupant: SeatOccupant) => void;
  onRequestClaimSeat: (tier: SocialSeatTier, seatIndex?: number) => void;
  onInviteGuest?: (fanUserId: string, note?: string) => Promise<boolean>;
}

export function VirtualRoomStageOverlay({
  isOpen,
  onClose,
  layout,
  isCreator,
  currentUserId,
  onSelectOccupant,
  onRequestClaimSeat,
  onInviteGuest,
}: VirtualRoomStageOverlayProps) {
  const [selectedSeat, setSelectedSeat] = useState<VirtualSeatSlot | null>(null);
  const [activeFilterTier, setActiveFilterTier] = useState<SocialSeatTier | "ALL">("ALL");
  const [guestInviteInputUserId, setGuestInviteInputUserId] = useState("");
  const [guestInviteNote, setGuestInviteNote] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  if (!isOpen || !layout) return null;

  const handleSeatClick = (seat: VirtualSeatSlot) => {
    setSelectedSeat(seat);
    if (seat.occupant) {
      onSelectOccupant(seat.occupant);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestInviteInputUserId.trim() || !onInviteGuest || isInviting) return;
    setIsInviting(true);
    try {
      await onInviteGuest(guestInviteInputUserId.trim(), guestInviteNote.trim() || "Live Broadcaster Guest");
      setGuestInviteInputUserId("");
      setGuestInviteNote("");
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-6 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="relative flex flex-col h-full max-h-[92vh] w-full max-w-5xl rounded-3xl border border-white/10 bg-zinc-950/95 shadow-2xl overflow-hidden text-white">
        {/* 1. Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 bg-zinc-900/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 text-white shadow-lg">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide text-white">
                  Virtual Audience Room
                </h2>
                <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[10px] font-black text-pink-300 border border-pink-500/30">
                  LIVE SPATIAL ARENA
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {layout.totalAudienceCount} viewers connected • {layout.totalSeatedCount} social seats occupied
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onRequestClaimSeat(layout.callerEntitlement.highestEntitledTier)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-pink-600/30 hover:brightness-110 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Claim / Upgrade Seat</span>
            </button>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 2. Tier Quick Filter Bar */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 bg-black/40 border-b border-white/5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveFilterTier("ALL")}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
              activeFilterTier === "ALL"
                ? "bg-white text-black shadow-md"
                : "bg-white/5 text-zinc-400 hover:bg-white/10"
            }`}
          >
            All Positions ({layout.totalSeatedCount})
          </button>
          <button
            onClick={() => setActiveFilterTier("CREATOR_SELECTED_GUEST")}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-all flex items-center gap-1 ${
              activeFilterTier === "CREATOR_SELECTED_GUEST"
                ? "bg-amber-400 text-black shadow-md"
                : "bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20"
            }`}
          >
            <Star className="h-3 w-3 fill-current" />
            Guest Spotlight ({layout.guestSpotlightSeats.filter((s) => s.isOccupied).length})
          </button>
          <button
            onClick={() => setActiveFilterTier("INNER_CIRCLE")}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-all flex items-center gap-1 ${
              activeFilterTier === "INNER_CIRCLE"
                ? "bg-rose-500 text-white shadow-md"
                : "bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20"
            }`}
          >
            <Crown className="h-3 w-3 fill-current" />
            Inner Circle ({layout.innerCircleSeats.filter((s) => s.isOccupied).length})
          </button>
          <button
            onClick={() => setActiveFilterTier("VIP")}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-all flex items-center gap-1 ${
              activeFilterTier === "VIP"
                ? "bg-cyan-500 text-black shadow-md"
                : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20"
            }`}
          >
            <Diamond className="h-3 w-3 fill-current" />
            VIP ({layout.vipSeats.filter((s) => s.isOccupied).length})
          </button>
          <button
            onClick={() => setActiveFilterTier("FRONT_ROW")}
            className={`rounded-full px-3 py-1 text-xs font-bold transition-all flex items-center gap-1 ${
              activeFilterTier === "FRONT_ROW"
                ? "bg-amber-500 text-white shadow-md"
                : "bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20"
            }`}
          >
            <Flame className="h-3 w-3 fill-current" />
            Front Row ({layout.frontRowSeats.filter((s) => s.isOccupied).length})
          </button>
        </div>

        {/* 3. Main Stage Interactive Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* STAGE CENTER: BROADCASTER & SPOTLIGHT GUEST */}
          <div className="relative flex flex-col items-center justify-center p-6 rounded-3xl bg-gradient-to-b from-purple-950/40 via-zinc-900/60 to-black/80 border border-purple-500/30 shadow-2xl overflow-hidden">
            <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold text-zinc-300 border border-white/10">
              <Sparkles className="h-3 w-3 text-pink-400" />
              <span>Center Stage (Proximity 0.0m - 0.2m)</span>
            </div>

            {/* Stage Performers Row */}
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 mt-4">
              {/* Creator Main Avatar */}
              <div className="flex flex-col items-center text-center">
                <div className="relative group">
                  <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-amber-500 opacity-75 blur-md animate-pulse" />
                  <img
                    src={layout.creatorAvatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"}
                    alt={layout.creatorDisplayName}
                    className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full border-4 border-pink-400 object-cover shadow-2xl"
                  />
                  <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                    <span className="rounded-full bg-pink-600 px-2.5 py-0.5 text-[10px] font-black text-white uppercase tracking-wider shadow-lg border border-pink-300/40">
                      Broadcaster
                    </span>
                  </div>
                </div>
                <h3 className="text-sm font-black text-white mt-4">{layout.creatorDisplayName}</h3>
                <p className="text-[10px] text-pink-300 font-semibold">Live Room Host</p>
              </div>

              {/* Creator-Selected Guest Spotlight Seats */}
              {layout.guestSpotlightSeats.map((slot) => {
                const isOccupied = slot.isOccupied && slot.occupant;
                return (
                  <div
                    key={slot.seatIndex}
                    onClick={() => handleSeatClick(slot)}
                    className={`relative flex flex-col items-center text-center cursor-pointer transition-transform hover:scale-105 ${
                      isOccupied ? "opacity-100" : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    <div className="relative">
                      {isOccupied ? (
                        <>
                          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 opacity-80 blur-md animate-pulse" />
                          <img
                            src={slot.occupant!.avatarUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"}
                            alt={slot.occupant!.displayName}
                            className="relative h-18 w-18 sm:h-20 sm:w-20 rounded-full border-3 border-amber-300 object-cover shadow-2xl"
                          />
                          <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-amber-950 font-black shadow-lg">
                            <Star className="h-4 w-4 fill-amber-950" />
                          </div>
                          <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                            <span className="rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 px-2 py-0.5 text-[9px] font-black text-amber-950 uppercase tracking-wider shadow-md">
                              Guest
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex h-18 w-18 sm:h-20 sm:w-20 items-center justify-center rounded-full border-2 border-dashed border-amber-400/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors">
                          <Star className="h-6 w-6 text-amber-400/60" />
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-black text-amber-300">
                        {isOccupied ? slot.occupant!.displayName : slot.label}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        {isOccupied ? "Invited by Host" : "Vacant Spotlight"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Creator Guest Inviter Form (Broadcaster Only) */}
            {isCreator && (
              <form
                onSubmit={handleInviteSubmit}
                className="mt-6 flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-black/60 p-2.5 border border-amber-500/30 max-w-lg w-full"
              >
                <input
                  type="text"
                  placeholder="Enter fan username to appoint as Guest..."
                  value={guestInviteInputUserId}
                  onChange={(e) => setGuestInviteInputUserId(e.target.value)}
                  className="flex-1 min-w-[200px] bg-transparent px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!guestInviteInputUserId.trim() || isInviting}
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 px-4 py-1.5 text-xs font-black text-amber-950 shadow-md hover:brightness-110 disabled:opacity-40"
                >
                  {isInviting ? "Inviting..." : "Appoint Spotlight Guest"}
                </button>
              </form>
            )}
          </div>

          {/* INNER CIRCLE ORBITAL RING */}
          {(activeFilterTier === "ALL" || activeFilterTier === "INNER_CIRCLE") && (
            <div className="rounded-3xl bg-zinc-900/40 p-5 border border-rose-500/30 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-500 to-purple-600 text-white shadow-md">
                    <Crown className="h-4 w-4 fill-white" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-rose-200 tracking-wide">
                      Inner Circle Orbital Ring (Proximity 0.8m)
                    </h3>
                    <p className="text-[10px] text-zinc-400">
                      Highest Devotees & Patrons Orbiting Closest to Host
                    </p>
                  </div>
                </div>
                <SeatBadge tier="INNER_CIRCLE" variant="tag" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {layout.innerCircleSeats.map((slot) => {
                  const isOccupied = slot.isOccupied && slot.occupant;
                  return (
                    <div
                      key={slot.seatIndex}
                      onClick={() => handleSeatClick(slot)}
                      className={`relative flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                        isOccupied
                          ? "bg-rose-950/30 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.15)] hover:scale-102"
                          : "bg-black/30 border-dashed border-rose-500/20 hover:border-rose-500/40"
                      }`}
                    >
                      <div className="relative shrink-0">
                        {isOccupied ? (
                          <>
                            <img
                              src={slot.occupant!.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                              alt={slot.occupant!.displayName}
                              className="h-11 w-11 rounded-full border-2 border-rose-400 object-cover"
                            />
                            <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white">
                              <Crown className="h-3 w-3 fill-white" />
                            </div>
                          </>
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <Plus className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-rose-100 truncate">
                          {isOccupied ? slot.occupant!.displayName : slot.label}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          {isOccupied ? `Level ${slot.occupant!.fanLevel}` : "Available to Patrons"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIP MEZZANINE PODS */}
          {(activeFilterTier === "ALL" || activeFilterTier === "VIP") && (
            <div className="rounded-3xl bg-zinc-900/40 p-5 border border-cyan-500/30 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md">
                    <Diamond className="h-4 w-4 fill-white" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-cyan-200 tracking-wide">
                      VIP Prime Ring (Proximity 1.5m)
                    </h3>
                    <p className="text-[10px] text-zinc-400">
                      Subscribed VIP Members & Devotees
                    </p>
                  </div>
                </div>
                <SeatBadge tier="VIP" variant="tag" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {layout.vipSeats.map((slot) => {
                  const isOccupied = slot.isOccupied && slot.occupant;
                  return (
                    <div
                      key={slot.seatIndex}
                      onClick={() => handleSeatClick(slot)}
                      className={`relative flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                        isOccupied
                          ? "bg-cyan-950/30 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.12)] hover:scale-102"
                          : "bg-black/30 border-dashed border-cyan-500/20 hover:border-cyan-500/40"
                      }`}
                    >
                      <div className="relative shrink-0">
                        {isOccupied ? (
                          <>
                            <img
                              src={slot.occupant!.avatarUrl || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"}
                              alt={slot.occupant!.displayName}
                              className="h-10 w-10 rounded-full border-2 border-cyan-400 object-cover"
                            />
                            <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-black">
                              <Diamond className="h-2.5 w-2.5 fill-black" />
                            </div>
                          </>
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <Plus className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-cyan-100 truncate">
                          {isOccupied ? slot.occupant!.displayName : slot.label}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          {isOccupied ? `Level ${slot.occupant!.fanLevel}` : "Claim VIP Pod"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FRONT ROW BLEACHERS */}
          {(activeFilterTier === "ALL" || activeFilterTier === "FRONT_ROW") && (
            <div className="rounded-3xl bg-zinc-900/40 p-5 border border-amber-500/25 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md">
                    <Flame className="h-4 w-4 fill-white" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-amber-200 tracking-wide">
                      Front Row Bleachers (Proximity 2.5m)
                    </h3>
                    <p className="text-[10px] text-zinc-400">
                      Active Tippers & High-Streak Community Members
                    </p>
                  </div>
                </div>
                <SeatBadge tier="FRONT_ROW" variant="tag" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                {layout.frontRowSeats.map((slot) => {
                  const isOccupied = slot.isOccupied && slot.occupant;
                  return (
                    <div
                      key={slot.seatIndex}
                      onClick={() => handleSeatClick(slot)}
                      className={`relative flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isOccupied
                          ? "bg-amber-950/20 border-amber-500/30 hover:bg-amber-950/30"
                          : "bg-black/30 border-dashed border-amber-500/20 hover:border-amber-500/30"
                      }`}
                    >
                      <div className="relative shrink-0">
                        {isOccupied ? (
                          <img
                            src={slot.occupant!.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                            alt={slot.occupant!.displayName}
                            className="h-8 w-8 rounded-full border border-amber-400 object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 text-xs">
                            {slot.seatIndex - 400 + 1}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-zinc-200 truncate">
                          {isOccupied ? slot.occupant!.displayName : `Row #${slot.seatIndex - 400 + 1}`}
                        </p>
                        <p className="text-[9px] text-zinc-400 truncate">
                          {isOccupied ? `🔥 Lv.${slot.occupant!.fanLevel}` : "Open Seat"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ARENA OVERVIEW (GENERAL AUDIENCE) */}
          <div className="rounded-2xl bg-black/40 p-4 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-300">
                  Arena Audience Floor (Proximity 4.0m)
                </p>
                <p className="text-[10px] text-zinc-500">
                  {layout.standardViewersCount}+ viewers enjoying standard livestream broadcast
                </p>
              </div>
            </div>
            <button
              onClick={() => onRequestClaimSeat("FRONT_ROW")}
              className="rounded-xl bg-white/10 hover:bg-white/15 px-3 py-1.5 text-[11px] font-bold text-white transition-colors"
            >
              Take a Front Seat
            </button>
          </div>
        </div>

        {/* 4. Footer Bar */}
        <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 bg-zinc-950 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span>Your Position:</span>
            <SeatBadge
              tier={layout.callerSeat ? layout.callerSeat.tier : layout.callerEntitlement.highestEntitledTier}
              variant="pill"
            />
          </div>
          <button
            onClick={() => onRequestClaimSeat(layout.callerEntitlement.highestEntitledTier)}
            className="text-pink-400 hover:underline font-bold"
          >
            Change or Upgrade Position →
          </button>
        </div>
      </div>
    </div>
  );
}
