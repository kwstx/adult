"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Sparkles, Coins, Flame, ShieldAlert, Star } from "lucide-react";
import { useUser } from "@/lib/user-context";

export interface ChatMessageItem {
  id: string;
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
}

export function LiveChat({ creatorId, onOpenTipMenu }: LiveChatProps) {
  const { currentUser } = useUser();
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // 1. Load initial chat history & Connect to Real-time SSE stream
  useEffect(() => {
    // Fetch initial chat
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
        } else if (event.type === "TIP_EVENT") {
          // Tip notification handled both in chat & tip alert overlay
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
                    <span className="font-extrabold text-amber-300">{msg.senderName}</span>
                  </div>
                  <span className="rounded-full bg-pink-500/30 px-2 py-0.5 text-[10px] font-black text-pink-300">
                    +{msg.tipAmount} TOKENS
                  </span>
                </div>
                <p className="mt-1 font-medium text-pink-100">{msg.text}</p>
              </div>
            );
          }

          return (
            <div key={msg.id || index} className="flex items-start gap-2 leading-relaxed">
              {/* Badges */}
              {msg.senderRole === "CREATOR" && (
                <span className="rounded bg-pink-600 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                  Creator
                </span>
              )}
              {msg.senderBadge === "VIP" && (
                <span className="rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                  VIP
                </span>
              )}
              {msg.senderBadge === "TOP_TIPPER" && (
                <span className="rounded bg-purple-500/20 border border-purple-500/40 px-1.5 py-0.5 text-[9px] font-bold text-purple-300">
                  ⭐ Top Tipper
                </span>
              )}
              {msg.senderBadge === "MOD" && (
                <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                  Mod
                </span>
              )}

              <span className="font-semibold text-zinc-400">{msg.senderName}:</span>
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
    </div>
  );
}
