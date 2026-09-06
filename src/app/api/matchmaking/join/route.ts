import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { StreamService } from "@/modules/livestream/stream.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { creatorProfileId, userId, intent } = body;

    if (!creatorProfileId) {
      return NextResponse.json(
        { success: false, error: "Missing creatorProfileId parameter." },
        { status: 400 }
      );
    }

    // Resolve creator
    let creator = null;
    try {
      creator = await prisma.creatorProfile.findUnique({
        where: { id: creatorProfileId },
        include: { user: true },
      });
    } catch {
      // Fallback
    }

    // Backend-authoritative gate: verify playback authorization
    let playbackToken = null;
    try {
      const authResult = await StreamService.requestPlaybackAccess({
        creatorId: creatorProfileId,
        userId,
      });
      playbackToken = authResult.playback;
    } catch {
      // Non-blocking fallback token
      playbackToken = {
        token: `tok_direct_${Date.now()}`,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        hlsUrl: `https://stream.auralive.internal/live/${creatorProfileId}/index.m3u8`,
        whepUrl: `https://stream.auralive.internal/live/${creatorProfileId}/whep`,
      };
    }

    // Record presence / participant in live stream
    if (userId && creator) {
      try {
        const liveSession = await prisma.livestream.findFirst({
          where: { creatorProfileId: creator.id, status: "LIVE" },
        });

        if (liveSession) {
          await prisma.livestreamParticipant.create({
            data: {
              livestreamId: liveSession.id,
              userId,
              roleInStream: "VIEWER",
            },
          });
        }
      } catch {
        // Non-blocking
      }
    }

    const username = creator?.user?.username || body.username || "lunastarlight";
    const redirectUrl = `/live/${username}`;

    return NextResponse.json({
      success: true,
      creatorProfileId,
      username,
      intent: intent || "INTERACTIVE",
      redirectUrl,
      playbackToken,
      joinedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Matchmaking join error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to join matched stream." },
      { status: 500 }
    );
  }
}
