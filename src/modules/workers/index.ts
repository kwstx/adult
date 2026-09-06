import { workerEngine, WorkerEngine } from "./core/worker-engine";
import { jobQueue, JobQueue } from "./core/job-queue";
import { jobDispatcher, JobDispatcher } from "./core/job-dispatcher";

// Import all 11 concrete worker handlers
import { videoProcessorWorker } from "./handlers/video-processor.worker";
import { thumbnailGeneratorWorker } from "./handlers/thumbnail-generator.worker";
import { contentModeratorWorker } from "./handlers/content-moderator.worker";
import { notificationDispatcherWorker } from "./handlers/notification-dispatcher.worker";
import { emailSenderWorker } from "./handlers/email-sender.worker";
import { searchIndexerWorker } from "./handlers/search-indexer.worker";
import { analyticsCalculatorWorker } from "./handlers/analytics-calculator.worker";
import { leaderboardGeneratorWorker } from "./handlers/leaderboard-generator.worker";
import { payoutProcessorWorker } from "./handlers/payout-processor.worker";
import { fraudDetectorWorker } from "./handlers/fraud-detector.worker";
import { recommendationEngineWorker } from "./handlers/recommendation-engine.worker";

/**
 * Registers all 11 domain background worker handlers into the engine.
 */
export function registerAllWorkerHandlers(engine: WorkerEngine = workerEngine): WorkerEngine {
  engine
    .registerHandler("VIDEO_PROCESS", videoProcessorWorker)
    .registerHandler("THUMBNAIL_GENERATE", thumbnailGeneratorWorker)
    .registerHandler("CONTENT_MODERATE", contentModeratorWorker)
    .registerHandler("NOTIFICATION_SEND", notificationDispatcherWorker)
    .registerHandler("EMAIL_SEND", emailSenderWorker)
    .registerHandler("SEARCH_INDEX_UPDATE", searchIndexerWorker)
    .registerHandler("ANALYTICS_CALCULATE", analyticsCalculatorWorker)
    .registerHandler("LEADERBOARD_GENERATE", leaderboardGeneratorWorker)
    .registerHandler("PAYOUT_PROCESS", payoutProcessorWorker)
    .registerHandler("FRAUD_DETECT", fraudDetectorWorker)
    .registerHandler("RECOMMENDATIONS_CALCULATE", recommendationEngineWorker);

  return engine;
}

// Auto-register default handlers into global worker engine instance
registerAllWorkerHandlers(workerEngine);

// Export types & core components
export * from "./types";
export { jobQueue, JobQueue };
export { workerEngine, WorkerEngine };
export { jobDispatcher, JobDispatcher };

// Export individual worker handlers
export {
  videoProcessorWorker,
  thumbnailGeneratorWorker,
  contentModeratorWorker,
  notificationDispatcherWorker,
  emailSenderWorker,
  searchIndexerWorker,
  analyticsCalculatorWorker,
  leaderboardGeneratorWorker,
  payoutProcessorWorker,
  fraudDetectorWorker,
  recommendationEngineWorker,
};
