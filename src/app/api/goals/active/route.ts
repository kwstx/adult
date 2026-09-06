import { NextRequest, NextResponse } from "next/server";
import { CollectiveGoalService } from "@/modules/goals/collective-goal.service";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/goals/active?creatorId=...&livestreamId=...
 * Returns the active collective goal for the room, or creates the default "MIDNIGHT GOAL" if none exists.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    let creatorId = searchParams.get("creatorId");
    const livestreamId = searchParams.get("livestreamId") || undefined;

    if (!creatorId) {
      // Find the first creator in the database as default
      const defaultCreator = await prisma.creatorProfile.findFirst();
      if (!defaultCreator) {
        return NextResponse.json({ error: "No creator profile found." }, { status: 404 });
      }
      creatorId = defaultCreator.id;
    }

    const goal = await CollectiveGoalService.getActiveGoal(creatorId, livestreamId);
    return NextResponse.json(goal);
  } catch (error: any) {
    console.error("Fetch active goal error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch active goal." },
      { status: 500 }
    );
  }
}
