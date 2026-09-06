/**
 * Background Worker System - Core Type Definitions
 * 
 * Supports production-grade queueing, priorities, retry policies,
 * idempotency, telemetry, and typed payloads for all 11 asynchronous job domains.
 */

export type JobPriority = "CRITICAL" | "HIGH" | "NORMAL" | "LOW";

export type JobStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "DEAD_LETTER";

export type JobType =
  | "VIDEO_PROCESS"
  | "THUMBNAIL_GENERATE"
  | "CONTENT_MODERATE"
  | "NOTIFICATION_SEND"
  | "EMAIL_SEND"
  | "SEARCH_INDEX_UPDATE"
  | "ANALYTICS_CALCULATE"
  | "LEADERBOARD_GENERATE"
  | "PAYOUT_PROCESS"
  | "FRAUD_DETECT"
  | "RECOMMENDATIONS_CALCULATE";

export interface JobOptions {
  priority?: JobPriority;
  maxRetries?: number;
  timeoutMs?: number;
  delayMs?: number;
  idempotencyKey?: string;
  cooldownSeconds?: number;
}

export interface Job<T = any> {
  id: string;
  type: JobType;
  payload: T;
  priority: JobPriority;
  status: JobStatus;
  retryCount: number;
  maxRetries: number;
  timeoutMs: number;
  idempotencyKey?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  progress?: number; // 0 to 100
}

export interface JobResult<R = any> {
  success: boolean;
  jobId: string;
  type: JobType;
  durationMs: number;
  data?: R;
  error?: string;
  retryable?: boolean;
}

export interface WorkerHandler<T = any, R = any> {
  (job: Job<T>, updateProgress: (percent: number) => Promise<void>): Promise<R>;
}

// ============================================================================
// PAYLOAD INTERFACES FOR THE 11 CONCRETE WORKERS
// ============================================================================

/** 1. Process Video Payload */
export interface VideoProcessPayload {
  contentId?: string;
  livestreamId?: string;
  creatorId: string;
  sourceFileKey: string;
  sourceUrl: string;
  mimeType: string;
  renditions?: Array<"1080p" | "720p" | "480p" | "360p">;
  generateHls?: boolean;
  watermark?: boolean;
}

export interface VideoProcessResult {
  contentId?: string;
  durationSeconds: number;
  resolutions: string[];
  hlsManifestUrl?: string;
  mp4Urls: Record<string, string>;
  fileSizeBytes: number;
  bitrateKbps: number;
}

/** 2. Generate Thumbnail Payload */
export interface ThumbnailGeneratePayload {
  contentId?: string;
  livestreamId?: string;
  creatorId: string;
  videoUrl: string;
  timestampsSeconds?: number[]; // e.g. [5, 15, 30]
  dimensions?: Array<{ width: number; height: number }>;
  generateAnimatedPreview?: boolean;
  generateBlurhash?: boolean;
}

export interface ThumbnailGenerateResult {
  contentId?: string;
  thumbnailUrls: string[];
  primaryThumbnailUrl: string;
  animatedWebpUrl?: string;
  blurhash?: string;
}

/** 3. Moderate Content Payload */
export interface ContentModeratePayload {
  contentId?: string;
  livestreamId?: string;
  creatorId: string;
  contentType: "VIDEO" | "PHOTO" | "AUDIO" | "TEXT" | "LIVESTREAM_FRAME";
  mediaUrl?: string;
  textSnippet?: string;
  checkUnderage2257: boolean;
  checkNsfwClassification: boolean;
  checkBannedKeywords: boolean;
  strictness: "LOW" | "STANDARD" | "HIGH";
}

export interface ContentModerateResult {
  contentId?: string;
  passed: boolean;
  riskScore: number; // 0.0 - 1.0
  flags: string[];
  actionTaken: "APPROVED" | "QUARANTINED" | "ESCALATED_TO_MODERATORS" | "BANNED";
  moderationCaseId?: string;
}

/** 4. Send Notification Payload */
export interface NotificationSendPayload {
  recipientUserIds: string[];
  type: string;
  title: string;
  body: string;
  channels: Array<"IN_APP" | "REALTIME_SSE" | "WEB_PUSH" | "SMS">;
  priority?: JobPriority;
  actionUrl?: string;
  senderUserId?: string;
  metadata?: Record<string, any>;
}

export interface NotificationSendResult {
  totalTargeted: number;
  deliveredInApp: number;
  deliveredRealtime: number;
  deliveredWebPush: number;
  skippedQuietHours: number;
  failedCount: number;
}

