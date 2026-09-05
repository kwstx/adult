"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MessageSquare, Send, Sparkles, Coins, Lock, CheckCircle2, ShieldCheck, Heart } from "lucide-react";
import { useUser } from "@/lib/user-context";

interface Conversation {
  id: string;
  creatorName: string;
  avatarUrl: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isVip: boolean;
}

const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    id: "conv_maya",
    creatorName: "Maya Velvet ✨",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    lastMessage: "Thanks for the spotlight tip! Sent you backstage preview 💕",
    timestamp: "10m ago",
    unreadCount: 1,
    isVip: true,
  },
  {
    id: "conv_chloe",
    creatorName: "Chloe Siren 🌊",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    lastMessage: "Live stream starts in 30 mins! See you there 🎧",
    timestamp: "2h ago",
    unreadCount: 0,
    isVip: false,
  },
];

export default function MessagesPage() {
  const { currentUser } = useUser();
  const [conversations] = useState<Conversation[]>(SAMPLE_CONVERSATIONS);
  const [selectedConv, setSelectedConv] = useState<Conversation>(SAMPLE_CONVERSATIONS[0]);
  const [chatHistory, setChatHistory] = useState([
    {
      id: "1",
      sender: "Maya Velvet ✨",
      text: "Hey Alex! Loved your enthusiasm in today's live stream! 💃",
      isCreator: true,
      time: "2:15 PM",
    },
    {
      id: "2",
      sender: "You",
      text: "The neon dance was amazing! Can't wait for the next stream.",
      isCreator: false,
      time: "2:18 PM",
    },
    {
      id: "3",
      sender: "Maya Velvet ✨",
      text: "Thanks for the spotlight tip! Sent you backstage preview 💕",
      isCreator: true,
      time: "2:20 PM",
    },
  ]);
  const [inputMsg, setInputMsg] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    setChatHistory((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "You",
        text: inputMsg.trim(),
        isCreator: false,
        time: "Just now",
      },
    ]);
    setInputMsg("");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <MessageSquare className="h-6 w-6 text-pink-400" />
        <h1 className="text-2xl sm:text-3xl font-black text-white">Direct Messages</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[72vh] rounded-3xl border border-zinc-800/80 bg-zinc-950 overflow-hidden shadow-2xl">
        {/* Left Column: Conversation List */}
        <div className="md:col-span-1 border-r border-zinc-800/80 flex flex-col bg-zinc-950">
          <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/40">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              VIP Inboxes ({conversations.length})
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.map((conv) => {
              const isSelected = selectedConv.id === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all ${
                    isSelected
                      ? "bg-pink-500/15 border border-pink-500/30 text-white"
                      : "text-zinc-300 hover:bg-zinc-900/60 border border-transparent"
                  }`}
                >
                  <div className="relative">
                    <img
                      src={conv.avatarUrl}
                      alt={conv.creatorName}
                      className="h-11 w-11 rounded-2xl object-cover ring-1 ring-zinc-700"
                    />
                    {conv.isVip && (
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] font-black text-black">
                        💎
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-xs font-bold text-white">
                        {conv.creatorName}
                      </span>
                      <span className="text-[10px] text-zinc-500">{conv.timestamp}</span>
                    </div>
                    <p className="truncate text-[11px] text-zinc-400 mt-0.5">{conv.lastMessage}</p>
                  </div>

                  {conv.unreadCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pink-600 text-[10px] font-bold text-white">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Chat Thread */}
        <div className="md:col-span-2 flex flex-col bg-zinc-950/60">
          {/* Thread Header */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-6 py-4 bg-zinc-900/40">
            <div className="flex items-center gap-3">
              <img
                src={selectedConv.avatarUrl}
                alt={selectedConv.creatorName}
                className="h-10 w-10 rounded-2xl object-cover ring-1 ring-pink-500/40"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-extrabold text-white">{selectedConv.creatorName}</h3>
                  <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="h-2.5 w-2.5" />
                    Verified
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400">Direct VIP Fan Channel</p>
              </div>
            </div>

            <Link
              href={`/live/${selectedConv.id.replace("conv_", "creator_")}`}
              className="flex items-center gap-1.5 rounded-xl bg-pink-600/20 px-3 py-1.5 text-xs font-bold text-pink-300 border border-pink-500/30 hover:bg-pink-600/30 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Watch Live</span>
            </Link>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.isCreator ? "items-start" : "items-end"}`}
              >
                <div
                  className={`max-w-md rounded-2xl p-3.5 leading-relaxed ${
                    msg.isCreator
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-200"
                      : "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/20"
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
                <span className="text-[10px] text-zinc-500 mt-1 px-1">{msg.time}</span>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <form
            onSubmit={handleSend}
            className="border-t border-zinc-800/80 p-4 bg-zinc-900/40 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder={`Message ${selectedConv.creatorName}...`}
              className="flex-1 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-white placeholder-zinc-500 border border-zinc-800 focus:border-pink-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputMsg.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500 disabled:opacity-40 transition-all"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
