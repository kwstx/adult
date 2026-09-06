import { redis } from "@/lib/redis";
import {
  NotificationJob,
  QueueHealthStats,
  EnqueueNotificationResult,
  NotificationPriority,
} from "./types";

const QUEUE_KEY_PREFIX = "notifications:jobs";
const DLQ_KEY = `${QUEUE_KEY_PREFIX}:dlq`;
const IDEMPOTENCY_PREFIX = "notifications:idempotency:";

class NotificationQueueService {
  // In-Memory Queue Fallback (ensures zero crashes if Redis is down/local)
  private memoryQueue: NotificationJob[] = [];
  private memoryActiveJobs: Map<string, NotificationJob> = new Map();
  private memoryDlq: NotificationJob[] = [];
  private idempotencyStore: Map<string, number> = new Map();

  // Metrics
  private completedJobsCount = 0;
  private failedJobsCount = 0;
  private totalNotificationsDelivered = 0;
  private totalBatchDurationsMs = 0;
  private totalBatchesProcessed = 0;
  private startTime = Date.now();

  /**
   * Enqueues a notification job asynchronously.
   * Completes in < 5ms.
   */
  public async enqueue(job: Omit<NotificationJob, "id" | "createdAt" | "retryCount" | "status">): Promise<EnqueueNotificationResult> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const fullJob: NotificationJob = {
      ...job,
      id: jobId,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: "PENDING",
    };

    // 1. Idempotency & Cooldown Check
    const cooldown = job.cooldownSeconds || 30;
    const isDuplicate = await this.checkAndSetIdempotency(job.idempotencyKey, cooldown);
    if (isDuplicate) {
      return {
        success: true,
        jobId: `dup_${job.idempotencyKey}`,
        isDuplicate: true,
        enqueuedAt: new Date().toISOString(),
      };
    }

    // 2. Push to Redis or Memory Queue
    try {
      if (redis.status === "ready") {
        const priorityScore = this.getPriorityScore(fullJob.priority);
        await redis.zadd(`${QUEUE_KEY_PREFIX}:zset`, priorityScore, JSON.stringify(fullJob));
      } else {
        this.enqueueInMemory(fullJob);
      }
    } catch {
      // Fallback to in-memory on any Redis failure
      this.enqueueInMemory(fullJob);
    }

    return {
      success: true,
      jobId,
      isDuplicate: false,
      enqueuedAt: fullJob.createdAt,
    };
  }

  /**
   * Dequeues the next highest priority job.
   */
  public async dequeue(): Promise<NotificationJob | null> {
    try {
      if (redis.status === "ready") {
        // Pop highest priority job (lowest score first)
        const results = await redis.zpopmin(`${QUEUE_KEY_PREFIX}:zset`, 1);
        if (results && results.length >= 2) {
          const jobJson = results[0];
          const job: NotificationJob = JSON.parse(jobJson);
          job.status = "PROCESSING";
          return job;
        }
      }
    } catch {
      // fallback to memory
    }

    return this.dequeueFromMemory();
  }

  /**
   * Marks a job as completed and updates metrics.
   */
  public recordJobCompletion(jobId: string, notificationsDelivered: number, durationMs: number) {
    this.completedJobsCount++;
    this.totalNotificationsDelivered += notificationsDelivered;
    this.totalBatchDurationsMs += durationMs;
    this.totalBatchesProcessed++;
    this.memoryActiveJobs.delete(jobId);
  }

  /**
   * Handles job failure with retry or DLQ routing.
   */
  public async recordJobFailure(job: NotificationJob, error: string) {
    job.retryCount++;
    job.error = error;

    if (job.retryCount >= job.maxRetries) {
      job.status = "DEAD_LETTER";
      this.failedJobsCount++;
      try {
        if (redis.status === "ready") {
          await redis.rpush(DLQ_KEY, JSON.stringify(job));
        } else {
          this.memoryDlq.push(job);
        }
      } catch {
        this.memoryDlq.push(job);
      }
    } else {
      job.status = "PENDING";
      // Exponential backoff re-queue
      const backoffScore = Date.now() + Math.pow(2, job.retryCount) * 1000;
      try {
        if (redis.status === "ready") {
          await redis.zadd(`${QUEUE_KEY_PREFIX}:zset`, backoffScore, JSON.stringify(job));
        } else {
          this.enqueueInMemory(job);
        }
      } catch {
        this.enqueueInMemory(job);
      }
    }

    this.memoryActiveJobs.delete(job.id);
  }

  /**
   * Returns live health and telemetry statistics.
   */
  public async getHealthStats(): Promise<QueueHealthStats> {
    let pendingJobs = this.memoryQueue.length;

    try {
      if (redis.status === "ready") {
        const redisCount = await redis.zcard(`${QUEUE_KEY_PREFIX}:zset`);
        pendingJobs = redisCount;
      }
    } catch {}

    const uptimeSeconds = Math.max(1, (Date.now() - this.startTime) / 1000);
    const avgDuration =
      this.totalBatchesProcessed > 0
        ? Math.round(this.totalBatchDurationsMs / this.totalBatchesProcessed)
        : 0;

    return {
      pendingJobs,
      activeJobs: this.memoryActiveJobs.size,
      completedJobsTotal: this.completedJobsCount,
      failedJobsTotal: this.failedJobsCount,
      deadLetterJobsTotal: this.memoryDlq.length,
      totalNotificationsDelivered: this.totalNotificationsDelivered,
      averageBatchDurationMs: avgDuration,
      throughputPerSecond: parseFloat(
        (this.totalNotificationsDelivered / uptimeSeconds).toFixed(2)
      ),
      redisConnected: redis.status === "ready",
      workerActive: true,
    };
  }

  // --- Internal Helpers ---

  private async checkAndSetIdempotency(key: string, cooldownSeconds: number): Promise<boolean> {
    const now = Date.now();
    const redisKey = `${IDEMPOTENCY_PREFIX}${key}`;

    try {
      if (redis.status === "ready") {
        const setSuccess = await redis.set(redisKey, "1", "EX", cooldownSeconds, "NX");
        return setSuccess === null; // If null, key already existed -> duplicate!
      }
    } catch {}

    // In-memory idempotency check
    const existing = this.idempotencyStore.get(key);
    if (existing && now - existing < cooldownSeconds * 1000) {
      return true;
    }
    this.idempotencyStore.set(key, now);
    return false;
  }

  private getPriorityScore(priority: NotificationPriority): number {
    // Lower score pops first in zpopmin
    switch (priority) {
      case "URGENT":
        return 100;
      case "HIGH":
        return 200;
      case "NORMAL":
        return 300;
      case "LOW":
        return 400;
      default:
        return 300;
    }
  }

  private enqueueInMemory(job: NotificationJob) {
    // Sort by priority on insert
    this.memoryQueue.push(job);
    this.memoryQueue.sort((a, b) => this.getPriorityScore(a.priority) - this.getPriorityScore(b.priority));
  }

  private dequeueFromMemory(): NotificationJob | null {
    const job = this.memoryQueue.shift() || null;
    if (job) {
      job.status = "PROCESSING";
      this.memoryActiveJobs.set(job.id, job);
    }
    return job;
  }
}

// Global Singleton for Next.js hot-reload persistence
const globalQueue = globalThis as unknown as {
  __notificationQueueService?: NotificationQueueService;
};

export const notificationQueue =
  globalQueue.__notificationQueueService ?? new NotificationQueueService();

if (process.env.NODE_ENV !== "production") {
  globalQueue.__notificationQueueService = notificationQueue;
}
