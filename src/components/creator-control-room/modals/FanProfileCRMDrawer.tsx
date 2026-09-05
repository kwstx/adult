"use client";

import React, { useState } from "react";
import {
  X,
  User,
  Crown,
  Sparkles,
  Flame,
  Clock,
  Coins,
  Shield,
  MessageSquare,
  VolumeX,
  UserX,
  Award,
  Save,
} from "lucide-react";
import type { AudienceMember, TopSupporter } from "@/types/control-room";

interface FanProfileCRMDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  member: AudienceMember | null;
  onMuteUser: (userId: string, username: string) => void;
  onBanUser: (userId: string, username: string) => void;
  onBroadcastShoutout?: (supporter: TopSupporter) => void;
}

export function FanProfileCRMDrawer({
  isOpen,
  onClose,
  member,
  onMuteUser,
  onBanUser,
  onBroadcastShoutout,
}: FanProfileCRMDrawerProps) {
  const [customNote, setCustomNote] = useState(member?.customNotes || "");
  const [hasSavedNote, setHasSavedNote] = useState(false);

  if (!isOpen || !member) return null;

  const handleSaveNote = () => {
    setHasSavedNote(true);
    setTimeout(() => setHasSavedNote(false), 2000);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "ROYAL_PATRON":
        return "from-amber-500 to-yellow-300 text-amber-950";
      case "SOULMATE":
        return "from-pink-500 to-rose-400 text-white";
      case "VIP_DEVOTEE":
        return "from-purple-500 to-indigo-400 text-white";
      case "SUPERFAN":
        return "from-blue-500 to-cyan-400 text-white";
      default:
        return "from-zinc-600 to-zinc-400 text-white";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md h-full bg-zinc-950 border-l border-zinc-800 p-6 shadow-2xl flex flex-col space-y-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
              <User className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-black text-white">Fan Relationship CRM</h3>
              <p className="text-[10px] text-zinc-400">Deep audience telemetry & engagement history</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={member.avatarUrl}
                alt=""
                className="h-16 w-16 rounded-2xl object-cover ring-2 ring-pink-500/40"
              />
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-950 text-[10px] font-black text-amber-400 border border-amber-500/40">
                Lv.{member.fanLevel}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-black text-white">{member.displayName}</h4>
                {member.isVip && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-black text-amber-300 border border-amber-500/40">
                    VIP
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">@{member.username}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span
                  className={`rounded-full bg-gradient-to-r px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${getTierColor(
                    member.relationshipTier
                  )}`}
                >
                  {member.relationshipTier.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>

          {/* Relationship Progression Bar */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-800">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-zinc-300">Progression to Next Tier</span>
              <span className="font-black text-pink-400">{member.relationshipProgressPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 transition-all duration-500"
                style={{ width: `${member.relationshipProgressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Lifetime & Session Statistics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-3.5">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Tonight's Spent</span>
              <Coins className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <p className="text-lg font-black text-amber-400 mt-1">
              {member.tokensSpentSession.toLocaleString()} <span className="text-[10px] font-bold">🪙</span>
            </p>
            <span className="text-[10px] text-zinc-500 block">
              ≈ ${(member.tokensSpentSession * 0.08).toFixed(2)} USD
            </span>
          </div>

          <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-3.5">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Lifetime Tokens</span>
              <Award className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <p className="text-lg font-black text-white mt-1">
              {member.tokensSpentLifetime.toLocaleString()} <span className="text-[10px] font-bold">🪙</span>
            </p>
            <span className="text-[10px] text-zinc-500 block">Total account loyalty</span>
          </div>

          <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-3.5">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Watch Duration</span>
              <Clock className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <p className="text-lg font-black text-white mt-1">
              {member.watchMinutesSession} <span className="text-xs font-bold text-zinc-400">mins</span>
            </p>
            <span className="text-[10px] text-zinc-500 block">In current broadcast</span>
          </div>

          <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-3.5">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Daily Streak</span>
              <Flame className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <p className="text-lg font-black text-rose-400 mt-1">
              {member.streakDays} <span className="text-xs font-bold text-zinc-400">days</span>
            </p>
            <span className="text-[10px] text-zinc-500 block">Consecutive attendance</span>
          </div>
        </div>

        {/* Private Creator Notes */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
            Private Creator Notes (Only visible to you)
          </label>
          <textarea
            rows={3}
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Add notes about preferences, favorite interactions, or VIP requests..."
            className="w-full rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-zinc-200 border border-zinc-800 focus:border-pink-500 focus:outline-none resize-none"
          />
          <div className="flex justify-end">
            <button
              onClick={handleSaveNote}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"
            >
              <Save className="h-3.5 w-3.5 text-pink-400" />
              {hasSavedNote ? "Saved Note!" : "Save Note"}
            </button>
          </div>
        </div>

        {/* Quick Moderation & Shoutout Actions */}
        <div className="mt-auto pt-4 border-t border-zinc-800 space-y-2">
          {onBroadcastShoutout && (
            <button
              onClick={() => {
                onBroadcastShoutout({
                  rank: 1,
                  userId: member.id,
                  displayName: member.displayName,
                  avatarUrl: member.avatarUrl,
                  fanLevel: member.fanLevel,
                  relationshipTier: member.relationshipTier,
                  totalTokensContributed: member.tokensSpentSession,
                  streakDays: member.streakDays,
                });
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 py-2.5 text-xs font-black text-white shadow-lg shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500"
            >
              <Crown className="h-4 w-4" />
              Send Live Shoutout in Chat
            </button>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                onMuteUser(member.id, member.username);
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 py-2 text-xs font-bold text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
            >
              <VolumeX className="h-3.5 w-3.5" />
              Mute in Room
            </button>
            <button
              onClick={() => {
                onBanUser(member.id, member.username);
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 py-2 text-xs font-bold text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
            >
              <UserX className="h-3.5 w-3.5" />
              Ban from Stream
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
