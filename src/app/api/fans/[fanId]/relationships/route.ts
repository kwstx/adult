import { NextRequest, NextResponse } from "next/server";
import { RelationshipService } from "@/modules/relationship/relationship.service";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ fanId: string }> }
) {
  try {
    const { fanId } = await context.params;
    const matrix = await RelationshipService.getFanRelationshipsMatrix(fanId);
    return NextResponse.json({
      success: true,
      data: matrix,
    });
  } catch (error: any) {
    console.error("Failed to fetch fan relationship matrix:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch fan relationship matrix",
      },
      { status: 500 }
    );
  }
}
