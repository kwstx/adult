import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { CollectiveGoalService } from "@/modules/goals/collective-goal.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/goals/[goalId]
 * Returns authoritative goal details, progress aggregates, top contributors, and unlock status.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ goalId: string }> }
) {
  try {
    const { goalId } = await context.params;

    const goal = await prisma.collectiveGoal.findUnique({
      where: { id: goalId },
      include: {
        creatorProfile: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found." }, { status: 404 });
    }

    const [topContributorsRaw, recentContributions] = await Promise.all([
      prisma.goalContribution.groupBy({
        by: ["fanId"],
        where: { collectiveGoalId: goal.id },
        _sum: { amountCredits: true },
        orderBy: { _sum: { amountCredits: "desc" } },
        take: 5,
      }),
      prisma.goalContribution.findMany({
        where: { collectiveGoalId: goal.id },
        include: {
          fan: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

    const fanIds = topContributorsRaw.map((t) => t.fanId);
    const fans = fanIds.length
      ? await prisma.user.findMany({
          where: { id: { in: fanIds } },
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        })
      : [];
    const fanMap = new Map(fans.map((f) => [f.id, f]));

    const topContributors = topContributorsRaw.map((t, idx) => {
      const fan = fanMap.get(t.fanId);
      return {
        fanId: t.fanId,
        displayName: fan?.displayName || `Patron #${idx + 1}`,
        username: fan?.username || `patron${idx + 1}`,
        avatarUrl: fan?.avatarUrl || null,
        amountContributed: t._sum.amountCredits || 0,
        rank: idx + 1,
      };
    });

    const formatted = CollectiveGoalService.formatGoalData(
      goal,
      topContributors,
      recentContributions
    );

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Fetch goal error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch goal." },
      { status: 500 }
    );
  }
}
