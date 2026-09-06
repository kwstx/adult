"use client";

import React, { useState, useEffect } from "react";
import {
  X,
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
  Heart,
  Crown,
  Share2,
  Check,
  Send,
  ExternalLink,
} from "lucide-react";
import { FanPublicStatus, FanCreatorDossier } from "@/types/fan-status";
import { FanStatusBadge } from "./FanStatusBadge";
import { FAN_STATUS_STYLES, FanStatusService } from "@/modules/relationship/fan-status.service";

interface FanStatusProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  fanId: string | null;
  creatorId: string;
  isCreator: boolean;
  currentUserId?: string;
  onSendShoutout?: (fan: FanPublicStatus) => void;
  onMuteUser?: (fanId: string, displayName: string) => void;
  onBanUser?: (fanId: string, displayName: string) => void;
  onSendWhisper?: (fanId: string, displayName: string) => void;
}

export function FanStatusProfileModal({
  isOpen,
  onClose,
  fanId,
  creatorId,
  isCreator,
  currentUserId,
  onSendShoutout,
  onMuteUser,
  onBanUser,
  onSendWhisper,
}: FanStatusProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [publicData, setPublicData] = useState<FanPublicStatus | null>(null);
  const [creatorDossier, setCreatorDossier] = useState<FanCreatorDossier | null>(null);
  const [customNote, setCustomNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [savedNoteSuccess, setSavedNoteSuccess] = useState(false);
  const [hasCheered, setHasCheered] = useState(false);
  const [cheerCount, setCheerCount] = useState(0);

  // Fetch status whenever modal opens
  useEffect(() => {
    if (!isOpen || !fanId) return;

    setLoading(true);
    fetch(`/api/live/${creatorId}/fan-status/${fanId}?requestingUserId=${currentUserId || ""}`)
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success && payload.data) {
          if (payload.roleView === "CREATOR") {
            setCreatorDossier(payload.data);
            setPublicData(payload.data);
            setCustomNote(payload.data.customNotes || "");
          } else {
            setPublicData(payload.data);
            setCreatorDossier(null);
          }
          setCheerCount(payload.data.respectCount || 12);
        }
      })
      .catch((err) => {
        console.error("Failed to load fan status profile:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, fanId, creatorId, currentUserId]);

  if (!isOpen || !fanId) return null;

  const style = publicData ? FAN_STATUS_STYLES[publicData.tier] : FAN_STATUS_STYLES.NEW_FAN;

  const handleSaveNote = async () => {
    if (!fanId || isSavingNote) return;
    setIsSavingNote(true);
    try {
      await fetch(`/api/live/${creatorId}/fan-status/${fanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: customNote }),
      });
      setSavedNoteSuccess(true);
      setTimeout(() => setSavedNoteSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to save creator note:", err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleCheer = () => {
    if (hasCheered) return;
    setHasCheered(true);
    setCheerCount((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-zinc-950/95 border border-white/10 p-6 shadow-2xl shadow-black/80 backdrop-blur-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Tier Glow Backdrop */}
        <div
          className={`absolute -top-24 -right-24 h-56 w-56 rounded-full blur-3xl pointer-events-none opacity-20 ${style.gradientClass}`}
        />

        {/* Header with Close */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400">
              {isCreator ? "Creator Intelligence" : "Live Room Patron"}
            </span>
            <span className="h-1 w-1 rounded-full bg-zinc-600" />
            <span className="text-[11px] font-mono text-zinc-500">
              {publicData?.tierLabel || "Member"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Loading State */}
        {loading && !publicData ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
            <p className="text-xs text-zinc-400">Recognizing relationship...</p>
          </div>
        ) : publicData ? (
          <div className="mt-4 space-y-5">
            {/* 1. Profile Identity Header */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <img
                  src={publicData.avatarUrl}
                  alt={publicData.displayName}
                  className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/15"
                />
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-950 text-[11px] border border-white/15 shadow-md">
                  {style.symbol}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white truncate">
                    {publicData.displayName}
                  </h3>
                  {publicData.fanLevel > 0 && (
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-mono font-bold text-zinc-300 border border-white/5 shrink-0">
                      Lv.{publicData.fanLevel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 truncate">@{publicData.username}</p>

                {/* Elegant Fan Status Badge */}
                <div className="mt-1.5 flex items-center gap-2">
                  <FanStatusBadge
                    tier={publicData.tier}
                    variant="pill"
                    streakDays={publicData.streakDays}
                  />
                  {publicData.streakDays && (
                    <span className="text-[11px] text-zinc-400 flex items-center gap-0.5">
                      <Flame className="h-3 w-3 text-amber-400" />
                      {publicData.streakDays}d streak
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bio / Description */}
            {publicData.bio && (
              <p className="text-xs text-zinc-300/90 leading-relaxed bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                {publicData.bio}
              </p>
            )}

            {/* ========================================================= */}
            {/* VIEW A: CREATOR PRIVATE DOSSIER (Authorized Only for Host) */}
            {/* ========================================================= */}
            {isCreator && creatorDossier && (
              <div className="space-y-4 pt-1 border-t border-white/5">
                {/* 4-Stat Telemetry Matrix */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3">
                    <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                      <span>Tonight's Spent</span>
                      <Coins className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                    <p className="text-base font-black text-amber-400 mt-0.5">
                      {creatorDossier.totalTokensSpentSession.toLocaleString()}{" "}
                      <span className="text-[10px] font-bold">🪙</span>
                    </p>
                    <span className="text-[10px] text-zinc-500">
                      ≈ ${creatorDossier.fiatValueEstimatedSessionUsd} USD
                    </span>
                  </div>

                  <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3">
                    <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                      <span>Lifetime Tokens</span>
                      <Award className="h-3.5 w-3.5 text-purple-400" />
                    </div>
                    <p className="text-base font-black text-zinc-100 mt-0.5">
                      {creatorDossier.totalTokensSpentLifetime.toLocaleString()}{" "}
                      <span className="text-[10px] font-bold">🪙</span>
                    </p>
                    <span className="text-[10px] text-zinc-500">
                      ≈ ${creatorDossier.fiatValueEstimatedLifetimeUsd} USD
                    </span>
                  </div>

                  <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3">
                    <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                      <span>Watch Duration</span>
                      <Clock className="h-3.5 w-3.5 text-blue-400" />
                    </div>
                    <p className="text-base font-black text-zinc-100 mt-0.5">
                      {creatorDossier.sessionWatchMinutes}{" "}
                      <span className="text-[10px] font-bold text-zinc-400">mins</span>
                    </p>
                    <span className="text-[10px] text-zinc-500">
                      {creatorDossier.lifetimeWatchMinutes}m lifetime
                    </span>
                  </div>

                  <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3">
                    <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                      <span>Loyalty Streak</span>
                      <Flame className="h-3.5 w-3.5 text-rose-400" />
                    </div>
                    <p className="text-base font-black text-rose-300 mt-0.5">
                      {creatorDossier.currentStreakDays}{" "}
                      <span className="text-[10px] font-bold text-zinc-400">days</span>
                    </p>
                    <span className="text-[10px] text-zinc-500">
                      Max {creatorDossier.longestStreakDays} days
                    </span>
                  </div>
                </div>

                {/* Private Host Notes */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Private Host Notes (Only you see this)
                    </label>
                    {savedNoteSuccess && (
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Saved!
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <textarea
                      rows={2}
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                      placeholder="Add private relationship preferences, favorite tracks, VIP perks..."
                      className="w-full rounded-2xl bg-black/50 px-3.5 py-2 text-xs text-zinc-200 border border-white/10 focus:border-pink-500 focus:outline-none resize-none placeholder-zinc-500"
                    />
                    <button
                      onClick={handleSaveNote}
                      disabled={isSavingNote}
                      className="absolute right-2 bottom-2.5 rounded-xl bg-white/10 hover:bg-white/20 px-2 py-1 text-[10px] font-semibold text-zinc-200 transition-colors"
                    >
                      <Save className="h-3 w-3 inline mr-1 text-pink-400" />
                      Save
                    </button>
                  </div>
                </div>

                {/* Creator Direct Action Buttons */}
                <div className="space-y-2 pt-1">
                  {onSendShoutout && (
                    <button
                      onClick={() => {
                        onSendShoutout(publicData);
                        onClose();
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-pink-600/20 hover:from-pink-500 hover:to-rose-500 transition-all"
                    >
                      <Crown className="h-3.5 w-3.5" />
                      Send Live Shoutout in Chat
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {onSendWhisper && (
                      <button
                        onClick={() => {
                          onSendWhisper(publicData.userId, publicData.displayName);
                          onClose();
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-2xl bg-white/[0.05] border border-white/10 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-pink-400" />
                        Whisper DM
                      </button>
                    )}

                    {onMuteUser && (
                      <button
                        onClick={() => {
                          onMuteUser(publicData.userId, publicData.displayName);
                          onClose();
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-2xl bg-white/[0.05] border border-white/10 py-2 text-xs font-semibold text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                      >
                        <VolumeX className="h-3.5 w-3.5" />
                        Mute Viewer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* VIEW B: PUBLIC SOCIAL CARD (Sanitized for Other Viewers)   */}
            {/* ========================================================= */}
            {!isCreator && (
              <div className="space-y-4 pt-1 border-t border-white/5">
                {/* Prestige Tier Details */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200">
                      Relationship Level
                    </span>
                    <span className={`text-xs font-black ${style.textColor}`}>
                      {style.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {style.description}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-white/5">
                    <span>Member Since</span>
                    <span className="text-zinc-300 font-medium">
                      {publicData.memberSince || "2024"}
                    </span>
                  </div>
                </div>

                {/* Social Cheer Action (Tasteful & Non-intrusive) */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCheer}
                    disabled={hasCheered}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-bold border transition-all ${
                      hasCheered
                        ? "bg-pink-600/20 text-pink-300 border-pink-500/40"
                        : "bg-white/[0.05] hover:bg-white/10 text-zinc-200 border-white/10 hover:border-pink-500/30 active:scale-98"
                    }`}
                  >
                    <Heart
                      className={`h-3.5 w-3.5 ${
                        hasCheered ? "fill-pink-500 text-pink-500" : "text-pink-400"
                      }`}
                    />
                    <span>
                      {hasCheered ? "Sent Respect!" : "Send Respect"} ({cheerCount})
                    </span>
                  </button>

                  <a
                    href={`/profile`}
                    onClick={onClose}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.05] border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    title="View Public Profile"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
