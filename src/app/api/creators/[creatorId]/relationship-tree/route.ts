import { NextRequest, NextResponse } from "next/server";
import { RelationshipService } from "@/modules/relationship/relationship.service";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await context.params;
    const url = new URL(req.url);
    const fanId = url.searchParams.get("fanId") || undefined;

    const tree = await RelationshipService.getRelationshipTree(creatorId, fanId);
    return NextResponse.json({
      success: true,
      data: tree,
    });
  } catch (error: any) {
    console.error("Failed to fetch creator relationship tree:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch creator relationship tree",
      },
      { status: 500 }
    );
  }
}
