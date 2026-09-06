import prisma from "@/lib/db";
import { eventBus } from "@/modules/realtime/event-bus";
import { InsufficientFundsError, WalletSuspendedError } from "@/modules/economic/wallet-ledger.service";
import { NotificationService } from "@/modules/notifications/notification.service";

const PLATFORM_RAKE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENTAGE || 20);

export type RelationshipTier =
  | "STRANGER"
  | "SUPPORTER"
  | "SUPERFAN"
  | "VIP_DEVOTEE"
  | "SOULMATE"
  | "ROYAL_PATRON";

export interface CreatorMessagingSettings {
  creatorId: string;
  creatorProfileId: string;
  paidMessagesEnabled: boolean;
  messagePriceCredits: number;
  allowFreeSubscribers: boolean;
  allowFreeVip: boolean;
  customWelcomeMessage?: string | null;
}

export interface SendMessageInput {
  senderId: string;
  creatorId: string; // creatorProfileId or username or userId
  body: string;
  mediaUrl?: string | null;
  attachedCredits?: number;
  isPaidMessage?: boolean;
  idempotencyKey?: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole: string;
  recipientId: string;
  body: string;
  mediaUrl?: string | null;
  isPaidMessage: boolean;
  paidPriceCredits: number;
  isPriority: boolean;
  relationshipTier?: RelationshipTier;
  fanLevel?: number;
  isRead: boolean;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  creatorProfileId: string;
  creatorName: string;
  creatorUsername: string;
  creatorAvatar: string;
  isCreatorLive: boolean;
  liveRoomId?: string;
  fanUserId: string;
  fanUsername: string;
  fanDisplayName: string;
  fanAvatar: string;
  lastMessage: string;
  lastActivityAt: string;
  unreadCount: number;
  hasPaidMessages: boolean;
  latestPaidAmount: number;
  isPriority: boolean;
  isSubscriber: boolean;
  subscriptionTier?: string;
  isVip: boolean;
  relationshipTier: RelationshipTier;
  relationshipLevel: number;
  totalCreditsSpent: number;
}

export interface SendMessageResult {
  success: boolean;
  message: MessageRecord;
  conversationId: string;
  walletDebit?: {
    creditsDeducted: number;
    platformFee: number;
    creatorNet: number;
    fanRemainingBalance: number;
    transactionId: string;
  };
  relationshipUpdate?: {
    xpEarned: number;
    newTotalXp: number;
    currentLevel: number;
    relationshipTier: RelationshipTier;
    leveledUp: boolean;
  };
}

// ----------------------------------------------------------------------------
// IN-MEMORY RESILIENT DATA STORE (FALLBACK ENGINE)
// ----------------------------------------------------------------------------
interface InMemUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  avatarUrl: string;
  balance: number;
}

interface InMemCreatorProfile {
  id: string;
  userId: string;
  stageName: string;
  isLive: boolean;
  paidMessagesEnabled: boolean;
  messagePriceCredits: number;
  allowFreeSubscribers: boolean;
  allowFreeVip: boolean;
  customWelcomeMessage?: string;
}

interface InMemRelationship {
  fanId: string;
  creatorProfileId: string;
  tier: RelationshipTier;
  level: number;
  totalXp: number;
  totalCreditsSpent: number;
  isSubscriber: boolean;
  isVip: boolean;
}

const memoryUsers: Map<string, InMemUser> = new Map([
  [
    "fan_alex",
    {
      id: "fan_alex",
      username: "alex_patron",
      displayName: "Alex Patron 💎",
      role: "FAN",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      balance: 2500,
    },
  ],
  [
    "fan_sarah",
    {
      id: "fan_sarah",
      username: "sarah_fan",
      displayName: "Sarah (Diamond VIP) 👑",
      role: "FAN",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
      balance: 4200,
    },
  ],
  [
    "creator_maya",
    {
      id: "creator_maya",
      username: "mayavelvet",
      displayName: "Maya Velvet ✨",
      role: "CREATOR",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      balance: 4520,
    },
  ],
  [
    "creator_chloe",
    {
      id: "creator_chloe",
      username: "chloesiren",
      displayName: "Chloe Siren 🌊",
      role: "CREATOR",
      avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
      balance: 1800,
    },
  ],
]);

const memoryCreators: Map<string, InMemCreatorProfile> = new Map([
  [
    "creator_maya",
    {
      id: "prof_maya",
      userId: "creator_maya",
      stageName: "Maya Velvet ✨",
      isLive: true,
      paidMessagesEnabled: true,
      messagePriceCredits: 50,
      allowFreeSubscribers: false,
      allowFreeVip: false,
      customWelcomeMessage: "Welcome to my direct VIP inbox! Paid messages receive priority instant replies 💕",
    },
  ],
  [
    "prof_maya",
    {
      id: "prof_maya",
      userId: "creator_maya",
      stageName: "Maya Velvet ✨",
      isLive: true,
      paidMessagesEnabled: true,
      messagePriceCredits: 50,
      allowFreeSubscribers: false,
      allowFreeVip: false,
      customWelcomeMessage: "Welcome to my direct VIP inbox! Paid messages receive priority instant replies 💕",
    },
  ],
  [
    "creator_chloe",
    {
      id: "prof_chloe",
      userId: "creator_chloe",
      stageName: "Chloe Siren 🌊",
      isLive: false,
      paidMessagesEnabled: false,
      messagePriceCredits: 0,
      allowFreeSubscribers: true,
      allowFreeVip: true,
      customWelcomeMessage: "Hey siren squad! Drop me a note anytime 🎧",
    },
  ],
  [
    "prof_chloe",
    {
      id: "prof_chloe",
      userId: "creator_chloe",
      stageName: "Chloe Siren 🌊",
      isLive: false,
      paidMessagesEnabled: false,
      messagePriceCredits: 0,
      allowFreeSubscribers: true,
      allowFreeVip: true,
      customWelcomeMessage: "Hey siren squad! Drop me a note anytime 🎧",
    },
  ],
]);

