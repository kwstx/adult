import { NextRequest, NextResponse } from "next/server";
import { VideoAuthService } from "@/modules/video/video-auth.service";

/**
 * POST /api/video/authorize
 * 
 * Authoritative Media Gatekeeper:
 * The frontend requests media access from the application server.
 * The backend evaluates Audience Rules (age assurance, VIP tier, ticket, geo restrictions)
 * and returns a cryptographically signed HMAC token for direct connection to media infrastructure.
 * 
 * NO raw video passes through this server.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mediaRoomIdOrName, userId } = body;

    if (!mediaRoomIdOrName) {
      return NextResponse.json(
        { error: "mediaRoomIdOrName is required." },
        { status: 400 }
      );
    }

    const clientIpCountry = req.headers.get("x-country-code") || "US";

    const authResult = await VideoAuthService.authorizeViewer({
      mediaRoomIdOrName,
      userId,
      clientIpCountry,
    });

    if (!authResult.allowed) {
      return NextResponse.json(
        {
          allowed: false,
          error: authResult.reason || "Access denied by room audience rules.",
        },
        { status: authResult.statusCode || 403 }
      );
    }

    return NextResponse.json({
      allowed: true,
      mediaToken: authResult.signedToken,
    });
  } catch (error: any) {
    console.error("Video authorization error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to authorize video access." },
      { status: 500 }
    );
  }
}
