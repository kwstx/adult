import { apiHandler, successResponse } from "@/lib/api-handler";
import prisma from "@/lib/db";

/**
 * GET /api/progression/user/[userId]
 * Thin endpoint: retrieves user's platform level, total XP, and unlocked achievements.
 */
export const GET = apiHandler<{ userId: string }>(async (req, ctx) => {
  const userId = ctx.params?.userId;
  if (!userId) {
    return successResponse({ level: 1, totalPlatformXp: 0, recentXpEvents: [], achievements: [] });
  }

  const [xpEvents, achievements] = await Promise.all([
    prisma.platformXPEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: "desc" },
    }),
  ]);

  const totalXp = xpEvents.reduce((acc, curr) => acc + curr.xpAwarded, 0);
  const level = Math.floor(Math.sqrt(totalXp / 100)) + 1;

  return successResponse({
    userId,
    level,
    totalPlatformXp: totalXp,
    recentXpEvents: xpEvents,
    achievements: achievements.map((a) => ({
      id: a.achievement.id,
      name: a.achievement.name,
      description: a.achievement.description,
      badgeTier: a.achievement.badgeTier,
      unlockedAt: a.unlockedAt,
    })),
  });
});
