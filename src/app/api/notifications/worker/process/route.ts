import { NextResponse } from "next/server";
import { notificationWorker } from "@/modules/notifications/notification-worker";
import { notificationQueue } from "@/modules/notifications/notification-queue.service";

/**
 * POST /api/notifications/worker/process
 * Manually or programmatically drains all pending jobs in the notification queue.
 */
export async function POST() {
  try {
    const startTime = Date.now();
    const batchResults = await notificationWorker.drainQueue();
    const durationMs = Date.now() - startTime;
    const stats = await notificationQueue.getHealthStats();

    return NextResponse.json({
      success: true,
      batchesProcessed: batchResults.length,
      durationMs,
      batchResults,
      queueStats: stats,
    });
  } catch (error: any) {
    console.error("[POST /api/notifications/worker/process] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process notification queue." },
      { status: 500 }
    );
  }
}