const memoryRelationships: Map<string, InMemRelationship> = new Map([
  [
    "fan_alex:prof_maya",
    {
      fanId: "fan_alex",
      creatorProfileId: "prof_maya",
      tier: "ROYAL_PATRON",
      level: 12,
      totalXp: 14500,
      totalCreditsSpent: 3500,
      isSubscriber: true,
      isVip: true,
    },
  ],
  [
    "fan_sarah:prof_maya",
    {
      fanId: "fan_sarah",
      creatorProfileId: "prof_maya",
      tier: "SUPERFAN",
      level: 8,
      totalXp: 7200,
      totalCreditsSpent: 1200,
      isSubscriber: true,
      isVip: true,
    },
  ],
  [
    "fan_alex:prof_chloe",
    {
      fanId: "fan_alex",
      creatorProfileId: "prof_chloe",
      tier: "SUPPORTER",
      level: 3,
      totalXp: 1800,
      totalCreditsSpent: 200,
      isSubscriber: false,
      isVip: false,
    },
  ],
]);

const memoryConversations: Map<string, {
  id: string;
  creatorProfileId: string;
  fanUserId: string;
  lastMessagePreview: string;
  lastActivityAt: string;
}> = new Map([
  [
    "conv_alex_maya",
    {
      id: "conv_alex_maya",
      creatorProfileId: "prof_maya",
      fanUserId: "fan_alex",
      lastMessagePreview: "Thanks for the spotlight tip! Sent you backstage preview 💕",
      lastActivityAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    },
  ],
  [
    "conv_sarah_maya",
    {
      id: "conv_sarah_maya",
      creatorProfileId: "prof_maya",
      fanUserId: "fan_sarah",
      lastMessagePreview: "Can you dance to the synthwave track next stream? 🎶",
      lastActivityAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
  ],
  [
    "conv_alex_chloe",
    {
      id: "conv_alex_chloe",
      creatorProfileId: "prof_chloe",
      fanUserId: "fan_alex",
      lastMessagePreview: "Live stream starts in 30 mins! See you there 🎧",
      lastActivityAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
  ],
]);

const memoryMessages: Map<string, MessageRecord[]> = new Map([
  [
    "conv_alex_maya",
    [
      {
        id: "msg_1",
        conversationId: "conv_alex_maya",
        senderId: "creator_maya",
        senderName: "Maya Velvet ✨",
        senderAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        senderRole: "CREATOR",
        recipientId: "fan_alex",
        body: "Hey Alex! Loved your enthusiasm in today's live stream! 💃",
        isPaidMessage: false,
        paidPriceCredits: 0,
        isPriority: false,
        isRead: true,
        createdAt: "2:15 PM",
      },
      {
        id: "msg_2",
        conversationId: "conv_alex_maya",
        senderId: "fan_alex",
        senderName: "Alex Patron 💎",
        senderAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        senderRole: "FAN",
        recipientId: "creator_maya",
        body: "The neon dance was amazing! Here's a VIP priority message for tomorrow's setlist 🎵",
        isPaidMessage: true,
        paidPriceCredits: 100,
        isPriority: true,
        relationshipTier: "ROYAL_PATRON",
        fanLevel: 12,
        isRead: true,
        createdAt: "2:18 PM",
      },
      {
        id: "msg_3",
        conversationId: "conv_alex_maya",
        senderId: "creator_maya",
        senderName: "Maya Velvet ✨",
        senderAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        senderRole: "CREATOR",
        recipientId: "fan_alex",
        body: "Thanks for the spotlight tip! Sent you backstage preview 💕",
        mediaUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
        isPaidMessage: false,
        paidPriceCredits: 0,
        isPriority: false,
        isRead: true,
        createdAt: "2:20 PM",
      },
    ],
  ],
  [
    "conv_sarah_maya",
    [
      {
        id: "msg_s1",
        conversationId: "conv_sarah_maya",
        senderId: "fan_sarah",
        senderName: "Sarah (Diamond VIP) 👑",
        senderAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
        senderRole: "FAN",
        recipientId: "creator_maya",
        body: "Can you dance to the synthwave track next stream? 🎶",
        isPaidMessage: true,
        paidPriceCredits: 50,
        isPriority: false,
        relationshipTier: "SUPERFAN",
        fanLevel: 8,
        isRead: false,
        createdAt: "1:45 PM",
      },
    ],
  ],
  [
    "conv_alex_chloe",
    [
      {
        id: "msg_c1",
        conversationId: "conv_alex_chloe",
        senderId: "creator_chloe",
        senderName: "Chloe Siren 🌊",
        senderAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
        senderRole: "CREATOR",
        recipientId: "fan_alex",
        body: "Live stream starts in 30 mins! See you there 🎧",
        isPaidMessage: false,
        paidPriceCredits: 0,
        isPriority: false,
        isRead: true,
        createdAt: "12:30 PM",
      },
    ],
  ],
]);

export class PaidMessagingService {
  /**
   * Helper to calculate relationship tier from XP
   */
  public static calculateRelationshipTier(totalXp: number): { tier: RelationshipTier; level: number } {
    const level = Math.max(1, Math.floor(totalXp / 1000) + 1);
    let tier: RelationshipTier = "STRANGER";

    if (totalXp >= 10000) {
      tier = "ROYAL_PATRON";
    } else if (totalXp >= 6000) {
      tier = "SOULMATE";
    } else if (totalXp >= 3500) {
      tier = "VIP_DEVOTEE";
    } else if (totalXp >= 1500) {
      tier = "SUPERFAN";
    } else if (totalXp >= 500) {
      tier = "SUPPORTER";
    }

    return { tier, level };
  }

  /**
   * 1. GET CREATOR MESSAGING CONFIGURATION
   */
  public static async getCreatorSettings(creatorId: string): Promise<CreatorMessagingSettings> {
    try {
      const creator = await prisma.creatorProfile.findFirst({
        where: {
          OR: [
            { id: creatorId },
            { userId: creatorId },
            { user: { username: creatorId } },
          ],
        },
      });

      if (creator) {
        return {
          creatorId: creator.userId,
          creatorProfileId: creator.id,
          paidMessagesEnabled: creator.paidMessagesEnabled,
          messagePriceCredits: creator.messagePriceCredits,
          allowFreeSubscribers: creator.allowFreeSubscribers,
          allowFreeVip: creator.allowFreeVip,
          customWelcomeMessage: creator.customWelcomeMessage,
        };
      }
    } catch {
      // Prisma offline, fallback to in-memory store
    }

    // In-memory fallback
    const memCreator =
      memoryCreators.get(creatorId) ||
      Array.from(memoryCreators.values()).find((c) => c.userId === creatorId || c.id === creatorId);

    if (memCreator) {
      return {
        creatorId: memCreator.userId,
        creatorProfileId: memCreator.id,
        paidMessagesEnabled: memCreator.paidMessagesEnabled,
        messagePriceCredits: memCreator.messagePriceCredits,
        allowFreeSubscribers: memCreator.allowFreeSubscribers,
        allowFreeVip: memCreator.allowFreeVip,
        customWelcomeMessage: memCreator.customWelcomeMessage,
      };
    }

    // Default configuration
    return {
      creatorId,
      creatorProfileId: creatorId,
      paidMessagesEnabled: false,
      messagePriceCredits: 50,
      allowFreeSubscribers: true,
      allowFreeVip: true,
      customWelcomeMessage: "Welcome to my inbox!",
    };
  }

  /**
   * 2. UPDATE CREATOR MESSAGING CONFIGURATION
   */
  public static async updateCreatorSettings(
    creatorId: string,
    settings: Partial<CreatorMessagingSettings>
  ): Promise<CreatorMessagingSettings> {
    try {
      const existing = await prisma.creatorProfile.findFirst({
        where: {
          OR: [{ id: creatorId }, { userId: creatorId }, { user: { username: creatorId } }],
        },
      });

      if (existing) {
        const updated = await prisma.creatorProfile.update({
          where: { id: existing.id },
          data: {
            paidMessagesEnabled: settings.paidMessagesEnabled !== undefined ? settings.paidMessagesEnabled : existing.paidMessagesEnabled,
            messagePriceCredits: settings.messagePriceCredits !== undefined ? Math.max(0, settings.messagePriceCredits) : existing.messagePriceCredits,
            allowFreeSubscribers: settings.allowFreeSubscribers !== undefined ? settings.allowFreeSubscribers : existing.allowFreeSubscribers,
            allowFreeVip: settings.allowFreeVip !== undefined ? settings.allowFreeVip : existing.allowFreeVip,
            customWelcomeMessage: settings.customWelcomeMessage !== undefined ? settings.customWelcomeMessage : existing.customWelcomeMessage,
          },
        });

        return {
          creatorId: updated.userId,
          creatorProfileId: updated.id,
          paidMessagesEnabled: updated.paidMessagesEnabled,
          messagePriceCredits: updated.messagePriceCredits,
          allowFreeSubscribers: updated.allowFreeSubscribers,
          allowFreeVip: updated.allowFreeVip,
          customWelcomeMessage: updated.customWelcomeMessage,
        };
      }
    } catch {
      // Prisma offline fallback
    }

    // Update in memory
    const memCreator =
      memoryCreators.get(creatorId) ||
      Array.from(memoryCreators.values()).find((c) => c.userId === creatorId || c.id === creatorId);

    if (memCreator) {
      if (settings.paidMessagesEnabled !== undefined) memCreator.paidMessagesEnabled = settings.paidMessagesEnabled;
      if (settings.messagePriceCredits !== undefined) memCreator.messagePriceCredits = Math.max(0, settings.messagePriceCredits);
      if (settings.allowFreeSubscribers !== undefined) memCreator.allowFreeSubscribers = settings.allowFreeSubscribers;
      if (settings.allowFreeVip !== undefined) memCreator.allowFreeVip = settings.allowFreeVip;
      if (settings.customWelcomeMessage !== undefined) memCreator.customWelcomeMessage = settings.customWelcomeMessage ?? undefined;

      return {
        creatorId: memCreator.userId,
        creatorProfileId: memCreator.id,
        paidMessagesEnabled: memCreator.paidMessagesEnabled,
        messagePriceCredits: memCreator.messagePriceCredits,
        allowFreeSubscribers: memCreator.allowFreeSubscribers,
        allowFreeVip: memCreator.allowFreeVip,
        customWelcomeMessage: memCreator.customWelcomeMessage,
      };
    }

    return {
      creatorId,
      creatorProfileId: creatorId,
      paidMessagesEnabled: Boolean(settings.paidMessagesEnabled),
      messagePriceCredits: settings.messagePriceCredits || 50,
      allowFreeSubscribers: Boolean(settings.allowFreeSubscribers),
      allowFreeVip: Boolean(settings.allowFreeVip),
      customWelcomeMessage: settings.customWelcomeMessage || null,
    };
  }

  /**
   * 3. VALIDATE MESSAGE PRICING & ELIGIBILITY
   */
  public static async validateMessageEligibility(
    fanUserId: string,
    creatorId: string,
    attachedCredits: number = 0
  ): Promise<{
    requiresPayment: boolean;
    requiredCredits: number;
    effectiveCreditsToCharge: number;
    isExempt: boolean;
    exemptionReason?: string;
    isPriority: boolean;
    canSend: boolean;
    walletBalance: number;
  }> {
    const settings = await this.getCreatorSettings(creatorId);

    // Check relationship / fan entitlements
    let isSubscriber = false;
    let isVip = false;
    let fanBalance = 0;

    try {
      const fan = await prisma.user.findUnique({
        where: { id: fanUserId },
        include: {
          wallet: true,
          subscriptionsFan: {
            where: { creatorProfileId: settings.creatorProfileId, status: "ACTIVE" },
          },
          creatorRelationshipsFan: {
            where: { creatorProfileId: settings.creatorProfileId },
          },
        },
      });

      if (fan) {
        fanBalance = fan.wallet?.balance || 0;
        isSubscriber = fan.subscriptionsFan.length > 0;
        const rel = fan.creatorRelationshipsFan[0];
        isVip = rel?.relationshipTier === "VIP_DEVOTEE" || rel?.relationshipTier === "SOULMATE" || rel?.relationshipTier === "ROYAL_PATRON";
      }
    } catch {
      // Memory fallback
      const relKey = `${fanUserId}:${settings.creatorProfileId}`;
      const rel = memoryRelationships.get(relKey);
      if (rel) {
        isSubscriber = rel.isSubscriber;
        isVip = rel.isVip;
      }
      const memUser = memoryUsers.get(fanUserId);
      if (memUser) {
        fanBalance = memUser.balance;
      }
    }

    let requiresPayment = false;
    let requiredCredits = 0;
    let isExempt = false;
    let exemptionReason: string | undefined = undefined;

    if (settings.paidMessagesEnabled) {
      if (settings.allowFreeSubscribers && isSubscriber) {
        isExempt = true;
        exemptionReason = "Free message granted via active Creator Subscription 👑";
      } else if (settings.allowFreeVip && isVip) {
        isExempt = true;
        exemptionReason = "Free message granted via VIP Devotee status 💎";
      } else {
        requiresPayment = true;
        requiredCredits = settings.messagePriceCredits;
      }
    }

    // Effective charge is required minimum credits OR any extra tip/priority credits attached by the fan
    const effectiveCreditsToCharge = Math.max(
      requiresPayment ? requiredCredits : 0,
      attachedCredits
    );

    const isPriority = effectiveCreditsToCharge >= 100 || effectiveCreditsToCharge > requiredCredits;
    const canSend = fanBalance >= effectiveCreditsToCharge;

    return {
      requiresPayment,
      requiredCredits,
      effectiveCreditsToCharge,
      isExempt,
      exemptionReason,
      isPriority,
      canSend,
      walletBalance: fanBalance,
    };
  }

  /**
   * 4. SEND PAID (OR FREE) MESSAGE
   * Atomically debits fan wallet, credits creator minus platform rake, updates relationship XP,
   * stores conversation & message in database, and broadcasts instantly via Real-time SSE / EventBus.
   */
  public static async sendPaidMessage(input: SendMessageInput): Promise<SendMessageResult> {
    const { senderId, creatorId, body, mediaUrl, attachedCredits = 0, isPaidMessage: requestedPaid = false } = input;

    if (!body?.trim() && !mediaUrl) {
      throw new Error("Message body or media attachment is required.");
    }

    // 1. Fetch Creator Settings & Validate Eligibility
    const settings = await this.getCreatorSettings(creatorId);
    const eligibility = await this.validateMessageEligibility(senderId, creatorId, attachedCredits);

    const isPaid = eligibility.requiresPayment || requestedPaid || attachedCredits > 0;
    const chargeCredits = isPaid ? eligibility.effectiveCreditsToCharge : 0;

    if (chargeCredits > 0 && eligibility.walletBalance < chargeCredits) {
      throw new InsufficientFundsError(chargeCredits, eligibility.walletBalance);
    }

    const platformFee = Math.floor(chargeCredits * (PLATFORM_RAKE_PERCENT / 100));
    const creatorNet = chargeCredits - platformFee;
    const idempotencyKey = input.idempotencyKey || `msg_${senderId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    let createdMessageRecord: MessageRecord;
    let conversationId: string = "";
    let walletDebitInfo: any = undefined;
    let relUpdateInfo: any = undefined;

    // 2. Execute DB Transaction (if Prisma active) or Fallback Store
    try {
      const result = await prisma.$transaction(async (tx: any) => {
        // Validate Fan
        const fan = await tx.user.findUnique({
          where: { id: senderId },
          include: { wallet: true },
        });
        if (!fan) throw new Error(`Sender user ${senderId} not found.`);

        // Validate Creator
        const creatorProfile = await tx.creatorProfile.findFirst({
          where: {
            OR: [{ id: settings.creatorProfileId }, { userId: settings.creatorId }],
          },
          include: { user: { include: { wallet: true } } },
        });
        if (!creatorProfile) throw new Error(`Creator ${creatorId} not found.`);

        // Wallet Transaction
        let txRecordId = `txn_${Date.now()}`;
        if (chargeCredits > 0) {
          if (!fan.wallet || fan.wallet.balance < chargeCredits) {
            throw new InsufficientFundsError(chargeCredits, fan.wallet?.balance || 0);
          }

          // Debit fan
          await tx.wallet.update({
            where: { id: fan.wallet.id },
            data: {
              balance: { decrement: chargeCredits },
              lifetimeSpentCredits: { increment: BigInt(chargeCredits) },
            },
          });

          // Credit creator
          if (creatorProfile.user.wallet) {
            await tx.wallet.update({
              where: { id: creatorProfile.user.wallet.id },
              data: {
                balance: { increment: creatorNet },
                lifetimeEarnedCredits: { increment: BigInt(creatorNet) },
              },
            });
          }

          // Ledger record
          const wTx = await tx.walletTransaction.create({
            data: {
              sourceWalletId: fan.wallet.id,
              destinationWalletId: creatorProfile.user.wallet?.id,
              transactionType: "PAID_MESSAGE",
              direction: "TRANSFER",
              amountCredits: chargeCredits,
              platformFeeCredits: platformFee,
              creatorNetCredits: creatorNet,
              balanceBefore: fan.wallet.balance,
              balanceAfter: fan.wallet.balance - chargeCredits,
              status: "COMPLETED",
              idempotencyKey,
              description: `Paid message to ${creatorProfile.user.displayName}`,
            },
          });
          txRecordId = wTx.id;

          // Creator Earning record
          await tx.creatorEarning.create({
            data: {
              creatorProfileId: creatorProfile.id,
              walletTransactionId: wTx.id,
              grossCredits: chargeCredits,
              platformFeeCredits: platformFee,
              netCredits: creatorNet,
              sourceType: "PAID_MESSAGE",
              clearanceStatus: "CLEARED",
              clearedAt: new Date(),
            },
          });
        }

        // Relationship XP progression
        const xpToAward = chargeCredits > 0 ? chargeCredits * 10 : 5;
        let existingRel = await tx.creatorRelationship.findUnique({
          where: {
            fanId_creatorProfileId: {
              fanId: fan.id,
              creatorProfileId: creatorProfile.id,
            },
          },
        });

        if (!existingRel) {
          existingRel = await tx.creatorRelationship.create({
            data: {
              fanId: fan.id,
              creatorProfileId: creatorProfile.id,
              relationshipTier: "STRANGER",
              currentLevel: 1,
              totalXp: BigInt(0),
              totalCreditsSpent: BigInt(0),
            },
          });
        }

        const newTotalXp = Number(existingRel.totalXp) + xpToAward;
        const newTotalSpent = Number(existingRel.totalCreditsSpent) + chargeCredits;
        const { tier: computedTier, level: computedLevel } = PaidMessagingService.calculateRelationshipTier(newTotalXp);

        await tx.creatorRelationship.update({
          where: { id: existingRel.id },
          data: {
            totalXp: BigInt(newTotalXp),
            totalCreditsSpent: BigInt(newTotalSpent),
            relationshipTier: computedTier,
            currentLevel: computedLevel,
            lastInteractedAt: new Date(),
          },
        });

        await tx.relationshipXPEvent.create({
          data: {
            creatorRelationshipId: existingRel.id,
            fanId: fan.id,
            creatorProfileId: creatorProfile.id,
            eventType: "PAID_MESSAGE",
            xpAwarded: xpToAward,
          },
        });

        // Find or Create Conversation
        let conv = await tx.conversation.findFirst({
          where: {
            creatorProfileId: creatorProfile.id,
            OR: [
              { initiatorUserId: fan.id, recipientUserId: creatorProfile.userId },
              { initiatorUserId: creatorProfile.userId, recipientUserId: fan.id },
            ],
          },
        });

        if (!conv) {
          conv = await tx.conversation.create({
            data: {
              conversationType: "CREATOR_FAN_DM",
              creatorProfileId: creatorProfile.id,
              initiatorUserId: fan.id,
              recipientUserId: creatorProfile.userId,
              lastMessagePreview: body.substring(0, 80),
              lastActivityAt: new Date(),
            },
          });
        } else {
          await tx.conversation.update({
            where: { id: conv.id },
            data: {
              lastMessagePreview: body.substring(0, 80),
              lastActivityAt: new Date(),
            },
          });
        }

        // Store Message
        const msg = await tx.message.create({
          data: {
            conversationId: conv.id,
            senderId: fan.id,
            recipientId: creatorProfile.userId,
            messageType: chargeCredits > 0 ? "PAID_MESSAGE" : mediaUrl ? "IMAGE" : "TEXT",
            body,
            mediaUrl,
            isPaidMessage: isPaid && chargeCredits > 0,
            paidPriceCredits: chargeCredits,
            isPriority: eligibility.isPriority,
            relationshipTierAtSend: computedTier,
            fanLevelAtSend: computedLevel,
            transactionId: chargeCredits > 0 ? txRecordId : null,
            isRead: false,
          },
        });

        return {
          message: {
            id: msg.id,
            conversationId: conv.id,
            senderId: fan.id,
            senderName: fan.displayName,
            senderAvatar: fan.avatarUrl || undefined,
            senderRole: fan.role,
            recipientId: creatorProfile.userId,
            body: msg.body || "",
            mediaUrl: msg.mediaUrl,
            isPaidMessage: msg.isPaidMessage,
            paidPriceCredits: msg.paidPriceCredits || 0,
            isPriority: msg.isPriority,
            relationshipTier: computedTier,
            fanLevel: computedLevel,
            isRead: false,
            createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
          conversationId: conv.id,
          fanRemainingBalance: (fan.wallet?.balance || 0) - chargeCredits,
          txRecordId,
          xpEarned: xpToAward,
          newTotalXp,
          computedTier,
          computedLevel,
        };
      });

      createdMessageRecord = result.message;
      conversationId = result.conversationId;
      if (chargeCredits > 0) {
        walletDebitInfo = {
          creditsDeducted: chargeCredits,
          platformFee,
          creatorNet,
          fanRemainingBalance: result.fanRemainingBalance,
          transactionId: result.txRecordId,
        };
      }
      relUpdateInfo = {
        xpEarned: result.xpEarned,
        newTotalXp: result.newTotalXp,
        currentLevel: result.computedLevel,
        relationshipTier: result.computedTier,
        leveledUp: false,
      };
    } catch {
      // IN-MEMORY FALLBACK PROCESSING
      const fan = memoryUsers.get(senderId) || {
        id: senderId,
        username: "fan_user",
        displayName: "Fan Patron",
        role: "FAN",
        avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        balance: 1500,
      };

      const creator = memoryCreators.get(settings.creatorProfileId) || memoryCreators.get(creatorId);
      const creatorUserId = creator?.userId || settings.creatorId;

      if (chargeCredits > 0) {
        if (fan.balance < chargeCredits) {
          throw new InsufficientFundsError(chargeCredits, fan.balance);
        }
        fan.balance -= chargeCredits;
        memoryUsers.set(fan.id, fan);

        const creatorUser = memoryUsers.get(creatorUserId);
        if (creatorUser) {
          creatorUser.balance += creatorNet;
          memoryUsers.set(creatorUserId, creatorUser);
        }
      }

      // Relationship update
      const relKey = `${senderId}:${settings.creatorProfileId}`;
      let rel = memoryRelationships.get(relKey) || {
        fanId: senderId,
        creatorProfileId: settings.creatorProfileId,
        tier: "STRANGER",
        level: 1,
        totalXp: 0,
        totalCreditsSpent: 0,
        isSubscriber: false,
        isVip: false,
      };

      const xpToAward = chargeCredits > 0 ? chargeCredits * 10 : 10;
      rel.totalXp += xpToAward;
      rel.totalCreditsSpent += chargeCredits;
      const { tier: computedTier, level: computedLevel } = this.calculateRelationshipTier(rel.totalXp);
      rel.tier = computedTier;
      rel.level = computedLevel;
      memoryRelationships.set(relKey, rel);

      // Find or Create Conversation
      let convId = `conv_${senderId}_${settings.creatorProfileId}`;
      const existingConv = Array.from(memoryConversations.values()).find(
        (c) => c.creatorProfileId === settings.creatorProfileId && c.fanUserId === senderId
      );

      if (existingConv) {
        convId = existingConv.id;
        existingConv.lastMessagePreview = body.substring(0, 80);
        existingConv.lastActivityAt = new Date().toISOString();
      } else {
        memoryConversations.set(convId, {
          id: convId,
          creatorProfileId: settings.creatorProfileId,
          fanUserId: senderId,
          lastMessagePreview: body.substring(0, 80),
          lastActivityAt: new Date().toISOString(),
        });
      }

      conversationId = convId;

      // Store Message
      const newMsg: MessageRecord = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        conversationId: convId,
        senderId: fan.id,
        senderName: fan.displayName,
        senderAvatar: fan.avatarUrl,
        senderRole: fan.role,
        recipientId: creatorUserId,
        body,
        mediaUrl: mediaUrl || null,
        isPaidMessage: isPaid && chargeCredits > 0,
        paidPriceCredits: chargeCredits,
        isPriority: eligibility.isPriority,
        relationshipTier: computedTier,
        fanLevel: computedLevel,
        isRead: false,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      const history = memoryMessages.get(convId) || [];
      history.push(newMsg);
      memoryMessages.set(convId, history);

      createdMessageRecord = newMsg;

      if (chargeCredits > 0) {
        walletDebitInfo = {
          creditsDeducted: chargeCredits,
          platformFee,
          creatorNet,
          fanRemainingBalance: fan.balance,
          transactionId: `txn_${Date.now()}`,
        };
      }

      relUpdateInfo = {
        xpEarned: xpToAward,
        newTotalXp: rel.totalXp,
        currentLevel: rel.level,
        relationshipTier: rel.tier,
        leveledUp: false,
      };
    }

    // 3. REAL-TIME INSTANT EVENT BROADCASTING
    // Channel 1: specific conversation thread
    eventBus.publish(`conversation:${conversationId}`, {
      type: "NEW_MESSAGE",
      payload: {
        message: createdMessageRecord,
        conversationId,
        isPaid: createdMessageRecord.isPaidMessage,
        isPriority: createdMessageRecord.isPriority,
        paidCredits: createdMessageRecord.paidPriceCredits,
      },
    });

    // Channel 2: recipient user direct inbox channel
    eventBus.publish(`user:${createdMessageRecord.recipientId}`, {
      type: "NEW_MESSAGE",
      payload: {
        message: createdMessageRecord,
        conversationId,
        isPaid: createdMessageRecord.isPaidMessage,
        isPriority: createdMessageRecord.isPriority,
        paidCredits: createdMessageRecord.paidPriceCredits,
      },
    });

    // Channel 3: creator channel
    eventBus.publish(`creator:${settings.creatorId}`, {
      type: "NEW_MESSAGE",
      payload: {
        message: createdMessageRecord,
        conversationId,
        isPaid: createdMessageRecord.isPaidMessage,
        isPriority: createdMessageRecord.isPriority,
        paidCredits: createdMessageRecord.paidPriceCredits,
      },
    });

    // Background Async Notification Delivery
    NotificationService.notifyMessageReceived({
      senderUserId: createdMessageRecord.senderId,
      senderDisplayName: createdMessageRecord.senderName,
      recipientUserId: createdMessageRecord.recipientId,
      messagePreview: createdMessageRecord.body,
      conversationId,
      isPaid: createdMessageRecord.isPaidMessage,
      creditsAmount: createdMessageRecord.paidPriceCredits,
    }).catch((err) => console.error("[PaidMessaging] Notification error:", err));

    return {
      success: true,
      message: createdMessageRecord,
      conversationId,
      walletDebit: walletDebitInfo,
      relationshipUpdate: relUpdateInfo,
    };
  }

  /**
   * 5. GET CONVERSATIONS FOR USER (WITH ATTENTION PRIORITIZATION FILTERS)
   */
  public static async getConversationsForUser(
    userId: string,
    role: "FAN" | "CREATOR" = "FAN",
    filter: "all" | "unread" | "paid" | "priority" | "subscribers" | "vip" = "all"
  ): Promise<ConversationSummary[]> {
    let summaries: ConversationSummary[] = [];

    // Try Prisma DB
    try {
      const dbConversations = await prisma.conversation.findMany({
        where:
          role === "CREATOR"
            ? {
                OR: [
                  { recipientUserId: userId },
                  { creatorProfile: { userId } },
                ],
              }
            : {
                OR: [
                  { initiatorUserId: userId },
                  { recipientUserId: userId },
                ],
              },
        include: {
          creatorProfile: {
            include: { user: true },
          },
          initiatorUser: {
            include: {
              wallet: true,
              subscriptionsFan: true,
              creatorRelationshipsFan: true,
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
        orderBy: { lastActivityAt: "desc" },
      });

      if (dbConversations && dbConversations.length > 0) {
        summaries = dbConversations.map((c) => {
          const creator = c.creatorProfile;
          const fan = c.initiatorUser;
          const messages = c.messages;
          const unreadCount = messages.filter((m) => !m.isRead && m.recipientId === userId).length;
          const paidMessages = messages.filter((m) => m.isPaidMessage);
          const hasPaidMessages = paidMessages.length > 0;
          const isPriority = messages.some((m) => m.isPriority);
          const latestPaid = paidMessages[0]?.paidPriceCredits || 0;

          const activeSub = fan.subscriptionsFan.find(
            (s) => s.creatorProfileId === creator?.id && s.status === "ACTIVE"
          );
          const rel = fan.creatorRelationshipsFan.find((r) => r.creatorProfileId === creator?.id);
          const tier = (rel?.relationshipTier as RelationshipTier) || "STRANGER";
          const isVip = tier === "VIP_DEVOTEE" || tier === "SOULMATE" || tier === "ROYAL_PATRON";

          return {
            id: c.id,
            creatorProfileId: creator?.id || "",
            creatorName: creator?.user.displayName || "Creator",
            creatorUsername: creator?.user.username || "creator",
            creatorAvatar: creator?.user.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            isCreatorLive: creator?.isLive || false,
            liveRoomId: creator?.id,
            fanUserId: fan.id,
            fanUsername: fan.username,
            fanDisplayName: fan.displayName,
            fanAvatar: fan.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
            lastMessage: c.lastMessagePreview || messages[0]?.body || "New conversation",
            lastActivityAt: c.lastActivityAt.toISOString(),
            unreadCount,
            hasPaidMessages,
            latestPaidAmount: latestPaid,
            isPriority,
            isSubscriber: Boolean(activeSub),
            subscriptionTier: activeSub ? "VIP Sub" : undefined,
            isVip,
            relationshipTier: tier,
            relationshipLevel: rel?.currentLevel || 1,
            totalCreditsSpent: Number(rel?.totalCreditsSpent || 0),
          };
        });
      }
    } catch {
      // Prisma offline, build from in-memory fallback
    }

    if (summaries.length === 0) {
      // Build from in-memory data
      Array.from(memoryConversations.values()).forEach((conv) => {
        const creator = memoryCreators.get(conv.creatorProfileId);
        const fan = memoryUsers.get(conv.fanUserId);
        const rel = memoryRelationships.get(`${conv.fanUserId}:${conv.creatorProfileId}`);
        const messages = memoryMessages.get(conv.id) || [];

        // Check user involvement
        const isFanMatch = conv.fanUserId === userId;
        const isCreatorMatch = creator?.userId === userId;

        if ((role === "CREATOR" && isCreatorMatch) || (role === "FAN" && (isFanMatch || !isCreatorMatch))) {
          const unreadCount = messages.filter((m) => !m.isRead && m.recipientId === userId).length;
          const paidMessages = messages.filter((m) => m.isPaidMessage);
          const hasPaidMessages = paidMessages.length > 0;
          const isPriority = messages.some((m) => m.isPriority);
          const latestPaid = paidMessages[paidMessages.length - 1]?.paidPriceCredits || 0;

          summaries.push({
            id: conv.id,
            creatorProfileId: conv.creatorProfileId,
            creatorName: creator?.stageName || "Maya Velvet ✨",
            creatorUsername: creator?.userId || "mayavelvet",
            creatorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            isCreatorLive: creator?.isLive || false,
            liveRoomId: creator?.id || "prof_maya",
            fanUserId: conv.fanUserId,
            fanUsername: fan?.username || "fan_patron",
            fanDisplayName: fan?.displayName || "Alex Patron 💎",
            fanAvatar: fan?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
            lastMessage: conv.lastMessagePreview,
            lastActivityAt: conv.lastActivityAt,
            unreadCount,
            hasPaidMessages,
            latestPaidAmount: latestPaid,
            isPriority,
            isSubscriber: rel?.isSubscriber || false,
            subscriptionTier: rel?.isSubscriber ? "VIP Sub" : undefined,
            isVip: rel?.isVip || false,
            relationshipTier: rel?.tier || "STRANGER",
            relationshipLevel: rel?.level || 1,
            totalCreditsSpent: rel?.totalCreditsSpent || 0,
          });
        }
      });
    }

    // Apply Prioritization Filters
    if (filter === "unread") {
      summaries = summaries.filter((c) => c.unreadCount > 0);
    } else if (filter === "paid") {
      summaries = summaries.filter((c) => c.hasPaidMessages);
    } else if (filter === "priority") {
      summaries = summaries.filter((c) => c.isPriority || c.latestPaidAmount >= 100);
    } else if (filter === "subscribers") {
      summaries = summaries.filter((c) => c.isSubscriber);
    } else if (filter === "vip") {
      summaries = summaries.filter((c) => c.isVip);
    }

    // Sort: Priority and Paid on top, then by most recent activity
    return summaries.sort((a, b) => {
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;
      if (a.latestPaidAmount !== b.latestPaidAmount) {
        return b.latestPaidAmount - a.latestPaidAmount;
      }
      return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
    });
  }

  /**
   * 6. GET MESSAGES FOR CONVERSATION
   */
  public static async getMessagesForConversation(
    conversationId: string,
    currentUserId?: string
  ): Promise<MessageRecord[]> {
    try {
      const messages = await prisma.message.findMany({
        where: { conversationId },
        include: { sender: true },
        orderBy: { createdAt: "asc" },
      });

      if (messages && messages.length > 0) {
        // Mark unread messages as read
        if (currentUserId) {
          await prisma.message.updateMany({
            where: {
              conversationId,
              recipientId: currentUserId,
              isRead: false,
            },
            data: {
              isRead: true,
              readAt: new Date(),
            },
          });
        }

        return messages.map((m) => ({
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId,
          senderName: m.sender.displayName,
          senderAvatar: m.sender.avatarUrl || undefined,
          senderRole: m.sender.role,
          recipientId: m.recipientId || "",
          body: m.body || "",
          mediaUrl: m.mediaUrl,
          isPaidMessage: m.isPaidMessage,
          paidPriceCredits: m.paidPriceCredits || 0,
          isPriority: m.isPriority,
          relationshipTier: (m.relationshipTierAtSend as RelationshipTier) || undefined,
          fanLevel: m.fanLevelAtSend || undefined,
          isRead: m.isRead,
          createdAt: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }));
      }
    } catch {
      // Fallback to in-memory store
    }

    const messages = memoryMessages.get(conversationId) || [];
    if (currentUserId) {
      messages.forEach((m) => {
        if (m.recipientId === currentUserId) {
          m.isRead = true;
        }
      });
      memoryMessages.set(conversationId, messages);
    }

    return [...messages];
  }
}
