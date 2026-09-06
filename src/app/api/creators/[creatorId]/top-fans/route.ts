import { NextRequest, NextResponse } from "next/server";
import { RelationshipService } from "@/modules/relationship/relationship.service";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    const topFans = await RelationshipService.getCreatorTopFans(creatorId, limit);
    return NextResponse.json({
      success: true,
      data: topFans,
    });
  } catch (error: any) {
    console.error("Failed to fetch top fans:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch top fans",
      },
      { status: 500 }
    );
  }
}
