import { NextRequest, NextResponse } from "next/server";
import { SubscriptionService } from "@/modules/subscription";

/**
 * Sweeper worker endpoint triggered by cron scheduler
 * to process due recurring subscription renewals and expired grace periods.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "platform_cron_secret";

    // Optional secret verification if configured
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 });
    }

    const now = new Date();
    const renewalResults = await SubscriptionService.processDueRenewalsBatch(now);
    const expiredCount = await SubscriptionService.expireStalePastDueBatch(now);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      renewals: renewalResults,
      expiredGracePeriodCount: expiredCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute subscription renewal sweeper" },
      { status: 500 }
    );
  }
}
