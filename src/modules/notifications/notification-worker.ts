import { notificationQueue } from "./notification-queue.service";
import { AudienceResolver } from "./audience-resolver";
import { InAppTransport } from "./transports/in-app.transport";
import { RealtimeSseTransport } from "./transports/realtime-sse.transport";
import { WebPushTransport } from "./transports/web-push.transport";
import {
  NotificationJob,
  NotificationRecipient,
  BatchProcessingResult,
} from "./types";

const BATCH_CHUNK_SIZE = 500;

export class NotificationWorker {
  private isProcessing = false;
  private isLoopRunning = false;
  private loopIntervalTimer: NodeJS.Timeout | null = null;

  /**
   * Starts the background processing loop.
   */
  public startWorkerLoop(intervalMs = 250) {
    if (this.isLoopRunning) return;
    this.isLoopRunning = true;

    this.loopIntervalTimer = setInterval(async () => {
      if (!this.isProcessing) {
        await this.processNextJob();
      }
    }, intervalMs);
  }

  /**
   * Stops the background worker loop.
   */
  public stopWorkerLoop() {
    if (this.loopIntervalTimer) {
      clearInterval(this.loopIntervalTimer);
      this.loopIntervalTimer = null;
    }
    this.isLoopRunning = false;
  }

  /**
   * Processes a single notification job from the queue.
   */
  public async processNextJob(): Promise<BatchProcessingResult[] | null> {
    const job = await notificationQueue.dequeue();
    if (!job) return null;

    this.isProcessing = true;
    const startOverall = Date.now();
    const batchResults: BatchProcessingResult[] = [];
    let totalRecipientsDelivered = 0;

    try {
      let batchIndex = 0;
      const recipientChunks = AudienceResolver.resolveRecipientChunks(
        job.audience,
        BATCH_CHUNK_SIZE
      );

      for await (const recipients of recipientChunks) {
        if (recipients.length === 0) continue;
        batchIndex++;

        const batchStart = Date.now();
        const filteredRecipients = this.filterRecipientsByPreferences(recipients, job);

        const inAppPromise = job.channels.includes("IN_APP")
          ? InAppTransport.deliverBatch(filteredRecipients, job.payload)
          : Promise.resolve({ savedCount: 0, errors: 0 });

        const realtimeResult = job.channels.includes("REALTIME_SSE")
          ? RealtimeSseTransport.deliverBatch(filteredRecipients, job.payload)
          : { deliveredCount: 0 };

        const pushPromise = job.channels.includes("WEB_PUSH")
          ? WebPushTransport.deliverBatch(filteredRecipients, job.payload)
          : Promise.resolve({ sentCount: 0, failedCount: 0 });

        const [inAppResult, pushResult] = await Promise.all([inAppPromise, pushPromise]);

        const batchDuration = Date.now() - batchStart;
        totalRecipientsDelivered += filteredRecipients.length;

        const result: BatchProcessingResult = {
          batchId: `batch_${job.id}_${batchIndex}`,
          jobId: job.id,
          totalRecipients: filteredRecipients.length,
          inAppSavedCount: inAppResult.savedCount,
          realtimePushedCount: realtimeResult.deliveredCount,
          pushSentCount: pushResult.sentCount,
          emailSentCount: 0,
          skippedQuietHours: recipients.length - filteredRecipients.length,
          skippedPreferences: 0,
          failedCount: inAppResult.errors + pushResult.failedCount,
          durationMs: batchDuration,
          timestamp: new Date().toISOString(),
        };

        batchResults.push(result);
      }

      const totalDuration = Date.now() - startOverall;
      notificationQueue.recordJobCompletion(job.id, totalRecipientsDelivered, totalDuration);

      return batchResults;
    } catch (error: any) {
      console.error(`[NotificationWorker] Job ${job.id} failed:`, error);
      await notificationQueue.recordJobFailure(job, error.message || "Batch processing failed");
      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Drains and processes all pending jobs in the queue.
   */
  public async drainQueue(): Promise<BatchProcessingResult[]> {
    const allResults: BatchProcessingResult[] = [];
    let hasMore = true;

    while (hasMore) {
      const results = await this.processNextJob();
      if (results && results.length > 0) {
        allResults.push(...results);
      } else {
        hasMore = false;
      }
    }

    return allResults;
  }

  /**
   * Checks recipient quiet hours and preference toggles.
   */
  private filterRecipientsByPreferences(
    recipients: NotificationRecipient[],
    job: NotificationJob
  ): NotificationRecipient[] {
    const currentHour = new Date().getUTCHours();

    return recipients.filter((r) => {
      // URGENT notifications (e.g. private session reminders) bypass quiet hours
      if (job.priority === "URGENT") return true;

      const prefs = r.preferences;
      if (!prefs) return true;

      if (prefs.inAppEnabled === false && prefs.pushEnabled === false && prefs.realtimeEnabled === false) {
        return false;
      }

      if (prefs.quietHoursStart !== undefined && prefs.quietHoursEnd !== undefined) {
        if (prefs.quietHoursStart < prefs.quietHoursEnd) {
          if (currentHour >= prefs.quietHoursStart && currentHour < prefs.quietHoursEnd) {
            return false;
          }
        } else {
          // Crosses midnight
          if (currentHour >= prefs.quietHoursStart || currentHour < prefs.quietHoursEnd) {
            return false;
          }
        }
      }

      return true;
    });
  }
}

// Global Singleton for Next.js hot reload
const globalWorker = globalThis as unknown as {
  __notificationWorker?: NotificationWorker;
};

export const notificationWorker =
  globalWorker.__notificationWorker ?? new NotificationWorker();

if (process.env.NODE_ENV !== "production") {
  globalWorker.__notificationWorker = notificationWorker;
}

// Auto-start worker loop in background
notificationWorker.startWorkerLoop();
