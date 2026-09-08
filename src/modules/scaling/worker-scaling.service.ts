import { jobQueue } from "@/modules/workers";
import { WorkerScalingMetrics } from "./types";

/**
 * Worker Scaling Coordinator Service
 * 
 * Core Architectural Invariant:
 * Background workers scale independently from the Next.js web application instances.
 * 
 * At 1,000 users: A single background worker pool processes all jobs.
 * At 100,000 users: Dedicated worker pools handle high-priority financial settlement
 *                   and video transcoding separately.
 * At Millions of users:
 *   1. Auto-scaler monitors queue depth and job latency lag.
 *   2. Dynamically scales worker processes horizontally from 2 -> 50+ nodes based on queue backlog.
 *   3. Critical SLA jobs (e.g. Creator Payouts, KYC verification) are isolated in dedicated fast-lane pools.
 */
export class WorkerScalingService {
  private currentWorkerInstances = 2;
  private concurrencyPerInstance = 10;
  private minInstances = 2;
  private maxInstances = 100;
  private targetSlaLagSeconds = 5; // Desired max queue wait time

  private metrics: WorkerScalingMetrics = {
    activeWorkerInstances: 2,
    concurrencyPerInstance: 10,
    totalWorkerCapacity: 20,
    queueDepth: 0,
    slaLagSeconds: 0,
    targetWorkerInstances: 2,
    lastScaleAction: "STEADY",
    throughputJobsPerSecond: 0,
  };

  /**
   * Evaluates current queue telemetry and calculates the optimal number of worker instances.
   */
  public async evaluateAutoScaling(): Promise<WorkerScalingMetrics> {
    const queueMetrics = await jobQueue.getMetrics(true);
    const queueDepth = queueMetrics.pendingJobs;
    const throughput = Math.max(1, queueMetrics.throughputPerSecond || 5);
    const avgDurationSec = (queueMetrics.averageJobDurationMs || 500) / 1000;

    // Estimate current lag
    const slaLagSeconds = parseFloat((queueDepth / throughput).toFixed(2));

    // Calculate required worker capacity using Little's Law
    // Required workers = (Queue Depth * Avg Job Duration) / Target SLA
    const requiredCapacity = Math.ceil((queueDepth * avgDurationSec) / this.targetSlaLagSeconds);
    const targetInstances = Math.max(
      this.minInstances,
      Math.min(this.maxInstances, Math.ceil(requiredCapacity / this.concurrencyPerInstance))
    );

    let lastScaleAction: "SCALE_UP" | "SCALE_DOWN" | "STEADY" = "STEADY";
    if (targetInstances > this.currentWorkerInstances) {
      lastScaleAction = "SCALE_UP";
      this.currentWorkerInstances = targetInstances;
    } else if (targetInstances < this.currentWorkerInstances && queueDepth < 10) {
      lastScaleAction = "SCALE_DOWN";
      this.currentWorkerInstances = targetInstances;
    }

    this.metrics = {
      activeWorkerInstances: this.currentWorkerInstances,
      concurrencyPerInstance: this.concurrencyPerInstance,
      totalWorkerCapacity: this.currentWorkerInstances * this.concurrencyPerInstance,
      queueDepth,
      slaLagSeconds,
      targetWorkerInstances: targetInstances,
      lastScaleAction,
      throughputJobsPerSecond: throughput,
    };

    return { ...this.metrics };
  }

  /**
   * Simulates a workload surge and evaluates scaling response.
   */
  public simulateWorkloadSurge(surgeQueueDepth: number): WorkerScalingMetrics {
    const avgDurationSec = 0.5;
    const requiredCapacity = Math.ceil((surgeQueueDepth * avgDurationSec) / this.targetSlaLagSeconds);
    const targetInstances = Math.max(
      this.minInstances,
      Math.min(this.maxInstances, Math.ceil(requiredCapacity / this.concurrencyPerInstance))
    );

    this.currentWorkerInstances = targetInstances;
    this.metrics = {
      activeWorkerInstances: targetInstances,
      concurrencyPerInstance: this.concurrencyPerInstance,
      totalWorkerCapacity: targetInstances * this.concurrencyPerInstance,
      queueDepth: surgeQueueDepth,
      slaLagSeconds: parseFloat((surgeQueueDepth / (targetInstances * 20)).toFixed(2)),
      targetWorkerInstances: targetInstances,
      lastScaleAction: targetInstances > this.minInstances ? "SCALE_UP" : "STEADY",
      throughputJobsPerSecond: targetInstances * 20,
    };

    return { ...this.metrics };
  }

  public getMetrics(): WorkerScalingMetrics {
    return { ...this.metrics };
  }
}

// Global Singleton
const globalForWorkerScale = globalThis as unknown as {
  __workerScalingService?: WorkerScalingService;
};

export const workerScaling =
  globalForWorkerScale.__workerScalingService ?? new WorkerScalingService();

if (process.env.NODE_ENV !== "production") {
  globalForWorkerScale.__workerScalingService = workerScaling;
}
