"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Send, Sparkles, Coins, Flame, Smile, ShieldAlert } from "lucide-react";
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

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  creatorName: string;
  onOpenGiftDrawer: () => void;
}

const QUICK_REACTIONS = ["🔥", "💖", "👑", "👏", "💋", "🎉", "💎", "⭐"];

export function ChatDrawer({
  isOpen,
  onClose,
  creatorId,
  creatorName,
  onOpenGiftDrawer,
}: ChatDrawerProps) {
  const { currentUser } = useUser();
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Load chat & connect SSE
  useEffect(() => {
    if (!creatorId) return;

    fetch(`/api/realtime/${creatorId}/chat`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(data);
        }
      })
      .catch(() => {});

    const eventSource = new EventSource(`/api/realtime/${creatorId}/sse`);
    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "CHAT_MESSAGE") {
          setMessages((prev) => [...prev, event.payload]);
        }
      } catch {
        // SSE parsing
      }
    };

    return () => {
      eventSource.close();
    };
  }, [creatorId]);

  // Auto scroll
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      // Handled
    } finally {
      setIsSending(false);
    }
  };

  const handleSendReaction = (emoji: string) => {
    setInputText((prev) => `${prev} ${emoji}`.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4 animate-fade-in">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 flex h-[75vh] sm:h-[620px] w-full max-w-lg flex-col rounded-t-3xl sm:rounded-3xl border border-zinc-800/90 bg-zinc-950/95 shadow-2xl backdrop-blur-2xl overflow-hidden animate-slide-up">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-3.5 bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <h3 className="text-sm font-extrabold text-white">
              Live Chat <span className="text-zinc-500 font-medium">({messages.length})</span>
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenGiftDrawer();
              }}
              className="flex items-center gap-1.5 rounded-full bg-pink-500/20 px-3 py-1 text-xs font-bold text-pink-400 border border-pink-500/30 hover:bg-pink-500/30 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Tip & Gifts</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Message Feed */}
        <div
          ref={chatScrollRef}
          className="flex-1 space-y-3 overflow-y-auto p-4 text-xs scroll-smooth"
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-zinc-500">
              <Smile className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-xs font-medium">Be the first to say hello in {creatorName}&apos;s room!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              if (msg.isTipNotice) {
                return (
                  <div
                    key={msg.id || index}
                    className="rounded-2xl bg-gradient-to-r from-pink-950/70 via-rose-900/40 to-amber-950/40 p-3 border border-pink-500/40 shadow-lg shadow-pink-500/5"
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
                    <p className="mt-1 font-semibold text-pink-100">{msg.text}</p>
                  </div>
                );
              }

              return (
                <div key={msg.id || index} className="flex items-start gap-2 leading-relaxed group">
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

                  <span className="font-bold text-zinc-400 shrink-0">{msg.senderName}:</span>
                  <span className="text-zinc-100 break-words flex-1 font-medium">{msg.text}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Reaction Bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-t border-zinc-900 bg-zinc-950/80 overflow-x-auto scrollbar-none">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSendReaction(emoji)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-sm hover:scale-125 hover:bg-zinc-800 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="border-t border-zinc-800/80 p-3 bg-zinc-900/60 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Comment as ${currentUser.displayName}...`}
            className="flex-1 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-white placeholder-zinc-500 border border-zinc-800 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500 disabled:opacity-40 transition-all"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
