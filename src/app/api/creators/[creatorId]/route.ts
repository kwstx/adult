import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;

    // Search by creatorProfile id OR username
    const creator = await prisma.creatorProfile.findFirst({
      where: {
        OR: [{ id: creatorId }, { user: { username: creatorId } }],
      },
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
        ppvContents: {
          orderBy: { createdAt: "desc" },
        },
        compliance2257: {
          select: {
            verificationStatus: true,
            approvedAt: true,
          },
        },
      },
    });

    if (!creator) {
      return NextResponse.json({ error: "Creator not found." }, { status: 404 });
    }

    return NextResponse.json({ creator });
  } catch (error: any) {
    console.error("Creator fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch creator." },
      { status: 500 }
    );
  }
}
