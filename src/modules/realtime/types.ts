export type RealtimeEventType =
  | "CHAT_MESSAGE"
  | "TIP_EVENT"
  | "GOAL_UPDATED"
  | "PRESENCE_COUNT"
  | "ROOM_STATUS"
  | "MODERATION_ACTION";

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
  createdAt: Date;
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
  createdAt: Date;
}

export interface PresencePayload {
  creatorId: string;
  viewerCount: number;
}
