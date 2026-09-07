"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Coins,
  Smile,
  ShieldCheck,
  Users,
  Radio,
  Pin,
  MessageSquare,
  Lock,
} from "lucide-react";
import { useUser } from "@/lib/user-context";
import type { ChatMessagePayload } from "@/modules/realtime/types";
import { SeatBadge } from "@/components/seats/SeatBadge";
import { SocialSeatTier, SEAT_TIER_CONFIGS } from "@/types/seat";

export interface DesktopLiveRoomChatProps {
  messages: ChatMessagePayload[];
  isChatSending: boolean;
  canChat: boolean;
  onSendMessage: (text: string) => Promise<boolean>;
  onInspectFan?: (fanId: string, fanName: string) => void;
  viewerCount: number;
  creatorName: string;
  className?: string;
}

const QUICK_REACTIONS = ["🔥", "❤️", "👑", "💎", "🚀", "🎉", "💋", "👏"];

export function DesktopLiveRoomChat({
  messages,
  isChatSending,
  canChat,
  onSendMessage,
  onInspectFan,
  viewerCount,
  creatorName,
  className = "",
}: DesktopLiveRoomChatProps) {
  const { currentUser } = useUser();
  const [inputText, setInputText] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isChatSending) return;

    const text = inputText.trim();
    setInputText("");
    const success = await onSendMessage(text);
    if (!success) {
      setInputText(text); // Restore on failure
    }
  };

  const handleQuickReaction = (emoji: string) => {
    setInputText((prev) => `${prev} ${emoji}`.trim());
  };

  const resolveMessageSeatTier = (msg: ChatMessagePayload): SocialSeatTier | null => {
    if (msg.senderRole === "CREATOR") return null;
    if (msg.senderSeatTier) return msg.senderSeatTier as SocialSeatTier;

    const name = msg.senderName.toLowerCase();
    const badge = msg.senderBadge?.toUpperCase() || "";

    if (badge.includes("GUEST") || badge.includes("SPOTLIGHT")) return "CREATOR_SELECTED_GUEST";
    if (badge.includes("INNER_CIRCLE") || name.includes("chris")) return "INNER_CIRCLE";
    if (badge.includes("VIP") || name.includes("maria")) return "VIP";
    if (badge.includes("FRONT") || badge.includes("SUPPORTER") || name.includes("alex")) return "FRONT_ROW";
    return null;
  };

  return (
    <div
      className={`flex flex-col h-full bg-zinc-950/90 border-x border-zinc-800/80 select-none ${className}`}
    >
      {/* 1. Center Chat Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 bg-zinc-900/40 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
            <MessageSquare className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Live Stream Chat
            </h3>
            <p className="text-[10px] text-zinc-400">
              Broadcasting to <span className="text-zinc-200 font-semibold">{viewerCount.toLocaleString()} fans</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        </div>
      </div>

      {/* 2. Chat Messages Stream */}
      <div
        ref={chatScrollRef}
        className="flex-1 space-y-2 overflow-y-auto p-4 text-xs scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-zinc-500 space-y-2">
            <div className="h-10 w-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-zinc-300">Welcome to the live chat room!</p>
            <p className="text-[11px] text-zinc-500 max-w-xs">
              Say hello to {creatorName}, send gifts, or trigger interactive challenges from the marketplace.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            // High-Tier Tip Notification
            if (msg.isTipNotice) {
              return (
                <div
                  key={msg.id || index}
                  className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-pink-950/80 via-rose-950/60 to-zinc-950/80 p-2.5 border border-pink-500/40 shadow-lg backdrop-blur-md animate-fade-in my-1"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-md">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <button
                        onClick={() => onInspectFan?.(msg.senderId, msg.senderName)}
                        className="font-bold text-amber-300 hover:underline truncate text-left"
                      >
                        {msg.senderName}
                      </button>
                      <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[10px] font-bold text-pink-200 border border-pink-500/30 shrink-0">
                        +{msg.tipAmount} TOKENS
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-pink-100 truncate">
                      {msg.text}
                    </p>
                  </div>
                </div>
              );
            }

            const seatTier = resolveMessageSeatTier(msg);
            const seatConfig = seatTier ? SEAT_TIER_CONFIGS[seatTier] : null;

            return (
              <div
                key={msg.id || index}
                className={`group flex items-start gap-1.5 rounded-xl px-2.5 py-1.5 transition-colors ${
                  seatConfig
                    ? "bg-zinc-900/60 border border-white/5"
                    : "hover:bg-zinc-900/40"
                }`}
              >
                {/* Creator Badge */}
                {msg.senderRole === "CREATOR" && (
                  <span className="rounded bg-pink-600 px-1.5 py-0.2 text-[9px] font-black text-white uppercase shrink-0 shadow-md">
                    Creator
                  </span>
                )}

                {/* Mod Badge */}
                {msg.senderBadge === "MOD" && (
                  <span className="rounded bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-bold text-emerald-300 shrink-0">
                    Mod
                  </span>
                )}

                {/* Seat Badge */}
                {seatTier && (
                  <SeatBadge
                    tier={seatTier}
                    variant="chat-prefix"
                    interactive
                    onClick={() => onInspectFan?.(msg.senderId, msg.senderName)}
                  />
                )}

                {/* Sender Name */}
                <button
                  onClick={() => onInspectFan?.(msg.senderId, msg.senderName)}
                  className={`font-bold transition-colors shrink-0 text-left hover:underline ${
                    seatConfig ? seatConfig.textColor : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {msg.senderName}:
                </button>

                {/* Message text */}
                <span
                  className={`break-words font-medium ${
                    seatTier === "CREATOR_SELECTED_GUEST" || seatTier === "INNER_CIRCLE"
                      ? "text-white font-semibold"
                      : "text-zinc-200"
                  }`}
                >
                  {msg.text}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Quick Emoji Reactions Bar */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-t border-zinc-900 bg-zinc-950/60 overflow-x-auto scrollbar-none shrink-0">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleQuickReaction(emoji)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800/80 text-xs hover:scale-115 hover:bg-zinc-800 transition-all active:scale-95"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* 4. Desktop Chat Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-zinc-800/80 bg-zinc-900/40 flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            canChat
              ? `Comment as ${currentUser.displayName}...`
              : "Chat is currently restricted..."
          }
          disabled={!canChat || isChatSending}
          maxLength={250}
          className="flex-1 rounded-2xl bg-zinc-900 border border-zinc-800 px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isChatSending || !canChat}
          className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500 disabled:opacity-40 transition-all shrink-0 active:scale-95"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
