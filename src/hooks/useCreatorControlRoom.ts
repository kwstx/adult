"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@/lib/user-context";
import type {
  ControlRoomTelemetry,
  ControlRoomChatMessage,
  AudienceMember,
  TopSupporter,
  LiveQueueItem,
  StreamGoal,
  PurchaseLedgerItem,
  MarketplaceItem,
  SurgeMultiplier,
  ModerationRuleConfig,
  IngestCredentials,
  InteractionEligibility,
} from "@/types/control-room";

// Initial seed marketplace items
const INITIAL_MARKETPLACE_ITEMS: MarketplaceItem[] = [
  {
    id: "m_1",
    title: "Mini Freestyle Dance 💃",
    description: "30-second live custom dance performance on stream",
    category: "Request",
    priceTokens: 100,
    basePriceTokens: 100,
    durationSeconds: 30,
    maxQuantityPerStream: 10,
    remainingQuantity: 7,
    eligibility: "ALL",
    isEnabled: true,
    icon: "💃",
  },
  {
    id: "m_2",
    title: "Wheel of Fortune Spin 🎡",
    description: "Spin the live interactive mystery prize wheel",
    category: "Visual",
    priceTokens: 250,
    basePriceTokens: 250,
    durationSeconds: 15,
    maxQuantityPerStream: 20,
    remainingQuantity: 18,
    eligibility: "ALL",
    isEnabled: true,
    icon: "🎡",
  },
  {
    id: "m_3",
    title: "Neon Confetti Popper 🎊",
    description: "Trigger digital room confetti cannon explosion",
    category: "Visual",
    priceTokens: 50,
    basePriceTokens: 50,
    durationSeconds: 10,
    maxQuantityPerStream: null,
    remainingQuantity: null,
    eligibility: "ALL",
    isEnabled: true,
    icon: "🎊",
  },
  {
    id: "m_4",
    title: "Toy Vibration Pulse (Level 5) ⚡",
    description: "Activate Bluetooth Lovense toy for 20 seconds",
    category: "Toy",
    priceTokens: 300,
    basePriceTokens: 300,
    durationSeconds: 20,
    maxQuantityPerStream: 15,
    remainingQuantity: 11,
    eligibility: "SUBSCRIBERS_ONLY",
    isEnabled: true,
    icon: "⚡",
    intensity: 5,
    toyCommandPattern: "Vibrate:15:20",
  },
  {
    id: "m_5",
    title: "VIP Champagne Pop 🍾",
    description: "VIP shoutout toast + sparkling room banner",
    category: "VIP",
    priceTokens: 500,
    basePriceTokens: 500,
    durationSeconds: 25,
    maxQuantityPerStream: 5,
    remainingQuantity: 4,
    eligibility: "MIN_FAN_LEVEL_5",
    isEnabled: true,
    icon: "🍾",
  },
  {
    id: "m_6",
    title: "Costume / Outfit Switch 👗",
    description: "Creator changes into fan-chosen cosplay theme",
    category: "Request",
    priceTokens: 1500,
    basePriceTokens: 1500,
    durationSeconds: 120,
    maxQuantityPerStream: 2,
    remainingQuantity: 2,
    eligibility: "ALL",
    isEnabled: true,
    icon: "👗",
  },
];

