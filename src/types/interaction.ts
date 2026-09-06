// ============================================================================
// INTERACTION SYSTEM - TYPE DEFINITIONS
// Authoritative definitions for Interaction Creation, Configuration & Real-Time Sync
// ============================================================================

export type InteractionType =
  | "QUESTION"
  | "ACTIVITY"
  | "CHALLENGE"
  | "PRIORITY_INTERACTION"
  | "CUSTOM_EXPERIENCE";

export type PurchaseEligibility =
  | "ALL"
  | "FOLLOWERS"
  | "SUBSCRIBERS_ONLY"
  | "MIN_FAN_LEVEL_5";

export interface InteractionTypeMetadata {
  type: InteractionType;
  label: string;
  shortDescription: string;
  defaultIcon: string;
  suggestedDurationSeconds: number;
  suggestedPriceTokens: number;
  badgeColor: string;
}

export const INTERACTION_TYPE_DEFINITIONS: Record<InteractionType, InteractionTypeMetadata> = {
  QUESTION: {
    type: "QUESTION",
    label: "Question",
    shortDescription: "Ask anything live on camera with prioritized live response",
    defaultIcon: "💬",
    suggestedDurationSeconds: 30,
    suggestedPriceTokens: 100,
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  ACTIVITY: {
    type: "ACTIVITY",
    label: "Activity",
    shortDescription: "Dance, workout, live song, costume change, or performance",
    defaultIcon: "💃",
    suggestedDurationSeconds: 45,
    suggestedPriceTokens: 200,
    badgeColor: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  },
  CHALLENGE: {
    type: "CHALLENGE",
    label: "Challenge",
    shortDescription: "Dare the creator with a live endurance, skill, or comedic challenge",
    defaultIcon: "🎯",
    suggestedDurationSeconds: 60,
    suggestedPriceTokens: 350,
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  PRIORITY_INTERACTION: {
    type: "PRIORITY_INTERACTION",
    label: "Priority interaction",
    shortDescription: "Jump the queue for an immediate spotlight moment and shoutout",
    defaultIcon: "⚡",
    suggestedDurationSeconds: 20,
    suggestedPriceTokens: 500,
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  CUSTOM_EXPERIENCE: {
    type: "CUSTOM_EXPERIENCE",
    label: "Custom experience",
    shortDescription: "A bespoke, tailored creator-fan interactive moment or roleplay",
    defaultIcon: "✨",
    suggestedDurationSeconds: 120,
    suggestedPriceTokens: 1000,
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
};

export interface InteractionConfig {
  id: string;
  creatorProfileId: string;
  type: InteractionType;
  name: string;
  description: string;
  price: number; // In Tokens / Credits
  duration: number; // In Seconds
  quantity: number | null; // null = Unlimited
  remainingQuantity: number | null;
  whoCanPurchase: PurchaseEligibility;
  requiresAcceptance: boolean;
  entersQueue: boolean;
  isActive: boolean;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInteractionInput {
  type: InteractionType;
  name: string;
  description?: string;
  price: number;
  duration: number;
  quantity?: number | null;
  whoCanPurchase?: PurchaseEligibility;
  requiresAcceptance?: boolean;
  entersQueue?: boolean;
  icon?: string;
}

export interface InteractionValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  sanitizedConfig?: Omit<InteractionConfig, "id" | "creatorProfileId" | "createdAt" | "updatedAt">;
}