/** 5. Send Email Payload */
export interface EmailSendPayload {
  to: string;
  toName?: string;
  template:
    | "KYC_APPROVED"
    | "KYC_REJECTED"
    | "PURCHASE_RECEIPT"
    | "PAYOUT_CLEARED"
    | "PAYOUT_PROCESSED"
    | "SECURITY_ALERT"
    | "CREATOR_GO_LIVE"
    | "WEEKLY_DIGEST";
  subject: string;
  variables: Record<string, any>;
  attachments?: Array<{ filename: string; url: string }>;
}

export interface EmailSendResult {
  messageId: string;
  recipient: string;
  deliveredAt: string;
  provider: string;
}

/** 6. Update Search Index Payload */
export interface SearchIndexUpdatePayload {
  entityType: "CREATOR" | "LIVESTREAM" | "CONTENT" | "PRODUCT";
  entityId: string;
  action: "UPSERT" | "DELETE" | "REINDEX_ALL";
  documentData?: Record<string, any>;
}

export interface SearchIndexUpdateResult {
  indexedEntities: number;
  indexName: string;
  action: string;
}

/** 7. Calculate Analytics Payload */
export interface AnalyticsCalculatePayload {
  timeframe: "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY";
  creatorId?: string;
  livestreamId?: string;
  targetDate?: string; // ISO date string
}

export interface AnalyticsCalculateResult {
  recordsAggregated: number;
  totalRevenueCalculated: number;
  uniqueViewersCalculated: number;
  retentionCalculated: boolean;
  computedAt: string;
}

/** 8. Generate Leaderboard Payload */
export interface LeaderboardGeneratePayload {
  scope: "GLOBAL_PLATFORM" | "CREATOR_ROOM" | "LIVESTREAM_SESSION";
  timeframe: "ALL_TIME" | "MONTHLY" | "WEEKLY" | "DAILY" | "STREAM_SESSION";
  creatorProfileId?: string;
  livestreamId?: string;
  limit?: number;
}

export interface LeaderboardGenerateResult {
  scope: string;
  timeframe: string;
  rankedCount: number;
  topRankedUserId?: string;
  topScore?: number;
  cachedInRedis: boolean;
}

/** 9. Process Payout Payload */
export interface PayoutProcessPayload {
  payoutId: string;
  creatorProfileId: string;
  amountCredits: number;
  payoutMethod: string;
  payoutDestination: string;
  bypassComplianceHold?: boolean;
}

export interface PayoutProcessResult {
  payoutId: string;
  status: "COMPLETED" | "REJECTED" | "HELD_COMPLIANCE";
  amountPaidCents: number;
  platformRakeCents: number;
  gatewayTransactionReference: string;
  clearedAt: string;
}

/** 10. Detect Suspicious Behavior Payload */
export interface FraudDetectPayload {
  userId: string;
  triggerEvent:
    | "RAPID_WALLET_DRAIN"
    | "CARD_VELOCITY_SPIKE"
    | "CHARGEBACK_SPIKE"
    | "UNUSUAL_GEO_LOCATION"
    | "SUSPICIOUS_TIP_PATTERN"
    | "UNDERAGE_CHAT_RISK";
  metadata: {
    transactionAmount?: number;
    ipAddress?: string;
    userAgent?: string;
    targetCreatorId?: string;
    chatContent?: string;
    cardLast4?: string;
  };
}

export interface FraudDetectResult {
  userId: string;
  riskScore: number; // 0.0 to 1.0
  isActionRequired: boolean;
  autoActionTaken?: "WALLET_FROZEN" | "ACCOUNT_SUSPENDED" | "SHADOWBANNED" | "FLAGGED_FOR_AUDIT";
  moderationCaseId?: string;
  auditEventId?: string;
}

/** 11. Calculate Recommendations Payload */
export interface RecommendationsCalculatePayload {
  userId?: string; // If undefined, batch computes for active users
  creatorId?: string;
  precomputeFeeds?: boolean;
  topK?: number;
}

export interface RecommendationsCalculateResult {
  usersUpdatedCount: number;
  topCategoriesComputed: string[];
  feedCacheWarmed: boolean;
  durationMs: number;
}

// ============================================================================
// TELEMETRY & QUEUE METRICS
// ============================================================================

export interface QueueMetrics {
  pendingJobs: number;
  activeJobs: number;
  completedJobsTotal: number;
  failedJobsTotal: number;
  deadLetterJobsTotal: number;
  throughputPerSecond: number;
  averageJobDurationMs: number;
  redisConnected: boolean;
  workerPoolActive: boolean;
  jobsByType: Record<string, number>;
}
