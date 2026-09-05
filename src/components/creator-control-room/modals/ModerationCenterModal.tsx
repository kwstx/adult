"use client";

import React, { useState } from "react";
import {
  X,
  Shield,
  ShieldAlert,
  VolumeX,
  UserX,
  Plus,
  Trash2,
  CheckCircle2,
  Lock,
  Clock,
  AlertTriangle,
} from "lucide-react";
import type { ModerationRuleConfig, AudienceMember } from "@/types/control-room";

interface ModerationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  moderationRules: ModerationRuleConfig;
  setModerationRules: React.Dispatch<React.SetStateAction<ModerationRuleConfig>>;
  audienceList: AudienceMember[];
  onMuteUser: (userId: string, username: string) => void;
  onBanUser: (userId: string, username: string) => void;
}

export function ModerationCenterModal({
  isOpen,
  onClose,
  moderationRules,
  setModerationRules,
  audienceList,
  onMuteUser,
  onBanUser,
}: ModerationCenterModalProps) {
  const [activeTab, setActiveTab] = useState<"rules" | "users" | "wordlist" | "reports">("rules");
  const [newBlockedWord, setNewBlockedWord] = useState("");

  if (!isOpen) return null;

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    const word = newBlockedWord.trim().toLowerCase();
    if (!word || moderationRules.blockedWords.includes(word)) return;

    setModerationRules((prev) => ({
      ...prev,
      blockedWords: [...prev.blockedWords, word],
    }));
    setNewBlockedWord("");
  };

  const handleRemoveWord = (word: string) => {
    setModerationRules((prev) => ({
      ...prev,
      blockedWords: prev.blockedWords.filter((w) => w !== word),
    }));
  };

  const mutedUsers = audienceList.filter((u) => u.isMuted);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-3xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-5 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Shield className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-black text-white">Trust & Moderation Command</h2>
              <p className="text-[11px] text-zinc-400">
                Authoritative safety filters, user sanctions & emergency controls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-zinc-800/60 pb-3 shrink-0">
          <button
            onClick={() => setActiveTab("rules")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === "rules"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            Room Modes
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === "users"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <UserX className="h-3.5 w-3.5" />
            Muted / Restricted ({mutedUsers.length})
          </button>
          <button
            onClick={() => setActiveTab("wordlist")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === "wordlist"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Automated Keyword Filters ({moderationRules.blockedWords.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* TAB 1: ROOM MODES */}
          {activeTab === "rules" && (
            <div className="space-y-4">
              {/* Subscribers Only */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Subscribers-Only VIP Chat</span>
                    <span className="rounded-full bg-pink-500/20 text-pink-300 px-2 py-0.5 text-[10px] font-bold">
                      VIP Mode
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Restricts live chat to active paid subscribers and VIP patrons only.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={moderationRules.isSubscribersOnlyChat}
                  onChange={(e) =>
                    setModerationRules((prev) => ({
                      ...prev,
                      isSubscribersOnlyChat: e.target.checked,
                    }))
                  }
                  className="h-5 w-5 rounded text-rose-600 focus:ring-rose-500 bg-zinc-900 border-zinc-700 cursor-pointer"
                />
              </div>

              {/* Slow Mode */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Chat Slow Mode</span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Enforce delay between messages to mitigate spam storms.
                    </p>
                  </div>
                  <span className="text-xs font-black text-amber-400">
                    {moderationRules.slowModeSeconds === 0
                      ? "Disabled (0s)"
                      : `${moderationRules.slowModeSeconds} Seconds`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {[0, 5, 10, 30, 60].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        setModerationRules((prev) => ({ ...prev, slowModeSeconds: s }))
                      }
                      className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                        moderationRules.slowModeSeconds === s
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {s === 0 ? "Off" : `${s}s`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Emergency Panic Blackout Status */}
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    <span className="text-xs font-bold text-rose-300">Emergency Panic Shield</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Instantly covers camera with "Be Right Back" screen and mutes all live audio.
                  </p>
                </div>
                <span
                  className={`px-3 py-1 text-xs font-black rounded-full ${
                    moderationRules.isPanicBlackoutActive
                      ? "bg-rose-600 text-white animate-pulse"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {moderationRules.isPanicBlackoutActive ? "ARMED & ACTIVE" : "STANDBY"}
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: RESTRICTED USERS */}
          {activeTab === "users" && (
            <div className="space-y-3">
              {mutedUsers.length === 0 ? (
                <div className="py-12 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/60 mb-2" />
                  <p className="text-xs font-bold text-zinc-300">Zero active mutes or bans</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Audience is adhering to community standards
                  </p>
                </div>
              ) : (
                mutedUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800"
                  >
                    <div className="flex items-center gap-3">
                      <img src={u.avatarUrl} alt="" className="h-9 w-9 rounded-xl object-cover" />
                      <div>
                        <span className="text-xs font-bold text-white block">{u.displayName}</span>
                        <span className="text-[10px] text-rose-400 font-semibold">● Muted in live chat</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onMuteUser(u.id, u.username)}
                      className="rounded-xl bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    >
                      Unmute
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: WORDLIST FILTERS */}
          {activeTab === "wordlist" && (
            <div className="space-y-4">
              <form onSubmit={handleAddWord} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newBlockedWord}
                  onChange={(e) => setNewBlockedWord(e.target.value)}
                  placeholder="Add blocked keyword or phrase..."
                  className="flex-1 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-white border border-zinc-800 focus:border-rose-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-2xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-500 shadow-lg shadow-rose-600/30"
                >
                  <Plus className="h-4 w-4" />
                  Add Filter
                </button>
              </form>

              <div className="flex flex-wrap gap-2 pt-2">
                {moderationRules.blockedWords.map((word) => (
                  <span
                    key={word}
                    className="flex items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300"
                  >
                    <span className="text-rose-400 font-bold">🚫</span>
                    <span>{word}</span>
                    <button
                      onClick={() => handleRemoveWord(word)}
                      className="text-zinc-500 hover:text-rose-400 ml-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800/80 pt-3 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="rounded-2xl bg-zinc-900 px-5 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800"
          >
            Close Center
          </button>
        </div>
      </div>
    </div>
  );
}
