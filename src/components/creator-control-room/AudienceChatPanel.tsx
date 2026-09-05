"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  Users,
  Crown,
  HeartHandshake,
  Pin,
  Trash2,
  VolumeX,
  UserX,
  Send,
  Search,
  Flame,
  Coins,
  Shield,
  Clock,
  Sparkles,
  Award,
} from "lucide-react";
import type {
  ControlRoomChatMessage,
  AudienceMember,
  TopSupporter,
} from "@/types/control-room";

interface AudienceChatPanelProps {
  chatMessages: ControlRoomChatMessage[];
  audienceList: AudienceMember[];
  topSupporters: TopSupporter[];
  onSendMessage: (text: string) => void;
  onPinMessage: (id: string) => void;
  onDeleteMessage: (id: string) => void;
  onMuteUser: (userId: string, username: string) => void;
  onTimeoutUser: (userId: string, username: string) => void;
  onBanUser: (userId: string, username: string) => void;
  onBroadcastShoutout: (supporter: TopSupporter) => void;
  onSelectAudienceMember: (member: AudienceMember) => void;
}

export function AudienceChatPanel({
  chatMessages,
  audienceList,
  topSupporters,
  onSendMessage,
  onPinMessage,
  onDeleteMessage,
  onMuteUser,
  onTimeoutUser,
  onBanUser,
  onBroadcastShoutout,
  onSelectAudienceMember,
}: AudienceChatPanelProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "audience" | "supporters" | "relationships">("chat");
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const filteredAudience = audienceList.filter(
    (m) =>
      m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedMessage = chatMessages.find((m) => m.isPinned);

  return (
    <div className="flex flex-col h-full bg-zinc-950/80 border-r border-zinc-800/80 w-full overflow-hidden select-none">
      {/* 4-Tab Navigation Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-2 py-2 bg-zinc-900/40 shrink-0">
        <div className="grid grid-cols-4 w-full gap-1">
          {/* Chat Tab */}
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
              activeTab === "chat"
                ? "bg-pink-600/20 text-pink-300 border border-pink-500/40 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Chat</span>
          </button>

          {/* Audience Tab */}
          <button
            onClick={() => setActiveTab("audience")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
              activeTab === "audience"
                ? "bg-pink-600/20 text-pink-300 border border-pink-500/40 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Audience</span>
          </button>

          {/* Top Supporters Tab */}
          <button
            onClick={() => setActiveTab("supporters")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
              activeTab === "supporters"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <Crown className="h-3.5 w-3.5" />
            <span>Top</span>
          </button>

          {/* Relationship Levels Tab */}
          <button
            onClick={() => setActiveTab("relationships")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
              activeTab === "relationships"
                ? "bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <HeartHandshake className="h-3.5 w-3.5" />
            <span>CRM</span>
          </button>
        </div>
      </div>

      {/* Main Tab View Canvas */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {/* ========================================================= */}
        {/* 1. LIVE CHAT TAB                                         */}
        {/* ========================================================= */}
        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col h-full min-h-0">
            {/* Pinned Message Banner */}
            {pinnedMessage && (
              <div className="flex items-center justify-between gap-2 p-2.5 bg-amber-500/10 border-b border-amber-500/30 text-xs shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Pin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="font-bold text-amber-300 shrink-0">{pinnedMessage.senderName}:</span>
                  <span className="text-zinc-200 truncate">{pinnedMessage.text}</span>
                </div>
                <button
                  onClick={() => onPinMessage(pinnedMessage.id)}
                  className="text-zinc-400 hover:text-white shrink-0 p-1"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`group relative rounded-2xl p-2.5 text-xs transition-all ${
                    msg.tipCredits
                      ? "bg-gradient-to-r from-amber-500/15 via-zinc-900 to-zinc-900 border border-amber-500/40 shadow-md"
                      : msg.senderId === "system"
                      ? "bg-rose-950/30 border border-rose-500/30 text-rose-300"
                      : "bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {msg.senderAvatar ? (
                      <img
                        src={msg.senderAvatar}
                        alt=""
                        className="h-7 w-7 rounded-xl object-cover shrink-0 mt-0.5"
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5 text-zinc-400 font-bold">
                        🛡️
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white text-xs">{msg.senderName}</span>

                        {/* Badges */}
                        {msg.fanLevel > 0 && (
                          <span className="rounded bg-zinc-800 px-1 py-0.2 text-[9px] font-mono font-bold text-zinc-300">
                            Lv.{msg.fanLevel}
                          </span>
                        )}
                        {msg.isVip && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-bold text-amber-300 border border-amber-500/30">
                            VIP
                          </span>
                        )}
                        {msg.isModerator && (
                          <span className="rounded bg-purple-500/20 px-1.5 py-0.2 text-[9px] font-bold text-purple-300 border border-purple-500/30">
                            MOD
                          </span>
                        )}
                        {msg.tipCredits && (
                          <span className="rounded-full bg-amber-400 text-black px-1.5 py-0.2 text-[9px] font-black">
                            +{msg.tipCredits} 🪙
                          </span>
                        )}

                        <span className="text-[10px] text-zinc-500 ml-auto">{msg.timestamp}</span>
                      </div>

                      <p className="mt-1 text-zinc-200 leading-relaxed break-words">{msg.text}</p>
                    </div>
                  </div>

                  {/* Hover Quick Moderation Actions */}
                  {msg.senderId !== "system" && (
                    <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 rounded-xl bg-zinc-950/90 border border-zinc-700 p-1 shadow-xl">
                      <button
                        onClick={() => onPinMessage(msg.id)}
                        className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-amber-400"
                        title="Pin Message"
                      >
                        <Pin className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => onMuteUser(msg.senderId, msg.senderName)}
                        className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-rose-400"
                        title="Mute User in Room"
                      >
                        <VolumeX className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => onDeleteMessage(msg.id)}
                        className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-rose-400"
                        title="Delete Message"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSend} className="p-3 border-t border-zinc-800/80 bg-zinc-950 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Send creator message or command..."
                  className="flex-1 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-white border border-zinc-800 focus:border-pink-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. AUDIENCE ROSTER TAB                                   */}
        {/* ========================================================= */}
        {activeTab === "audience" && (
          <div className="flex-1 flex flex-col h-full min-h-0 p-3 space-y-3">
            {/* Search Filter */}
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search active viewers..."
                className="w-full rounded-2xl bg-zinc-900 pl-9 pr-4 py-2 text-xs text-white border border-zinc-800 focus:border-pink-500 focus:outline-none"
              />
            </div>

            {/* Audience List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredAudience.map((member) => (
                <div
                  key={member.id}
                  onClick={() => onSelectAudienceMember(member)}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-pink-500/40 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={member.avatarUrl}
                        alt=""
                        className="h-9 w-9 rounded-xl object-cover"
                      />
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-950 text-[8px] font-black text-amber-400 border border-zinc-800">
                        {member.fanLevel}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs truncate">
                          {member.displayName}
                        </span>
                        {member.isVip && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[8px] font-black text-amber-300">
                            VIP
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 block truncate">
                        {member.relationshipTier.replace("_", " ")} • {member.watchMinutesSession}m in room
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-amber-400 block">
                      {member.tokensSpentSession} 🪙
                    </span>
                    <span className="text-[10px] text-zinc-500">tonight</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. TOP SUPPORTERS LEADERBOARD TAB                        */}
        {/* ========================================================= */}
        {activeTab === "supporters" && (
          <div className="flex-1 flex flex-col h-full min-h-0 p-3 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold text-zinc-300">Tonight&apos;s High Rollers</span>
              <span className="text-[10px] text-pink-400 font-bold">● Live Updates</span>
            </div>

            {/* Podium Cards */}
            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {topSupporters.map((supporter) => {
                const isFirst = supporter.rank === 1;
                const isSecond = supporter.rank === 2;
                const isThird = supporter.rank === 3;

                return (
                  <div
                    key={supporter.userId}
                    className={`relative rounded-2xl p-3 border transition-all ${
                      isFirst
                        ? "bg-gradient-to-r from-amber-500/20 via-zinc-900 to-zinc-900 border-amber-500/50 shadow-lg shadow-amber-500/10"
                        : isSecond
                        ? "bg-zinc-900/80 border-zinc-700"
                        : "bg-zinc-900/50 border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-950 font-black text-xs border border-zinc-800">
                          {isFirst ? "🥇" : isSecond ? "🥈" : "🥉"}
                        </div>
                        <img
                          src={supporter.avatarUrl}
                          alt=""
                          className="h-9 w-9 rounded-xl object-cover ring-1 ring-zinc-700"
                        />
                        <div>
                          <span className="text-xs font-black text-white block">
                            {supporter.displayName}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {supporter.streakDays}-day streak • {supporter.relationshipTier.replace("_", " ")}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-amber-400 block">
                          {supporter.totalTokensContributed.toLocaleString()} 🪙
                        </span>
                        <button
                          onClick={() => onBroadcastShoutout(supporter)}
                          className="mt-1 rounded-lg bg-pink-600/20 hover:bg-pink-600 text-pink-300 hover:text-white px-2 py-0.5 text-[9px] font-bold border border-pink-500/30 transition-all"
                        >
                          Shoutout ✨
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. RELATIONSHIP LEVELS (CRM) TAB                         */}
        {/* ========================================================= */}
        {activeTab === "relationships" && (
          <div className="flex-1 flex flex-col h-full min-h-0 p-3 space-y-3">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/40 to-pink-950/40 border border-purple-500/30">
              <span className="text-xs font-black text-purple-300 block">Audience Loyalty Matrix</span>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Track fan retention, XP progression and custom private relationship notes.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5">
              {audienceList.map((fan) => (
                <div
                  key={fan.id}
                  onClick={() => onSelectAudienceMember(fan)}
                  className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-3 space-y-2 hover:border-purple-500/40 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={fan.avatarUrl} alt="" className="h-7 w-7 rounded-xl object-cover" />
                      <span className="text-xs font-bold text-white">{fan.displayName}</span>
                    </div>
                    <span className="rounded-full bg-purple-500/20 text-purple-300 px-2 py-0.5 text-[9px] font-bold border border-purple-500/30">
                      {fan.relationshipTier.replace("_", " ")}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-zinc-400 font-semibold">
                      <span>Progression</span>
                      <span className="text-pink-400">{fan.relationshipProgressPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                        style={{ width: `${fan.relationshipProgressPercent}%` }}
                      />
                    </div>
                  </div>

                  {fan.customNotes && (
                    <p className="text-[10px] text-zinc-400 italic bg-zinc-950/60 rounded-xl p-2 border border-zinc-800/80 truncate">
                      &ldquo;{fan.customNotes}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
