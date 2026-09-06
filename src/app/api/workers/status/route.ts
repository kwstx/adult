import { NextResponse } from "next/server";
import { workerEngine, jobQueue } from "@/modules/workers";

export async function GET() {
  try {
    const engineStatus = workerEngine.getStatus();
    const metrics = await jobQueue.getMetrics(engineStatus.isRunning);
    const dlqItems = await jobQueue.getDlqItems(10);

    return NextResponse.json({
      status: "HEALTHY",
      timestamp: new Date().toISOString(),
      engine: engineStatus,
      queue: metrics,
      deadLetterQueueSample: dlqItems,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "ERROR", message: error.message },
      { status: 500 }
    );
  }
}
