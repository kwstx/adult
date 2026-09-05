import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get("tag");
    const query = searchParams.get("q");

    const where: any = {};
    if (tag) {
      where.tags = { contains: tag };
    }
    if (query) {
      where.OR = [
        { user: { displayName: { contains: query } } },
        { user: { username: { contains: query } } },
        { streamTitle: { contains: query } },
        { tags: { contains: query } },
      ];
    }

    const creators = await prisma.creatorProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            kycStatus: true,
          },
        },
        interactionItems: {
          where: { isEnabled: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ isLive: "desc" }, { viewerCount: "desc" }],
    });

    return NextResponse.json({ creators });
  } catch (error: any) {
    console.error("Creators fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch creators." },
      { status: 500 }
    );
  }
}
