import { NotificationType } from "@prisma/client";

export type NotificationEventType =
  | "CREATOR_WENT_LIVE"
  | "PRIVATE_SESSION_REMINDER"
  | "SUB_RENEWAL"
  | "MESSAGE_RECEIVED"
  | "CONTENT_RELEASE"
  | "GOAL_COMPLETED"
  | "CREATOR_EVENT"
  | "DROP_RELEASE"
  | "TIP_RECEIVED"
  | "NEW_SUBSCRIBER"
  | "INTERACTION_QUEUED"
  | "INTERACTION_EXECUTED"
  | "PRIVATE_BOOKING_REQUEST"
  | "PRIVATE_BOOKING_CONFIRMED"
  | "MODERATION_WARNING"
  | "SYSTEM_ANNOUNCEMENT"
  | "ACHIEVEMENT_UNLOCKED";

export type NotificationChannel = "IN_APP" | "REALTIME_SSE" | "WEB_PUSH" | "EMAIL";

export type NotificationPriority = "URGENT" | "HIGH" | "NORMAL" | "LOW";

export interface UserNotificationPreferences {
  userId: string;
  inAppEnabled: boolean;
  realtimeEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  liveNotifications: boolean;
  quietHoursStart?: number; // 0-23
  quietHoursEnd?: number; // 0-23
  minTiersRequired?: string[];
}

export interface NotificationRecipient {
  userId: string;
  email?: string | null;
  displayName?: string;
  username?: string;
  pushSubscription?: any;
  preferences?: Partial<UserNotificationPreferences>;
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
  imageUrl?: string;
  senderUserId?: string;
  metadata?: Record<string, any>;
}

export type AudienceTarget =
  | { type: "CREATOR_FOLLOWERS"; creatorProfileId: string; tiers?: ("ALL" | "LIVE_ONLY")[] }
  | { type: "CREATOR_SUBSCRIBERS"; creatorProfileId: string; minTier?: string }
  | { type: "GOAL_CONTRIBUTORS"; goalId: string; includeRoomViewers?: boolean; creatorProfileId?: string }
  | { type: "BOOKING_PARTICIPANTS"; bookingId: string; userIds: string[] }
  | { type: "CONVERSATION_PARTICIPANT"; conversationId: string; recipientUserId: string }
  | { type: "DROP_WAITLIST"; dropId: string; creatorProfileId?: string }
  | { type: "EVENT_REGISTRANTS"; eventId: string; creatorProfileId?: string }
  | { type: "SPECIFIC_USERS"; userIds: string[] }
  | { type: "ALL_ACTIVE_USERS" };

export interface NotificationJob {
  id: string;
  eventType: NotificationEventType;
  priority: NotificationPriority;
  payload: NotificationPayload;
  audience: AudienceTarget;
  channels: NotificationChannel[];
  idempotencyKey: string;
  cooldownSeconds?: number;
  createdAt: string;
  retryCount: number;
  maxRetries: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "DEAD_LETTER";
  error?: string;
}

export interface NotificationBatch {
  batchId: string;
  jobId: string;
  batchIndex: number;
  totalBatches: number;
  recipients: NotificationRecipient[];
  payload: NotificationPayload;
  channels: NotificationChannel[];
  timestamp: string;
}

export interface BatchProcessingResult {
  batchId: string;
  jobId: string;
  totalRecipients: number;
  inAppSavedCount: number;
  realtimePushedCount: number;
  pushSentCount: number;
  emailSentCount: number;
  skippedQuietHours: number;
  skippedPreferences: number;
  failedCount: number;
  durationMs: number;
  timestamp: string;
}

export interface QueueHealthStats {
  pendingJobs: number;
  activeJobs: number;
  completedJobsTotal: number;
  failedJobsTotal: number;
  deadLetterJobsTotal: number;
  totalNotificationsDelivered: number;
  averageBatchDurationMs: number;
  throughputPerSecond: number;
  redisConnected: boolean;
  workerActive: boolean;
}

export interface EnqueueNotificationResult {
  success: boolean;
  jobId: string;
  isDuplicate: boolean;
  enqueuedAt: string;
  estimatedAudienceSize?: number;
}
