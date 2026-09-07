import React from "react";
import { CreatorAnalyticsDashboard } from "@/components/creator-analytics/CreatorAnalyticsDashboard";
import { CreatorAnalyticsService } from "@/modules/analytics/creator-analytics.service";
import prisma from "@/lib/db";

export const metadata = {
  title: "Creator Analytics & Intelligence | Platform",
  description: "Monetization telemetry, high-value fan attribution & retention metrics for creators.",
};

export default async function CreatorAnalyticsPage() {
  // Query primary active creator profile for initial server render
  let creatorProfileId = "creator_maya";

  try {
    const profile = await prisma.creatorProfile.findFirst({
      select: { id: true },
    });
    if (profile?.id) {
      creatorProfileId = profile.id;
    }
  } catch {
    // Fallback in case of mock/standalone environment
  }

  const initialData = await CreatorAnalyticsService.getCreatorAnalyticsOverview(
    creatorProfileId,
    "LAST_7_DAYS"
  );

  return (
    <main className="min-h-screen bg-black text-white pt-6 pb-16">
      <CreatorAnalyticsDashboard
        initialData={initialData}
        creatorId={creatorProfileId}
      />
    </main>
  );
}
