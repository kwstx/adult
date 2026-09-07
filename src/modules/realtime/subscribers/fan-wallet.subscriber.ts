/**
 * Fan Wallet Subscriber
 *
 * Listens for authoritative spending events (Gifts, Interactions, PPV Content)
 * and immediately broadcasts private wallet updates to the fan's user channel.
 *
 * Responsibilities:
 * - Pushes real-time wallet debit/credit sync to `user:<userId>` and `wallet:<userId>`
 * - Prevents client wallet desynchronization without any client HTTP polling
 */

import { eventBus } from "../event-bus";
import {
  DomainEvent,
  GiftSentPayload,
  InteractionPurchasedPayload,
  ContentPurchasedPayload,
  FanWalletUpdatePayload,
} from "../types";

export class FanWalletSubscriber {
  private static registered = false;
  private static mockBalances: Map<string, number> = new Map();

  public static register(): void {
    if (this.registered) return;
    this.registered = true;

    // 1. React to GIFT_SENT
    eventBus.on<GiftSentPayload>("GIFT_SENT", (event) => {
      this.handleGiftSent(event);
    });

    // 2. React to INTERACTION_PURCHASED
    eventBus.on<InteractionPurchasedPayload>("INTERACTION_PURCHASED", (event) => {
      this.handleInteractionPurchased(event);
    });

    // 3. React to CONTENT_PURCHASED
    eventBus.on<ContentPurchasedPayload>("CONTENT_PURCHASED", (event) => {
      this.handleContentPurchased(event);
    });
  }

  private static handleGiftSent(event: DomainEvent<GiftSentPayload>): void {
    const { sender, gift } = event.payload;
    const fanUserId = sender.userId;
    const spent = gift.creditAmount;

    this.applyBalanceDebitAndNotify(fanUserId, spent, "GIFT_SENT", event.id);
  }

  private static handleInteractionPurchased(event: DomainEvent<InteractionPurchasedPayload>): void {
    const { senderId, actionItem } = event.payload;
    const spent = actionItem.creditCost;

    this.applyBalanceDebitAndNotify(senderId, spent, "INTERACTION_PURCHASED", event.id);
  }

  private static handleContentPurchased(event: DomainEvent<ContentPurchasedPayload>): void {
    const { buyerUserId, priceCredits } = event.payload;
    const spent = priceCredits;

    this.applyBalanceDebitAndNotify(buyerUserId, spent, "CONTENT_PURCHASED", event.id);
  }

  private static applyBalanceDebitAndNotify(
    userId: string,
    amountDebited: number,
    eventType: any,
    referenceId: string
  ): void {
    const currentBalance = this.mockBalances.get(userId) ?? 2500;
    const newBalance = Math.max(0, currentBalance - amountDebited);
    this.mockBalances.set(userId, newBalance);

    const payload: FanWalletUpdatePayload = {
      userId,
      eventType,
      balanceDelta: -amountDebited,
      newAvailableBalance: newBalance,
      referenceId,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to fan's private channels
    const userChannel = `user:${userId}`;
    const walletChannel = `wallet:${userId}`;

    const updateEvent: DomainEvent = {
      id: `wup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: "ROOM_STATUS",
      channel: userChannel,
      timestamp: Date.now(),
      payload: {
        type: "WALLET_BALANCE_UPDATED",
        ...payload,
      },
      metadata: {
        source: "fan_wallet_subscriber",
        version: "1.0.0",
      },
    };

    eventBus.publish(userChannel, updateEvent);
    eventBus.publish(walletChannel, updateEvent);
  }

  public static setBalance(userId: string, balance: number): void {
    this.mockBalances.set(userId, balance);
  }

  public static getBalance(userId: string): number {
    return this.mockBalances.get(userId) ?? 2500;
  }

  public static resetForTesting(): void {
    this.registered = false;
    this.mockBalances.clear();
  }
}
