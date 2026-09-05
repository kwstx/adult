"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Send,
  Sparkles,
  Coins,
  ShieldCheck,
  Paperclip,
  Image as ImageIcon,
  Settings,
  Radio,
  Star,
  Crown,
  Gem,
  Check,
  X,
  Sliders,
  Plus,
  RefreshCw,
  Zap,
  ArrowRight,
  UserCheck,
  Flame,
  Clock,
} from "lucide-react";
import { useUser } from "@/lib/user-context";

interface Conversation {
  id: string;
  creatorProfileId: string;
  creatorName: string;
  creatorUsername: string;
  creatorAvatar: string;
  isCreatorLive: boolean;
  liveRoomId?: string;
  fanUserId: string;
  fanUsername: string;
  fanDisplayName: string;
  fanAvatar: string;
  lastMessage: string;
  lastActivityAt: string;
  unreadCount: number;
  hasPaidMessages: boolean;
  latestPaidAmount: number;
  isPriority: boolean;
  isSubscriber: boolean;
  subscriptionTier?: string;
  isVip: boolean;
  relationshipTier: string;
  relationshipLevel: number;
  totalCreditsSpent: number;
}

interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole: string;
  recipientId: string;
  body: string;
  mediaUrl?: string | null;
  isPaidMessage: boolean;
  paidPriceCredits: number;
  isPriority: boolean;
  relationshipTier?: string;
  fanLevel?: number;
  isRead: boolean;
  createdAt: string;
}

interface CreatorSettings {
  creatorId: string;
  creatorProfileId: string;
  paidMessagesEnabled: boolean;
  messagePriceCredits: number;
  allowFreeSubscribers: boolean;
  allowFreeVip: boolean;
  customWelcomeMessage?: string | null;
}

