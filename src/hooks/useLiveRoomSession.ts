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
import type {
  ChatMessagePayload,
  GiftSentPayload,
  LeaderboardEntry,
  InteractionPurchasedPayload,
  InteractionAcceptedPayload,
  GoalUpdatedPayload,
  ViewerPresenceEventPayload,
  NewInteractionAvailablePayload,
} from "@/modules/realtime/types";
import type { InteractionConfig } from "@/types/interaction";

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
  // 2. REAL-TIME CONNECTION STATE & VISUAL EVENTS
  // -------------------------------------------------------------
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>("INITIALIZING");
  const [socketId, setSocketId] = useState<string | null>(null);
  const [activeGiftEvent, setActiveGiftEvent] = useState<GiftSentPayload | null>(null);
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
  // 7. INTERACTION CATALOGUE, QUEUE & PPV VAULT
  // -------------------------------------------------------------
  const [interactions, setInteractions] = useState<InteractionCatalogueItem[]>([]);
  const [interactionQueue, setInteractionQueue] = useState<InteractionPurchasedPayload[]>([]);
  const [ppvVault, setPpvVault] = useState<PPVVaultItem[]>([]);
  const [isTriggeringInteraction, setIsTriggeringInteraction] = useState<string | null>(null);
  const [newInteractionAlert, setNewInteractionAlert] = useState<InteractionConfig | null>(null);

  // -------------------------------------------------------------
  // 8. CREATOR LIVE GOAL & LEADERBOARD
  // -------------------------------------------------------------
  const [goal, setGoal] = useState<StreamGoalData>({
    title: "Stream Goal",
    target: 500,
    progress: 0,
    percentage: 0,
    remaining: 500,
    isCompleted: false,
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // -------------------------------------------------------------
  // 9. CREATOR LIVE EARNINGS
  // -------------------------------------------------------------
  const [creatorGrossCredits, setCreatorGrossCredits] = useState<number>(0);
  const [creatorNetUsd, setCreatorNetUsd] = useState<number>(0);

  // -------------------------------------------------------------
  // 10. VIEWER RELATIONSHIP LEVEL & WALLET
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
  // CHAT & LEADERBOARD INITIAL HYDRATION
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

    fetch(`/api/realtime/${creatorId}/leaderboard`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.topContributors)) {
          setLeaderboard(data.topContributors);
        }
      })
      .catch((err) => console.error("Leaderboard hydration error:", err));
  }, [roomConfig?.creatorId]);

  // =============================================================
  // REAL-TIME PERSISTENT SSE STREAM & AUTHORITATIVE EVENT ROUTER
  // =============================================================
  useEffect(() => {
    const creatorId = roomConfig?.creatorId;
    if (!creatorId) return;

    setConnectionStatus("CONNECTING");

    const params = new URLSearchParams({
      userId: currentUser.id,
      displayName: currentUser.displayName,
      badge: relationship.fanBadge || "",
    });

    const eventSource = new EventSource(`/api/realtime/${creatorId}/sse?${params.toString()}`);

    eventSource.onopen = () => {
      setConnectionStatus("CONNECTED");
    };

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);

        switch (event.type) {
          // ---------------------------------------------------------
          // 1. CONNECTION & PRESENCE
          // ---------------------------------------------------------
          case "CONNECTED":
            setSocketId(event.payload.socketId);
            if (typeof event.payload.viewerCount === "number") {
              setViewerCount(event.payload.viewerCount);
            }
            if (Array.isArray(event.payload.leaderboard)) {
              setLeaderboard(event.payload.leaderboard);
            }
            break;

          case "HEARTBEAT":
          case "PRESENCE_COUNT":
            if (typeof event.payload.viewerCount === "number") {
              setViewerCount(event.payload.viewerCount);
            }
            break;

          case "VIEWER_JOINED":
          case "VIEWER_LEFT": {
            const presence = event.payload as ViewerPresenceEventPayload;
            if (typeof presence.viewerCount === "number") {
              setViewerCount(presence.viewerCount);
            }
            break;
          }

          // ---------------------------------------------------------
          // 2. AUTHORITATIVE GIFT_SENT EVENT
          // ---------------------------------------------------------
          case "GIFT_SENT": {
            const gift = event.payload as GiftSentPayload;

            // A. Trigger Visual Canvas Animation
            setActiveGiftEvent(gift);

            // B. Update Stream Goal State
            if (gift.updatedGoal) {
              setGoal((prev) => ({
                ...prev,
                title: gift.updatedGoal.title,
                target: gift.updatedGoal.target,
                progress: gift.updatedGoal.progress,
                percentage: gift.updatedGoal.percentage,
                remaining: Math.max(0, gift.updatedGoal.target - gift.updatedGoal.progress),
                isCompleted: gift.updatedGoal.isCompleted,
              }));
            }

            // C. Update Top Leaderboard
            if (Array.isArray(gift.updatedLeaderboard)) {
              setLeaderboard(gift.updatedLeaderboard);
            }

            // D. Update Creator Live Earnings Ticker
            if (gift.creatorEarningsDelta) {
              setCreatorGrossCredits((prev) => prev + gift.creatorEarningsDelta.grossCredits);
              setCreatorNetUsd((prev) => prev + gift.creatorEarningsDelta.netCredits * 0.08);
            }

            // E. Floating Toast Notification
            const alertItem: TipAlertItem = {
              id: gift.eventId,
              senderName: gift.sender.displayName,
              credits: gift.gift.creditAmount,
              actionTitle: gift.gift.name,
              customMessage: gift.gift.customMessage,
            };
            setRecentTipAlerts((prev) => [...prev, alertItem]);
            setTimeout(() => {
              setRecentTipAlerts((prev) => prev.filter((a) => a.id !== alertItem.id));
            }, 6000);

            // F. If Current User is the Sender (e.g. Sarah) -> Sync relationship & level
            if (gift.sender.userId === currentUser.id) {
              setRelationship((prev) => {
                const total = prev.totalTokensContributed + gift.gift.creditAmount;
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

          // ---------------------------------------------------------
          // 3. CHAT MESSAGE EVENT
          // ---------------------------------------------------------
          case "NEW_MESSAGE":
          case "CHAT_MESSAGE":
            setChatMessages((prev) => [...prev, event.payload]);
            break;

          // ---------------------------------------------------------
          // 4. GOAL UPDATED EVENT
          // ---------------------------------------------------------
          case "GOAL_UPDATED": {
            const goalData = event.payload as GoalUpdatedPayload;
            setGoal((prev) => ({
              ...prev,
              title: goalData.title,
              target: goalData.target,
              progress: goalData.progress,
              percentage: goalData.percentage,
              remaining: goalData.remaining,
              isCompleted: goalData.isCompleted,
            }));
            break;
          }

          // ---------------------------------------------------------
          // 5. LEADERBOARD UPDATED EVENT
          // ---------------------------------------------------------
          case "LEADERBOARD_UPDATED":
            if (Array.isArray(event.payload.topContributors)) {
              setLeaderboard(event.payload.topContributors);
            }
            break;

          // ---------------------------------------------------------
          // 6. INTERACTION QUEUE & STATE MACHINE EVENTS
          // ---------------------------------------------------------
          case "INTERACTION_PURCHASED":
            setInteractionQueue((prev) => [...prev, event.payload]);
            break;

          case "INTERACTION_ACCEPTED": {
            const accepted = event.payload as any;
            setInteractionQueue((prev) =>
              prev.map((i) => (i.queueId === accepted.queueId ? { ...i, status: "ACCEPTED" } : i))
            );
            break;
          }

          case "INTERACTION_STARTED": {
            const started = event.payload as any;
            setInteractionQueue((prev) =>
              prev.map((i) => (i.queueId === started.queueId ? { ...i, status: "IN_PROGRESS" } : i))
            );
            break;
          }

          case "INTERACTION_COMPLETED": {
            const completed = event.payload as any;
            setInteractionQueue((prev) =>
              prev.filter((i) => i.queueId !== completed.queueId)
            );
            break;
          }

          case "INTERACTION_REJECTED":
          case "INTERACTION_CANCELLED":
          case "INTERACTION_REFUNDED": {
            const refunded = event.payload as any;
            setInteractionQueue((prev) =>
              prev.filter((i) => i.queueId !== refunded.queueId)
            );
            // If current fan was refunded, refresh balance
            if (refunded.senderId === currentUser.id) {
              updateBalance();
            }
            break;
          }

          case "QUEUE_STATE_CHANGED": {
            const qState = event.payload as any;
            if (qState.item) {
              setInteractionQueue((prev) => {
                const exists = prev.some((i) => (i.queueId || i.id) === qState.item.id);
                if (exists) {
                  return prev.map((i) => ((i.queueId || i.id) === qState.item.id ? qState.item : i));
                }
                return [...prev, qState.item];
              });
            }
            break;
          }

          case "NEW_INTERACTION_AVAILABLE": {
            const payload = event.payload as NewInteractionAvailablePayload;
            if (payload?.interaction) {
              const item = payload.interaction;
              const newCatalogueItem: InteractionCatalogueItem = {
                id: item.id,
                title: item.name,
                description: item.description,
                creditCost: item.price,
                actionType: item.type,
                sortOrder: 0,
                isEnabled: item.isActive,
              };

              setInteractions((prev) => {
                const exists = prev.some((i) => i.id === item.id);
                if (exists) {
                  return prev.map((i) => (i.id === item.id ? newCatalogueItem : i));
                }
                return [newCatalogueItem, ...prev];
              });

              setNewInteractionAlert(item as any);
              setTimeout(() => {
                setNewInteractionAlert((current) => (current?.id === item.id ? null : current));
              }, 8000);
            }
            break;
          }

          // ---------------------------------------------------------
          // 7. ROOM STATUS
          // ---------------------------------------------------------
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
        console.error("SSE parsing error:", err);
      }
    };

    eventSource.onerror = () => {
      setConnectionStatus("RECONNECTING");
    };

    return () => {
      eventSource.close();
      setConnectionStatus("DISCONNECTED");
    };
  }, [roomConfig?.creatorId, currentUser.id, currentUser.displayName, relationship.fanBadge]);

  // =============================================================
  // ACTION: Send Authoritative Gift (e.g. Sarah sends 500 tokens)
  // =============================================================
  const sendGift = async (params: {
    credits: number;
    giftId?: string;
    giftName?: string;
    giftIcon?: string;
    customMessage?: string;
  }): Promise<boolean> => {
    const creatorId = roomConfig?.creatorId;
    if (!creatorId || params.credits <= 0) return false;

    if (walletBalance < params.credits) {
      return false;
    }

    try {
      const res = await fetch(`/api/realtime/${creatorId}/gift`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fanUserId: currentUser.id,
          credits: params.credits,
          giftId: params.giftId || "gift_custom",
          giftName: params.giftName || "Diamond Spark",
          giftIcon: params.giftIcon || "💎",
          customMessage: params.customMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send gift.");

      if (typeof data.fanRemainingBalance === "number") {
        setWalletBalance(data.fanRemainingBalance);
        updateBalance(data.fanRemainingBalance);
      }
      return true;
    } catch (err: any) {
      console.error("Send gift failed:", err);
      alert(err.message || "Failed to send gift.");
      return false;
    }
  };

  // =============================================================
  // ACTION: Trigger Interaction Menu Item
  // =============================================================
  const triggerInteraction = async (
    item: InteractionCatalogueItem,
    customMessage?: string
  ): Promise<boolean> => {
    const creatorId = roomConfig?.creatorId;
    if (!creatorId || item.creditCost <= 0) return false;

    if (walletBalance < item.creditCost) {
      return false;
    }

    try {
      const res = await fetch(`/api/creators/${creatorId}/interactions/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interactionId: item.id,
          expectedPrice: item.creditCost,
          fanUserId: currentUser.id,
          fanDisplayName: currentUser.displayName,
          fanAvatarUrl: currentUser.avatarUrl,
          customMessage: customMessage || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to trigger interaction.");

      if (data.receipt?.fanRemainingBalance !== undefined) {
        setWalletBalance(data.receipt.fanRemainingBalance);
        updateBalance(data.receipt.fanRemainingBalance);
      }
      return true;
    } catch (err: any) {
      console.error("Trigger interaction failed:", err);
      alert(err.message || "Failed to trigger interaction.");
      return false;
    }
  };

  // =============================================================
  // ACTION: Accept Interaction (Creator Action)
  // =============================================================
  const acceptInteraction = async (queueId: string): Promise<boolean> => {
    const creatorId = roomConfig?.creatorId;
    if (!creatorId) return false;

    try {
      const res = await fetch(`/api/realtime/${creatorId}/interaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACCEPT", queueId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

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
  // ACTION: Chip in Tokens Toward Live Goal
  // =============================================================
  const chipInGoal = async (credits: number): Promise<boolean> => {
    return await sendGift({
      credits,
      giftName: "Goal Support",
      giftIcon: "🎯",
      customMessage: `Chipped in ${credits} tokens toward milestone goal! 🎯`,
    });
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

    // 2. Real-time Connection & Animations
    connectionStatus,
    socketId,
    activeGiftEvent,
    clearActiveGiftEvent: () => setActiveGiftEvent(null),
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
    interactionQueue,
    newInteractionAlert,
    clearNewInteractionAlert: () => setNewInteractionAlert(null),
    ppvVault,
    isTriggeringInteraction,
    triggerInteraction,
    acceptInteraction,
    unlockPPV,

    // 8. Live Goal & Leaderboard
    goal,
    leaderboard,
    chipInGoal,
    sendGift,

    // 9. Creator Live Earnings
    creatorGrossCredits,
    creatorNetUsd,

    // 10. Relationship & Wallet
    relationship,
    toggleFollow,
    walletBalance,
  };
}
