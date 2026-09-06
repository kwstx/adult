import { NextRequest, NextResponse } from "next/server";
import { extractMLFeatureVector, exportTrainingDataset } from "@/lib/recommendations/feature-store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const creatorProfileId = searchParams.get("creatorProfileId") || searchParams.get("creatorId");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 500);

    if (userId && creatorProfileId) {
      const vector = await extractMLFeatureVector(userId, creatorProfileId);
      if (!vector) {
        return NextResponse.json({ error: "Interaction pair not found." }, { status: 404 });
      }
      return NextResponse.json({ vector });
    }

    const dataset = await exportTrainingDataset(limit);
    return NextResponse.json({
      count: dataset.length,
      dataset,
      featureSchema: {
        userFeatures: [
          "user_lifetime_events_count",
          "user_avg_watch_duration_sec",
          "user_bounce_rate",
          "user_gift_propensity",
          "user_preferred_category",
          "user_active_hours_recency",
        ],
        creatorFeatures: [
          "creator_total_followers",
          "creator_is_live",
          "creator_current_viewers",
          "creator_chat_velocity",
          "creator_heat_index",
          "creator_primary_category",
        ],
        pairFeatures: [
          "pair_is_following",
          "pair_is_subscribed",
          "pair_previous_watch_count",
          "pair_total_watch_seconds",
          "pair_distinct_return_sessions",
          "pair_category_cosine_similarity",
          "pair_previous_bounce_count",
          "pair_gifts_sent_count",
        ],
        targetLabels: [
          "label_watched_30s",
          "label_dwell_seconds",
          "label_converted_gift_sub",
        ],
      },
    });
  } catch (error: any) {
    console.error("[ML Feature Store API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to extract ML features." },
      { status: 500 }
    );
  }
}
