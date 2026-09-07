import { NextRequest, NextResponse } from "next/server";
import { OperationalDataService } from "@/modules/analytics/operational-data.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params;
    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get("userId") || undefined;

    if (!contentId) {
      return NextResponse.json(
        { error: "Content ID parameter is required." },
        { status: 400 }
      );
    }

    const contentOwnershipView = await OperationalDataService.getContentOwnership(
      contentId,
      queryUserId
    );

    return NextResponse.json(contentOwnershipView);
  } catch (error: any) {
    console.error("[Operational Content Ownership API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch content ownership." },
      { status: 500 }
    );
  }
}
