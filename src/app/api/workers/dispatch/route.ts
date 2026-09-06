import { NextRequest, NextResponse } from "next/server";
import { jobDispatcher, JobType } from "@/modules/workers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, payload, options } = body;

    if (!type || !payload) {
      return NextResponse.json(
        { error: "Missing required fields: 'type' and 'payload'" },
        { status: 400 }
      );
    }

    const result = await jobDispatcher.dispatch(type as JobType, payload, options);

    return NextResponse.json(
      {
        success: true,
        message: result.isDuplicate ? "Duplicate job ignored by idempotency key" : "Job enqueued successfully",
        jobId: result.jobId,
        isDuplicate: result.isDuplicate,
        enqueuedAt: new Date().toISOString(),
      },
      { status: 202 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
