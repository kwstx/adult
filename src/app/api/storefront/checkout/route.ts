import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { WalletLedgerService } from "@/modules/economic/wallet-ledger.service";
import { SubscriptionService } from "@/modules/subscription";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      checkoutType, // "INTERACTION" | "SUBSCRIPTION" | "PPV_CONTENT" | "PRIVATE_BOOKING" | "PRODUCT_EXPERIENCE"
      fanUserId,
      creatorProfileId,
      productId,
      contentId,
      interactionDefinitionId,
      credits,
      quantity = 1,
      customNotes,
      durationMinutes,
      slotTime,
      livestreamId,
      idempotencyKey = `sf_chk_${fanUserId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    } = body;

    if (!fanUserId) {
      return NextResponse.json({ error: "fanUserId is required." }, { status: 400 });
    }

    if (!checkoutType) {
      return NextResponse.json({ error: "checkoutType is required." }, { status: 400 });
    }

    // Process according to checkout type
    switch (checkoutType) {
      case "INTERACTION": {
        if (!creatorProfileId || !credits) {
          return NextResponse.json(
            { error: "creatorProfileId and credits are required for live interaction." },
            { status: 400 }
          );
        }

        const result = await WalletLedgerService.processPaidQuestion({
          fanUserId,
          creatorProfileId,
          credits: Number(credits),
          questionText: customNotes || "Live Interaction Request",
          interactionDefinitionId,
          livestreamId,
          idempotencyKey,
        });

        return NextResponse.json({
          success: true,
          type: "INTERACTION",
          message: "Live interaction purchased and sent to queue!",
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
        const ratePerMin = 100;
        const totalCredits = duration * ratePerMin;

        // Ensure creator has user record & wallet
        const creator = await prisma.creatorProfile.findUnique({
          where: { id: creatorProfileId },
          include: { user: true },
        });

        if (!creator) {
          return NextResponse.json({ error: "Creator not found." }, { status: 404 });
        }

        // Validate fan wallet
        const fanWallet = await prisma.wallet.findUnique({ where: { userId: fanUserId } });
        if (!fanWallet || fanWallet.balance < totalCredits) {
          return NextResponse.json(
            {
              error: `Insufficient tokens. Required: ${totalCredits}, available: ${fanWallet?.balance || 0}`,
              code: "INSUFFICIENT_CREDITS",
            },
            { status: 402 }
          );
        }

        // Deduct from fan wallet and create booking
        const bookingDate = slotTime ? new Date(slotTime) : new Date(Date.now() + 24 * 60 * 60 * 1000);
        const endDate = new Date(bookingDate.getTime() + duration * 60 * 1000);

        const booking = await prisma.$transaction(async (tx) => {
          // Debit fan wallet
          await tx.wallet.update({
            where: { id: fanWallet.id },
            data: {
              balance: { decrement: totalCredits },
              lifetimeSpentCredits: { increment: BigInt(totalCredits) },
            },
          });

          // Create ledger entry
          const ledgerTx = await tx.walletTransaction.create({
            data: {
              sourceWalletId: fanWallet.id,
              destinationWalletId: null, // Escrowed until completion
              transactionType: "PRIVATE_BOOKING",
              direction: "TRANSFER",
              amountCredits: totalCredits,
              platformFeeCredits: Math.floor(totalCredits * 0.2),
              creatorNetCredits: Math.floor(totalCredits * 0.8),
              idempotencyKey,
              status: "COMPLETED",
              note: `Private 1-on-1 Booking (${duration} mins with ${creator.user.displayName})`,
            },
          });

          // Create booking record
          return await tx.booking.create({
            data: {
              creatorProfileId: creator.id,
              fanId: fanUserId,
              scheduledStartTime: bookingDate,
              scheduledEndTime: endDate,
              durationMinutes: duration,
              creditRatePerMinute: ratePerMin,
              totalCreditsEscrowed: totalCredits,
              status: "ACCEPTED",
              fanNotes: customNotes || "Private session booking",
              meetingRoomId: `room_priv_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              walletTransactionId: ledgerTx.id,
            },
          });
        });

        return NextResponse.json({
          success: true,
          type: "PRIVATE_BOOKING",
          message: "Private 1-on-1 session confirmed & reserved!",
          result: booking,
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
    if (error.name === "InsufficientFundsError" || error.message?.includes("Insufficient funds")) {
      return NextResponse.json(
        { error: error.message, code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to process storefront purchase." },
      { status: 500 }
    );
  }
}
