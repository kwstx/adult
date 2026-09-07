import { NextRequest, NextResponse } from "next/server";
import { AdminAuthService } from "@/modules/admin/admin-auth.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier } = body;

    if (!identifier) {
      return NextResponse.json(
        { error: "Administrative identifier (username, email, or user ID) is required." },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;
    const session = await AdminAuthService.authenticateAdminUser(identifier, ipAddress);

    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to authenticate administrator." },
      { status: error.statusCode || 500 }
    );
  }
}
