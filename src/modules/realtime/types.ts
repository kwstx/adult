export type RealtimeEventType =
  | "CHAT_MESSAGE"
  | "TIP_EVENT"
  | "GOAL_UPDATED"
  | "PRESENCE_COUNT"
  | "ROOM_STATUS"
  | "INTERACTION_TRIGGERED"
  | "RELATIONSHIP_UPDATE"
  | "MODERATION_ACTION"
  | "CONNECTED"
  | "HEARTBEAT";

export interface RealtimeEvent<T = unknown> {
  type: RealtimeEventType;
  payload: T;
  channel?: string;
  timestamp?: number;
}

export interface TipEventPayload {
  tipId: string;
  senderName: string;
  senderId: string;
  credits: number;
  actionTitle?: string;
  customMessage?: string;
  newGoalProgress: number;
  goalTarget: number;
  createdAt: Date | string;
}

export interface ChatMessagePayload {
  id: string;
  creatorId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderBadge?: string | null;
  text: string;
  isTipNotice?: boolean;
  tipAmount?: number;
  tipActionName?: string | null;
  createdAt: Date | string;
}

export interface PresencePayload {
  creatorId: string;
  viewerCount: number;
}

export interface InteractionTriggeredPayload {
  interactionId: string;
  title: string;
  actionType: string;
  senderName: string;
  senderId: string;
  creditCost: number;
}
