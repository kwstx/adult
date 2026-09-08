// ============================================================================
// CREATOR CRM ANALYTICAL STORE & CAMPAIGN REPOSITORY
// High-performance indexing for fan cohorts, custom notes/tags, and campaigns
// ============================================================================

import {
  CrmFanSummary,
  CrmFanDossier,
  CreatorCampaign,
  CrmFanCohort,
  CohortMetadata,
} from "./types";

export const COHORT_DEFINITIONS: Record<CrmFanCohort, CohortMetadata> = {
  NEW_FANS: {
    cohort: "NEW_FANS",
    title: "New Fans",
    shortTitle: "New",
    description: "Fans who joined or first interacted in the last 14 days with early progression.",
    iconName: "Sparkles",
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10 hover:bg-emerald-500/15",
    borderClass: "border-emerald-500/30",
    recommendedAction: "Send personalized welcome note & first-stream perk",
  },
  RETURNING_FANS: {
    cohort: "RETURNING_FANS",
    title: "Returning Fans",
    shortTitle: "Returning",
    description: "Repeat viewers maintaining active engagement streaks (≥3 days) or multiple stream visits.",
    iconName: "Flame",
    colorClass: "text-amber-400",
    bgClass: "bg-amber-500/10 hover:bg-amber-500/15",
    borderClass: "border-amber-500/30",
    recommendedAction: "Acknowledge loyalty streak with chat badge & priority shoutout",
  },
  VIPS: {
    cohort: "VIPS",
    title: "VIPs & Devotees",
    shortTitle: "VIPs",
    description: "Fans in VIP, Inner Circle, or Elite tiers with exceptional devotion & spending.",
    iconName: "Crown",
    colorClass: "text-rose-400",
    bgClass: "bg-rose-500/10 hover:bg-rose-500/15",
    borderClass: "border-rose-500/30",
    recommendedAction: "Offer backstage pass, custom 1-on-1 session discount, or direct priority DM",
  },
  INACTIVE_FANS: {
    cohort: "INACTIVE_FANS",
    title: "Inactive Fans",
    shortTitle: "Inactive",
    description: "Previously active fans with no activity for 30–60 days.",
    iconName: "Clock",
    colorClass: "text-zinc-400",
    bgClass: "bg-zinc-800/40 hover:bg-zinc-800/60",
    borderClass: "border-zinc-700/40",
    recommendedAction: "Send a friendly 'Miss you' note with an exclusive comeback perk",
  },
  RECENT_PURCHASERS: {
    cohort: "RECENT_PURCHASERS",
    title: "Recent Purchasers",
    shortTitle: "Recent Buyers",
    description: "Fans who completed ANY purchase (tips, toys, PPV, subs) in the last 14 days.",
    iconName: "Coins",
    colorClass: "text-cyan-400",
    bgClass: "bg-cyan-500/10 hover:bg-cyan-500/15",
    borderClass: "border-cyan-500/30",
    recommendedAction: "Deliver thank-you bonus media or follow-up private message",
  },
  HIGH_VALUE_SUPPORTERS: {
    cohort: "HIGH_VALUE_SUPPORTERS",
    title: "High-Value Supporters",
    shortTitle: "Top Spenders",
    description: "Cumulative lifetime spend ≥1,000 credits with this creator.",
    iconName: "Diamond",
    colorClass: "text-purple-400",
    bgClass: "bg-purple-500/10 hover:bg-purple-500/15",
    borderClass: "border-purple-500/30",
    recommendedAction: "Personalized concierge relationship management & bespoke custom rewards",
  },
  SUBSCRIBERS: {
    cohort: "SUBSCRIBERS",
    title: "Active Subscribers",
    shortTitle: "Subscribers",
    description: "Fans currently holding an active recurring monthly subscription tier.",
    iconName: "Award",
    colorClass: "text-blue-400",
    bgClass: "bg-blue-500/10 hover:bg-blue-500/15",
    borderClass: "border-blue-500/30",
    recommendedAction: "Drop exclusive monthly subscriber photos/videos & private room links",
  },
  EXPIRING_SUBSCRIBERS: {
    cohort: "EXPIRING_SUBSCRIBERS",
    title: "Expiring Subscribers",
    shortTitle: "Expiring Subs",
    description: "Subscriptions renewing or ending in the next 3–7 days.",
    iconName: "AlertTriangle",
    colorClass: "text-orange-400",
    bgClass: "bg-orange-500/10 hover:bg-orange-500/15",
    borderClass: "border-orange-500/30",
    recommendedAction: "Send renewal incentive bonus (extra private content or shoutout voucher)",
  },
  PEOPLE_WHO_HAVENT_RETURNED: {
    cohort: "PEOPLE_WHO_HAVENT_RETURNED",
    title: "Lapsed / Lost Fans",
    shortTitle: "Lapsed (>60d)",
    description: "Former community supporters who haven't visited in over 60 days.",
    iconName: "UserX",
    colorClass: "text-red-400",
    bgClass: "bg-red-500/10 hover:bg-red-500/15",
    borderClass: "border-red-500/30",
    recommendedAction: "Launch win-back teaser campaign with new stream highlights",
  },
  RECENT_CONTENT_PURCHASERS: {
    cohort: "RECENT_CONTENT_PURCHASERS",
    title: "Recent Content Buyers",
    shortTitle: "PPV Collectors",
    description: "Fans who unlocked PPV photos, videos, or audio media in the last 30 days.",
    iconName: "Film",
    colorClass: "text-pink-400",
    bgClass: "bg-pink-500/10 hover:bg-pink-500/15",
    borderClass: "border-pink-500/30",
    recommendedAction: "Recommend new companion PPV sets & early-access photo drops",
  },
};

