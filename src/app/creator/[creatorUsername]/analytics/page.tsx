import React from "react";
import { CreatorAnalyticsDashboard } from "@/components/creator-analytics/CreatorAnalyticsDashboard";
import { CreatorAnalyticsService } from "@/modules/analytics/creator-analytics.service";
import prisma from "@/lib/db";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ creatorUsername: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { creatorUsername } = await params;
  return {
    title: `@${creatorUsername} Analytics & Intelligence | Platform`,
    description: `Creator analytics, revenue breakdown, and fan attribution for @${creatorUsername}.`,
  };
}

export default async function CreatorUserAnalyticsPage({ params }: PageProps) {
  const { creatorUsername } = await params;

  let creatorProfileId = "creator_maya";

  try {
    const profile = await prisma.creatorProfile.findFirst({
      where: {
        user: {
          username: {
            equals: creatorUsername,
            mode: "insensitive",
          },
        },
      },
      select: { id: true },
    });

    if (profile) {
      creatorProfileId = profile.id;
    }
  } catch {
    // Keep fallback
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
