import { NextRequest, NextResponse } from "next/server";
import { OperationalDataService } from "@/modules/analytics/operational-data.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID parameter is required." },
        { status: 400 }
      );
    }

    const walletView = await OperationalDataService.getWalletBalance(userId);
    return NextResponse.json(walletView);
  } catch (error: any) {
    console.error("[Operational Wallet API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch operational wallet balance." },
      { status: 500 }
    );
  }
}
