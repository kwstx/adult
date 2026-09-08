/**
 * Recommendation Engine Event Hub Subscriber
 *
 * Captures user behavioral events and feeds them directly into the
 * Recommendation Event Collector, updating real-time affinity and creator popularity heat.
 */

import { eventBus } from "@/modules/realtime/event-bus";
import { UserJoinedLivePayload, UserFollowedCreatorPayload, UserBoughtContentPayload, UserSentGiftPayload } from "../types";
import { recordRecommendationEvent } from "@/lib/recommendations/event-collector";
import { StructuredLogger } from "@/core/observability";

export class RecommendationHubSubscriber {
  private static registered = false;
  public static processedCount = 0;

  public static register(): void {
    if (this.registered) return;
    this.registered = true;

    // 1. User Joined Live (Watch/Impression signal)
    eventBus.on("USER_JOINED_LIVE", async (event) => {
      this.processedCount++;
      const payload = event.payload as UserJoinedLivePayload;

      try {
        await recordRecommendationEvent({
          userId: payload.userId,
          creatorProfileId: payload.creatorProfileId,
          livestreamId: payload.livestreamId,
          eventType: "WATCH",
          watchDurationSeconds: 15,
          dwellTimeMs: 15000,
          timestamp: Date.now(),
        });
      } catch {
        // Non-blocking telemetry
      }
    });

    // 2. User Followed Creator (Strong intent signal)
    eventBus.on("USER_FOLLOWED_CREATOR", async (event) => {
      this.processedCount++;
      const payload = event.payload as UserFollowedCreatorPayload;

      try {
        await recordRecommendationEvent({
          userId: payload.userId,
          creatorProfileId: payload.creatorProfileId,
          eventType: "FOLLOW",
          timestamp: Date.now(),
        });
      } catch {
        // Non-blocking telemetry
      }
    });

    // 3. User Bought Content (Economic purchase signal)
    eventBus.on("USER_BOUGHT_CONTENT", async (event) => {
      this.processedCount++;
      const payload = event.payload as UserBoughtContentPayload;

      try {
        await recordRecommendationEvent({
          userId: payload.userId,
          creatorProfileId: payload.creatorProfileId,
          contentId: payload.contentId,
          eventType: "CONTENT_PURCHASE",
          amountCredits: payload.priceCreditsPaid,
          timestamp: Date.now(),
        });
      } catch {
        // Non-blocking telemetry
      }
    });

    // 4. User Sent Gift (High-value monetization affinity signal)
    eventBus.on("USER_SENT_GIFT", async (event) => {
      this.processedCount++;
      const payload = event.payload as UserSentGiftPayload;

      try {
        await recordRecommendationEvent({
          userId: payload.userId,
          creatorProfileId: payload.creatorProfileId,
          eventType: "GIFT",
          amountCredits: payload.amountCredits,
          metadata: { giftName: payload.giftName },
          timestamp: Date.now(),
        });
      } catch {
        // Non-blocking telemetry
      }
    });
  }

  public static _reset(): void {
    this.processedCount = 0;
  }
}
