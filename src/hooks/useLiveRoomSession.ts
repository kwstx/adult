"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@/lib/user-context";
import type {
  RoomConfig,
  ViewerPermissions,
  ViewerRelationship,
  StreamGoalData,
  InteractionCatalogueItem,
  PPVVaultItem,
  RoomSessionPayload,
} from "@/modules/livestream/room-session.service";
import type { ChatMessagePayload, TipEventPayload } from "@/modules/realtime/types";

export type ConnectionState = "INITIALIZING" | "CONNECTING" | "CONNECTED" | "RECONNECTING" | "DISCONNECTED" | "ERROR";
export type MediaPlaybackState = "IDLE" | "PREWARMING" | "PLAYING" | "PAUSED" | "RESTRICTED" | "OFFLINE";

export interface TipAlertItem {
  id: string;
  senderName: string;
  credits: number;
  actionTitle?: string;
  customMessage?: string;
}

export function useLiveRoomSession(creatorIdOrUsername: string) {
  const { currentUser, updateBalance } = useUser();

  // -------------------------------------------------------------
  // 1. VIDEO MEDIA ENGINE STATE
  // -------------------------------------------------------------
  const [mediaState, setMediaState] = useState<MediaPlaybackState>("IDLE");
  const [isMuted, setIsMuted] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | undefined>(undefined);
  const [posterUrl, setPosterUrl] = useState<string | undefined>(undefined);

  // -------------------------------------------------------------
  // 2. REAL-TIME CONNECTION STATE
  // -------------------------------------------------------------
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>("INITIALIZING");
  const [socketId, setSocketId] = useState<string | null>(null);
  const [recentTipAlerts, setRecentTipAlerts] = useState<TipAlertItem[]>([]);

  // -------------------------------------------------------------
  // 3. ROOM CONFIGURATION
  // -------------------------------------------------------------
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);

  // -------------------------------------------------------------
  // 4. BACKEND VIEWER PERMISSIONS
  // -------------------------------------------------------------
  const [permissions, setPermissions] = useState<ViewerPermissions>({
    canView: true,
    canChat: true,
    canInteract: true,
    canTip: true,
    isVip: false,
    isModerator: false,
    isCreator: false,
    isAdmin: false,
    isAgeVerified: true,
  });

  // -------------------------------------------------------------
  // 5. CHAT ENGINE & MESSAGES
  // -------------------------------------------------------------
  const [chatMessages, setChatMessages] = useState<ChatMessagePayload[]>([]);
  const [isChatSending, setIsChatSending] = useState(false);

  // -------------------------------------------------------------
  // 6. AUDIENCE PRESENCE
  // -------------------------------------------------------------
  const [viewerCount, setViewerCount] = useState<number>(0);

  // -------------------------------------------------------------
  // 7. INTERACTION CATALOGUE & PPV VAULT
  // -------------------------------------------------------------
  const [interactions, setInteractions] = useState<InteractionCatalogueItem[]>([]);
  const [ppvVault, setPpvVault] = useState<PPVVaultItem[]>([]);
  const [isTriggeringInteraction, setIsTriggeringInteraction] = useState<string | null>(null);

  // -------------------------------------------------------------
  // 8. CREATOR LIVE GOAL
  // -------------------------------------------------------------
  const [goal, setGoal] = useState<StreamGoalData>({
    title: "Stream Goal",
    target: 500,
    progress: 0,
    percentage: 0,
    remaining: 500,
    isCompleted: false,
  });

  // -------------------------------------------------------------
  // 9. VIEWER RELATIONSHIP LEVEL
  // -------------------------------------------------------------
  const [relationship, setRelationship] = useState<ViewerRelationship>({
    isFollowing: false,
    isSubscribed: false,
    subscriptionTier: null,
    subscriptionExpiresAt: null,
    totalTokensContributed: 0,
    fanLevel: 1,
    fanTitle: "Explorer",
    fanBadge: null,
    topContributorRank: null,
  });

  // -------------------------------------------------------------
  // 10. WALLET BALANCE
  // -------------------------------------------------------------
  const [walletBalance, setWalletBalance] = useState<number>(currentUser.walletBalance);

  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const activeCreatorIdRef = useRef<string | null>(null);

  // Synchronize internal balance when UserContext balance changes
  useEffect(() => {
    setWalletBalance(currentUser.walletBalance);
  }, [currentUser.walletBalance]);

  // =============================================================
  // SYSTEM BOOTSTRAPPER: Fetch Authoritative Room Session
  // =============================================================
  const loadRoomSession = useCallback(async () => {
    if (!creatorIdOrUsername) return;
    setIsLoadingSession(true);
    setSessionError(null);

    try {
      const res = await fetch(
        `/api/livestream/${creatorIdOrUsername}/session?userId=${currentUser.id}`
      );

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || "Failed to load live room.");
      }

      const session: RoomSessionPayload = await res.json();

      activeCreatorIdRef.current = session.roomConfig.creatorId;
      setRoomConfig(session.roomConfig);
      setPermissions(session.permissions);
      setRelationship(session.relationship);
      setGoal(session.goal);
      setInteractions(session.interactions);
      setPpvVault(session.ppvVault);
      setViewerCount(session.roomConfig.viewerCount);
      setPosterUrl(session.roomConfig.bannerUrl || session.roomConfig.avatarUrl || undefined);
      setWalletBalance(session.viewerWalletBalance);
      updateBalance(session.viewerWalletBalance);

      if (session.playback?.playbackUrl) {
        setStreamUrl(session.playback.playbackUrl);
      }

      if (!session.permissions.canView) {
        setMediaState("RESTRICTED");
      } else if (session.roomConfig.isLive) {
        setMediaState("PLAYING");
      } else {
        setMediaState("OFFLINE");
      }
    } catch (err: any) {
      console.error("Failed to bootstrap live room session:", err);
      setSessionError(err.message || "Failed to enter live room.");
      setConnectionStatus("ERROR");
    } finally {
      setIsLoadingSession(false);
    }
  }, [creatorIdOrUsername, currentUser.id, updateBalance]);

  useEffect(() => {
    loadRoomSession();
  }, [loadRoomSession]);

  // =============================================================
  // CHAT HISTORY HYDRATION
  // =============================================================
  useEffect(() => {
    const creatorId = roomConfig?.creatorId;
    if (!creatorId) return;

    fetch(`/api/realtime/${creatorId}/chat`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setChatMessages(data);
        }
      })
      .catch((err) => console.error("Chat hydration error:", err));
  }, [roomConfig?.creatorId]);

  // =============================================================
  // REAL-TIME SSE & PRESENCE MULTIPLEXING
  // =============================================================
  useEffect(() => {
    const creatorId = roomConfig?.creatorId;
    if (!creatorId) return;

    setConnectionStatus("CONNECTING");
    const eventSource = new EventSource(`/api/realtime/${creatorId}/sse`);

    eventSource.onopen = () => {
      setConnectionStatus("CONNECTED");
    };

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);

        switch (event.type) {
          case "CONNECTED":
            setSocketId(event.payload.socketId);
            if (typeof event.payload.viewerCount === "number") {
              setViewerCount(event.payload.viewerCount);
            }
            break;

          case "HEARTBEAT":
            if (typeof event.payload.viewerCount === "number") {
              setViewerCount(event.payload.viewerCount);
            }
            break;

          case "PRESENCE_COUNT":
            if (typeof event.payload.viewerCount === "number") {
              setViewerCount(event.payload.viewerCount);
            }
            break;

          case "CHAT_MESSAGE":
            setChatMessages((prev) => [...prev, event.payload]);
            break;

          case "TIP_EVENT": {
            const tip = event.payload as TipEventPayload;
            // 1. Update live goal progress
            if (tip.newGoalProgress !== undefined) {
              setGoal((prev) => {
                const target = tip.goalTarget || prev.target;
                const progress = tip.newGoalProgress;
                return {
                  ...prev,
                  target,
                  progress,
                  percentage: Math.min(100, Math.round((progress / (target || 1)) * 100)),
                  remaining: Math.max(0, target - progress),
                  isCompleted: progress >= target,
                };
              });
            }

            // 2. Add floating tip alert toast
            const alertItem: TipAlertItem = {
              id: tip.tipId || `alert_${Date.now()}`,
              senderName: tip.senderName,
              credits: tip.credits,
              actionTitle: tip.actionTitle,
              customMessage: tip.customMessage,
            };
            setRecentTipAlerts((prev) => [...prev, alertItem]);
            setTimeout(() => {
              setRecentTipAlerts((prev) => prev.filter((a) => a.id !== alertItem.id));
            }, 6000);

            // 3. Update viewer's relationship if viewer is the tipper
            if (tip.senderId === currentUser.id) {
              setRelationship((prev) => {
                const total = prev.totalTokensContributed + tip.credits;
                const fanLevel = Math.max(1, Math.floor(Math.sqrt(total / 40)) + 1);
                return {
                  ...prev,
                  totalTokensContributed: total,
                  fanLevel,
                  fanBadge: prev.isSubscribed ? `💎 VIP Lv.${fanLevel}` : `⭐ Fan Lv.${fanLevel}`,
                };
              });
            }
            break;
          }

          case "ROOM_STATUS":
            if (event.payload.isLive !== undefined) {
              setRoomConfig((prev) => (prev ? { ...prev, isLive: event.payload.isLive } : null));
              setMediaState(event.payload.isLive ? "PLAYING" : "OFFLINE");
            }
            break;

          default:
            break;
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    eventSource.onerror = () => {
      setConnectionStatus("RECONNECTING");
    };

    return () => {
      eventSource.close();
      setConnectionStatus("DISCONNECTED");
    };
  }, [roomConfig?.creatorId, currentUser.id]);

  // =============================================================
  // ACTION: Send Chat Message
  // =============================================================
  const sendChatMessage = async (text: string): Promise<boolean> => {
    const creatorId = roomConfig?.creatorId;
    if (!creatorId || !text.trim() || isChatSending) return false;

    if (!permissions.canChat) {
      alert(permissions.restrictionReason || "You do not have permission to chat in this room.");
      return false;
    }

    setIsChatSending(true);
    try {
      const res = await fetch(`/api/realtime/${creatorId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUser.id,
          text: text.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send message.");
      }
      return true;
    } catch (err: any) {
      console.error("Send chat failed:", err);
      alert(err.message || "Failed to send message.");
      return false;
    } finally {
      setIsChatSending(false);
    }
  };

  // =============================================================
  // ACTION: Trigger Interaction Catalogue Item / Send Tip
  // =============================================================
  const triggerInteraction = async (
    item: InteractionCatalogueItem,
    customMessage?: string
  ): Promise<boolean> => {
    const creatorId = roomConfig?.creatorId;
    if (!creatorId) return false;

    if (walletBalance < item.creditCost) {
      return false; // Calling UI will open wallet top-up drawer
    }

    setIsTriggeringInteraction(item.id);
    try {
      const res = await fetch("/api/economic/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fanUserId: currentUser.id,
          creatorId,
          credits: item.creditCost,
          menuItemId: item.id,
          customMessage: customMessage || `Triggered ${item.title}! ✨`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to trigger interaction.");

      setWalletBalance(data.fanRemainingBalance);
      updateBalance(data.fanRemainingBalance);
      return true;
    } catch (err: any) {
      console.error("Interaction trigger failed:", err);
      alert(err.message || "Interaction failed.");
      return false;
    } finally {
      setIsTriggeringInteraction(null);
    }
  };

  // =============================================================
  // ACTION: Chip in Tokens Toward Live Goal
  // =============================================================
  const chipInGoal = async (credits: number): Promise<boolean> => {
    const creatorId = roomConfig?.creatorId;
    if (!creatorId || credits <= 0) return false;

    if (walletBalance < credits) return false;

    try {
      const res = await fetch("/api/economic/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fanUserId: currentUser.id,
          creatorId,
          credits,
          customMessage: `Chipped in ${credits} tokens toward milestone goal! 🎯`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to contribute tokens.");

      setWalletBalance(data.fanRemainingBalance);
      updateBalance(data.fanRemainingBalance);
      return true;
    } catch (err: any) {
      console.error("Goal chip-in failed:", err);
      return false;
    }
  };

  // =============================================================
  // ACTION: Unlock PPV Content
  // =============================================================
  const unlockPPV = async (ppvId: string): Promise<boolean> => {
    const item = ppvVault.find((p) => p.id === ppvId);
    if (!item) return false;

    if (walletBalance < item.creditPrice) return false;

    try {
      const res = await fetch("/api/economic/ppv/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fanUserId: currentUser.id,
          ppvContentId: ppvId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to unlock media.");

      setWalletBalance(data.fanRemainingBalance);
      updateBalance(data.fanRemainingBalance);
      setPpvVault((prev) =>
        prev.map((p) => (p.id === ppvId ? { ...p, isUnlocked: true } : p))
      );
      return true;
    } catch (err: any) {
      console.error("PPV unlock failed:", err);
      return false;
    }
  };

  // =============================================================
  // ACTION: Toggle Follow Creator
  // =============================================================
  const toggleFollow = async () => {
    const creatorId = roomConfig?.creatorId;
    if (!creatorId) return;

    try {
      const res = await fetch(`/api/livestream/${creatorId}/relationship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          action: "TOGGLE_FOLLOW",
        }),
      });

      if (res.ok) {
        setRelationship((prev) => ({ ...prev, isFollowing: !prev.isFollowing }));
      }
    } catch (err) {
      console.error("Toggle follow failed:", err);
    }
  };

  return {
    // 1. Media
    mediaState,
    streamUrl,
    posterUrl,
    isMuted,
    toggleMute: () => setIsMuted((prev) => !prev),

    // 2. Real-time Connection
    connectionStatus,
    socketId,
    recentTipAlerts,

    // 3. Room Configuration
    roomConfig,
    isLoadingSession,
    sessionError,
    refreshSession: loadRoomSession,

    // 4. Permissions
    permissions,

    // 5. Chat
    chatMessages,
    isChatSending,
    sendChatMessage,

    // 6. Presence
    viewerCount,

    // 7. Interactions & PPV
    interactions,
    ppvVault,
    isTriggeringInteraction,
    triggerInteraction,
    unlockPPV,

    // 8. Live Goal
    goal,
    chipInGoal,

    // 9. Relationship
    relationship,
    toggleFollow,

    // 10. Wallet
    walletBalance,
  };
}