export class CrmStore {
  // Creator -> Fan ID -> Private metadata (notes, tags, custom nickname)
  private static privateNotesStore: Map<string, { notes: string; nickname?: string; tags: string[] }> = new Map();

  // Creator -> Campaigns Array
  private static campaignsStore: Map<string, CreatorCampaign[]> = new Map();

  // Creator -> Fan summaries cache
  private static fanSummariesCache: Map<string, CrmFanSummary[]> = new Map();

  private static getNoteKey(creatorProfileId: string, fanId: string): string {
    return `${creatorProfileId}:${fanId}`;
  }

  public static getFanNotes(creatorProfileId: string, fanId: string) {
    return this.privateNotesStore.get(this.getNoteKey(creatorProfileId, fanId)) || {
      notes: "",
      nickname: undefined,
      tags: [],
    };
  }

  public static setFanNotes(
    creatorProfileId: string,
    fanId: string,
    data: { notes?: string; nickname?: string; tags?: string[] }
  ) {
    const key = this.getNoteKey(creatorProfileId, fanId);
    const existing = this.getFanNotes(creatorProfileId, fanId);
    this.privateNotesStore.set(key, {
      notes: data.notes !== undefined ? data.notes : existing.notes,
      nickname: data.nickname !== undefined ? data.nickname : existing.nickname,
      tags: data.tags !== undefined ? data.tags : existing.tags,
    });
  }

  public static getCampaigns(creatorProfileId: string): CreatorCampaign[] {
    return this.campaignsStore.get(creatorProfileId) || [];
  }

  public static addCampaign(creatorProfileId: string, campaign: CreatorCampaign) {
    const list = this.getCampaigns(creatorProfileId);
    this.campaignsStore.set(creatorProfileId, [campaign, ...list]);
  }

  public static updateCampaign(creatorProfileId: string, campaign: CreatorCampaign) {
    const list = this.getCampaigns(creatorProfileId);
    const updated = list.map((c) => (c.id === campaign.id ? campaign : c));
    this.campaignsStore.set(creatorProfileId, updated);
  }

  public static getCampaignById(creatorProfileId: string, campaignId: string): CreatorCampaign | undefined {
    const list = this.getCampaigns(creatorProfileId);
    return list.find((c) => c.id === campaignId);
  }

  public static getCachedSummaries(creatorProfileId: string): CrmFanSummary[] | undefined {
    return this.fanSummariesCache.get(creatorProfileId);
  }

  public static setCachedSummaries(creatorProfileId: string, summaries: CrmFanSummary[]): void {
    if (summaries.length === 0) {
      this.fanSummariesCache.delete(creatorProfileId);
    } else {
      this.fanSummariesCache.set(creatorProfileId, summaries);
    }
  }

  // Creator -> Fan ID -> Active CrmFanSummary record
  private static fanRecords: Map<string, CrmFanSummary> = new Map();

  public static getFan(creatorProfileId: string, fanId: string): CrmFanSummary | undefined {
    return this.fanRecords.get(this.getNoteKey(creatorProfileId, fanId));
  }

  public static upsertFan(creatorProfileId: string, fan: Partial<CrmFanSummary> & { fanId: string; creatorProfileId: string }): CrmFanSummary {
    const key = this.getNoteKey(creatorProfileId, fan.fanId);
    const existing = this.fanRecords.get(key);
    const nowIso = new Date().toISOString();
    const updated: CrmFanSummary = {
      id: existing?.id || `crm_${fan.fanId}_${creatorProfileId}`,
      fanId: fan.fanId,
      username: fan.username || existing?.username || "fan",
      displayName: fan.displayName || existing?.displayName || "Fan",
      avatarUrl: fan.avatarUrl !== undefined ? fan.avatarUrl : (existing?.avatarUrl || "/avatars/default.png"),
      relationshipTier: existing?.relationshipTier || "REGULAR",
      tierName: existing?.tierName || "Fan",
      fanLevel: fan.fanLevel || existing?.fanLevel || 1,
      totalXp: fan.totalXp || existing?.totalXp || 0,
      totalCreditsSpent: fan.totalCreditsSpent !== undefined ? fan.totalCreditsSpent : (existing?.totalCreditsSpent || 0),
      fiatEstimatedEur: Math.round(((fan.totalCreditsSpent !== undefined ? fan.totalCreditsSpent : (existing?.totalCreditsSpent || 0)) / 100) * 10),
      currentStreakDays: existing?.currentStreakDays || 1,
      longestStreakDays: existing?.longestStreakDays || 1,
      totalMinutesWatched: existing?.totalMinutesWatched || 10,
      lastInteractedAt: nowIso,
      daysSinceLastInteraction: 0,
      firstInteractedAt: existing?.firstInteractedAt || nowIso,
      isSubscribed: fan.isSubscribed !== undefined ? fan.isSubscribed : (existing?.isSubscribed || false),
      subscriptionTier: fan.subscriptionTier || existing?.subscriptionTier,
      recentContentPurchasedCount: existing?.recentContentPurchasedCount || 0,
      customNickname: existing?.customNickname || null,
      customNotes: existing?.customNotes || null,
      tags: existing?.tags || [],
      cohorts: fan.cohorts || existing?.cohorts || ["NEW_FANS"],
      isNotificationsEnabled: true,
      isMutedByCreator: false,
      isBannedFromRoom: false,
    };
    this.fanRecords.set(key, updated);
    return updated;
  }

  public static reset(): void {
    this.privateNotesStore.clear();
    this.campaignsStore.clear();
    this.fanSummariesCache.clear();
    this.fanRecords.clear();
  }
}

export const creatorCrmStore = CrmStore;

