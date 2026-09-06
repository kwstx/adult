import { NextResponse } from "next/server";
import { notificationQueue } from "@/modules/notifications/notification-queue.service";

/**
 * GET /api/notifications/queue/stats
 * Returns queue health, throughput, pending jobs, and active batch worker stats.
 */
export async function GET() {
  try {
    const stats = await notificationQueue.getHealthStats();

    return NextResponse.json({
      success: true,
      stats,
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[GET /api/notifications/queue/stats] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve queue statistics." },
      { status: 500 }
    );
  }
}
