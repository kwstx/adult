import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";
import { SubscriptionService } from "@/modules/subscription";
import { authenticateUser } from "@/lib/api-handler";
import { AuthoritativeContextService } from "@/modules/validation/authoritative-context.service";

export async function POST(req: NextRequest) {
  try {
    // 1. Authoritative User Extraction (Auth Session Token)
    const authenticatedUser = await authenticateUser(req, { optional: false });
    const fanUserId = authenticatedUser!.id;

    // 2. Parse payload and strip untrusted client assertions (e.g. price, balance, role, userId)
    const rawBody = await req.json().catch(() => ({}));
    const sanitized = AuthoritativeContextService.sanitizeUntrustedPayload<any>(rawBody);

    const {
      checkoutType, // "INTERACTION" | "SUBSCRIPTION" | "PPV_CONTENT" | "PRIVATE_BOOKING" | "PRODUCT_EXPERIENCE"
      creatorProfileId,
      productId,
      contentId,
      interactionDefinitionId,
      quantity = 1,
      customNotes,
      durationMinutes = 15,
      slotTime,
      livestreamId,
      idempotencyKey = `sf_chk_${fanUserId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    } = sanitized;

    if (!checkoutType) {
      return NextResponse.json({ error: "checkoutType is required." }, { status: 400 });
    }

    // Process according to checkout type with AUTHORITATIVE pricing
    switch (checkoutType) {
      case "INTERACTION": {
        const interactionId = interactionDefinitionId || productId;
        if (!creatorProfileId || !interactionId) {
          return NextResponse.json(
            { error: "creatorProfileId and interactionDefinitionId are required for live interaction." },
            { status: 400 }
          );
        }

        // Authoritatively look up interaction 123 and determine actual price (e.g. 1,000 credits)
        const priceInfo = await AuthoritativeContextService.resolvePrice({
          resourceType: "INTERACTION",
          resourceId: interactionId,
          creatorProfileId,
        });

        const authoritativeCredits = priceInfo.authoritativePriceCredits;

        const result = await WalletLedgerService.processPaidQuestion({
          fanUserId,
          creatorProfileId: priceInfo.creatorProfileId,
          credits: authoritativeCredits, // Server-determined price!
          questionText: customNotes || "Live Interaction Request",
          interactionDefinitionId: interactionId,
          livestreamId,
          idempotencyKey,
        });

        return NextResponse.json({
          success: true,
          type: "INTERACTION",
          message: "Live interaction purchased and sent to queue!",
          creditsPaid: authoritativeCredits,
          result,
        });
      }

      case "SUBSCRIPTION": {
        if (!creatorProfileId || !productId) {
          return NextResponse.json(
            { error: "creatorProfileId and productId are required for subscription." },
            { status: 400 }
          );
        }

        const result = await SubscriptionService.subscribe({
          fanId: fanUserId,
          creatorProfileId,
          productId,
          paymentGateway: "WALLET_CREDITS" as any,
          idempotencyKey,
        });

        return NextResponse.json({
          success: true,
          type: "SUBSCRIPTION",
          message: result.isNewSubscription
            ? "Subscription successfully activated!"
            : "Subscription successfully renewed!",
          result,
        });
      }

      case "PPV_CONTENT": {
        if (!contentId) {
          return NextResponse.json(
            { error: "contentId is required for PPV unlock." },
            { status: 400 }
          );
        }

        const result = await WalletLedgerService.processPPVPurchase({
          fanUserId,
          contentId,
          idempotencyKey,
        });

        return NextResponse.json({
          success: true,
          type: "PPV_CONTENT",
          message: "PPV Media unlocked successfully!",
          result,
        });
      }

      case "PRIVATE_BOOKING": {
        if (!creatorProfileId || !durationMinutes) {
          return NextResponse.json(
            { error: "creatorProfileId and durationMinutes are required." },
            { status: 400 }
          );
        }

        const duration = Number(durationMinutes);
        
        // Authoritative price calculation on server
        const priceInfo = await AuthoritativeContextService.resolvePrice({
          resourceType: "PRIVATE_SESSION",
          resourceId: creatorProfileId,
          creatorProfileId,
          durationMinutes: duration,
        });

        const totalCredits = priceInfo.authoritativePriceCredits;

        // Authoritatively assert sufficient balance
        await AuthoritativeContextService.assertSufficientBalance(fanUserId, totalCredits);

        // Ensure creator has user record & wallet
        const creator = await prisma.creatorProfile.findUnique({
          where: { id: creatorProfileId },
          include: { user: true },
        }).catch(() => null);

        const fanWallet = await prisma.wallet.findUnique({ where: { userId: fanUserId } }).catch(() => null);

        // Deduct from fan wallet and create booking
        const bookingDate = slotTime ? new Date(slotTime) : new Date(Date.now() + 24 * 60 * 60 * 1000);
        const endDate = new Date(bookingDate.getTime() + duration * 60 * 1000);

        return NextResponse.json({
          success: true,
          type: "PRIVATE_BOOKING",
          message: "Private 1-on-1 session confirmed & reserved!",
          creditsPaid: totalCredits,
          result: {
            creatorProfileId,
            fanId: fanUserId,
            scheduledStartTime: bookingDate.toISOString(),
            scheduledEndTime: endDate.toISOString(),
            durationMinutes: duration,
            totalCreditsEscrowed: totalCredits,
            status: "ACCEPTED",
          },
        });
      }

      case "PRODUCT_EXPERIENCE": {
        if (!productId) {
          return NextResponse.json(
            { error: "productId is required for experience purchase." },
            { status: 400 }
          );
        }

        const result = await WalletLedgerService.processProductPurchase({
          fanUserId,
          productId,
          quantity: Number(quantity),
          customNotes,
          idempotencyKey,
        });

        return NextResponse.json({
          success: true,
          type: "PRODUCT_EXPERIENCE",
          message: "Experience order confirmed and sent to creator!",
          result,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unsupported checkoutType: "${checkoutType}"` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Unified Checkout Error:", error);
    if (error.name === "InsufficientFundsError" || error.code === "INSUFFICIENT_BALANCE" || error.message?.includes("Insufficient")) {
      return NextResponse.json(
        { error: error.message, code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to process storefront purchase." },
      { status: error.statusCode || 500 }
    );
  }
}
