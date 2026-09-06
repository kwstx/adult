import { NextRequest, NextResponse } from "next/server";
import { sessionReminderService } from "@/modules/private-sessions/reminder.service";

/**
 * POST /api/private-sessions/remind
 * Dispatches automated reminders for sessions starting soon or triggers a manual reminder.
 * 
 * GET /api/private-sessions/remind?userId=xyz
 * Returns all active reminders for a user.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { bookingId, advanceMinutes = 15 } = body;

    let reminders;
    if (bookingId) {
      reminders = sessionReminderService.triggerImmediateReminder(bookingId);
    } else {
      reminders = sessionReminderService.checkAndDispatchReminders(advanceMinutes);
    }

    return NextResponse.json({
      success: true,
      dispatchedCount: reminders.length,
      reminders,
    });
  } catch (error: any) {
    console.error("POST private-sessions/remind error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to trigger reminders." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId query parameter is required." },
        { status: 400 }
      );
    }

    const reminders = sessionReminderService.getUserReminders(userId);
    return NextResponse.json({ success: true, count: reminders.length, reminders });
  } catch (error: any) {
    console.error("GET private-sessions/remind error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch reminders." },
      { status: 500 }
    );
  }
}
