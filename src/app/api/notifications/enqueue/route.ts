import { NextRequest, NextResponse } from "next/server";
import { NotificationService } from "@/modules/notifications/notification.service";

/**
 * POST /api/notifications/enqueue
 * Dispatches an asynchronous notification job for any supported event type.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventType,
      creatorProfileId,
      streamId,
      streamTitle,
      stageName,
      bookingId,
      fanUserId,
      creatorUserId,
      creatorDisplayName,
      fanDisplayName,
      scheduledStartTime,
      minutesUntil,
      tierName,
      priceCredits,
      senderUserId,
      senderDisplayName,
      recipientUserId,
      messagePreview,
      conversationId,
      isPaid,
      contentId,
      contentTitle,
      contentType,
      accessLevel,
      goalId,
      goalTitle,
      targetCredits,
      unlockTitle,
      eventId,
      eventTitle,
      dropId,
      dropTitle,
      limitedQuantity,
      customPayload,
      customAudience,
    } = body;

    let result;

    switch (eventType) {
      case "CREATOR_WENT_LIVE":
        result = await NotificationService.notifyCreatorWentLive({
          creatorProfileId,
          streamId,
          streamTitle,
          stageName,
        });
        break;

      case "PRIVATE_SESSION_REMINDER":
        result = await NotificationService.notifyPrivateSessionReminder({
          bookingId,
          fanUserId,
          creatorUserId,
          creatorDisplayName: creatorDisplayName || "Creator",
          fanDisplayName: fanDisplayName || "Fan",
          scheduledStartTime: scheduledStartTime || new Date().toISOString(),
          minutesUntil: minutesUntil || 15,
        });
        break;

      case "SUB_RENEWAL":
        result = await NotificationService.notifySubscriptionRenewal({
          fanUserId,
          creatorProfileId,
          creatorName: creatorDisplayName || "Creator",
          tierName: tierName || "VIP",
          priceCredits: priceCredits || 500,
          status: "SUCCESS",
        });
        break;

      case "MESSAGE_RECEIVED":
        result = await NotificationService.notifyMessageReceived({
          senderUserId,
          senderDisplayName: senderDisplayName || "Sender",
          recipientUserId,
          messagePreview: messagePreview || "New direct message",
          conversationId: conversationId || `conv_${Date.now()}`,
          isPaid,
          creditsAmount: priceCredits,
        });
        break;

      case "CONTENT_RELEASE":
        result = await NotificationService.notifyContentRelease({
          creatorProfileId,
          creatorName: creatorDisplayName || "Creator",
          contentId: contentId || `cnt_${Date.now()}`,
          contentTitle: contentTitle || "New Exclusive Release",
          contentType: contentType || "VIDEO",
          accessLevel: accessLevel || "PPV_PURCHASE",
        });
        break;

      case "GOAL_COMPLETED":
        result = await NotificationService.notifyGoalCompleted({
          creatorProfileId,
          creatorName: creatorDisplayName || "Creator",
          goalId: goalId || `goal_${Date.now()}`,
          goalTitle: goalTitle || "Midnight Special Goal",
          targetCredits: targetCredits || 100000,
          unlockTitle: unlockTitle || "VIP Stage Show Unlocked",
        });
        break;

      case "CREATOR_EVENT":
        result = await NotificationService.notifyCreatorEvent({
          creatorProfileId,
          creatorName: creatorDisplayName || "Creator",
          eventId: eventId || `evt_${Date.now()}`,
          eventTitle: eventTitle || "Midnight Neon Gala",
          scheduledStartTime: scheduledStartTime || new Date().toISOString(),
        });
        break;

      case "DROP_RELEASE":
        result = await NotificationService.notifyDropRelease({
          creatorProfileId,
          creatorName: creatorDisplayName || "Creator",
          dropId: dropId || `drop_${Date.now()}`,
          dropTitle: dropTitle || "Limited Edition VIP Pass",
          limitedQuantity: limitedQuantity || 50,
          priceCredits: priceCredits || 2500,
        });
        break;

      default:
        if (customPayload && customAudience) {
          result = await NotificationService.sendNotification({
            eventType: eventType || "SYSTEM_ANNOUNCEMENT",
            payload: customPayload,
            audience: customAudience,
          });
        } else {
          return NextResponse.json(
            { error: `Unsupported or missing eventType: ${eventType}` },
            { status: 400 }
          );
        }
    }

    return NextResponse.json({
      success: true,
      result,
      enqueuedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[POST /api/notifications/enqueue] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to enqueue notification job." },
      { status: 500 }
    );
  }
}
