// ============================================================================
// VIDEO SYSTEM DOMAIN TYPES & INTERFACES
// ============================================================================

export type StreamStatus =
  | "IDLE"
  | "PROVISIONED"
  | "BROADCASTING"
  | "PAUSED"
  | "ENDED"
  | "BANNED";

export type StreamMode = "PUBLIC_BROADCAST" | "PRIVATE_1ON1" | "VIP_SHOW";

export type ParticipantRole = "PUBLISHER" | "SUBSCRIBER" | "CO_HOST" | "MODERATOR";

export type TwoWaySessionStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "CONNECTED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";

/**
 * Direct Media Ingest Credentials (Issued to Creator).
 * The video frames flow directly to the media server, never proxying through the app server.
 */
export interface StreamIngestCredentials {
  mediaRoomId: string;
  roomName: string;
  streamKey: string;
  rtmpIngestUrl: string;
  whipIngestUrl: string;
  whipBearerToken: string;
  sfuRoomId: string;
  iceServers: RTCIceServerConfig[];
  expiresAt: number;
}

/**
 * ICE / STUN / TURN Server Configuration for WebRTC.
 */
export interface RTCIceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/**
 * Backend Authoritative Media Authorization Token.
 * Issued to Viewers after backend checks permissions & audience rules.
 */
export interface SignedMediaToken {
  token: string;
  mediaRoomId: string;
  streamId: string;
  userId: string;
  role: ParticipantRole;
  streamMode: StreamMode;
  
  // Media endpoints on specialized infrastructure
  hlsPlaybackUrl: string;
  whepPlaybackUrl: string;
  webrtcSfuUrl?: string;
  
  iceServers: RTCIceServerConfig[];
  expiresAt: number;
  
  // Dynamic Watermark Metadata (Forensic Anti-Piracy Overlay)
  watermark: {
    userId: string;
    username: string;
    sessionId: string;
    timestamp: number;
  };
  
  // Granular Access Permissions
  permissions: {
    canView: boolean;
    canChat: boolean;
    canInteract: boolean;
    canPublishAudio: boolean;
    canPublishVideo: boolean;
    isVip: boolean;
  };
}

/**
 * Audience Rules Matrix for Stream Gatekeeping.
 */
export interface AudienceRulesConfig {
  minAge: number;
  requireAgeAssurance: boolean;
  isSubscribersOnly: boolean;
  minSubscriptionTier?: string | null;
  ticketPriceCredits: number; // 0 = Free, > 0 = Pay-Per-View Livestream
  isFollowerOnly: boolean;
  slowModeSeconds: number;
  isChatDisabled: boolean;
  geoBlockedCountries: string[];
}

/**
 * Authoritative Livestream State & Relations.
 */
export interface LivestreamRelationGraph {
  creator: {
    id: string;
    userId: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    isVerified2257: boolean;
  };
  livestream: {
    id: string;
    title: string;
    category: string;
    tags: string[];
    streamMode: StreamMode;
    status: StreamStatus;
    startedAt: Date | null;
    endedAt: Date | null;
    peakViewers: number;
    totalCreditsEarned: number;
  };
  mediaRoom: {
    id: string;
    roomName: string;
    mediaProvider: string;
    rtmpIngestUrl: string;
    whipIngestUrl: string;
    playbackHlsUrl: string;
    playbackWhepUrl: string;
  };
  audienceRules: AudienceRulesConfig;
  userPermissions?: {
    canView: boolean;
    canChat: boolean;
    canInteract: boolean;
    isVip: boolean;
    restrictionReason?: string;
  };
}

/**
 * Interactive 1-on-1 Two-Way WebRTC Session Payload.
 */
export interface Interactive1on1SessionPayload {
  sessionId: string;
  mediaRoomId: string;
  creatorUserId: string;
  creatorDisplayName: string;
  fanUserId: string;
  fanDisplayName: string;
  status: TwoWaySessionStatus;
  creditRatePerMinute: number;
  totalCreditsCharged: number;
  startedAt: Date | null;
  durationSeconds: number;
  iceServers: RTCIceServerConfig[];
  
  // Direct WebRTC tokens for Creator and Fan
  mediaToken: string;
  signalingEndpoint: string;
}

/**
 * Webhook Ingestion Schema from Specialized Media Infrastructure.
 */
export interface MediaInfrastructureWebhookEvent {
  event:
    | "stream.published"
    | "stream.unpublished"
    | "transcode.rendition_ready"
    | "peer.joined"
    | "peer.left"
    | "session.health_metrics"
    | "recording.completed";
  streamKey?: string;
  roomName?: string;
  sessionId?: string;
  peerId?: string;
  timestamp: number;
  metrics?: {
    bitrateKbps: number;
    fps: number;
    resolution: string;
    packetLossRatio: number;
    jitterMs: number;
  };
  recordingUrl?: string;
}
