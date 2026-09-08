// ============================================================================
// BACKEND EVENT FUNNEL TYPES & CONTRACTS
// 16-Stage User Discovery, Engagement, Monetization & Retention Funnel
// ============================================================================

export type FunnelEventType =
  | "USER_CREATED"
  | "AGE_VERIFIED"
  | "FEED_VIEWED"
  | "LIVE_IMPRESSION"
  | "LIVE_ENTERED"
  | "WATCH_STARTED"
  | "WATCH_30_SECONDS"
  | "CREATOR_FOLLOWED"
  | "INTERACTION_MENU_OPENED"
  | "INTERACTION_VIEWED"
  | "PURCHASE_STARTED"
  | "PURCHASE_COMPLETED"
  | "XP_EARNED"
  | "RELATIONSHIP_LEVEL_UP"
  | "LIVE_EXITED"
  | "RETURNED";

export interface FunnelStageDefinition {
  stage: FunnelEventType;
  stageIndex: number;
  stageName: string;
  category: "ONBOARDING" | "DISCOVERY" | "ENGAGEMENT" | "COMMERCE" | "PROGRESSION" | "RETENTION";
  description: string;
}

export const FUNNEL_STAGES: FunnelStageDefinition[] = [
  {
    stage: "USER_CREATED",
    stageIndex: 1,
    stageName: "User Created",
    category: "ONBOARDING",
    description: "New fan registers / creates an account on the platform",
  },
  {
    stage: "AGE_VERIFIED",
    stageIndex: 2,
    stageName: "Age Verified",
    category: "ONBOARDING",
    description: "Fan successfully completes 18+ age assurance compliance check",
  },
  {
    stage: "FEED_VIEWED",
    stageIndex: 3,
    stageName: "Feed Viewed",
    category: "DISCOVERY",
    description: "Fan lands on and loads the live discovery sliding window feed",
  },
  {
    stage: "LIVE_IMPRESSION",
    stageIndex: 4,
    stageName: "Live Impression",
    category: "DISCOVERY",
    description: "A live creator stream card/preview is rendered in the viewer's viewport",
  },
  {
    stage: "LIVE_ENTERED",
    stageIndex: 5,
    stageName: "Live Entered",
    category: "DISCOVERY",
    description: "Fan selects or snaps into the creator's live stream session",
  },
  {
    stage: "WATCH_STARTED",
    stageIndex: 6,
    stageName: "Watch Started",
    category: "ENGAGEMENT",
    description: "Video stream player establishes connection and begins active media playback",
  },
  {
    stage: "WATCH_30_SECONDS",
    stageIndex: 7,
    stageName: "Watch 30s Milestone",
    category: "ENGAGEMENT",
    description: "Viewer sustains active watch time exceeding 30 continuous seconds",
  },
  {
    stage: "CREATOR_FOLLOWED",
    stageIndex: 8,
    stageName: "Creator Followed",
    category: "ENGAGEMENT",
    description: "Fan clicks follow and creates a social graph link to the creator",
  },
  {
    stage: "INTERACTION_MENU_OPENED",
    stageIndex: 9,
    stageName: "Interaction Menu Opened",
    category: "ENGAGEMENT",
    description: "Viewer opens the live gifting, tip, or haptic toy interaction drawer",
  },
  {
    stage: "INTERACTION_VIEWED",
    stageIndex: 10,
    stageName: "Interaction Viewed",
    category: "ENGAGEMENT",
    description: "Viewer inspects specific live action items, dare items, or goal rewards",
  },
  {
    stage: "PURCHASE_STARTED",
    stageIndex: 11,
    stageName: "Purchase Started",
    category: "COMMERCE",
    description: "Viewer initiates a tip, gift, interaction purchase, or token top-up",
  },
  {
    stage: "PURCHASE_COMPLETED",
    stageIndex: 12,
    stageName: "Purchase Completed",
    category: "COMMERCE",
    description: "Double-entry ledger confirms atomic financial transaction and creator earning",
  },
  {
    stage: "XP_EARNED",
    stageIndex: 13,
    stageName: "XP Earned",
    category: "PROGRESSION",
    description: "Platform XP or Creator Relationship XP is authoritatively awarded",
  },
  {
    stage: "RELATIONSHIP_LEVEL_UP",
    stageIndex: 14,
    stageName: "Relationship Level Up",
    category: "PROGRESSION",
    description: "Viewer ascends to a higher tier/level with the creator (e.g. Stranger -> Supporter)",
  },
  {
    stage: "LIVE_EXITED",
    stageIndex: 15,
    stageName: "Live Exited",
    category: "RETENTION",
    description: "Viewer ends or leaves the current live session with session metrics logged",
  },
  {
    stage: "RETURNED",
    stageIndex: 16,
    stageName: "Returned (Day 1+)",
    category: "RETENTION",
    description: "Viewer returns to the platform in a subsequent retention session",
  },
];

