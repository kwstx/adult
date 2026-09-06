"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Coins, Sparkles, Smile, ShieldAlert } from "lucide-react";
import { useUser } from "@/lib/user-context";
import type { ChatMessagePayload } from "@/modules/realtime/types";
import { FanStatusBadge } from "./FanStatusBadge";
import { SeatBadge } from "@/components/seats/SeatBadge";
import { SocialSeatTier } from "@/types/seat";
import { SEAT_TIER_CONFIGS } from "@/modules/seats/seat-entitlement.service";
import { normalizeRelationshipTier } from "@/modules/relationship/tier-definitions";
import { FAN_STATUS_STYLES } from "@/modules/relationship/fan-status.service";

interface TranslucentChatPanelProps {
  messages: ChatMessagePayload[];
  isChatSending: boolean;
  canChat: boolean;
  onSendMessage: (text: string) => Promise<boolean>;
  onOpenMarketplace: () => void;
  onInspectFan?: (fanId: string, fanName: string) => void;
}

const QUICK_REACTIONS = ["🔥", "❤️", "👑", "💎", "🚀", "🎉", "💋", "👏"];

export function TranslucentChatPanel({
  messages,
  isChatSending,
  canChat,
  onSendMessage,
  onOpenMarketplace,
  onInspectFan,
}: TranslucentChatPanelProps) {
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
      setInputText(text); // Restore on error
    }
  };

  const handleQuickReaction = (emoji: string) => {
    setInputText((prev) => `${prev} ${emoji}`.trim());
  };

  // Helper to resolve seat tier / relationship tier from message payload
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
    <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col justify-end p-4 sm:p-6 pb-20 sm:pb-6 pointer-events-none max-w-xl">
      {/* 1. Translucent Gradient Message Feed */}
      <div className="pointer-events-auto flex flex-col max-h-[280px] sm:max-h-[340px] w-full mask-gradient-b">
        <div
          ref={chatScrollRef}
          className="flex flex-col space-y-2 overflow-y-auto pr-2 pb-2 text-xs scroll-smooth [mask-image:linear-gradient(to_bottom,transparent_0%,black_20%)]"
        >
          {messages.length === 0 ? (
            <div className="text-zinc-400 text-xs italic bg-black/40 backdrop-blur-md rounded-2xl p-2.5 max-w-xs border border-white/5">
              Welcome to the live room! Say hello in chat... 👋
            </div>
          ) : (
            messages.map((msg, index) => {
              // High-tier Tip Alerts (Rendered elegantly)
              if (msg.isTipNotice) {
                return (
                  <div
                    key={msg.id || index}
                    className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-pink-950/80 via-rose-950/60 to-zinc-950/80 p-2.5 border border-pink-500/30 shadow-lg backdrop-blur-md animate-fade-in"
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
                  className={`group flex items-start gap-1.5 rounded-2xl backdrop-blur-md px-3 py-1.5 border max-w-[92%] shadow-lg transition-all hover:bg-black/60 ${
                    seatConfig
                      ? seatConfig.chatBubbleClass
                      : "bg-black/45 border-white/5"
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

                  {/* Authoritative Social Seat Badge (Guest ⭐, Inner Circle 👑, VIP 💎, Front Row 🔥) */}
                  {seatTier && (
                    <SeatBadge
                      tier={seatTier}
                      variant="chat-prefix"
                      interactive
                      onClick={() => onInspectFan?.(msg.senderId, msg.senderName)}
                    />
                  )}

                  {/* Sender Name with distinct Tier styling */}
                  <button
                    onClick={() => onInspectFan?.(msg.senderId, msg.senderName)}
                    className={`font-bold transition-colors shrink-0 text-left hover:underline ${
                      seatConfig ? seatConfig.textColor : "text-zinc-300 hover:text-white"
                    }`}
                  >
                    {msg.senderName}:
                  </button>

                  {/* Message Body */}
                  <span className={`break-words font-medium ${
                    seatTier === "CREATOR_SELECTED_GUEST" || seatTier === "INNER_CIRCLE"
                      ? "text-white font-semibold"
                      : "text-white/95"
                  }`}>
                    {msg.text}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Quick Reaction Emoji Bar */}
      <div className="pointer-events-auto flex items-center gap-1.5 py-2 overflow-x-auto scrollbar-none">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleQuickReaction(emoji)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-black/50 backdrop-blur-lg border border-white/10 text-xs hover:scale-125 hover:bg-white/20 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* 3. Translucent Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 p-1.5 shadow-2xl"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            canChat
              ? `Comment as ${currentUser.displayName}...`
              : "Chat is restricted..."
          }
          disabled={!canChat || isChatSending}
          maxLength={250}
          className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-zinc-400 focus:outline-none disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isChatSending || !canChat}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500 disabled:opacity-40 transition-all shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
