import { jobQueue } from "./job-queue";
import {
  JobOptions,
  JobType,
  VideoProcessPayload,
  ThumbnailGeneratePayload,
  ContentModeratePayload,
  NotificationSendPayload,
  EmailSendPayload,
  SearchIndexUpdatePayload,
  AnalyticsCalculatePayload,
  LeaderboardGeneratePayload,
  PayoutProcessPayload,
  FraudDetectPayload,
  RecommendationsCalculatePayload,
} from "../types";

export class JobDispatcher {
  /**
   * Generic job enqueueing method
   */
  public async dispatch<T>(
    type: JobType,
    payload: T,
    options?: JobOptions
  ): Promise<{ jobId: string; isDuplicate: boolean }> {
    return jobQueue.enqueue(type, payload, options);
  }

  // ============================================================================
  // TYPED DISPATCH HELPERS FOR THE 11 CONCRETE WORKER DOMAINS
  // ============================================================================

  /** 1. Enqueue Video Transcoding */
  public async dispatchVideoProcessing(
    payload: VideoProcessPayload,
    options: JobOptions = { priority: "HIGH", timeoutMs: 300000 }
  ) {
    return this.dispatch("VIDEO_PROCESS", payload, options);
  }

  /** 2. Enqueue Thumbnail Generation */
  public async dispatchThumbnailGeneration(
    payload: ThumbnailGeneratePayload,
    options: JobOptions = { priority: "NORMAL", timeoutMs: 60000 }
  ) {
    return this.dispatch("THUMBNAIL_GENERATE", payload, options);
  }

  /** 3. Enqueue Content Moderation Scan */
  public async dispatchContentModeration(
    payload: ContentModeratePayload,
    options: JobOptions = { priority: "CRITICAL", timeoutMs: 45000 }
  ) {
    return this.dispatch("CONTENT_MODERATE", payload, options);
  }

  /** 4. Enqueue High-Throughput Notification Send */
  public async dispatchNotification(
    payload: NotificationSendPayload,
    options: JobOptions = { priority: "NORMAL", timeoutMs: 30000 }
  ) {
    return this.dispatch("NOTIFICATION_SEND", payload, options);
  }

  /** 5. Enqueue Transactional Email */
  public async dispatchEmail(
    payload: EmailSendPayload,
    options: JobOptions = { priority: "NORMAL", maxRetries: 5, timeoutMs: 20000 }
  ) {
    return this.dispatch("EMAIL_SEND", payload, options);
  }

  /** 6. Enqueue Search Index Synchronization */
  public async dispatchSearchIndexUpdate(
    payload: SearchIndexUpdatePayload,
    options: JobOptions = { priority: "LOW", timeoutMs: 30000 }
  ) {
    return this.dispatch("SEARCH_INDEX_UPDATE", payload, options);
  }

  /** 7. Enqueue Analytics Calculation Rollup */
  public async dispatchAnalyticsCalculation(
    payload: AnalyticsCalculatePayload,
    options: JobOptions = { priority: "LOW", timeoutMs: 120000 }
  ) {
    return this.dispatch("ANALYTICS_CALCULATE", payload, options);
  }

  /** 8. Enqueue Leaderboard Generation */
  public async dispatchLeaderboardGeneration(
    payload: LeaderboardGeneratePayload,
    options: JobOptions = { priority: "NORMAL", timeoutMs: 60000 }
  ) {
    return this.dispatch("LEADERBOARD_GENERATE", payload, options);
  }

  /** 9. Enqueue Creator Payout Processing */
  public async dispatchPayoutProcessing(
    payload: PayoutProcessPayload,
    options: JobOptions = { priority: "CRITICAL", maxRetries: 3, timeoutMs: 60000 }
  ) {
    return this.dispatch("PAYOUT_PROCESS", payload, options);
  }

  /** 10. Enqueue Suspicious Behavior / Fraud Analysis */
  public async dispatchFraudDetection(
    payload: FraudDetectPayload,
    options: JobOptions = { priority: "CRITICAL", timeoutMs: 30000 }
  ) {
    return this.dispatch("FRAUD_DETECT", payload, options);
  }

  /** 11. Enqueue Recommendations Feed Calculation */
  public async dispatchRecommendationsCalculation(
    payload: RecommendationsCalculatePayload,
    options: JobOptions = { priority: "LOW", timeoutMs: 180000 }
  ) {
    return this.dispatch("RECOMMENDATIONS_CALCULATE", payload, options);
  }
}

export const jobDispatcher = new JobDispatcher();
