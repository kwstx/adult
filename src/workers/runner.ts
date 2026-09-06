/**
 * Standalone Background Worker Process Runner
 * 
 * Usage:
 *   npx tsx src/workers/runner.ts
 *   or: npm run worker
 * 
 * Runs independently from the Next.js web application, processing heavy asynchronous
 * jobs across all 11 background domains.
 */

import { workerEngine, registerAllWorkerHandlers, jobQueue } from "../modules/workers";

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || "10", 10);
const POLL_INTERVAL_MS = parseInt(process.env.WORKER_POLL_INTERVAL_MS || "200", 10);

async function bootstrap() {
  console.log("================================================================");
  console.log("🚀 STARTING STANDALONE BACKGROUND WORKER PROCESS");
  console.log("================================================================");
  console.log(`• Node Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`• Process PID:      ${process.pid}`);
  console.log(`• Concurrency:      ${CONCURRENCY} parallel workers`);
  console.log(`• Poll Interval:    ${POLL_INTERVAL_MS}ms`);

  // Ensure all 11 handlers are registered
  registerAllWorkerHandlers(workerEngine);

  // Start processing loop
  workerEngine.start();

  // Periodic Telemetry Heartbeat Logger
  const telemetryTimer = setInterval(async () => {
    const status = workerEngine.getStatus();
    const metrics = await jobQueue.getMetrics(status.isRunning);
    console.log(
      `[WorkerHeartbeat] 💓 Active=${status.activeWorkersCount}/${CONCURRENCY} | Pending=${metrics.pendingJobs} | Completed=${metrics.completedJobsTotal} | Failed=${metrics.failedJobsTotal} | Redis=${metrics.redisConnected ? "ONLINE" : "FALLBACK_MEMORY"}`
    );
  }, 30000);

  // Graceful Shutdown Handler
  const shutdown = async (signal: string) => {
    console.log(`\n[WorkerRunner] Received ${signal}. Stopping worker process...`);
    clearInterval(telemetryTimer);

    try {
      await workerEngine.stop();
      console.log("[WorkerRunner] All jobs drained. Process exiting cleanly.");
      process.exit(0);
    } catch (err) {
      console.error("[WorkerRunner] Error during graceful shutdown:", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("uncaughtException", (err) => {
    console.error("[WorkerRunner] 💥 Uncaught Exception:", err);
  });

  process.on("unhandledRejection", (reason) => {
    console.error("[WorkerRunner] 💥 Unhandled Rejection:", reason);
  });
}

bootstrap().catch((err) => {
  console.error("[WorkerRunner] Fatal error on startup:", err);
  process.exit(1);
});