// Initial audience members
const INITIAL_AUDIENCE: AudienceMember[] = [
  {
    id: "fan_alex",
    username: "alex_patron",
    displayName: "Alex Patron 💎",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    fanLevel: 14,
    relationshipTier: "ROYAL_PATRON",
    isVip: true,
    isSubscriber: true,
    isModerator: false,
    isMuted: false,
    isBanned: false,
    tokensSpentSession: 1250,
    tokensSpentLifetime: 48500,
    watchMinutesSession: 42,
    streakDays: 19,
    lastActive: "Active now",
    customNotes: "Top supporter since launch, loves electronic music & dance requests.",
    relationshipProgressPercent: 85,
  },
  {
    id: "fan_sarah",
    username: "sarah_k",
    displayName: "Sarah Diamond 👑",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    fanLevel: 9,
    relationshipTier: "SOULMATE",
    isVip: true,
    isSubscriber: true,
    isModerator: true,
    isMuted: false,
    isBanned: false,
    tokensSpentSession: 800,
    tokensSpentLifetime: 26200,
    watchMinutesSession: 38,
    streakDays: 12,
    lastActive: "Active now",
    customNotes: "Co-moderator & trusted fan. High engagement on chat.",
    relationshipProgressPercent: 62,
  },
  {
    id: "fan_marcus",
    username: "marcus_cyber",
    displayName: "Marcus Neon ⚡",
    avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
    fanLevel: 6,
    relationshipTier: "SUPERFAN",
    isVip: false,
    isSubscriber: true,
    isModerator: false,
    isMuted: false,
    isBanned: false,
    tokensSpentSession: 350,
    tokensSpentLifetime: 9400,
    watchMinutesSession: 29,
    streakDays: 5,
    lastActive: "Active now",
    customNotes: "Loves wheel spins and sound triggers.",
    relationshipProgressPercent: 44,
  },
  {
    id: "fan_elena",
    username: "elena_v",
    displayName: "Elena Velvet 🌸",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    fanLevel: 3,
    relationshipTier: "SUPPORTER",
    isVip: false,
    isSubscriber: false,
    isModerator: false,
    isMuted: false,
    isBanned: false,
    tokensSpentSession: 150,
    tokensSpentLifetime: 1200,
    watchMinutesSession: 15,
    streakDays: 2,
    lastActive: "Active now",
    relationshipProgressPercent: 20,
  },
];

// Initial top supporters
const INITIAL_TOP_SUPPORTERS: TopSupporter[] = [
  {
    rank: 1,
    userId: "fan_alex",
    displayName: "Alex Patron 💎",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    fanLevel: 14,
    relationshipTier: "ROYAL_PATRON",
    totalTokensContributed: 1250,
    streakDays: 19,
  },
  {
    rank: 2,
    userId: "fan_sarah",
    displayName: "Sarah Diamond 👑",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    fanLevel: 9,
    relationshipTier: "SOULMATE",
    totalTokensContributed: 800,
    streakDays: 12,
  },
  {
    rank: 3,
    userId: "fan_marcus",
    displayName: "Marcus Neon ⚡",
    avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
    fanLevel: 6,
    relationshipTier: "SUPERFAN",
    totalTokensContributed: 350,
    streakDays: 5,
  },
];

// Initial chat messages
const INITIAL_CHAT_MESSAGES: ControlRoomChatMessage[] = [
  {
    id: "c_1",
    senderId: "fan_sarah",
    senderName: "Sarah Diamond 👑",
    senderAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    fanLevel: 9,
    relationshipTier: "SOULMATE",
    isVip: true,
    isSubscriber: true,
    isModerator: true,
    text: "Welcome everyone to tonight's live! Keep the vibe friendly ✨",
    timestamp: "10:14 PM",
    isPinned: true,
  },
  {
    id: "c_2",
    senderId: "fan_marcus",
    senderName: "Marcus Neon ⚡",
    senderAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
    fanLevel: 6,
    relationshipTier: "SUPERFAN",
    isVip: false,
    isSubscriber: true,
    isModerator: false,
    text: "Maya the lighting looks insane tonight! 🔥",
    timestamp: "10:15 PM",
  },
  {
    id: "c_3",
    senderId: "fan_alex",
    senderName: "Alex Patron 💎",
    senderAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    fanLevel: 14,
    relationshipTier: "ROYAL_PATRON",
    isVip: true,
    isSubscriber: true,
    isModerator: false,
    text: "Let's crush the stream milestone! Dropping 500 tokens for the goal 💃",
    tipCredits: 500,
    timestamp: "10:16 PM",
  },
];

// Helper to play synthesized Web Audio chime
function playWebAudioAlert(type: "tip" | "queue" | "celebrate") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === "tip") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === "queue") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === "celebrate") {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.5);
      });
    }
  } catch {
    // AudioContext autoplay restrictions
  }
}

