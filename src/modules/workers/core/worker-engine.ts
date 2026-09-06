import { jobQueue, JobQueue } from "./job-queue";
import {
  Job,
  JobResult,
  JobType,
  WorkerHandler,
} from "../types";

export interface WorkerEngineOptions {
  concurrency?: number;
  pollIntervalMs?: number;
  shutdownTimeoutMs?: number;
}

export class WorkerEngine {
  private queue: JobQueue;
  private handlers: Map<JobType, WorkerHandler> = new Map();
  private isRunning = false;
  private isShuttingDown = false;
  private activeExecutions = new Set<Promise<any>>();
  private concurrency: number;
  private pollIntervalMs: number;
  private shutdownTimeoutMs: number;
  private loopTimer: NodeJS.Timeout | null = null;

  constructor(options: WorkerEngineOptions = {}, queue = jobQueue) {
    this.queue = queue;
    this.concurrency = options.concurrency || 5;
    this.pollIntervalMs = options.pollIntervalMs || 100;
    this.shutdownTimeoutMs = options.shutdownTimeoutMs || 10000;
  }

  /**
   * Registers a dedicated worker handler for a specific job type.
   */
  public registerHandler<T = any, R = any>(
    type: JobType,
    handler: WorkerHandler<T, R>
  ): this {
    this.handlers.set(type, handler);
    return this;
  }

  /**
   * Starts the background worker processing loop.
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isShuttingDown = false;
    console.log(
      `[WorkerEngine] 🚀 Started with concurrency=${this.concurrency}, registered handlers=${this.handlers.size}`
    );

    this.scheduleNextPoll();
  }

  /**
   * Stops the worker engine and gracefully waits for active jobs to finish.
   */
  public async stop(): Promise<void> {
    if (!this.isRunning || this.isShuttingDown) return;
    this.isShuttingDown = true;
    console.log(
      `[WorkerEngine] ⏳ Initiating graceful shutdown. Waiting for ${this.activeExecutions.size} active jobs...`
    );

    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }

    if (this.activeExecutions.size > 0) {
      const shutdownPromise = Promise.all(Array.from(this.activeExecutions));
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(resolve, this.shutdownTimeoutMs)
      );
      await Promise.race([shutdownPromise, timeoutPromise]);
    }

    this.isRunning = false;
    console.log("[WorkerEngine] 🛑 Background worker engine stopped gracefully.");
  }

  /**
   * Drains the queue completely (useful for unit tests and batch sync runs).
   */
  public async drainQueue(): Promise<JobResult[]> {
    const results: JobResult[] = [];
    let job = await this.queue.dequeue();

    while (job) {
      const result = await this.executeJob(job);
      results.push(result);
      job = await this.queue.dequeue();
    }

    return results;
  }

  /**
   * Checks whether the worker engine is actively running.
   */
  public getStatus(): {
    isRunning: boolean;
    isShuttingDown: boolean;
    activeWorkersCount: number;
    concurrencyLimit: number;
    registeredJobTypes: string[];
  } {
    return {
      isRunning: this.isRunning,
      isShuttingDown: this.isShuttingDown,
      activeWorkersCount: this.activeExecutions.size,
      concurrencyLimit: this.concurrency,
      registeredJobTypes: Array.from(this.handlers.keys()),
    };
  }

  // ============================================================================
  // INTERNAL LOOP & EXECUTION MANAGEMENT
  // ============================================================================

  private scheduleNextPoll(): void {
    if (!this.isRunning || this.isShuttingDown) return;

    this.loopTimer = setTimeout(async () => {
      await this.pollAndSpawnWorkers();
      this.scheduleNextPoll();
    }, this.pollIntervalMs);
  }

  private async pollAndSpawnWorkers(): Promise<void> {
    while (
      this.isRunning &&
      !this.isShuttingDown &&
      this.activeExecutions.size < this.concurrency
    ) {
      const job = await this.queue.dequeue();
      if (!job) break; // No ready jobs right now

      const executionPromise = this.executeJob(job).finally(() => {
        this.activeExecutions.delete(executionPromise);
      });

      this.activeExecutions.add(executionPromise);
    }
  }

  /**
   * Executes a single job with timeout handling and error catching.
   */
  private async executeJob(job: Job): Promise<JobResult> {
    const startTime = Date.now();
    const handler = this.handlers.get(job.type);

    if (!handler) {
      const errorMsg = `No registered worker handler for job type: ${job.type}`;
      console.error(`[WorkerEngine] ❌ ${errorMsg} (JobID: ${job.id})`);
      await this.queue.recordFailure(job, errorMsg);
      return {
        success: false,
        jobId: job.id,
        type: job.type,
        durationMs: Date.now() - startTime,
        error: errorMsg,
        retryable: false,
      };
    }

    const progressCallback = async (percent: number) => {
      await this.queue.updateJobProgress(job.id, percent);
    };

    try {
      // Execute handler with execution timeout protection
      const resultData = await Promise.race([
        handler(job, progressCallback),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`Job timed out after ${job.timeoutMs}ms`)),
            job.timeoutMs
          )
        ),
      ]);

      const durationMs = Date.now() - startTime;
      await this.queue.recordSuccess(job, durationMs);

      return {
        success: true,
        jobId: job.id,
        type: job.type,
        durationMs,
        data: resultData,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorMsg = err?.message || String(err);
      console.warn(
        `[WorkerEngine] ⚠️ Error in ${job.type} (JobID: ${job.id}, retry: ${job.retryCount}):`,
        errorMsg
      );

      const willRetry = await this.queue.recordFailure(job, errorMsg);

      return {
        success: false,
        jobId: job.id,
        type: job.type,
        durationMs,
        error: errorMsg,
        retryable: willRetry,
      };
    }
  }
}

// Global Singleton
const globalForEngine = globalThis as unknown as {
  __globalWorkerEngine?: WorkerEngine;
};

export const workerEngine =
  globalForEngine.__globalWorkerEngine ?? new WorkerEngine();

if (process.env.NODE_ENV !== "production") {
  globalForEngine.__globalWorkerEngine = workerEngine;
}
