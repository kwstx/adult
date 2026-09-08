/**
 * Creator CRM Event Hub Subscriber
 *
 * Automatically maintains fan relationship CRM records, lifetime spend analytics,
 * and dynamic cohort classification (Whales, Spenders, Superfans, Churn Risks).
 */

import { eventBus } from "@/modules/realtime/event-bus";
import { UserSentGiftPayload, UserBoughtContentPayload, SessionBookedPayload, UserFollowedCreatorPayload } from "../types";
import { creatorCrmStore } from "@/modules/creator-crm/crm-store";
import { StructuredLogger } from "@/core/observability";

export class CreatorCrmHubSubscriber {
  private static registered = false;
  public static processedCount = 0;

  public static register(): void {
    if (this.registered) return;
    this.registered = true;

    // 1. Gift Sent -> Update Lifetime Spend & Top Spender Cohorts
    eventBus.on("USER_SENT_GIFT", async (event) => {
      this.processedCount++;
      const payload = event.payload as UserSentGiftPayload;
      const { userId, creatorProfileId, amountCredits } = payload;

      StructuredLogger.info("Creator CRM: Updating fan spending stats", { userId, creatorProfileId, amountCredits });

      try {
        const existing = creatorCrmStore.getFan(creatorProfileId, userId);
        const currentSpent = (existing?.totalCreditsSpent || 0) + amountCredits;
        const cohorts = new Set(existing?.cohorts || []);

        // Dynamic cohort assignment rules
        if (currentSpent >= 5000) cohorts.add("WHALES" as any);
        if (currentSpent >= 1000) cohorts.add("TOP_SPENDERS" as any);
        cohorts.add("ENGAGED_FANS" as any);

        creatorCrmStore.upsertFan(creatorProfileId, {
          fanId: userId,
          creatorProfileId,
          totalCreditsSpent: currentSpent,
          cohorts: Array.from(cohorts),
        });
      } catch {
        // Non-blocking CRM update
      }
    });

    // 2. Content Purchased -> Add to Recent Purchasers Cohort
    eventBus.on("USER_BOUGHT_CONTENT", async (event) => {
      this.processedCount++;
      const payload = event.payload as UserBoughtContentPayload;
      const { userId, creatorProfileId, priceCreditsPaid } = payload;

      try {
        const existing = creatorCrmStore.getFan(creatorProfileId, userId);
        const currentSpent = (existing?.totalCreditsSpent || 0) + priceCreditsPaid;
        const cohorts = new Set(existing?.cohorts || []);
        cohorts.add("RECENT_CONTENT_PURCHASERS" as any);

        creatorCrmStore.upsertFan(creatorProfileId, {
          fanId: userId,
          creatorProfileId,
          totalCreditsSpent: currentSpent,
          cohorts: Array.from(cohorts),
        });
      } catch {
        // Non-blocking CRM update
      }
    });

    // 3. Private Session Booked -> Add to VIP Private Clients Cohort
    eventBus.on("SESSION_BOOKED", async (event) => {
      this.processedCount++;
      const payload = event.payload as SessionBookedPayload;
      const { fanId, creatorProfileId, totalCreditsEscrowed } = payload;

      try {
        const existing = creatorCrmStore.getFan(creatorProfileId, fanId);
        const currentSpent = (existing?.totalCreditsSpent || 0) + totalCreditsEscrowed;
        const cohorts = new Set(existing?.cohorts || []);
        cohorts.add("VIP_PRIVATE_CLIENTS" as any);
        cohorts.add("HIGH_VALUE_CUSTOMERS" as any);

        creatorCrmStore.upsertFan(creatorProfileId, {
          fanId,
          creatorProfileId,
          totalCreditsSpent: currentSpent,
          cohorts: Array.from(cohorts),
        });
      } catch {
        // Non-blocking CRM update
      }
    });
  }

  public static _reset(): void {
    this.processedCount = 0;
  }
}
