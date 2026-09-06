import { redis } from "@/lib/redis";
import {
  Job,
  JobOptions,
  JobPriority,
  JobType,
  QueueMetrics,
} from "../types";

const QUEUE_PREFIX = "bg_worker:queue";
const ZSET_KEY = `${QUEUE_PREFIX}:priority_zset`;
const DELAYED_ZSET_KEY = `${QUEUE_PREFIX}:delayed_zset`;
const DLQ_LIST_KEY = `${QUEUE_PREFIX}:dlq`;
const IDEMPOTENCY_PREFIX = "bg_worker:idempotency:";
const METRICS_HASH_KEY = `${QUEUE_PREFIX}:metrics`;

export class JobQueue {
  private memoryQueue: Job[] = [];
  private memoryDelayedQueue: Array<{ runAt: number; job: Job }> = [];
  private memoryActiveJobs: Map<string, Job> = new Map();
  private memoryDlq: Job[] = [];
  private memoryIdempotency: Map<string, number> = new Map();

  // Metric counters
  private completedCount = 0;
  private failedCount = 0;
  private totalDurationMs = 0;
  private jobsByTypeCount: Record<string, number> = {};
  private startTime = Date.now();

  /**
   * Enqueues a typed job into the background queue.
   */
  public async enqueue<T>(
    type: JobType,
    payload: T,
    options: JobOptions = {}
  ): Promise<{ jobId: string; isDuplicate: boolean }> {
    const {
      priority = "NORMAL",
      maxRetries = 3,
      timeoutMs = 60000,
      delayMs = 0,
      idempotencyKey,
      cooldownSeconds = 60,
    } = options;

    // 1. Deduplication / Idempotency Check
    if (idempotencyKey) {
      const isDuplicate = await this.checkIdempotency(idempotencyKey, cooldownSeconds);
      if (isDuplicate) {
        return { jobId: `dedup_${idempotencyKey}`, isDuplicate: true };
      }
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const job: Job<T> = {
      id: jobId,
      type,
      payload,
      priority,
      status: "PENDING",
      retryCount: 0,
      maxRetries,
      timeoutMs,
      idempotencyKey,
      createdAt: new Date().toISOString(),
      progress: 0,
    };

    // Track metric by type
    this.jobsByTypeCount[type] = (this.jobsByTypeCount[type] || 0) + 1;

    // 2. Queue in Redis or Memory Fallback
    if (delayMs > 0) {
      const runAt = Date.now() + delayMs;
      await this.enqueueDelayed(job, runAt);
    } else {
      await this.enqueueReady(job);
    }

    return { jobId, isDuplicate: false };
  }

  /**
   * Dequeues the next highest-priority ready job.
   */
  public async dequeue(): Promise<Job | null> {
    // 1. Promote any delayed jobs whose runAt has passed
    await this.promoteDelayedJobs();

    // 2. Pop next ready job from Redis or Memory
    try {
      if (redis.status === "ready") {
        // Pops item with lowest score (highest priority)
        const results = await redis.zpopmin(ZSET_KEY, 1);
        if (results && results.length >= 2) {
          const rawJob = results[0];
          const job: Job = JSON.parse(rawJob);
          job.status = "PROCESSING";
          job.startedAt = new Date().toISOString();
          this.memoryActiveJobs.set(job.id, job);
          return job;
        }
      }
    } catch {
      // Fallback to memory
    }

    return this.dequeueFromMemory();
  }

  /**
   * Records successful completion of a job.
   */
  public async recordSuccess(job: Job, durationMs: number): Promise<void> {
    job.status = "COMPLETED";
    job.completedAt = new Date().toISOString();
    job.progress = 100;

    this.completedCount++;
    this.totalDurationMs += durationMs;
    this.memoryActiveJobs.delete(job.id);

    try {
      if (redis.status === "ready") {
        await redis.hincrby(METRICS_HASH_KEY, "completed", 1);
        await redis.hincrby(METRICS_HASH_KEY, "totalDurationMs", durationMs);
      }
    } catch {}
  }

  /**
   * Records failure of a job, deciding whether to retry with exponential backoff or send to DLQ.
   */
  public async recordFailure(job: Job, errorMsg: string): Promise<boolean> {
    job.retryCount++;
    job.error = errorMsg;

    if (job.retryCount >= job.maxRetries) {
      // Max retries exhausted -> Move to Dead Letter Queue (DLQ)
      job.status = "DEAD_LETTER";
      this.failedCount++;
      this.memoryActiveJobs.delete(job.id);

      try {
        if (redis.status === "ready") {
          await redis.rpush(DLQ_LIST_KEY, JSON.stringify(job));
          await redis.hincrby(METRICS_HASH_KEY, "deadLetter", 1);
        } else {
          this.memoryDlq.push(job);
        }
      } catch {
        this.memoryDlq.push(job);
      }
      return false; // Not retryable
    } else {
      // Exponential backoff with jitter
      job.status = "PENDING";
      const baseDelay = Math.pow(2, job.retryCount) * 1000;
      const jitter = Math.floor(Math.random() * 500);
      const delayMs = Math.min(30000, baseDelay + jitter);
      const runAt = Date.now() + delayMs;

      this.memoryActiveJobs.delete(job.id);
      await this.enqueueDelayed(job, runAt);
      return true; // Will retry
    }
  }

  /**
   * Updates in-flight job progress (0 - 100).
   */
  public async updateJobProgress(jobId: string, percent: number): Promise<void> {
    const job = this.memoryActiveJobs.get(jobId);
    if (job) {
      job.progress = Math.min(100, Math.max(0, percent));
    }
  }

  /**
   * Gets Dead Letter Queue items for inspection or replay.
   */
  public async getDlqItems(limit = 50): Promise<Job[]> {
    try {
      if (redis.status === "ready") {
        const items = await redis.lrange(DLQ_LIST_KEY, 0, limit - 1);
        return items.map((i) => JSON.parse(i));
      }
    } catch {}
    return this.memoryDlq.slice(0, limit);
  }

  /**
   * Returns live telemetry and health stats.
   */
  public async getMetrics(isWorkerActive: boolean): Promise<QueueMetrics> {
    let pendingCount = this.memoryQueue.length + this.memoryDelayedQueue.length;
    let dlqCount = this.memoryDlq.length;

    try {
      if (redis.status === "ready") {
        const [zCount, dCount, lCount] = await Promise.all([
          redis.zcard(ZSET_KEY),
          redis.zcard(DELAYED_ZSET_KEY),
          redis.llen(DLQ_LIST_KEY),
        ]);
        pendingCount = zCount + dCount;
        dlqCount = lCount;
      }
    } catch {}

    const uptimeSeconds = Math.max(1, (Date.now() - this.startTime) / 1000);
    const avgDuration =
      this.completedCount > 0
        ? Math.round(this.totalDurationMs / this.completedCount)
        : 0;

    return {
      pendingJobs: pendingCount,
      activeJobs: this.memoryActiveJobs.size,
      completedJobsTotal: this.completedCount,
      failedJobsTotal: this.failedCount,
      deadLetterJobsTotal: dlqCount,
      throughputPerSecond: parseFloat((this.completedCount / uptimeSeconds).toFixed(2)),
      averageJobDurationMs: avgDuration,
      redisConnected: redis.status === "ready",
      workerPoolActive: isWorkerActive,
      jobsByType: { ...this.jobsByTypeCount },
    };
  }

  // ============================================================================
  // INTERNAL HELPERS
  // ============================================================================

  private calculatePriorityScore(priority: JobPriority): number {
    // Lower score is pulled first by zpopmin
    switch (priority) {
      case "CRITICAL":
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

  private async checkIdempotency(key: string, cooldownSeconds: number): Promise<boolean> {
    const redisKey = `${IDEMPOTENCY_PREFIX}${key}`;
    try {
      if (redis.status === "ready") {
        const setRes = await redis.set(redisKey, "1", "EX", cooldownSeconds, "NX");
        return setRes === null; // If null, key exists -> duplicate
      }
    } catch {}

    const now = Date.now();
    const existing = this.memoryIdempotency.get(key);
    if (existing && now - existing < cooldownSeconds * 1000) {
      return true;
    }
    this.memoryIdempotency.set(key, now);
    return false;
  }

  private async enqueueReady(job: Job): Promise<void> {
    const score = this.calculatePriorityScore(job.priority);
    try {
      if (redis.status === "ready") {
        await redis.zadd(ZSET_KEY, score, JSON.stringify(job));
        return;
      }
    } catch {}

    this.memoryQueue.push(job);
    this.memoryQueue.sort(
      (a, b) => this.calculatePriorityScore(a.priority) - this.calculatePriorityScore(b.priority)
    );
  }

  private async enqueueDelayed(job: Job, runAt: number): Promise<void> {
    try {
      if (redis.status === "ready") {
        await redis.zadd(DELAYED_ZSET_KEY, runAt, JSON.stringify(job));
        return;
      }
    } catch {}

    this.memoryDelayedQueue.push({ runAt, job });
    this.memoryDelayedQueue.sort((a, b) => a.runAt - b.runAt);
  }

  private async promoteDelayedJobs(): Promise<void> {
    const now = Date.now();
    try {
      if (redis.status === "ready") {
        // Find all jobs ready to run (score <= now)
        const readyItems = await redis.zrangebyscore(DELAYED_ZSET_KEY, 0, now);
        if (readyItems && readyItems.length > 0) {
          for (const item of readyItems) {
            const job: Job = JSON.parse(item);
            const score = this.calculatePriorityScore(job.priority);
            await redis.zadd(ZSET_KEY, score, item);
            await redis.zrem(DELAYED_ZSET_KEY, item);
          }
        }
      }
    } catch {}

    // Memory delayed promotion
    while (this.memoryDelayedQueue.length > 0 && this.memoryDelayedQueue[0].runAt <= now) {
      const entry = this.memoryDelayedQueue.shift()!;
      this.memoryQueue.push(entry.job);
      this.memoryQueue.sort(
        (a, b) =>
          this.calculatePriorityScore(a.priority) - this.calculatePriorityScore(b.priority)
      );
    }
  }

  private dequeueFromMemory(): Job | null {
    const job = this.memoryQueue.shift() || null;
    if (job) {
      job.status = "PROCESSING";
      job.startedAt = new Date().toISOString();
      this.memoryActiveJobs.set(job.id, job);
    }
    return job;
  }
}

// Global Singleton
const globalForQueue = globalThis as unknown as {
  __globalJobQueue?: JobQueue;
};

export const jobQueue = globalForQueue.__globalJobQueue ?? new JobQueue();

if (process.env.NODE_ENV !== "production") {
  globalForQueue.__globalJobQueue = jobQueue;
}