export function useCreatorControlRoom() {
  const { currentUser } = useUser();
  const creatorProfileId = currentUser.username === "mayavelvet" ? "creator_maya" : currentUser.id;

  // -------------------------------------------------------------
  // 1. TOP REGION: TELEMETRY & LIVE STATUS
  // -------------------------------------------------------------
  const [telemetry, setTelemetry] = useState<ControlRoomTelemetry>({
    isLive: true,
    durationSeconds: 1420, // 23 mins 40 secs
    viewerCount: 384,
    peakViewers: 452,
    uniqueViewers: 890,
    grossTokens: 2550,
    netUsd: 204.0, // 2550 * 0.08
    tokensPerMin: 108,
    completedInteractionsCount: 8,
    fps: 60,
    bitrateKbps: 6400,
    streamHealth: "EXCELLENT",
  });

  // -------------------------------------------------------------
  // 2. HARDWARE & MEDIA STREAM ENGINE
  // -------------------------------------------------------------
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isMicActive, setIsMicActive] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [audioMeterLevel, setAudioMeterLevel] = useState<number>(45); // 0 to 100
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Ingest credentials
  const [ingestCredentials] = useState<IngestCredentials>({
    rtmpIngestUrl: "rtmp://ingest.live.platform.local/app",
    whipIngestUrl: "https://whip.live.platform.local/v1/endpoint",
    streamKey: "live_maya_sec_994b7x",
    playbackHlsUrl: "https://stream.platform.local/live/maya/index.m3u8",
    playbackWhepUrl: "https://whep.live.platform.local/v1/maya",
  });

  // -------------------------------------------------------------
  // 3. LEFT REGION: AUDIENCE, CHAT & CRM STATE
  // -------------------------------------------------------------
  const [chatMessages, setChatMessages] = useState<ControlRoomChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [audienceList, setAudienceList] = useState<AudienceMember[]>(INITIAL_AUDIENCE);
  const [topSupporters, setTopSupporters] = useState<TopSupporter[]>(INITIAL_TOP_SUPPORTERS);
  const [selectedAudienceMember, setSelectedAudienceMember] = useState<AudienceMember | null>(null);

  // -------------------------------------------------------------
  // 4. CENTER REGION: QUEUE, GOAL & LEDGER
  // -------------------------------------------------------------
  const [interactionQueue, setInteractionQueue] = useState<LiveQueueItem[]>([
    {
      id: "q_1",
      fanId: "fan_alex",
      fanName: "Alex Patron 💎",
      fanAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      credits: 250,
      actionTitle: "Wheel of Fortune Spin 🎡",
      actionType: "Visual",
      customMessage: "Spin for neon victory! ✨",
      durationSeconds: 15,
      timeRemainingSeconds: 12,
      status: "EXECUTING",
      timestamp: "Just now",
    },
    {
      id: "q_2",
      fanId: "fan_marcus",
      fanName: "Marcus Neon ⚡",
      fanAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
      credits: 100,
      actionTitle: "Mini Freestyle Dance 💃",
      actionType: "Request",
      customMessage: "Play some cyber bass!",
      durationSeconds: 30,
      timeRemainingSeconds: 30,
      status: "QUEUED",
      timestamp: "1 min ago",
    },
  ]);

  const [activeGoal, setActiveGoal] = useState<StreamGoal>({
    id: "goal_stream_1",
    title: "Neon Dance Party & VIP Champagne Toast 🍾",
    targetTokens: 3000,
    currentTokens: 2550,
    percentage: 85,
    remainingTokens: 450,
    rewardDescription: "Live 10-minute freestyle dance set with confetti blast",
    isCompleted: false,
    contributors: [
      {
        userId: "fan_alex",
        displayName: "Alex Patron 💎",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        tokens: 1250,
      },
      {
        userId: "fan_sarah",
        displayName: "Sarah Diamond 👑",
        avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
        tokens: 800,
      },
      {
        userId: "fan_marcus",
        displayName: "Marcus Neon ⚡",
        avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
        tokens: 350,
      },
      {
        userId: "fan_elena",
        displayName: "Elena Velvet 🌸",
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
        tokens: 150,
      },
    ],
  });

  const [purchaseLedger, setPurchaseLedger] = useState<PurchaseLedgerItem[]>([
    {
      id: "tx_1",
      buyerId: "fan_alex",
      buyerName: "Alex Patron 💎",
      buyerAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      itemType: "INTERACTION",
      itemTitle: "Wheel of Fortune Spin 🎡",
      tokensPaid: 250,
      netUsd: 20.0,
      timestamp: "1 min ago",
    },
    {
      id: "tx_2",
      buyerId: "fan_sarah",
      buyerName: "Sarah Diamond 👑",
      buyerAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      itemType: "PPV_UNLOCK",
      itemTitle: "Exclusive Backstage 4K Photo Set",
      tokensPaid: 300,
      netUsd: 24.0,
      timestamp: "4 mins ago",
    },
    {
      id: "tx_3",
      buyerId: "fan_marcus",
      buyerName: "Marcus Neon ⚡",
      buyerAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
      itemType: "SUBSCRIPTION",
      itemTitle: "VIP Diamond Pass (Monthly)",
      tokensPaid: 500,
      netUsd: 40.0,
      timestamp: "8 mins ago",
    },
  ]);

  // -------------------------------------------------------------
  // 5. RIGHT REGION: MARKETPLACE CONTROLS & SURGE
  // -------------------------------------------------------------
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>(INITIAL_MARKETPLACE_ITEMS);
  const [surgeMultiplier, setSurgeMultiplier] = useState<SurgeMultiplier>(1.0);

  // -------------------------------------------------------------
  // 6. BOTTOM REGION: MODERATION & BROADCAST RULES
  // -------------------------------------------------------------
  const [moderationRules, setModerationRules] = useState<ModerationRuleConfig>({
    isSubscribersOnlyChat: false,
    slowModeSeconds: 0,
    minTipToHighlight: 100,
    isPanicBlackoutActive: false,
    blockedWords: ["chargeback", "hacked", "scam", "underage"],
  });

  // Confetti celebration state
  const [isConfettiActive, setIsConfettiActive] = useState(false);

  // -------------------------------------------------------------
  // A. MEDIA STREAM & AUDIO VU METER CAPTURE
  // -------------------------------------------------------------
  const startCamera = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } },
          audio: true,
        });
        mediaStreamRef.current = stream;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }

        // Setup Web Audio Analyser for realistic VU meter
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            audioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateMeter = () => {
              if (analyserRef.current) {
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
                }
                const average = sum / dataArray.length;
                const normalized = Math.min(100, Math.round((average / 128) * 100));
                setAudioMeterLevel(normalized);
              }
              animFrameRef.current = requestAnimationFrame(updateMeter);
            };
            animFrameRef.current = requestAnimationFrame(updateMeter);
          }
        } catch {
          // Fallback if audio context fails
        }
      }
    } catch (err) {
      console.warn("Camera fallback mode:", err);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [startCamera]);

  // -------------------------------------------------------------
  // B. DURATION STOPWATCH & QUEUE COUNTDOWN TIMER
  // -------------------------------------------------------------
  useEffect(() => {
    if (!telemetry.isLive) return;

    const interval = setInterval(() => {
      // 1. Duration increment
      setTelemetry((prev) => ({
        ...prev,
        durationSeconds: prev.durationSeconds + 1,
      }));

      // 2. Decrement active executing interaction timer
      setInteractionQueue((prev) =>
        prev.map((item) => {
          if (item.status === "EXECUTING" && item.timeRemainingSeconds > 0) {
            const remaining = item.timeRemainingSeconds - 1;
            if (remaining === 0) {
              playWebAudioAlert("tip");
              return { ...item, timeRemainingSeconds: 0, status: "COMPLETED" };
            }
            return { ...item, timeRemainingSeconds: remaining };
          }
          return item;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [telemetry.isLive]);

  // -------------------------------------------------------------
  // C. REAL-TIME SSE LISTENER FOR INCOMING FAN ACTIONS
  // -------------------------------------------------------------
  useEffect(() => {
    const eventSource = new EventSource(`/api/realtime/${creatorProfileId}/sse`);

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);

        if (event.type === "TIP_EVENT" || event.type === "GIFT_SENT") {
          const payload = event.payload;
          const credits = payload.credits || payload.gift?.creditAmount || 0;
          const senderName = payload.senderName || payload.sender?.displayName || "Fan";
          const title = payload.actionTitle || payload.gift?.name || "Fan Tip";

          playWebAudioAlert("tip");

          // 1. Update Telemetry
          setTelemetry((prev) => ({
            ...prev,
            grossTokens: prev.grossTokens + credits,
            netUsd: (prev.grossTokens + credits) * 0.08,
            tokensPerMin: prev.tokensPerMin + Math.round(credits / 10),
          }));

          // 2. Add to Queue if interaction
          if (payload.actionTitle || payload.gift?.name) {
            setInteractionQueue((prev) => [
              ...prev,
              {
                id: `q_${Date.now()}`,
                fanId: payload.sender?.userId || "fan_anon",
                fanName: senderName,
                fanAvatar: payload.sender?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
                credits,
                actionTitle: title,
                actionType: "Interaction",
                customMessage: payload.customMessage || payload.gift?.customMessage,
                durationSeconds: 15,
                timeRemainingSeconds: 15,
                status: "QUEUED",
                timestamp: "Just now",
              },
            ]);
          }

          // 3. Update Stream Goal
          setActiveGoal((prev) => {
            const newTotal = prev.currentTokens + credits;
            const pct = Math.min(100, Math.round((newTotal / prev.targetTokens) * 100));
            const isCompleted = newTotal >= prev.targetTokens;
            if (isCompleted && !prev.isCompleted) {
              playWebAudioAlert("celebrate");
              setIsConfettiActive(true);
              setTimeout(() => setIsConfettiActive(false), 6000);
            }
            return {
              ...prev,
              currentTokens: newTotal,
              percentage: pct,
              remainingTokens: Math.max(0, prev.targetTokens - newTotal),
              isCompleted,
            };
          });

          // 4. Add to Ledger
          setPurchaseLedger((prev) => [
            {
              id: `tx_${Date.now()}`,
              buyerId: payload.sender?.userId || "fan_anon",
              buyerName: senderName,
              buyerAvatar: payload.sender?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
              itemType: "TIP",
              itemTitle: title,
              tokensPaid: credits,
              netUsd: credits * 0.08,
              timestamp: "Just now",
            },
            ...prev.slice(0, 19),
          ]);
        } else if (event.type === "PRESENCE_COUNT" || event.type === "VIEWER_JOINED" || event.type === "VIEWER_LEFT") {
          if (typeof event.payload.viewerCount === "number") {
            setTelemetry((prev) => ({
              ...prev,
              viewerCount: event.payload.viewerCount,
              peakViewers: Math.max(prev.peakViewers, event.payload.viewerCount),
            }));
          }
        } else if (event.type === "NEW_MESSAGE" || event.type === "CHAT_MESSAGE") {
          const msg = event.payload;
          setChatMessages((prev) => [
            ...prev,
            {
              id: msg.id || `msg_${Date.now()}`,
              senderId: msg.senderId || "fan_anon",
              senderName: msg.senderName || msg.sender?.displayName || "Viewer",
              senderAvatar: msg.senderAvatar || msg.sender?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
              fanLevel: msg.fanLevel || 1,
              relationshipTier: msg.relationshipTier || "SUPPORTER",
              isVip: !!msg.isVip,
              isSubscriber: !!msg.isSubscriber,
              isModerator: !!msg.isModerator,
              text: msg.text || msg.body || "",
              tipCredits: msg.tipCredits,
              timestamp: "Just now",
            },
          ]);
        }
      } catch {
        // SSE parsing
      }
    };

    return () => eventSource.close();
  }, [creatorProfileId]);

  // -------------------------------------------------------------
  // D. MASTER ACTIONS & QUEUE DISPATCHERS
  // -------------------------------------------------------------

  const handleToggleBroadcast = () => {
    setTelemetry((prev) => ({ ...prev, isLive: !prev.isLive }));
  };

  const handleTogglePanicBlackout = () => {
    setModerationRules((prev) => ({
      ...prev,
      isPanicBlackoutActive: !prev.isPanicBlackoutActive,
    }));
  };

  const handleToggleCamera = () => {
    if (mediaStreamRef.current) {
      const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isCameraActive;
      }
    }
    setIsCameraActive((prev) => !prev);
  };

  const handleToggleMic = () => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicActive;
      }
    }
    setIsMicActive((prev) => !prev);
  };

  const handleAcceptQueueItem = (id: string) => {
    playWebAudioAlert("queue");
    setInteractionQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "EXECUTING" } : item))
    );
  };

  const handleCompleteQueueItem = (id: string) => {
    playWebAudioAlert("tip");
    setTelemetry((prev) => ({
      ...prev,
      completedInteractionsCount: prev.completedInteractionsCount + 1,
    }));
    setInteractionQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSkipQueueItem = (id: string) => {
    setInteractionQueue((prev) => prev.filter((item) => item.id !== id));
  };

  // -------------------------------------------------------------
  // E. MARKETPLACE CONTROLLER & SURGE PRICING
  // -------------------------------------------------------------

  const handleApplySurgeMultiplier = (multiplier: SurgeMultiplier) => {
    setSurgeMultiplier(multiplier);
    setMarketplaceItems((prev) =>
      prev.map((item) => ({
        ...item,
        priceTokens: Math.round(item.basePriceTokens * multiplier),
      }))
    );
  };

  const handleAddMarketplaceItem = (item: Omit<MarketplaceItem, "id">) => {
    const newItem: MarketplaceItem = {
      ...item,
      id: `m_${Date.now()}`,
      priceTokens: Math.round(item.basePriceTokens * surgeMultiplier),
    };
    setMarketplaceItems((prev) => [newItem, ...prev]);
  };

  const handleUpdatePrice = (id: string, newBasePrice: number) => {
    setMarketplaceItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              basePriceTokens: newBasePrice,
              priceTokens: Math.round(newBasePrice * surgeMultiplier),
            }
          : item
      )
    );
  };

  const handleToggleItemEnabled = (id: string) => {
    setMarketplaceItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isEnabled: !item.isEnabled } : item))
    );
  };

  const handleSetQuantity = (id: string, quantity: number | null) => {
    setMarketplaceItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, maxQuantityPerStream: quantity, remainingQuantity: quantity }
          : item
      )
    );
  };

  const handleSetDuration = (id: string, durationSeconds: number) => {
    setMarketplaceItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, durationSeconds } : item))
    );
  };

  const handleSetEligibility = (id: string, eligibility: InteractionEligibility) => {
    setMarketplaceItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, eligibility } : item))
    );
  };

  const handleDeleteItem = (id: string) => {
    setMarketplaceItems((prev) => prev.filter((item) => item.id !== id));
  };

  // -------------------------------------------------------------
  // F. CHAT, SHOUTOUTS & MODERATION ACTIONS
  // -------------------------------------------------------------

  const handleSendChatMessage = (text: string) => {
    if (!text.trim()) return;
    const msg: ControlRoomChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      senderName: `${currentUser.displayName} (Creator) ✨`,
      senderAvatar: currentUser.avatarUrl,
      fanLevel: 99,
      relationshipTier: "ROYAL_PATRON",
      isVip: true,
      isSubscriber: true,
      isModerator: true,
      text: text.trim(),
      timestamp: "Just now",
    };
    setChatMessages((prev) => [...prev, msg]);
  };

  const handlePinMessage = (id: string) => {
    setChatMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isPinned: !m.isPinned } : m))
    );
  };

  const handleDeleteMessage = (id: string) => {
    setChatMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const handleMuteUser = (userId: string, username: string) => {
    setAudienceList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isMuted: true } : u))
    );
    const sysMsg: ControlRoomChatMessage = {
      id: `sys_${Date.now()}`,
      senderId: "system",
      senderName: "Moderator Shield 🛡️",
      senderAvatar: "",
      fanLevel: 0,
      relationshipTier: "STRANGER",
      isVip: false,
      isSubscriber: false,
      isModerator: true,
      text: `@${username} has been muted in this broadcast.`,
      timestamp: "Just now",
    };
    setChatMessages((prev) => [...prev, sysMsg]);
  };

  const handleTimeoutUser = (userId: string, username: string, durationMinutes = 5) => {
    handleMuteUser(userId, username);
  };

  const handleBanUser = (userId: string, username: string) => {
    setAudienceList((prev) => prev.filter((u) => u.id !== userId));
    const sysMsg: ControlRoomChatMessage = {
      id: `sys_${Date.now()}`,
      senderId: "system",
      senderName: "Moderator Shield 🛡️",
      senderAvatar: "",
      fanLevel: 0,
      relationshipTier: "STRANGER",
      isVip: false,
      isSubscriber: false,
      isModerator: true,
      text: `@${username} was removed and banned from the live room.`,
      timestamp: "Just now",
    };
    setChatMessages((prev) => [...prev, sysMsg]);
  };

  const handleBroadcastShoutout = (supporter: TopSupporter) => {
    playWebAudioAlert("celebrate");
    const shoutoutMsg: ControlRoomChatMessage = {
      id: `shout_${Date.now()}`,
      senderId: currentUser.id,
      senderName: `${currentUser.displayName} ✨`,
      senderAvatar: currentUser.avatarUrl,
      fanLevel: 99,
      relationshipTier: "ROYAL_PATRON",
      isVip: true,
      isSubscriber: true,
      isModerator: true,
      text: `👑 HUGE SHOUTOUT TO ${supporter.displayName.toUpperCase()}! Rank #${supporter.rank} with ${supporter.totalTokensContributed} tokens & ${supporter.streakDays}-day streak! Thank you so much! 🎉✨`,
      timestamp: "Just now",
      isPinned: true,
    };
    setChatMessages((prev) => [...prev, shoutoutMsg]);
  };

  // -------------------------------------------------------------
  // G. STREAM GOAL UPDATER
  // -------------------------------------------------------------

  const handleUpdateGoal = (title: string, targetTokens: number, rewardDescription: string) => {
    setActiveGoal((prev) => {
      const pct = Math.min(100, Math.round((prev.currentTokens / targetTokens) * 100));
      return {
        ...prev,
        title,
        targetTokens,
        rewardDescription,
        percentage: pct,
        remainingTokens: Math.max(0, targetTokens - prev.currentTokens),
        isCompleted: prev.currentTokens >= targetTokens,
      };
    });
  };

  const handleTriggerGoalCelebration = () => {
    playWebAudioAlert("celebrate");
    setIsConfettiActive(true);
    setTimeout(() => setIsConfettiActive(false), 6000);
  };

  // -------------------------------------------------------------
  // H. LIVE TEST EVENT SIMULATION SUITE
  // -------------------------------------------------------------

  const handleSimulateTip = (tokens = 250) => {
    playWebAudioAlert("tip");
    const sender = INITIAL_AUDIENCE[Math.floor(Math.random() * INITIAL_AUDIENCE.length)];
    const titles = ["Wheel of Fortune Spin 🎡", "Neon Confetti Pop 🎊", "Freestyle Dance 💃", "Diamond Spark 💎"];
    const actionTitle = titles[Math.floor(Math.random() * titles.length)];

    setTelemetry((prev) => ({
      ...prev,
      grossTokens: prev.grossTokens + tokens,
      netUsd: (prev.grossTokens + tokens) * 0.08,
      tokensPerMin: prev.tokensPerMin + 25,
    }));

    setInteractionQueue((prev) => [
      ...prev,
      {
        id: `q_sim_${Date.now()}`,
        fanId: sender.id,
        fanName: sender.displayName,
        fanAvatar: sender.avatarUrl,
        credits: tokens,
        actionTitle,
        actionType: "Interaction",
        customMessage: `Test interaction trigger (${tokens} tokens)!`,
        durationSeconds: 20,
        timeRemainingSeconds: 20,
        status: "QUEUED",
        timestamp: "Just now",
      },
    ]);

    setActiveGoal((prev) => {
      const newTotal = prev.currentTokens + tokens;
      const pct = Math.min(100, Math.round((newTotal / prev.targetTokens) * 100));
      const isCompleted = newTotal >= prev.targetTokens;
      if (isCompleted && !prev.isCompleted) {
        playWebAudioAlert("celebrate");
        setIsConfettiActive(true);
        setTimeout(() => setIsConfettiActive(false), 6000);
      }
      return {
        ...prev,
        currentTokens: newTotal,
        percentage: pct,
        remainingTokens: Math.max(0, prev.targetTokens - newTotal),
        isCompleted,
      };
    });

    setPurchaseLedger((prev) => [
      {
        id: `tx_${Date.now()}`,
        buyerId: sender.id,
        buyerName: sender.displayName,
        buyerAvatar: sender.avatarUrl,
        itemType: "INTERACTION",
        itemTitle: actionTitle,
        tokensPaid: tokens,
        netUsd: tokens * 0.08,
        timestamp: "Just now",
      },
      ...prev.slice(0, 19),
    ]);

    setChatMessages((prev) => [
      ...prev,
      {
        id: `msg_${Date.now()}`,
        senderId: sender.id,
        senderName: sender.displayName,
        senderAvatar: sender.avatarUrl,
        fanLevel: sender.fanLevel,
        relationshipTier: sender.relationshipTier,
        isVip: sender.isVip,
        isSubscriber: sender.isSubscriber,
        isModerator: sender.isModerator,
        text: `Sent ${tokens} tokens for ${actionTitle}! 🎉`,
        tipCredits: tokens,
        timestamp: "Just now",
      },
    ]);
  };

  return {
    // 1. Telemetry
    telemetry,
    setTelemetry,

    // 2. Hardware & Media
    videoPreviewRef,
    isCameraActive,
    isMicActive,
    isScreenSharing,
    setIsScreenSharing,
    audioMeterLevel,
    ingestCredentials,
    onToggleCamera: handleToggleCamera,
    onToggleMic: handleToggleMic,

    // 3. Left Region (Audience & Chat)
    chatMessages,
    audienceList,
    topSupporters,
    selectedAudienceMember,
    setSelectedAudienceMember,
    onSendChatMessage: handleSendChatMessage,
    onPinMessage: handlePinMessage,
    onDeleteMessage: handleDeleteMessage,
    onMuteUser: handleMuteUser,
    onTimeoutUser: handleTimeoutUser,
    onBanUser: handleBanUser,
    onBroadcastShoutout: handleBroadcastShoutout,

    // 4. Center Region (Queue, Goal, Ledger)
    interactionQueue,
    activeGoal,
    purchaseLedger,
    isConfettiActive,
    onAcceptQueueItem: handleAcceptQueueItem,
    onCompleteQueueItem: handleCompleteQueueItem,
    onSkipQueueItem: handleSkipQueueItem,
    onUpdateGoal: handleUpdateGoal,
    onTriggerGoalCelebration: handleTriggerGoalCelebration,

    // 5. Right Region (Marketplace)
    marketplaceItems,
    surgeMultiplier,
    onApplySurgeMultiplier: handleApplySurgeMultiplier,
    onAddMarketplaceItem: handleAddMarketplaceItem,
    onUpdatePrice: handleUpdatePrice,
    onToggleItemEnabled: handleToggleItemEnabled,
    onSetQuantity: handleSetQuantity,
    onSetDuration: handleSetDuration,
    onSetEligibility: handleSetEligibility,
    onDeleteItem: handleDeleteItem,

    // 6. Bottom Region (Moderation & Broadcast)
    moderationRules,
    setModerationRules,
    onToggleBroadcast: handleToggleBroadcast,
    onTogglePanicBlackout: handleTogglePanicBlackout,

    // 7. Simulation Suite
    onSimulateTip: handleSimulateTip,
  };
}
