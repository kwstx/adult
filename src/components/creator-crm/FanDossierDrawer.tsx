"use client";

import React, { useState, useEffect } from "react";
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
  Award,
  Save,
  Tag,
  Plus,
  Send,
  Film,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { CrmFanDossier } from "@/modules/creator-crm/types";
import { FanStatusBadge } from "@/components/live-room/FanStatusBadge";
import { COHORTS_CONFIG } from "./CohortFilterBar";

interface FanDossierDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  fanId: string | null;
  onSaveNotes: (fanId: string, customNotes: string, customNickname: string, tags: string[]) => Promise<void>;
  onSendDirectMessage?: (fanId: string, message: string) => Promise<void>;
}

export function FanDossierDrawer({
  isOpen,
  onClose,
  fanId,
  onSaveNotes,
  onSendDirectMessage,
}: FanDossierDrawerProps) {
  const [dossier, setDossier] = useState<CrmFanDossier | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customNotes, setCustomNotes] = useState("");
  const [customNickname, setCustomNickname] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  // Quick DM State
  const [directMessageText, setDirectMessageText] = useState("");
  const [isSendingDm, setIsSendingDm] = useState(false);
  const [dmSentSuccess, setDmSentSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && fanId) {
      loadDossier(fanId);
    }
  }, [isOpen, fanId]);

  const loadDossier = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/creator/crm/fans/${id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setDossier(data.data);
        setCustomNotes(data.data.customNotes || "");
        setCustomNickname(data.data.customNickname || "");
        setTags(data.data.tags || []);
      }
    } catch (err) {
      console.error("Failed to load fan dossier:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!fanId) return;
    setIsSaving(true);
    try {
      await onSaveNotes(fanId, customNotes, customNickname, tags);
      setHasSaved(true);
      setTimeout(() => setHasSaved(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;
    const clean = newTagInput.trim();
    if (!tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setNewTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSendQuickDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directMessageText.trim() || !fanId) return;
    setIsSendingDm(true);
    try {
      if (onSendDirectMessage) {
        await onSendDirectMessage(fanId, directMessageText);
      }
      setDmSentSuccess(true);
      setDirectMessageText("");
      setTimeout(() => setDmSentSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to send quick DM:", err);
    } finally {
      setIsSendingDm(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-xl h-full bg-zinc-950 border-l border-zinc-800 p-6 shadow-2xl flex flex-col space-y-6 overflow-y-auto">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <User className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-white">360° Fan Relationship Dossier</h3>
              <p className="text-xs text-zinc-400">Authoritative audience profile, lifetime spend & private notes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading || !dossier ? (
          <div className="flex-1 flex items-center justify-center py-20 text-zinc-500">
            <span>Loading fan dossier...</span>
          </div>
        ) : (
          <div className="space-y-6 pb-8">
            {/* Fan Profile Identity Card */}
            <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={dossier.avatarUrl}
                      alt=""
                      className="h-16 w-16 rounded-2xl object-cover ring-2 ring-rose-500/40"
                    />
                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-950 text-[10px] font-black text-amber-400 border border-amber-500/40">
                      Lv.{dossier.fanLevel}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white">{dossier.displayName}</h4>
                    <p className="text-xs text-zinc-400">@{dossier.username}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <FanStatusBadge
                        tier={dossier.relationshipTier}
                        variant="pill"
                        level={dossier.fanLevel}
                      />
                      {dossier.isSubscribed && (
                        <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[9px] font-bold text-blue-300 border border-blue-500/30">
                          {dossier.subscriptionTier || "Subscribed"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-zinc-400">Total Lifetime Spend</span>
                  <p className="text-xl font-black text-emerald-400">
                    {dossier.totalCreditsSpent.toLocaleString()} cr
                  </p>
                  <p className="text-[11px] font-semibold text-zinc-500">
                    ≈ €{dossier.fiatEstimatedEur.toFixed(2)} EUR
                  </p>
                </div>
              </div>

              {/* Assigned Cohorts */}
              <div className="pt-3 border-t border-zinc-800/80 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  Active Cohort Classifications
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {dossier.cohorts.map((c) => {
                    const cfg = COHORTS_CONFIG.find((x) => x.cohort === c);
                    return (
                      <span
                        key={c}
                        className={`rounded-xl px-2.5 py-1 text-[10px] font-bold border ${
                          cfg?.badgeBg || "bg-zinc-800 text-zinc-300 border-zinc-700"
                        }`}
                      >
                        {cfg?.title || c}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Streak & Watch Metrics */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80 text-center">
                <div className="rounded-2xl bg-zinc-950/50 p-2.5 border border-zinc-800/40">
                  <span className="text-[10px] text-zinc-400 font-semibold">Current Streak</span>
                  <p className="text-sm font-black text-amber-400 flex items-center justify-center gap-1 mt-0.5">
                    <Flame className="h-3.5 w-3.5" />
                    <span>{dossier.currentStreakDays} days</span>
                  </p>
                </div>
                <div className="rounded-2xl bg-zinc-950/50 p-2.5 border border-zinc-800/40">
                  <span className="text-[10px] text-zinc-400 font-semibold">Watch Time</span>
                  <p className="text-sm font-black text-cyan-400 flex items-center justify-center gap-1 mt-0.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{Math.floor(dossier.totalMinutesWatched / 60)}h {dossier.totalMinutesWatched % 60}m</span>
                  </p>
                </div>
                <div className="rounded-2xl bg-zinc-950/50 p-2.5 border border-zinc-800/40">
                  <span className="text-[10px] text-zinc-400 font-semibold">Total XP</span>
                  <p className="text-sm font-black text-rose-400 flex items-center justify-center gap-1 mt-0.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{dossier.totalXp.toLocaleString()}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Spend Breakdown */}
            <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-300">
                Authoritative Spend Breakdown
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="rounded-2xl bg-zinc-950/60 p-3 border border-zinc-800/60">
                  <span className="text-[10px] text-zinc-400 font-semibold">Live Tips</span>
                  <p className="text-sm font-black text-white mt-0.5">
                    {dossier.spendBreakdown.liveTipsCredits} cr
                  </p>
                </div>
                <div className="rounded-2xl bg-zinc-950/60 p-3 border border-zinc-800/60">
                  <span className="text-[10px] text-zinc-400 font-semibold">Interactive Toys/Menu</span>
                  <p className="text-sm font-black text-white mt-0.5">
                    {dossier.spendBreakdown.interactiveActionsCredits} cr
                  </p>
                </div>
                <div className="rounded-2xl bg-zinc-950/60 p-3 border border-zinc-800/60">
                  <span className="text-[10px] text-zinc-400 font-semibold">PPV Content Unlocked</span>
                  <p className="text-sm font-black text-white mt-0.5">
                    {dossier.spendBreakdown.ppvContentCredits} cr
                  </p>
                </div>
                <div className="rounded-2xl bg-zinc-950/60 p-3 border border-zinc-800/60">
                  <span className="text-[10px] text-zinc-400 font-semibold">Subscriptions</span>
                  <p className="text-sm font-black text-white mt-0.5">
                    {dossier.spendBreakdown.subscriptionsCredits} cr
                  </p>
                </div>
                <div className="rounded-2xl bg-zinc-950/60 p-3 border border-zinc-800/60">
                  <span className="text-[10px] text-zinc-400 font-semibold">Private Sessions</span>
                  <p className="text-sm font-black text-white mt-0.5">
                    {dossier.spendBreakdown.privateSessionsCredits} cr
                  </p>
                </div>
                <div className="rounded-2xl bg-zinc-950/60 p-3 border border-zinc-800/60">
                  <span className="text-[10px] text-zinc-400 font-semibold">Paid Direct Messages</span>
                  <p className="text-sm font-black text-white mt-0.5">
                    {dossier.spendBreakdown.paidMessagesCredits} cr
                  </p>
                </div>
              </div>
            </div>

            {/* Creator Private Notes & Tag Editor */}
            <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-300">
                    Creator Private Relationship Memory & Notes
                  </h4>
                  <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[8px] font-black text-rose-400 border border-rose-500/20 uppercase">
                    100% Private to You
                  </span>
                </div>
                {hasSaved && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 animate-fadeIn">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Saved</span>
                  </span>
                )}
              </div>

              {/* Custom Nickname Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-300">
                  Custom Nickname / Stage Alias
                </label>
                <input
                  type="text"
                  value={customNickname}
                  onChange={(e) => setCustomNickname(e.target.value)}
                  placeholder="e.g. Alex R., Front Row Dan..."
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Tags Manager */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-300">
                  Audience Segmentation Tags
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-xl bg-zinc-800/90 px-2.5 py-1 text-[10px] font-bold text-zinc-200 border border-zinc-700/60"
                    >
                      <Tag className="h-3 w-3 text-rose-400" />
                      <span>{tag}</span>
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-0.5 text-zinc-400 hover:text-red-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <form onSubmit={handleAddTag} className="flex gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="Add custom tag (e.g. VIP Collector, Weekend Fan)..."
                    className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-950 px-3.5 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-rose-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-1 rounded-2xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                </form>
              </div>

              {/* Private Notes Textarea */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-zinc-300">
                  Private Preferences & Fan Notes
                </label>
                <textarea
                  rows={3}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Record fan preferences, song requests, previous conversation topics, or special perks promised..."
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-white placeholder-zinc-600 focus:border-rose-500 focus:outline-none resize-none"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 w-full rounded-2xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white hover:bg-rose-500 shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? "Saving..." : "Save Private CRM Notes & Tags"}</span>
              </button>
            </div>

            {/* Quick 1-on-1 Personalized Direct Message */}
            <div className="rounded-3xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400">
                  Send Personalized Direct Message
                </h4>
                {dmSentSuccess && (
                  <span className="text-[11px] font-bold text-emerald-400">
                    ✓ Message Delivered to Fan
                  </span>
                )}
              </div>
              <form onSubmit={handleSendQuickDm} className="space-y-2">
                <textarea
                  rows={2}
                  value={directMessageText}
                  onChange={(e) => setDirectMessageText(e.target.value)}
                  placeholder={`Send a private direct message or exclusive thank-you note to @${dossier.username}...`}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-white placeholder-zinc-600 focus:border-cyan-500 focus:outline-none resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">
                    Delivered directly to fan's platform inbox with priority badge.
                  </span>
                  <button
                    type="submit"
                    disabled={isSendingDm || !directMessageText.trim()}
                    className="flex items-center gap-1.5 rounded-2xl bg-cyan-600 px-4 py-2 text-xs font-black text-white hover:bg-cyan-500 transition-all disabled:opacity-50 shadow-md shadow-cyan-600/20"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isSendingDm ? "Sending..." : "Send DM"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
