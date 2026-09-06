import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { redis } from "@/lib/redis";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hours = parseInt(searchParams.get("hours") || "24", 10);
    const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    // 1. Total events count in time window
    const [totalCount, eventsByType, topCategories, topCreators] = await Promise.all([
      prisma.recommendationEvent.count({
        where: { createdAt: { gte: sinceDate } },
      }),
      prisma.recommendationEvent.groupBy({
        by: ["eventType"],
        where: { createdAt: { gte: sinceDate } },
        _count: { id: true },
      }),
      prisma.recommendationEvent.groupBy({
        by: ["category"],
        where: {
          createdAt: { gte: sinceDate },
          category: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.recommendationEvent.groupBy({
        by: ["creatorProfileId"],
        where: {
          createdAt: { gte: sinceDate },
          creatorProfileId: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
    ]);

    // 2. Fetch real-time Redis streaming stats if available
    let redisStreamLength = 0;
    try {
      redisStreamLength = await redis.xlen("events:recommendations:stream");
    } catch (err) {}

    return NextResponse.json({
      timeWindowHours: hours,
      totalEvents: totalCount,
      redisStreamBufferLength: redisStreamLength,
      eventsByType: eventsByType.map((e) => ({
        eventType: e.eventType,
        count: e._count.id,
      })),
      topCategories: topCategories.map((c) => ({
        category: c.category,
        eventCount: c._count.id,
      })),
      topCreatorsByEngagement: topCreators.map((cr) => ({
        creatorProfileId: cr.creatorProfileId,
        eventCount: cr._count.id,
      })),
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Recommendation Analytics Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch recommendation analytics." },
      { status: 500 }
    );
  }
}