export default function PaidMessagingPage() {
  const { currentUser, switchUser, refreshWallet } = useUser();

  // Mode: Viewing as Fan or Viewing as Creator
  const isCreatorMode = currentUser.role === "CREATOR";

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);

  // Filters for Creator Attention Prioritization
  const [activeFilter, setActiveFilter] = useState<
    "all" | "unread" | "paid" | "priority" | "subscribers" | "vip"
  >("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Message Form State
  const [inputMsg, setInputMsg] = useState<string>("");
  const [attachedMediaUrl, setAttachedMediaUrl] = useState<string | null>(null);
  const [isPaidBoostActive, setIsPaidBoostActive] = useState<boolean>(false);
  const [paidBoostAmount, setPaidBoostAmount] = useState<number>(50);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Creator Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [creatorSettings, setCreatorSettings] = useState<CreatorSettings>({
    creatorId: "creator_maya",
    creatorProfileId: "prof_maya",
    paidMessagesEnabled: true,
    messagePriceCredits: 50,
    allowFreeSubscribers: false,
    allowFreeVip: false,
    customWelcomeMessage: "Welcome to my direct VIP inbox! Paid messages receive instant replies 💕",
  });
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // Attachment Modal / Selector
  const [showAttachmentPicker, setShowAttachmentPicker] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch conversations
  const loadConversations = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/messages/conversations?userId=${currentUser.id}&role=${currentUser.role}&filter=${activeFilter}`
      );
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        if (data.conversations && data.conversations.length > 0) {
          if (!selectedConv || !data.conversations.find((c: Conversation) => c.id === selectedConv.id)) {
            setSelectedConv(data.conversations[0]);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch creator settings for the current active conversation / creator
  const loadCreatorSettings = async (creatorId: string) => {
    try {
      const res = await fetch(
        `/api/messages/settings/${creatorId}?fanUserId=${currentUser.id}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setCreatorSettings(data.settings);
          if (data.settings.paidMessagesEnabled) {
            setPaidBoostAmount(data.settings.messagePriceCredits || 50);
          }
        }
      }
    } catch {
      // Fallback
    }
  };

  // Fetch messages for selected conversation
  const loadMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/messages/${convId}?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  // Reload when active user, role or filter changes
  useEffect(() => {
    loadConversations();
  }, [currentUser.id, currentUser.role, activeFilter]);

  // When selected conversation changes
  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.id);
      loadCreatorSettings(selectedConv.creatorProfileId || selectedConv.creatorUsername);
    }
  }, [selectedConv?.id]);

  // Real-time SSE listener for instant message delivery without polling
  useEffect(() => {
    const sseUrl = `/api/messages/realtime?userId=${currentUser.id}${
      selectedConv ? `&conversationId=${selectedConv.id}` : ""
    }${isCreatorMode ? `&creatorId=${currentUser.id}` : ""}`;

    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "NEW_MESSAGE" && data.payload?.message) {
          const newMsg = data.payload.message;
          // If message belongs to current open conversation, append it
          if (selectedConv && newMsg.conversationId === selectedConv.id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
          // Refresh conversation list to update previews & unread badges
          loadConversations();
          refreshWallet();
        }
      } catch {
        // Parse error ignore
      }
    };

    return () => {
      eventSource.close();
    };
  }, [currentUser.id, selectedConv?.id, isCreatorMode]);

  // Handle Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() && !attachedMediaUrl) return;
    if (!selectedConv) return;

    setErrorMsg(null);
    setSending(true);

    const targetCreatorId = selectedConv.creatorProfileId || selectedConv.creatorUsername || "prof_maya";
    const shouldCharge = creatorSettings.paidMessagesEnabled || isPaidBoostActive;
    const creditsToSend = shouldCharge ? Math.max(creatorSettings.messagePriceCredits || 0, paidBoostAmount) : 0;

    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUser.id,
          creatorId: targetCreatorId,
          body: inputMsg.trim(),
          mediaUrl: attachedMediaUrl,
          attachedCredits: creditsToSend,
          isPaidMessage: shouldCharge,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "INSUFFICIENT_CREDITS") {
          setErrorMsg(
            `Insufficient credits! You need ${data.requiredCredits} credits, but only have ${data.availableCredits}.`
          );
        } else {
          setErrorMsg(data.error || "Failed to send message.");
        }
        return;
      }

      // Successful dispatch
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
        setInputMsg("");
        setAttachedMediaUrl(null);
        setIsPaidBoostActive(false);
        if (data.walletDebit) {
          setSuccessToast(
            `⚡ Paid message sent! ${data.walletDebit.creditsDeducted} credits deducted. Priority status granted.`
          );
          setTimeout(() => setSuccessToast(null), 4000);
          refreshWallet();
        }
      }

      loadConversations();
    } catch (err: any) {
      setErrorMsg(err.message || "Network error sending message.");
    } finally {
      setSending(false);
    }
  };

  // Save Creator Configuration
  const handleSaveCreatorSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/messages/settings/${creatorSettings.creatorProfileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creatorSettings),
      });
      if (res.ok) {
        setSuccessToast("Settings saved! Fans will now see your updated messaging pricing.");
        setTimeout(() => setSuccessToast(null), 4000);
        setShowSettingsModal(false);
        loadConversations();
      }
    } catch (err) {
      console.error("Save settings error:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  // Sample media attachments for quick simulation
  const SAMPLE_ATTACHMENTS = [
    {
      title: "Backstage Photo 📸",
      url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80",
    },
    {
      title: "VIP Setlist 🎵",
      url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
    },
    {
      title: "Neon Studio Shot ✨",
      url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
    },
  ];

  // Filtered conversation list by search query
  const filteredConversations = conversations.filter((c) => {
    const nameMatch = isCreatorMode
      ? c.fanDisplayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.fanUsername.toLowerCase().includes(searchQuery.toLowerCase())
      : c.creatorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.creatorUsername.toLowerCase().includes(searchQuery.toLowerCase());
    const msgMatch = c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || msgMatch;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Top Header & Role Switcher Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/20">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Direct Messaging & VIP Inboxes
              </h1>
              <p className="text-xs text-zinc-400">
                Authoritative paid messages, instant real-time delivery & attention prioritization
              </p>
            </div>
          </div>
        </div>

        {/* Persona / Quick Switcher Bar */}
        <div className="flex items-center gap-2 rounded-2xl bg-zinc-900/90 p-1.5 border border-zinc-800">
          <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            View As:
          </span>
          <button
            onClick={() =>
              switchUser({
                id: "fan_alex",
                username: "alex_patron",
                displayName: "Alex Patron 💎",
                role: "FAN",
                kycStatus: "AGE_VERIFIED",
                avatarUrl:
                  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
                walletBalance: currentUser.walletBalance,
              })
            }
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              !isCreatorMode
                ? "bg-pink-600 text-white shadow-md shadow-pink-600/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Gem className="h-3.5 w-3.5 text-amber-300" />
            <span>Fan (Alex Patron)</span>
          </button>

          <button
            onClick={() =>
              switchUser({
                id: "creator_maya",
                username: "mayavelvet",
                displayName: "Maya Velvet ✨",
                role: "CREATOR",
                kycStatus: "COMPLIANCE_2257_APPROVED",
                avatarUrl:
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
                walletBalance: 4520,
              })
            }
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              isCreatorMode
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Crown className="h-3.5 w-3.5 text-pink-300" />
            <span>Creator (Maya Velvet)</span>
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-950/80 p-3.5 text-xs text-emerald-200 shadow-xl backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Messaging Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0 h-[78vh] rounded-3xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: CONVERSATION LIST & CREATOR ATTENTION PRIORITIZATION         */}
        {/* ========================================================================= */}
        <div className="md:col-span-5 lg:col-span-4 border-r border-zinc-800/80 flex flex-col bg-zinc-950">
          {/* Header with Search & Creator Configure Button */}
          <div className="p-3.5 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-white">
                {isCreatorMode ? "Creator Attention Inbox" : "Conversations"}
              </h2>
              <span className="flex h-5 items-center justify-center rounded-full bg-zinc-800 px-2 text-[10px] font-bold text-zinc-300">
                {filteredConversations.length}
              </span>
            </div>

            {/* Creator Configure Free/Paid Settings Action */}
            {isCreatorMode && (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-1 rounded-xl bg-purple-600/20 px-2.5 py-1 text-[11px] font-bold text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 transition-all"
                title="Configure Free vs Paid messaging rules"
              >
                <Sliders className="h-3 w-3" />
                <span>Pricing Rules</span>
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="p-2 border-b border-zinc-800/60 bg-zinc-950">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-xl bg-zinc-900/90 px-3 py-1.5 text-xs text-white placeholder-zinc-500 border border-zinc-800 focus:border-pink-500 focus:outline-none"
            />
          </div>

          {/* CREATOR ATTENTION PRIORITIZATION FILTER PILLS */}
          {isCreatorMode && (
            <div className="flex items-center gap-1 overflow-x-auto p-2 border-b border-zinc-800/60 bg-zinc-900/30 no-scrollbar">
              <button
                onClick={() => setActiveFilter("all")}
                className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all ${
                  activeFilter === "all"
                    ? "bg-zinc-200 text-black font-extrabold"
                    : "bg-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilter("unread")}
                className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all ${
                  activeFilter === "unread"
                    ? "bg-pink-600 text-white"
                    : "bg-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                <Flame className="h-3 w-3 text-pink-400" />
                Unread
              </button>
              <button
                onClick={() => setActiveFilter("paid")}
                className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all ${
                  activeFilter === "paid"
                    ? "bg-amber-500 text-black font-extrabold"
                    : "bg-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                <Coins className="h-3 w-3 text-amber-400" />
                Paid 💰
              </button>
              <button
                onClick={() => setActiveFilter("priority")}
                className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all ${
                  activeFilter === "priority"
                    ? "bg-purple-600 text-white"
                    : "bg-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                <Star className="h-3 w-3 text-purple-300" />
                Priority ⭐
              </button>
              <button
                onClick={() => setActiveFilter("subscribers")}
                className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all ${
                  activeFilter === "subscribers"
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                <Crown className="h-3 w-3 text-emerald-300" />
                Subscribers 👑
              </button>
              <button
                onClick={() => setActiveFilter("vip")}
                className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all ${
                  activeFilter === "vip"
                    ? "bg-cyan-600 text-white"
                    : "bg-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                <Gem className="h-3 w-3 text-cyan-300" />
                VIP 💎
              </button>
            </div>
          )}

          {/* Conversation List Items */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-pink-500" />
                <span className="text-xs">Loading conversations...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-12 text-center text-zinc-500">
                <p className="text-xs font-semibold">No conversations found</p>
                <p className="text-[10px] text-zinc-600 mt-1">Try changing your filter above</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConv?.id === conv.id;
                const displayName = isCreatorMode ? conv.fanDisplayName : conv.creatorName;
                const avatar = isCreatorMode ? conv.fanAvatar : conv.creatorAvatar;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-all ${
                      isSelected
                        ? "bg-zinc-900 border border-pink-500/40 text-white shadow-lg"
                        : "text-zinc-300 hover:bg-zinc-900/60 border border-transparent"
                    }`}
                  >
                    {/* Avatar with Live / VIP indicators */}
                    <div className="relative shrink-0">
                      <img
                        src={avatar}
                        alt={displayName}
                        className="h-11 w-11 rounded-2xl object-cover ring-1 ring-zinc-700"
                      />
                      {/* Creator Live Pulse */}
                      {!isCreatorMode && conv.isCreatorLive && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-red-500 ring-2 ring-zinc-950"></span>
                        </span>
                      )}

                      {/* VIP / Sub Badge indicator */}
                      {conv.isVip && (
                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[8px] font-black text-black">
                          💎
                        </span>
                      )}
                    </div>

                    {/* Meta info & badges */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="truncate text-xs font-black text-white">
                            {displayName}
                          </span>
                          {!isCreatorMode && (
                            <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-400" />
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500 shrink-0">
                          {new Date(conv.lastActivityAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Badges for Attention Prioritization */}
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {conv.hasPaidMessages && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-black text-amber-300 border border-amber-500/30">
                            💰 {conv.latestPaidAmount > 0 ? `${conv.latestPaidAmount}c` : "Paid"}
                          </span>
                        )}
                        {conv.isPriority && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-purple-500/20 px-1.5 py-0.2 text-[9px] font-black text-purple-300 border border-purple-500/30">
                            ⭐ Priority
                          </span>
                        )}
                        {conv.isSubscriber && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-black text-emerald-300 border border-emerald-500/30">
                            👑 Sub
                          </span>
                        )}
                        {conv.relationshipTier && conv.relationshipTier !== "STRANGER" && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-zinc-800 px-1.5 py-0.2 text-[9px] font-bold text-zinc-400">
                            Lvl {conv.relationshipLevel} {conv.relationshipTier.replace("_", " ")}
                          </span>
                        )}
                      </div>

                      <p className="truncate text-[11px] text-zinc-400 mt-1">{conv.lastMessage}</p>
                    </div>

                    {/* Unread Counter Badge */}
                    {conv.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-600 px-1.5 text-[10px] font-black text-white shadow-md shadow-pink-600/30 shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: CHAT THREAD WITH EXTREMELY SIMPLE INTERFACE                 */}
        {/* ========================================================================= */}
        <div className="md:col-span-7 lg:col-span-8 flex flex-col bg-zinc-950/80">
          {selectedConv ? (
            <>
              {/* Thread Header */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-3.5 bg-zinc-900/50 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={isCreatorMode ? selectedConv.fanAvatar : selectedConv.creatorAvatar}
                      alt={isCreatorMode ? selectedConv.fanDisplayName : selectedConv.creatorName}
                      className="h-10 w-10 rounded-2xl object-cover ring-1 ring-pink-500/40"
                    />
                    {!isCreatorMode && selectedConv.isCreatorLive && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 rounded-full bg-red-500 ring-2 ring-zinc-950 animate-pulse" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-extrabold text-white">
                        {isCreatorMode ? selectedConv.fanDisplayName : selectedConv.creatorName}
                      </h3>
                      {!isCreatorMode && (
                        <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="h-2.5 w-2.5" />
                          Verified
                        </span>
                      )}
                    </div>

                    {/* Online / Live status */}
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                      {!isCreatorMode ? (
                        selectedConv.isCreatorLive ? (
                          <span className="flex items-center gap-1 font-bold text-red-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                            Live Streaming Now
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Online
                          </span>
                        )
                      ) : (
                        <span>
                          {selectedConv.relationshipTier} • Lvl {selectedConv.relationshipLevel} (
                          {selectedConv.totalCreditsSpent} tokens spent)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Creator Live Action Button */}
                {!isCreatorMode && selectedConv.isCreatorLive && (
                  <Link
                    href={`/live/${selectedConv.creatorProfileId || selectedConv.creatorUsername}`}
                    className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-lg shadow-red-600/30 hover:bg-red-500 transition-all animate-pulse"
                  >
                    <Radio className="h-3.5 w-3.5" />
                    <span>Watch Live Room</span>
                  </Link>
                )}
              </div>

              {/* Creator Welcome Banner / Paid Message Notice */}
              {creatorSettings.paidMessagesEnabled && !isCreatorMode && (
                <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-pink-950/40 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400 shrink-0" />
                    <span className="text-[11px]">
                      {creatorSettings.customWelcomeMessage ||
                        `Paid messages enabled (${creatorSettings.messagePriceCredits} credits). Get priority replies!`}
                    </span>
                  </div>
                  <span className="rounded-lg bg-amber-500/20 px-2 py-0.5 text-[10px] font-black text-amber-300 border border-amber-500/30">
                    ⚡ {creatorSettings.messagePriceCredits} Credits / msg
                  </span>
                </div>
              )}

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 text-xs">
                {messages.length === 0 ? (
                  <div className="py-20 text-center text-zinc-500">
                    <MessageSquare className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
                    <p className="font-bold text-white">No messages yet</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Send a direct message or paid priority message to start the conversation!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSelf = msg.senderId === currentUser.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                      >
                        {/* Paid message highlight tag if applicable */}
                        {msg.isPaidMessage && (
                          <div
                            className={`mb-1 flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-black tracking-wide ${
                              msg.isPriority
                                ? "bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm"
                                : "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                            }`}
                          >
                            <Coins className="h-3 w-3 text-amber-400" />
                            <span>
                              PAID MESSAGE • {msg.paidPriceCredits} CREDITS
                              {msg.isPriority && " • ⭐ PRIORITY"}
                            </span>
                          </div>
                        )}

                        {/* Bubble Container */}
                        <div
                          className={`max-w-md rounded-2xl p-3.5 leading-relaxed shadow-md transition-all ${
                            isSelf
                              ? msg.isPaidMessage
                                ? "bg-gradient-to-r from-amber-600 via-pink-600 to-rose-600 text-white border border-amber-400/40 shadow-amber-500/20"
                                : "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-pink-600/20"
                              : msg.isPaidMessage
                              ? "bg-zinc-900 border-2 border-amber-500/60 text-zinc-100 shadow-amber-500/10"
                              : "bg-zinc-900 border border-zinc-800 text-zinc-200"
                          }`}
                        >
                          {/* Attached Media */}
                          {msg.mediaUrl && (
                            <div className="mb-2 overflow-hidden rounded-xl border border-zinc-700/50">
                              <img
                                src={msg.mediaUrl}
                                alt="Attachment"
                                className="max-h-48 w-full object-cover"
                              />
                            </div>
                          )}

                          <p className="whitespace-pre-wrap">{msg.body}</p>
                        </div>

                        {/* Message Timestamp & Read Status */}
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-1 px-1">
                          <span>{msg.createdAt}</span>
                          {isSelf && (
                            <span className="text-pink-400">
                              {msg.isRead ? "• Read ✓✓" : "• Sent ✓"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Error feedback if any */}
              {errorMsg && (
                <div className="mx-4 mb-2 flex items-center justify-between rounded-xl border border-red-500/30 bg-red-950/80 px-3 py-2 text-xs text-red-200">
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4 text-red-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                  <Link
                    href="/wallet"
                    className="flex items-center gap-1 rounded-lg bg-pink-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-pink-500"
                  >
                    Top Up <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}

              {/* Attached media preview bar */}
              {attachedMediaUrl && (
                <div className="mx-4 mb-2 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-pink-400" />
                    <span className="text-[11px] font-semibold">Image attachment ready</span>
                  </div>
                  <button
                    onClick={() => setAttachedMediaUrl(null)}
                    className="text-zinc-500 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* ========================================================================= */}
              {/* MESSAGE INPUT & PAID-MESSAGE OPTIONS                                      */}
              {/* ========================================================================= */}
              <div className="border-t border-zinc-800/80 p-3.5 bg-zinc-900/60">
                {/* Paid Message Boost Selector */}
                {!isCreatorMode && (
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPaidBoostActive(!isPaidBoostActive)}
                        className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all border ${
                          creatorSettings.paidMessagesEnabled || isPaidBoostActive
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"
                        }`}
                      >
                        <Zap className="h-3 w-3 text-amber-400" />
                        <span>
                          {creatorSettings.paidMessagesEnabled
                            ? "Paid Message (Mandatory)"
                            : "Add Paid Priority Boost"}
                        </span>
                      </button>

                      {/* Boost Amount Selector */}
                      {(creatorSettings.paidMessagesEnabled || isPaidBoostActive) && (
                        <div className="flex items-center gap-1">
                          {[50, 100, 250, 500].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setPaidBoostAmount(amt)}
                              className={`rounded-lg px-2 py-0.5 text-[10px] font-black transition-all ${
                                paidBoostAmount === amt
                                  ? "bg-gradient-to-r from-amber-500 to-pink-500 text-black shadow-sm"
                                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                              }`}
                            >
                              +{amt}c
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Live Fan Balance Preview */}
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <Coins className="h-3.5 w-3.5 text-amber-400" />
                      <span>Balance:</span>
                      <strong className="text-white font-mono">{currentUser.walletBalance}c</strong>
                    </div>
                  </div>
                )}

                {/* Input Form */}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  {/* Attachment Button */}
                  <button
                    type="button"
                    onClick={() => setShowAttachmentPicker(!showAttachmentPicker)}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-pink-400 hover:border-pink-500/40 transition-all"
                    title="Add attachment"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>

                  {/* Text Input */}
                  <input
                    type="text"
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    placeholder={
                      creatorSettings.paidMessagesEnabled && !isCreatorMode
                        ? `Send a paid message (${paidBoostAmount} credits)...`
                        : `Message ${
                            isCreatorMode ? selectedConv.fanDisplayName : selectedConv.creatorName
                          }...`
                    }
                    className="flex-1 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-white placeholder-zinc-500 border border-zinc-800 focus:border-pink-500 focus:outline-none"
                  />

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={sending || (!inputMsg.trim() && !attachedMediaUrl)}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 px-4 text-xs font-bold text-white shadow-md shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500 disabled:opacity-40 transition-all"
                  >
                    {sending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>Send</span>
                        <Send className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </form>

                {/* Quick Attachment Dropdown / Picker */}
                {showAttachmentPicker && (
                  <div className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 shadow-xl animate-fade-in">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                      Attach Media / Backstage Content
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {SAMPLE_ATTACHMENTS.map((att, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setAttachedMediaUrl(att.url);
                            setShowAttachmentPicker(false);
                          }}
                          className="flex items-center gap-2 rounded-xl bg-zinc-950 p-2 text-left border border-zinc-800 hover:border-pink-500/50 transition-all"
                        >
                          <img
                            src={att.url}
                            alt={att.title}
                            className="h-8 w-8 rounded-lg object-cover"
                          />
                          <span className="text-[10px] font-bold text-white truncate">
                            {att.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 py-24">
              <MessageSquare className="h-12 w-12 text-zinc-700 mb-3" />
              <p className="text-sm font-bold text-white">Select a conversation</p>
              <p className="text-xs text-zinc-500 mt-1">
                Choose an inbox from the left to start chatting
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CREATOR PRICING & INCOMING RULES MODAL                                     */}
      {/* ========================================================================= */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-purple-400" />
                <h3 className="text-base font-black text-white">
                  Creator Direct Message Settings
                </h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="rounded-xl p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Paid Messages Toggle */}
              <div className="flex items-center justify-between rounded-2xl bg-zinc-900 p-4 border border-zinc-800">
                <div>
                  <h4 className="font-bold text-white">Require Paid Messages</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    When enabled, fans must pay credits to send direct messages to your inbox.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={creatorSettings.paidMessagesEnabled}
                  onChange={(e) =>
                    setCreatorSettings({
                      ...creatorSettings,
                      paidMessagesEnabled: e.target.checked,
                    })
                  }
                  className="h-5 w-5 rounded accent-pink-600 cursor-pointer"
                />
              </div>

              {/* Price Per Message */}
              {creatorSettings.paidMessagesEnabled && (
                <div className="rounded-2xl bg-zinc-900 p-4 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-white">Message Price (Credits)</label>
                    <span className="font-mono text-sm font-black text-amber-400">
                      {creatorSettings.messagePriceCredits} Credits
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="10"
                    value={creatorSettings.messagePriceCredits}
                    onChange={(e) =>
                      setCreatorSettings({
                        ...creatorSettings,
                        messagePriceCredits: Number(e.target.value),
                      })
                    }
                    className="w-full accent-pink-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>10 credits</span>
                    <span>250 credits</span>
                    <span>500 credits</span>
                  </div>
                </div>
              )}

              {/* Free Subscriber Bypass Toggle */}
              <div className="flex items-center justify-between rounded-2xl bg-zinc-900 p-4 border border-zinc-800">
                <div>
                  <h4 className="font-bold text-white">Allow Active Subscribers for Free</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Fans with an active monthly subscription can message without paying per message.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={creatorSettings.allowFreeSubscribers}
                  onChange={(e) =>
                    setCreatorSettings({
                      ...creatorSettings,
                      allowFreeSubscribers: e.target.checked,
                    })
                  }
                  className="h-5 w-5 rounded accent-pink-600 cursor-pointer"
                />
              </div>

              {/* Free VIP Bypass Toggle */}
              <div className="flex items-center justify-between rounded-2xl bg-zinc-900 p-4 border border-zinc-800">
                <div>
                  <h4 className="font-bold text-white">Allow VIP Devotees for Free</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Fans with VIP Devotee, Soulmate or Royal Patron tier bypass message charges.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={creatorSettings.allowFreeVip}
                  onChange={(e) =>
                    setCreatorSettings({
                      ...creatorSettings,
                      allowFreeVip: e.target.checked,
                    })
                  }
                  className="h-5 w-5 rounded accent-pink-600 cursor-pointer"
                />
              </div>

              {/* Custom Welcome Message */}
              <div className="rounded-2xl bg-zinc-900 p-4 border border-zinc-800 space-y-1.5">
                <label className="font-bold text-white">Welcome / Pricing Notice</label>
                <input
                  type="text"
                  value={creatorSettings.customWelcomeMessage || ""}
                  onChange={(e) =>
                    setCreatorSettings({
                      ...creatorSettings,
                      customWelcomeMessage: e.target.value,
                    })
                  }
                  placeholder="e.g. Paid messages get priority instant replies 💕"
                  className="w-full rounded-xl bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 border border-zinc-700 focus:border-pink-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-zinc-800 pt-4">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCreatorSettings}
                disabled={savingSettings}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-pink-600/30 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50"
              >
                {savingSettings ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Save Pricing Rules</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