export interface FunnelEventPayload {
  eventId?: string;
  eventType: FunnelEventType;
  userId?: string;
  sessionId?: string;
  creatorProfileId?: string;
  livestreamId?: string;
  timestamp?: number | string;
  stageIndex?: number;
  durationSeconds?: number;
  amountCredits?: number;
  xpAwarded?: number;
  deviceType?: "MOBILE" | "DESKTOP" | "TABLET";
  metadata?: Record<string, any>;
}

export interface FunnelStageAnalysis {
  stage: FunnelEventType;
  stageIndex: number;
  stageName: string;
  category: string;
  uniqueUsers: number;
  totalEvents: number;
  conversionFromPreviousStagePercent: number; // (uniqueUsers / prevStageUniqueUsers) * 100
  dropOffCount: number;                       // prevStageUniqueUsers - uniqueUsers
  dropOffRatePercent: number;                 // (dropOffCount / prevStageUniqueUsers) * 100
  overallConversionPercent: number;           // (uniqueUsers / stage1UniqueUsers) * 100
  medianTimeToReachSeconds?: number;
}

export interface FunnelDropOffDiagnosis {
  primaryDropOffStage: {
    fromStage: FunnelEventType;
    toStage: FunnelEventType;
    dropOffCount: number;
    dropOffRatePercent: number;
    insight: string;
    actionableRecommendation: string;
  };
  secondaryDropOffStage?: {
    fromStage: FunnelEventType;
    toStage: FunnelEventType;
    dropOffCount: number;
    dropOffRatePercent: number;
    insight: string;
    actionableRecommendation: string;
  };
  topFrictionCategory: "ONBOARDING" | "DISCOVERY" | "ENGAGEMENT" | "COMMERCE" | "PROGRESSION" | "RETENTION";
}

export interface EventFunnelAnalysisResult {
  timeframe: string;
  periodStart: string;
  periodEnd: string;
  creatorProfileId?: string;
  totalUniqueUsersStarted: number;    // Count at Stage 1 (or Stage 3 if filter is feed-first)
  totalUniqueUsersConverted: number;  // Count at Stage 12 (Purchase Completed) or Stage 16 (Returned)
  overallFunnelConversionRatePercent: number; // (Converted / Started) * 100
  stages: FunnelStageAnalysis[];
  dropOffDiagnosis: FunnelDropOffDiagnosis;
  cohortSummary: {
    onboardingDropOffPercent: number;
    engagementDropOffPercent: number;
    monetizationDropOffPercent: number;
    retentionDropOffPercent: number;
  };
  generatedAt: string;
}

export interface FunnelAnalysisQuery {
  timeframe?: "LAST_24_HOURS" | "LAST_7_DAYS" | "LAST_30_DAYS" | "ALL_TIME" | "CUSTOM";
  startDate?: string;
  endDate?: string;
  creatorProfileId?: string;
  deviceType?: "MOBILE" | "DESKTOP" | "ALL";
}
