"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Sparkles, Coins, Flame, ShieldAlert, Star } from "lucide-react";
import { useUser } from "@/lib/user-context";
import { FanStatusBadge } from "@/components/live-room/FanStatusBadge";
import { FanStatusProfileModal } from "@/components/live-room/FanStatusProfileModal";
import { FAN_STATUS_STYLES } from "@/modules/relationship/fan-status.service";

export interface ChatMessageItem {
  id: string;
  senderId?: string;
  senderName: string;
  senderRole: string;
  senderBadge?: string | null;
  text: string;
  isTipNotice?: boolean;
  tipAmount?: number;
  tipActionName?: string | null;
  createdAt: string | Date;
}

interface LiveChatProps {
  creatorId: string;
  onOpenTipMenu: () => void;
  isCreator?: boolean;
}

export function LiveChat({ creatorId, onOpenTipMenu, isCreator = false }: LiveChatProps) {
  const { currentUser } = useUser();
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedFanId, setSelectedFanId] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // 1. Load initial chat history & Connect to Real-time SSE stream
  useEffect(() => {
    fetch(`/api/realtime/${creatorId}/chat`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(data);
        }
      })
      .catch(() => {});

    // Open SSE stream
    const eventSource = new EventSource(`/api/realtime/${creatorId}/sse`);

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "CHAT_MESSAGE") {
          setMessages((prev) => [...prev, event.payload]);
        }
      } catch {
        // SSE parsing error
      }
    };

    return () => {
      eventSource.close();
    };
  }, [creatorId]);

  // 2. Auto-scroll on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 3. Send message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const textToSend = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      await fetch(`/api/realtime/${creatorId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUser.id,
          text: textToSend,
        }),
      });
    } catch {
      // Error handled
    } finally {
      setIsSending(false);
    }
  };

  const resolveFanTier = (msg: ChatMessageItem) => {
    if (msg.senderRole === "CREATOR") return null;
    const name = msg.senderName.toLowerCase();
    const badge = msg.senderBadge?.toUpperCase() || "";

    if (badge.includes("INNER_CIRCLE") || name.includes("chris")) return "INNER_CIRCLE";
    if (badge.includes("VIP") || name.includes("maria")) return "VIP";
    if (badge.includes("SUPPORTER") || name.includes("alex")) return "SUPPORTER";
    if (badge.includes("REGULAR") || name.includes("sophia")) return "REGULAR";
    if (badge.includes("ELITE") || badge.includes("PATRON")) return "ELITE";
    return null;
  };

  return (
    <div className="flex h-full flex-col rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-2xl overflow-hidden">
      {/* Chat Room Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 bg-zinc-900/40">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Live Stream Chat
          </h3>
        </div>
        <button
          onClick={onOpenTipMenu}
          className="flex items-center gap-1.5 rounded-full bg-pink-500/20 px-3 py-1 text-xs font-bold text-pink-400 border border-pink-500/30 hover:bg-pink-500/30 transition-colors"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Tip Menu
        </button>
      </div>

      {/* Message Feed */}
      <div
        ref={chatScrollRef}
        className="flex-1 space-y-2.5 overflow-y-auto p-4 text-xs scroll-smooth"
      >
        {messages.map((msg, index) => {
          if (msg.isTipNotice) {
            return (
              <div
                key={msg.id || index}
                className="my-2 rounded-2xl bg-gradient-to-r from-pink-950/70 via-rose-900/40 to-amber-950/40 p-3 border border-pink-500/40 shadow-lg shadow-pink-500/5 animate-tip-pop"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                      <Coins className="h-3 w-3" />
                    </span>
                    <button
                      onClick={() => setSelectedFanId(msg.senderId || msg.senderName)}
                      className="font-extrabold text-amber-300 hover:underline"
                    >
                      {msg.senderName}
                    </button>
                  </div>
                  <span className="rounded-full bg-pink-500/30 px-2 py-0.5 text-[10px] font-black text-pink-300">
                    +{msg.tipAmount} TOKENS
                  </span>
                </div>
                <p className="mt-1 font-medium text-pink-100">{msg.text}</p>
              </div>
            );
          }

          const fanTier = resolveFanTier(msg);

          return (
            <div key={msg.id || index} className="flex items-start gap-1.5 leading-relaxed">
              {/* Creator Tag */}
              {msg.senderRole === "CREATOR" && (
                <span className="rounded bg-pink-600 px-1.5 py-0.2 text-[9px] font-bold text-white uppercase shrink-0">
                  Creator
                </span>
              )}

              {/* Mod Tag */}
              {msg.senderBadge === "MOD" && (
                <span className="rounded bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-bold text-emerald-300 shrink-0">
                  Mod
                </span>
              )}

              {/* Elegant Fan Status Badge */}
              {fanTier && (
                <FanStatusBadge
                  tier={fanTier}
                  variant="pill"
                  interactive
                  onClick={() => setSelectedFanId(msg.senderId || msg.senderName)}
                />
              )}

              <button
                onClick={() => setSelectedFanId(msg.senderId || msg.senderName)}
                className="font-semibold text-zinc-400 hover:text-white transition-colors shrink-0 text-left hover:underline"
              >
                {msg.senderName}:
              </button>
              <span className="text-zinc-200 break-words flex-1">{msg.text}</span>
            </div>
          );
        })}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSendMessage}
        className="border-t border-zinc-800/80 p-3 bg-zinc-900/40 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Chat as ${currentUser.displayName}...`}
          className="flex-1 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-white placeholder-zinc-500 border border-zinc-800 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 transition-all"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500 disabled:opacity-40 transition-all"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      {/* Fan Status Profile Modal */}
      <FanStatusProfileModal
        isOpen={Boolean(selectedFanId)}
        onClose={() => setSelectedFanId(null)}
        fanId={selectedFanId}
        creatorId={creatorId}
        isCreator={isCreator}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
