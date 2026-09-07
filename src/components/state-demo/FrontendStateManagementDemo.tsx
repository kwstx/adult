"use client";

import React, { useState } from "react";
import {
  ServerStateProvider,
  LiveRoomUIProvider,
  useLiveRoomUI,
  useWalletBalance,
  useCreatorProfile,
  useSubscriptionState,
  useLiveStatus,
  useInteractionQueueState,
  useLiveMessagesState,
  useXpProgressionState,
  useRelationshipLevelState,
  serverCache,
  useServerState,
} from "@/hooks/state";
import {
  Volume2,
  VolumeX,
  Gift,
  MessageCircle,
  Coins,
  ShieldCheck,
  Zap,
  RefreshCw,
  Sparkles,
  Layers,
  Database,
  Radio,
  Send,
  CheckCircle2,
  AlertTriangle,
  Flame,
  UserCheck,
  Check,
  X,
  HelpCircle,
} from "lucide-react";

export function FrontendStateManagementDemo() {
  return (
    <ServerStateProvider>
      <LiveRoomUIProvider>
        <DemoContent />
      </LiveRoomUIProvider>
    </ServerStateProvider>
  );
}

function DemoContent() {
  const currentFanId = "usr_fan_alex";
  const currentCreatorId = "mayavelvet";
  const { invalidate } = useServerState();

  // -------------------------------------------------------------
  // 1. LOCAL UI STATE (Pure React Component Memory)
  // -------------------------------------------------------------
  const {
    isGiftDrawerOpen,
    toggleGiftDrawer,
    isChatExpanded,
    toggleChatExpanded,
    selectedInteraction,
    setSelectedInteraction,
    isMuted,
    toggleMute,
    volume,
    setVolume,
    activeModal,
    openModal,
    closeModal,
    isModalOpen,
  } = useLiveRoomUI();

  // -------------------------------------------------------------
  // 2. SERVER STATE (Authoritative & Synchronized with Backend)
  // -------------------------------------------------------------
  const walletState = useWalletBalance(currentFanId);
  const creatorState = useCreatorProfile(currentCreatorId, currentFanId);
  const subscriptionState = useSubscriptionState(currentFanId, currentCreatorId);
  const liveStatusState = useLiveStatus(currentCreatorId);
  const queueState = useInteractionQueueState(currentCreatorId);
  const messagesState = useLiveMessagesState(currentCreatorId);
  const xpState = useXpProgressionState(currentFanId, currentCreatorId);
  const relationshipState = useRelationshipLevelState(currentFanId, currentCreatorId);

  // Local message input form state (UI state)
  const [chatInput, setChatInput] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Simulated SSE Event Dispatches to demonstrate automated server state invalidation
  const simulateIncomingGift = () => {
    // Dispatch simulated GIFT_SENT to Server State Cache
    serverCache.mutate<any>(["live-status", currentCreatorId], (current) => {
      if (!current) return current;
      const prevProgress = current.goal?.progress || 2500;
      return {
        ...current,
        goal: {
          title: "Neon Dance Party Milestone 💃",
          target: 3000,
          progress: prevProgress + 500,
          percentage: Math.min(100, Math.round(((prevProgress + 500) / 3000) * 100)),
          isCompleted: prevProgress + 500 >= 3000,
        },
      };
    });

    // Award XP to viewer
    xpState.awardXpOptimistic(500);

    // Invalidate wallet & relationship
    walletState.invalidate();
    relationshipState.invalidate();

    showNotice("⚡ SSE Event received: [GIFT_SENT] -> Goal updated, XP awarded, Wallet revalidated!");
  };

  const simulateNewQueueItem = () => {
    const newItem = {
      id: `iq_${Date.now()}`,
      fanId: "fan_sarah",
      fanName: "Sarah Diamond 👑",
      credits: 250,
      actionTitle: "Spin the Wheel of Fortune 🎡",
      actionType: "Visual",
      customMessage: "Let's win VIP prizes! ✨",
      durationSeconds: 15,
      position: queueState.queue.length + 1,
      status: "PENDING" as const,
      purchaseTime: new Date().toISOString(),
    };

    serverCache.mutate<any[]>(["interaction-queue", currentCreatorId], (current) => [
      ...(current || []),
      newItem,
    ]);

    showNotice("⚡ SSE Event received: [INTERACTION_PURCHASED] -> Interaction queue updated!");
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput("");

    try {
      await messagesState.sendMessage({
        senderId: currentFanId,
        senderDisplayName: "Alex Patron 💎",
        text,
        fanLevel: xpState.fanLevel,
        badge: relationshipState.fanBadge,
      });
      showNotice("💬 Optimistic message dispatched to chat server cache!");
    } catch {
      showNotice("❌ Message failed to send, optimistic entry rolled back.");
    }
  };

  const handleOptimisticTip = async (amount: number) => {
    try {
      await walletState.optimisticSpend(amount, async () => {
        // Simulate backend call
        await new Promise((resolve) => setTimeout(resolve, 600));
        xpState.awardXpOptimistic(amount);
        return true;
      });
      showNotice(`💎 Successfully spent ${amount} tokens with optimistic deduction!`);
    } catch (err: any) {
      showNotice(`❌ Spending failed: ${err.message}`);
    }
  };

  const stats = serverCache.getStats();

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-white p-4 md:p-8 font-sans">
      {/* Header Banner */}
      <header className="max-w-7xl mx-auto mb-8 border-b border-zinc-800 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-600 to-amber-500 shadow-lg shadow-pink-500/20">
                <Layers className="h-4 w-4 text-white" />
              </span>
              <h1 className="text-2xl font-black tracking-tight text-white">
                Frontend State Management Architecture
              </h1>
            </div>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Strict separation between <strong className="text-pink-400">Local UI State</strong> (ephemeral React component memory) and <strong className="text-cyan-400">Server State</strong> (authoritative backend synchronization, cache invalidation, and SSE reconciliation).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => invalidate(() => true)}
              className="flex items-center gap-2 rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-bold text-zinc-200 border border-zinc-800 hover:border-zinc-700 hover:text-white transition-all shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
              <span>Invalidate All Cache</span>
            </button>
          </div>
        </div>

        {/* Global Action Toast */}
        {actionNotice && (
          <div className="mt-4 rounded-xl bg-zinc-900/90 border border-pink-500/40 px-4 py-2.5 text-xs font-bold text-pink-300 flex items-center gap-2 shadow-lg animate-fade-in">
            <Sparkles className="h-4 w-4 text-pink-400 animate-pulse" />
            <span>{actionNotice}</span>
          </div>
        )}
      </header>

      {/* Main Grid: Local UI State (Left) vs Server State (Right) */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ================================================================= */}
        {/* LEFT COLUMN: LOCAL UI STATE (Pure React Component Memory)         */}
        {/* ================================================================= */}
        <section className="lg:col-span-4 space-y-6">
          <div className="rounded-3xl border border-pink-500/30 bg-gradient-to-b from-pink-950/20 to-zinc-900/40 p-6 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-pink-500/20 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-600/30 text-pink-400 border border-pink-500/40">
                  <Zap className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-black text-pink-300">Local UI State</h2>
                  <p className="text-[11px] text-zinc-400">Pure React Hooks (`useState`)</p>
                </div>
              </div>
              <span className="rounded-full bg-pink-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-pink-300 border border-pink-500/30">
                0 Network Calls
              </span>
            </div>

            <div className="space-y-4">
              {/* 1. Gift Drawer Open */}
              <div className="rounded-2xl bg-zinc-950/60 p-3.5 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-zinc-200">1. Gift Drawer Open?</div>
                  <div className="text-[11px] text-zinc-400">
                    State: <strong className={isGiftDrawerOpen ? "text-emerald-400" : "text-zinc-500"}>{isGiftDrawerOpen ? "OPEN (true)" : "CLOSED (false)"}</strong>
                  </div>
                </div>
                <button
                  onClick={toggleGiftDrawer}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-md ${
                    isGiftDrawerOpen
                      ? "bg-pink-600 text-white shadow-pink-600/30"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {isGiftDrawerOpen ? "Close Drawer" : "Open Drawer"}
                </button>
              </div>

              {/* 2. Chat Expanded */}
              <div className="rounded-2xl bg-zinc-950/60 p-3.5 border border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-zinc-200">2. Chat Expanded?</div>
                  <div className="text-[11px] text-zinc-400">
                    State: <strong className={isChatExpanded ? "text-emerald-400" : "text-zinc-500"}>{isChatExpanded ? "EXPANDED" : "COLLAPSED"}</strong>
                  </div>
                </div>
                <button
                  onClick={toggleChatExpanded}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    isChatExpanded
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  Toggle
                </button>
              </div>

              {/* 3. Selected Interaction */}
              <div className="rounded-2xl bg-zinc-950/60 p-3.5 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-zinc-200">3. Selected Interaction?</div>
                  <span className="text-[11px] text-pink-400 font-bold">
                    {selectedInteraction ? selectedInteraction.name : "None"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {[
                    { id: "i_dance", name: "Dance 💃", price: 100 },
                    { id: "i_spin", name: "Wheel 🎡", price: 250 },
                    { id: "i_toast", name: "Toast 🍾", price: 500 },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() =>
                        setSelectedInteraction(
                          selectedInteraction?.id === item.id ? null : item
                        )
                      }
                      className={`rounded-xl py-1.5 px-2 text-[11px] font-bold border transition-all truncate ${
                        selectedInteraction?.id === item.id
                          ? "bg-pink-600/30 border-pink-500 text-pink-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Video Muted */}
              <div className="rounded-2xl bg-zinc-950/60 p-3.5 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-zinc-200">4. Video Muted?</div>
                    <div className="text-[11px] text-zinc-400">
                      State: <strong className={isMuted ? "text-rose-400" : "text-emerald-400"}>{isMuted ? "MUTED (true)" : "ACTIVE (false)"}</strong>
                    </div>
                  </div>
                  <button
                    onClick={toggleMute}
                    className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all ${
                      isMuted
                        ? "bg-rose-950/40 border-rose-500/40 text-rose-400"
                        : "bg-emerald-950/40 border-emerald-500/40 text-emerald-400"
                    }`}
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-zinc-500">Vol</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full accent-pink-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
              </div>

              {/* 5. Modal Open */}
              <div className="rounded-2xl bg-zinc-950/60 p-3.5 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-zinc-200">5. Modal Open?</div>
                  <span className="text-[11px] font-bold text-amber-400">
                    {activeModal ? activeModal.toUpperCase() : "NONE"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {(["wallet", "report", "claimSeat"] as const).map((modal) => (
                    <button
                      key={modal}
                      onClick={() =>
                        isModalOpen(modal) ? closeModal() : openModal(modal)
                      }
                      className={`rounded-xl py-1.5 px-2 text-[10px] font-bold border transition-all capitalize ${
                        isModalOpen(modal)
                          ? "bg-amber-500/20 border-amber-500 text-amber-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {modal}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Diagnostic Box */}
            <div className="mt-5 rounded-2xl bg-zinc-950/80 p-3 border border-pink-500/20 text-[11px] text-zinc-400 space-y-1">
              <div className="flex justify-between">
                <span>Persistence:</span>
                <span className="text-zinc-200 font-mono">React Component Lifetime</span>
              </div>
              <div className="flex justify-between">
                <span>Authority:</span>
                <span className="text-zinc-200 font-mono">Client Presentation Only</span>
              </div>
              <div className="flex justify-between">
                <span>Database Writes:</span>
                <span className="text-emerald-400 font-mono font-bold">0 Writes</span>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* RIGHT COLUMN: SERVER STATE (Authoritative & Synchronized)          */}
        {/* ================================================================= */}
        <section className="lg:col-span-8 space-y-6">
          <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-zinc-900/40 p-6 shadow-xl backdrop-blur-xl">
            {/* Header with SSE Simulator */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-cyan-500/20 pb-4 mb-5 gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-600/30 text-cyan-400 border border-cyan-500/40">
                  <Database className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-black text-cyan-300">Server State</h2>
                  <p className="text-[11px] text-zinc-400">
                    Synchronized, Cached (SWR), Event-Invalidated
                  </p>
                </div>
              </div>

              {/* SSE Simulation Trigger Pill */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={simulateIncomingGift}
                  className="rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-pink-600/30 hover:scale-105 active:scale-95 transition-all"
                  title="Simulate incoming gift event from realtime SSE"
                >
                  ⚡ Simulate Gift SSE
                </button>
                <button
                  onClick={simulateNewQueueItem}
                  className="rounded-xl bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-200 border border-zinc-700 transition-all"
                >
                  + Push Queue Item
                </button>
              </div>
            </div>

            {/* 8 Server State Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Wallet Balance */}
              <div className="rounded-2xl bg-zinc-950/70 p-4 border border-zinc-800/80 space-y-2 relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                    <Coins className="h-3.5 w-3.5 text-amber-400" />
                    1. Wallet Balance
                  </span>
                  <button
                    onClick={() => walletState.invalidate()}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`h-2.5 w-2.5 ${walletState.isFetching ? "animate-spin" : ""}`} />
                    Invalidate
                  </button>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-xl font-black text-amber-300 font-mono">
                    {walletState.balance.toLocaleString()} <span className="text-xs font-medium text-zinc-400">tokens</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Authoritative
                  </span>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleOptimisticTip(100)}
                    className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 py-1 text-[11px] font-bold text-amber-300 transition-all"
                  >
                    Optimistic Spend (100)
                  </button>
                </div>
              </div>

              {/* 2. Creator Profile */}
              <div className="rounded-2xl bg-zinc-950/70 p-4 border border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                    <Flame className="h-3.5 w-3.5 text-pink-400" />
                    2. Creator Profile
                  </span>
                  <button
                    onClick={() => creatorState.invalidate()}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`h-2.5 w-2.5 ${creatorState.isFetching ? "animate-spin" : ""}`} />
                    Invalidate
                  </button>
                </div>
                <div className="text-sm font-bold text-white truncate">
                  {creatorState.creator?.displayName || "Maya Velvet ✨"}
                </div>
                <div className="text-[11px] text-zinc-400 flex items-center gap-3">
                  <span>Followers: <strong className="text-zinc-200">{creatorState.creator?.followerCount || 1240}</strong></span>
                  <span>Menu Items: <strong className="text-zinc-200">{creatorState.creator?.interactionMenu?.length || 6}</strong></span>
                </div>
              </div>

              {/* 3. Subscription */}
              <div className="rounded-2xl bg-zinc-950/70 p-4 border border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                    <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
                    3. Subscription
                  </span>
                  <button
                    onClick={() => subscriptionState.invalidate()}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`h-2.5 w-2.5 ${subscriptionState.isFetching ? "animate-spin" : ""}`} />
                    Invalidate
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-purple-300">
                    {subscriptionState.subscription?.tier || "VIP Diamond Pass"}
                  </span>
                  <span className="text-[10px] font-bold text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-500/30">
                    {subscriptionState.subscription?.status || "ACTIVE"}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  VIP Entitlement: <strong className="text-emerald-400">Granted (Server Verified)</strong>
                </div>
              </div>

              {/* 4. Live Status */}
              <div className="rounded-2xl bg-zinc-950/70 p-4 border border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                    <Radio className="h-3.5 w-3.5 text-rose-500" />
                    4. Live Status
                  </span>
                  <button
                    onClick={() => liveStatusState.invalidate()}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`h-2.5 w-2.5 ${liveStatusState.isFetching ? "animate-spin" : ""}`} />
                    Invalidate
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-xs font-black text-rose-400">BROADCASTING</span>
                  </div>
                  <span className="text-xs font-mono text-zinc-300">
                    {liveStatusState.viewerCount || 384} viewers
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  Goal: <strong className="text-amber-300">🎯 {liveStatusState.goal?.title || "Milestone"} [{liveStatusState.goal?.percentage || 85}%]</strong>
                </div>
              </div>

              {/* 5. Interaction Queue */}
              <div className="rounded-2xl bg-zinc-950/70 p-4 border border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    5. Interaction Queue
                  </span>
                  <button
                    onClick={() => queueState.invalidate()}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`h-2.5 w-2.5 ${queueState.isFetching ? "animate-spin" : ""}`} />
                    Invalidate
                  </button>
                </div>
                <div className="text-xs text-zinc-300">
                  Pending Requests: <strong className="text-amber-300 font-mono">{queueState.pendingCount}</strong>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                  {queueState.queue.slice(0, 2).map((item) => (
                    <div key={item.id} className="text-[10px] bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800 flex justify-between items-center">
                      <span className="truncate max-w-[130px]">{item.actionTitle}</span>
                      <span className="text-amber-400 font-bold">{item.credits}t [{item.status}]</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Messages */}
              <div className="rounded-2xl bg-zinc-950/70 p-4 border border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                    <MessageCircle className="h-3.5 w-3.5 text-indigo-400" />
                    6. Messages
                  </span>
                  <button
                    onClick={() => messagesState.invalidate()}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`h-2.5 w-2.5 ${messagesState.isFetching ? "animate-spin" : ""}`} />
                    Invalidate
                  </button>
                </div>
                <form onSubmit={handleSendMessage} className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Send optimistic message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button type="submit" className="rounded-xl bg-indigo-600 px-2.5 py-1 text-xs text-white font-bold hover:bg-indigo-500">
                    <Send className="h-3 w-3" />
                  </button>
                </form>
                <div className="text-[10px] text-zinc-400 truncate">
                  Latest: {messagesState.messages.slice(-1)[0]?.text || "No recent messages"}
                </div>
              </div>

              {/* 7. XP Progression */}
              <div className="rounded-2xl bg-zinc-950/70 p-4 border border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    7. XP Progression
                  </span>
                  <button
                    onClick={() => xpState.invalidate()}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`h-2.5 w-2.5 ${xpState.isFetching ? "animate-spin" : ""}`} />
                    Invalidate
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-300">Level {xpState.fanLevel} ({xpState.tierName})</span>
                  <span className="font-mono text-zinc-400">{xpState.xp} XP</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-pink-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, xpState.progressPercent || 65)}%` }}
                  />
                </div>
              </div>

              {/* 8. Relationship Level */}
              <div className="rounded-2xl bg-zinc-950/70 p-4 border border-zinc-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                    8. Relationship Level
                  </span>
                  <button
                    onClick={() => relationshipState.invalidate()}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`h-2.5 w-2.5 ${relationshipState.isFetching ? "animate-spin" : ""}`} />
                    Invalidate
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-300">{relationshipState.fanBadge}</span>
                  <span className="text-[10px] text-zinc-400">🔥 {relationshipState.streakDays || 19} Day Streak</span>
                </div>
                <div className="text-[11px] text-zinc-400">
                  Total Contributed: <strong className="text-zinc-200">{relationshipState.totalTokensContributed.toLocaleString()} tokens</strong>
                </div>
              </div>
            </div>

            {/* Server State Cache Telemetry Bar */}
            <div className="mt-5 rounded-2xl bg-zinc-950/80 p-3.5 border border-cyan-500/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div>
                <div className="text-zinc-500 text-[10px]">Cached Queries</div>
                <div className="text-cyan-300 font-black font-mono mt-0.5">{stats.totalEntries}</div>
              </div>
              <div>
                <div className="text-zinc-500 text-[10px]">Active Subscribers</div>
                <div className="text-cyan-300 font-black font-mono mt-0.5">{stats.activeSubscribers}</div>
              </div>
              <div>
                <div className="text-zinc-500 text-[10px]">In-Flight Requests</div>
                <div className="text-cyan-300 font-black font-mono mt-0.5">{stats.inflightRequests}</div>
              </div>
              <div>
                <div className="text-zinc-500 text-[10px]">Sync Protocol</div>
                <div className="text-emerald-400 font-bold text-[10px] mt-0.5">SSE + SWR</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
