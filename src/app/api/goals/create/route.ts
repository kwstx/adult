import { NextRequest, NextResponse } from "next/server";
import { CollectiveGoalService } from "@/modules/goals/collective-goal.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/goals/create
 * Creator endpoint to create or reconfigure a collective goal.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      creatorProfileId,
      livestreamId,
      title,
      description,
      rewardDescription,
      targetCredits,
      initialCredits,
      unlockType,
      unlockTitle,
      unlockDescription,
      endsAt,
    } = body;

    if (!creatorProfileId || !title || !targetCredits) {
      return NextResponse.json(
        { error: "Missing required fields: creatorProfileId, title, and targetCredits." },
        { status: 400 }
      );
    }

    const goal = await CollectiveGoalService.createGoal({
      creatorProfileId,
      livestreamId,
      title,
      description,
      rewardDescription,
      targetCredits: Number(targetCredits),
      initialCredits: initialCredits ? Number(initialCredits) : 0,
      unlockType,
      unlockTitle,
      unlockDescription,
      endsAt: endsAt ? new Date(endsAt) : undefined,
    });

    return NextResponse.json(goal);
  } catch (error: any) {
    console.error("Create goal error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create collective goal." },
      { status: 500 }
    );
  }
}
