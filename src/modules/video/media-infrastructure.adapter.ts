import crypto from "crypto";
import {
  StreamIngestCredentials,
  SignedMediaToken,
  ParticipantRole,
  StreamMode,
  RTCIceServerConfig,
} from "./types";

/**
 * SPECIALIZED STREAMING INFRASTRUCTURE ADAPTER
 * 
 * Core Architectural Invariant:
 * The application server NEVER handles raw video/audio packets.
 * This adapter coordinates with dedicated media servers (LiveKit / SRS / Cloudflare / WHEP)
 * and generates cryptographically signed authorization tokens that permit clients
 * to connect directly to the media edge.
 */
export class MediaInfrastructureAdapter {
  private readonly mediaEdgeHost: string;
  private readonly hmacSecret: string;
  private readonly iceServers: RTCIceServerConfig[];

  constructor() {
    this.mediaEdgeHost = process.env.MEDIA_CDN_BASE_URL || "https://edge.live.streamplatform.local";
    this.hmacSecret = process.env.MEDIA_TOKEN_SECRET || "sec_media_infrastructure_token_signing_key_2026";
    this.iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      {
        urls: "turn:turn.streamplatform.local:3478",
        username: "platform_peer",
        credential: "peer_secure_turn_token_2026",
      },
    ];
  }

  /**
   * Provision direct media ingest endpoints (WHIP / RTMP) for a creator.
   * Media stream flows from Creator's browser/OBS directly to the media server.
   */
  async provisionIngestCredentials(params: {
    mediaRoomId: string;
    roomName: string;
    streamKey: string;
    creatorUserId: string;
  }): Promise<StreamIngestCredentials> {
    const { mediaRoomId, roomName, streamKey, creatorUserId } = params;
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24; // 24 hours

    // Generate cryptographic bearer token for WHIP (WebRTC HTTP Ingest Protocol)
    const whipBearerToken = this.signMediaPayload({
      roomName,
      mediaRoomId,
      userId: creatorUserId,
      role: "PUBLISHER",
      exp: expiresAt,
    });

    const sfuRoomId = `sfu_room_${roomName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

    return {
      mediaRoomId,
      roomName,
      streamKey,
      rtmpIngestUrl: `rtmp://ingest.live.streamplatform.local/live/${streamKey}`,
      whipIngestUrl: `${this.mediaEdgeHost}/api/whip/${streamKey}`,
      whipBearerToken,
      sfuRoomId,
      iceServers: this.iceServers,
      expiresAt,
    };
  }

  /**
   * Provision signed authorization token for a viewer to connect directly
   * to scalable low-latency distribution (WHEP / LL-HLS).
   */
  async generateViewerPlaybackToken(params: {
    mediaRoomId: string;
    streamId: string;
    roomName: string;
    user: {
      id: string;
      username: string;
      displayName: string;
    };
    role?: ParticipantRole;
    streamMode?: StreamMode;
    isVip?: boolean;
    canChat?: boolean;
    canInteract?: boolean;
  }): Promise<SignedMediaToken> {
    const {
      mediaRoomId,
      streamId,
      roomName,
      user,
      role = "SUBSCRIBER",
      streamMode = "PUBLIC_BROADCAST",
      isVip = false,
      canChat = true,
      canInteract = true,
    } = params;

    const expiresAt = Date.now() + 1000 * 60 * 60 * 6; // 6 hours validity
    const sessionId = `sess_${crypto.randomBytes(8).toString("hex")}`;

    const payload = {
      mediaRoomId,
      streamId,
      roomName,
      userId: user.id,
      username: user.username,
      sessionId,
      role,
      streamMode,
      isVip,
      exp: expiresAt,
    };

    const token = this.signMediaPayload(payload);

    return {
      token,
      mediaRoomId,
      streamId,
      userId: user.id,
      role,
      streamMode,
      hlsPlaybackUrl: `${this.mediaEdgeHost}/hls/${roomName}/index.m3u8?token=${token}`,
      whepPlaybackUrl: `${this.mediaEdgeHost}/api/whep/${roomName}?token=${token}`,
      webrtcSfuUrl: `${this.mediaEdgeHost}/sfu/${roomName}?token=${token}`,
      iceServers: this.iceServers,
      expiresAt,
      watermark: {
        userId: user.id,
        username: user.username,
        sessionId,
        timestamp: Date.now(),
      },
      permissions: {
        canView: true,
        canChat,
        canInteract,
        canPublishAudio: role === "PUBLISHER" || role === "CO_HOST",
        canPublishVideo: role === "PUBLISHER" || role === "CO_HOST",
        isVip,
      },
    };
  }

  /**
   * Provision a two-way interactive WebRTC Media Room for 1-on-1 sessions.
   * Both creator and fan are granted bi-directional audio/video publishing and subscribing.
   */
  async provisionInteractive1on1MediaRoom(params: {
    sessionId: string;
    mediaRoomId: string;
    creatorUserId: string;
    fanUserId: string;
  }) {
    const { sessionId, mediaRoomId, creatorUserId, fanUserId } = params;
    const expiresAt = Date.now() + 1000 * 60 * 60 * 2; // 2 hours

    const creatorToken = this.signMediaPayload({
      sessionId,
      mediaRoomId,
      userId: creatorUserId,
      role: "CO_HOST",
      streamMode: "PRIVATE_1ON1",
      exp: expiresAt,
    });

    const fanToken = this.signMediaPayload({
      sessionId,
      mediaRoomId,
      userId: fanUserId,
      role: "CO_HOST",
      streamMode: "PRIVATE_1ON1",
      exp: expiresAt,
    });

    const signalingEndpoint = `${this.mediaEdgeHost}/webrtc/1on1/${sessionId}`;

    return {
      sessionId,
      signalingEndpoint,
      iceServers: this.iceServers,
      creatorToken,
      fanToken,
      expiresAt,
    };
  }

  /**
   * Cryptographically signs media payloads with HMAC-SHA256.
   */
  private signMediaPayload(payload: Record<string, any>): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto
      .createHmac("sha256", this.hmacSecret)
      .update(encodedPayload)
      .digest("base64url");
    return `${encodedPayload}.${signature}`;
  }

  /**
   * Verifies HMAC media tokens.
   */
  verifyMediaToken(token: string): { valid: boolean; payload?: any } {
    try {
      const [encodedPayload, signature] = token.split(".");
      if (!encodedPayload || !signature) return { valid: false };

      const expectedSignature = crypto
        .createHmac("sha256", this.hmacSecret)
        .update(encodedPayload)
        .digest("base64url");

      if (signature !== expectedSignature) return { valid: false };

      const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf-8"));
      if (payload.exp && payload.exp < Date.now()) {
        return { valid: false }; // Expired
      }

      return { valid: true, payload };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Validates webhooks sent from specialized media servers (e.g. LiveKit / SRS / Cloudflare).
   */
  validateWebhookSignature(rawBody: string, receivedSignature: string): boolean {
    const webhookSecret = process.env.MEDIA_WEBHOOK_SECRET || this.hmacSecret;
    const computedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");
    return computedSignature === receivedSignature;
  }
}

export const mediaInfrastructure = new MediaInfrastructureAdapter();
