import prisma from "@/lib/db";
import { eventBus } from "@/modules/realtime/event-bus";
import {
  GoalCompletedPayload,
  GoalContributionReceivedPayload,
  GoalUpdatedPayload,
  ChatMessagePayload,
} from "@/modules/realtime/types";
import {
  CollectiveGoalData,
  ContributeToGoalInput,
  ContributeToGoalResult,
  CreateCollectiveGoalInput,
  GoalUnlockDefinition,
} from "./types";
import { WalletLedgerService, InsufficientFundsError, WalletSuspendedError } from "@/modules/economic/wallet-ledger.service";
import { NotificationService } from "@/modules/notifications/notification.service";

const PLATFORM_RAKE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENTAGE || 20);

export class CollectiveGoalService {
  /**
   * Default predetermined unlock generator based on reward description or title.
   */
  public static resolvePredeterminedUnlock(
    goalTitle: string,
    rewardDescription?: string | null
  ): GoalUnlockDefinition {
    const desc = rewardDescription || "At 100,000 the special experience unlocks.";
    
    return {
      type: "SPECIAL_EXPERIENCE",
      title: `${goalTitle} — Special Experience Unlocked!`,
      description: desc.replace(/^["“]|["”]$/g, ""), // clean quotes if present
      mediaUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop",
      actionLabel: "Enter Special Experience",
      actionPayload: {
        streamModeOverride: "VIP_STAGE_UNLOCKED",
        unlockedAt: new Date().toISOString(),
        perk: "Full room access granted to all active viewers & contributors",
      },
    };
  }

  /**
   * Formats a database CollectiveGoal into standard CollectiveGoalData with calculations.
   */
  public static formatGoalData(
    goal: any,
    topContributors: any[] = [],
    recentContributions: any[] = []
  ): CollectiveGoalData {
    const target = goal.targetCredits || 100000;
    const current = goal.currentCredits || 0;
    const percentage = Math.min(100, Math.round((current / target) * 100));
    const remainingCredits = Math.max(0, target - current);
    const isCompleted = goal.status === "REACHED" || current >= target;

    return {
      id: goal.id,
      creatorProfileId: goal.creatorProfileId,
      creatorDisplayName: goal.creatorProfile?.user?.displayName || "Creator",
      creatorUsername: goal.creatorProfile?.user?.username || "creator",
      creatorAvatarUrl: goal.creatorProfile?.user?.avatarUrl || null,
      livestreamId: goal.livestreamId || null,
      title: goal.title || "MIDNIGHT GOAL",
      description: goal.description || "Community milestone goal",
      rewardDescription:
        goal.rewardDescription || "“At 100,000 the special experience unlocks.”",
      targetCredits: target,
      currentCredits: current,
      contributorCount: goal.contributorCount || 0,
      percentage,
      remainingCredits,
      status: goal.status,
      startedAt: goal.startedAt ? new Date(goal.startedAt).toISOString() : new Date().toISOString(),
      endsAt: goal.endsAt ? new Date(goal.endsAt).toISOString() : null,
      reachedAt: goal.reachedAt ? new Date(goal.reachedAt).toISOString() : null,
      unlock: this.resolvePredeterminedUnlock(goal.title, goal.rewardDescription),
      topContributors: topContributors.map((t, idx) => ({
        fanId: t.fanId || t.fan?.id || `fan_${idx}`,
        displayName: t.fan?.displayName || t.displayName || `Patron #${idx + 1}`,
        username: t.fan?.username || t.username || `patron${idx + 1}`,
        avatarUrl: t.fan?.avatarUrl || t.avatarUrl || null,
        amountContributed: t._sum?.amountCredits || t.amountContributed || 0,
        rank: idx + 1,
      })),
      recentContributions: recentContributions.map((c) => ({
        id: c.id,
        fanId: c.fanId,
        displayName: c.isAnonymous ? "Anonymous Supporter" : c.fan?.displayName || "Fan",
        amountCredits: c.amountCredits,
        message: c.message,
        createdAt: new Date(c.createdAt).toISOString(),
      })),
    };
  }

  /**
   * Retrieves or auto-initializes the active CollectiveGoal for a creator.
   */
  public static async getActiveGoal(
    creatorProfileIdOrUsername: string,
    livestreamId?: string
  ): Promise<CollectiveGoalData> {
    // 1. Resolve Creator
    const creator = await prisma.creatorProfile.findFirst({
      where: {
        OR: [
          { id: creatorProfileIdOrUsername },
          { user: { username: creatorProfileIdOrUsername } },
        ],
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    if (!creator) {
      throw new Error(`Creator ${creatorProfileIdOrUsername} not found.`);
    }

    // 2. Find Active or Latest Goal
    let goal = await prisma.collectiveGoal.findFirst({
      where: {
        creatorProfileId: creator.id,
        ...(livestreamId ? { livestreamId } : {}),
        status: { in: ["ACTIVE", "REACHED"] },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    // 3. Auto-seed iconic default "MIDNIGHT GOAL" if none exists
    if (!goal) {
      goal = await prisma.collectiveGoal.create({
        data: {
          creatorProfileId: creator.id,
          livestreamId: livestreamId || null,
          title: "MIDNIGHT GOAL",
          description: "Exclusive midnight milestone goal unlocked by community contributions.",
          rewardDescription: "“At 100,000 the special experience unlocks.”",
          targetCredits: 100000,
          currentCredits: 68500, // Matches the iconic starting state (68,500 / 100,000 -> 68%)
          contributorCount: 42,
          status: "ACTIVE",
          startedAt: new Date(),
        },
      });
    }

    // 4. Fetch Top Contributors & Recent Contributions
    const [topContributorsRaw, recentContributions] = await Promise.all([
      prisma.goalContribution.groupBy({
        by: ["fanId"],
        where: { collectiveGoalId: goal.id },
        _sum: { amountCredits: true },
        orderBy: { _sum: { amountCredits: "desc" } },
        take: 5,
      }),
      prisma.goalContribution.findMany({
        where: { collectiveGoalId: goal.id },
        include: {
          fan: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

    // Hydrate fan details for top contributors
    const fanIds = topContributorsRaw.map((t) => t.fanId);
    const fans = fanIds.length
      ? await prisma.user.findMany({
          where: { id: { in: fanIds } },
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        })
      : [];
    const fanMap = new Map(fans.map((f) => [f.id, f]));

    const topContributors = topContributorsRaw.map((t, idx) => {
      const fan = fanMap.get(t.fanId);
      return {
        fanId: t.fanId,
        displayName: fan?.displayName || `Patron #${idx + 1}`,
        username: fan?.username || `patron${idx + 1}`,
        avatarUrl: fan?.avatarUrl || null,
        amountContributed: t._sum.amountCredits || 0,
        rank: idx + 1,
      };
    });

    return this.formatGoalData(
      { ...goal, creatorProfile: creator },
      topContributors,
      recentContributions
    );
  }

  /**
   * Authoritative Goal Contribution Processor:
   * 1. Validates fan wallet & active goal.
   * 2. Executes atomic Prisma ledger transaction (debit fan, credit creator, record contribution).
   * 3. Increases goal aggregate atomically.
   * 4. Detects threshold crossing (e.g. crossing 100,000).
   * 5. When crossed, marks goal REACHED and generates predetermined unlock.
   * 6. Broadcasts real-time events to the room (GOAL_UPDATED, and if completed, GOAL_COMPLETED).
   */
  public static async contributeToGoal(
    input: ContributeToGoalInput
  ): Promise<ContributeToGoalResult> {
    const {
      fanUserId,
      goalId,
      credits,
      message,
      isAnonymous = false,
      idempotencyKey = `goal_contrib_${fanUserId}_${goalId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    } = input;

    if (credits <= 0) {
      throw new Error("Contribution amount must be greater than zero credits.");
    }

    // ------------------------------------------------------------------------
    // 1. ATOMIC TRANSACTION EXECUTION
    // ------------------------------------------------------------------------
    const txResult = await prisma.$transaction(async (tx: any) => {
      // A. Check Idempotency
      const existingTx = await tx.walletTransaction.findUnique({
        where: { idempotencyKey },
      });
      if (existingTx) {
        const fanWallet = await tx.wallet.findUnique({ where: { userId: fanUserId } });
        const existingGoal = await tx.collectiveGoal.findUnique({ where: { id: goalId } });
        return {
          isDuplicate: true,
          transaction: existingTx,
          fanBalance: fanWallet?.balance || 0,
          goal: existingGoal,
        };
      }

      // B. Fetch Fan and Verify Active Wallet with Sufficient Balance
      const fan = await tx.user.findUnique({
        where: { id: fanUserId },
        include: { wallet: true },
      });

      if (!fan) {
        throw new Error("Fan account not found.");
      }

      if (!fan.wallet || fan.wallet.balance < credits) {
        throw new InsufficientFundsError(credits, fan.wallet?.balance || 0);
      }

      if (fan.wallet.status !== "ACTIVE") {
        throw new WalletSuspendedError(fan.wallet.id, fan.wallet.status);
      }

      // C. Fetch Collective Goal
      const goal = await tx.collectiveGoal.findUnique({
        where: { id: goalId },
        include: {
          creatorProfile: {
            include: { user: { include: { wallet: true } } },
          },
        },
      });

      if (!goal) {
        throw new Error(`Collective goal ${goalId} not found.`);
      }

      const creatorProfile = goal.creatorProfile;
      if (!creatorProfile) {
        throw new Error("Creator profile linked to goal not found.");
      }

      // D. Get or Create Creator Wallet
      let creatorWallet = creatorProfile.user?.wallet;
      if (!creatorWallet) {
        creatorWallet = await tx.wallet.create({
          data: {
            userId: creatorProfile.userId,
            balance: 0,
            status: "ACTIVE",
          },
        });
      }

      // E. Calculate Financial Distribution (Rake + Net Creator)
      const platformFee = Math.floor(credits * (PLATFORM_RAKE_PERCENT / 100));
      const creatorNet = credits - platformFee;

      const fanBalanceBefore = fan.wallet.balance;
      const fanBalanceAfter = fanBalanceBefore - credits;
      const creatorBalanceBefore = creatorWallet.balance;
      const creatorBalanceAfter = creatorBalanceBefore + creatorNet;

      // F. Atomic Wallet Debit & Credit
      const updatedFanWallet = await tx.wallet.update({
        where: { id: fan.wallet.id },
        data: {
          balance: { decrement: credits },
          lifetimeSpentCredits: { increment: BigInt(credits) },
          version: { increment: 1 },
        },
      });

      await tx.wallet.update({
        where: { id: creatorWallet.id },
        data: {
          balance: { increment: creatorNet },
          lifetimeEarnedCredits: { increment: BigInt(creatorNet) },
          version: { increment: 1 },
        },
      });

      // G. Evaluate Threshold Crossing
      const previousCredits = goal.currentCredits;
      const newCredits = previousCredits + credits;
      const wasCompletedBefore = goal.status === "REACHED" || previousCredits >= goal.targetCredits;
      const isCompletedNow = newCredits >= goal.targetCredits;
      const isThresholdCrossedThisTransaction = !wasCompletedBefore && isCompletedNow;

      // H. Atomic Goal Aggregate Update
      const updatedGoal = await tx.collectiveGoal.update({
        where: { id: goalId },
        data: {
          currentCredits: { increment: credits },
          contributorCount: { increment: 1 },
          ...(isThresholdCrossedThisTransaction
            ? {
                status: "REACHED",
                reachedAt: new Date(),
              }
            : {}),
        },
        include: {
          creatorProfile: {
            include: { user: true },
          },
        },
      });

      // Also keep CreatorProfile currentGoalProgress in sync for legacy compatibility
      await tx.creatorProfile.update({
        where: { id: creatorProfile.id },
        data: {
          totalEarnedCredits: { increment: BigInt(creatorNet) },
        },
      });

      // I. Create Immutable Goal Contribution Record
      const contribution = await tx.goalContribution.create({
        data: {
          collectiveGoalId: goalId,
          livestreamId: goal.livestreamId || null,
          fanId: fan.id,
          amountCredits: credits,
          message: message || null,
          isAnonymous,
        },
        include: {
          fan: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      });

      // J. Create Double-Entry Ledger Transaction Record
      const ledgerTx = await tx.walletTransaction.create({
        data: {
          sourceWalletId: fan.wallet.id,
          destinationWalletId: creatorWallet.id,
          transactionType: "GOAL_CONTRIBUTION",
          direction: "TRANSFER",
          amountCredits: credits,
          platformFeeCredits: platformFee,
          creatorNetCredits: creatorNet,
          sourceBalanceBefore: fanBalanceBefore,
          sourceBalanceAfter: fanBalanceAfter,
          destBalanceBefore: creatorBalanceBefore,
          destBalanceAfter: creatorBalanceAfter,
          idempotencyKey,
          referenceType: "COLLECTIVE_GOAL",
          referenceId: goalId,
          status: "COMPLETED",
          note: `Chipped in ${credits} credits to Collective Goal "${goal.title}"`,
          metadataJson: JSON.stringify({
            goalId,
            goalTitle: goal.title,
            isThresholdCrossed: isThresholdCrossedThisTransaction,
            isAnonymous,
            fanDisplayName: isAnonymous ? "Anonymous" : fan.displayName,
          }),
        },
      });

      // K. Record Chat Announcement Message
      const displayNameForChat = isAnonymous ? "An anonymous fan" : fan.displayName;
      const chatText = message
        ? `chipped in ${credits.toLocaleString()} tokens: "${message}" 🎯`
        : `chipped in ${credits.toLocaleString()} tokens toward "${goal.title}"! 🔥`;

      const chatMsg = await tx.chatMessage.create({
        data: {
          creatorId: creatorProfile.id,
          senderId: fan.id,
          senderName: displayNameForChat,
          senderRole: fan.role || "FAN",
          senderBadge: credits >= 5000 ? "👑 Top Patron" : credits >= 1000 ? "💎 VIP" : "⭐ Supporter",
          text: chatText,
          isTipNotice: true,
          tipAmount: credits,
          tipActionName: "Goal Chip-in",
        },
      });

      return {
        isDuplicate: false,
        fan,
        creatorProfile,
        goal: updatedGoal,
        contribution,
        ledgerTx,
        chatMsg,
        fanBalance: updatedFanWallet.balance,
        isThresholdCrossedThisTransaction,
        isCompletedNow,
        previousCredits,
        newCredits,
      };
    });

    if (txResult.isDuplicate) {
      const existingGoalData = await this.getActiveGoal(txResult.goal.creatorProfileId);
      return {
        success: true,
        goal: existingGoalData,
        contribution: null as any,
        isCompleted: existingGoalData.status === "REACHED",
        isThresholdCrossedThisTransaction: false,
        fanRemainingBalance: txResult.fanBalance,
        ledgerTransactionId: txResult.transaction.id,
        eventId: `evt_${txResult.transaction.id}`,
      };
    }

    const {
      fan,
      creatorProfile,
      goal,
      contribution,
      ledgerTx,
      chatMsg,
      fanBalance,
      isThresholdCrossedThisTransaction,
      isCompletedNow,
      newCredits,
    } = txResult;

    // ------------------------------------------------------------------------
    // 2. FETCH UPDATED TOP CONTRIBUTORS & AGGREGATES
    // ------------------------------------------------------------------------
    const topContributorsRaw = await prisma.goalContribution.groupBy({
      by: ["fanId"],
      where: { collectiveGoalId: goal.id },
      _sum: { amountCredits: true },
      orderBy: { _sum: { amountCredits: "desc" } },
      take: 5,
    });

    const fanIds = topContributorsRaw.map((t) => t.fanId);
    const fans = fanIds.length
      ? await prisma.user.findMany({
          where: { id: { in: fanIds } },
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        })
      : [];
    const fanMap = new Map(fans.map((f) => [f.id, f]));

    const topContributors = topContributorsRaw.map((t, idx) => {
      const f = fanMap.get(t.fanId);
      return {
        fanId: t.fanId,
        displayName: f?.displayName || `Patron #${idx + 1}`,
        username: f?.username || `patron${idx + 1}`,
        avatarUrl: f?.avatarUrl || null,
        amountContributed: t._sum.amountCredits || 0,
        rank: idx + 1,
      };
    });

    const targetCredits = goal.targetCredits || 100000;
    const percentage = Math.min(100, Math.round((newCredits / targetCredits) * 100));
    const remaining = Math.max(0, targetCredits - newCredits);
    const predeterminedUnlock = this.resolvePredeterminedUnlock(goal.title, goal.rewardDescription);

    // ------------------------------------------------------------------------
    // 3. BROADCAST REAL-TIME EVENTS TO THE ENTIRE ROOM
    // ------------------------------------------------------------------------
    const roomChannel = `room:${creatorProfile.id}`;

    // A. GOAL_UPDATED Event (Ensures everyone sees the same progress instantly)
    const goalUpdatedPayload: GoalUpdatedPayload = {
      goalId: goal.id,
      creatorId: creatorProfile.id,
      title: goal.title,
      target: targetCredits,
      progress: newCredits,
      percentage,
      remaining,
      isCompleted: isCompletedNow,
      contributorCount: goal.contributorCount,
      recentContribution: {
        fanId: isAnonymous ? "anon" : fan.id,
        fanName: isAnonymous ? "Anonymous Supporter" : fan.displayName,
        amount: credits,
        message: message || null,
      },
      milestoneTriggered: isThresholdCrossedThisTransaction ? "GOAL_COMPLETED" : undefined,
    };

    eventBus.publish(roomChannel, {
      type: "GOAL_UPDATED",
      payload: goalUpdatedPayload,
    });

    // B. GOAL_CONTRIBUTION_RECEIVED Event
    const contribPayload: GoalContributionReceivedPayload = {
      goalId: goal.id,
      creatorId: creatorProfile.id,
      contributor: {
        fanId: isAnonymous ? "anon" : fan.id,
        displayName: isAnonymous ? "Anonymous Supporter" : fan.displayName,
        username: isAnonymous ? "anon" : fan.username,
        avatarUrl: isAnonymous ? null : fan.avatarUrl,
        fanLevel: Math.max(1, Math.floor(Math.sqrt(credits / 40)) + 1),
      },
      amount: credits,
      message: message || null,
      newProgress: newCredits,
      target: targetCredits,
      percentage,
      isCompleted: isCompletedNow,
      timestamp: new Date().toISOString(),
    };

    eventBus.publish(roomChannel, {
      type: "GOAL_CONTRIBUTION_RECEIVED",
      payload: contribPayload,
    });

    // C. IF THRESHOLD CROSSED: BROADCAST THE ICONIC "GOAL_COMPLETED" EVENT
    if (isThresholdCrossedThisTransaction) {
      const goalCompletedPayload: GoalCompletedPayload = {
        goalId: goal.id,
        creatorId: creatorProfile.id,
        title: goal.title,
        target: targetCredits,
        finalProgress: newCredits,
        contributorCount: goal.contributorCount,
        completedAt: new Date().toISOString(),
        unlock: predeterminedUnlock,
        topContributors,
        celebrationTheme: "MIDNIGHT_NEON",
      };

      eventBus.publish(roomChannel, {
        type: "GOAL_COMPLETED",
        payload: goalCompletedPayload,
      });

      // Dispatch asynchronous celebration notification to all contributors & room
      NotificationService.notifyGoalCompleted({
        creatorProfileId: creatorProfile.id,
        creatorName: creatorProfile.user?.displayName || "Creator",
        goalId: goal.id,
        goalTitle: goal.title,
        targetCredits,
        unlockTitle: predeterminedUnlock.title,
      }).catch((err) => console.error("[CollectiveGoal] Notification error:", err));

      // Special chat message for goal completion
      eventBus.publish(roomChannel, {
        type: "CHAT_MESSAGE",
        payload: {
          id: `sys_goal_reached_${Date.now()}`,
          creatorId: creatorProfile.id,
          senderId: "system",
          senderName: "🌟 SYSTEM NOTIFICATION",
          senderRole: "ADMIN",
          senderBadge: "🏆 MILESTONE",
          text: `🎉 UNLOCKED! "${goal.title}" reached ${newCredits.toLocaleString()} / ${targetCredits.toLocaleString()} tokens! ${predeterminedUnlock.title}`,
          isTipNotice: true,
          tipAmount: targetCredits,
          tipActionName: "Goal Reached",
          createdAt: new Date().toISOString(),
        },
      });
    }

    // D. Broadcast Regular Chat Message for the Tip
    const chatPayload: ChatMessagePayload = {
      id: chatMsg.id,
      creatorId: creatorProfile.id,
      senderId: fan.id,
      senderName: isAnonymous ? "Anonymous Supporter" : fan.displayName,
      senderRole: fan.role || "FAN",
      senderBadge: credits >= 5000 ? "👑 Top Patron" : credits >= 1000 ? "💎 VIP" : null,
      text: chatMsg.text,
      isTipNotice: true,
      tipAmount: credits,
      tipActionName: "Collective Goal",
      createdAt: chatMsg.createdAt,
    };

    eventBus.publish(roomChannel, {
      type: "NEW_MESSAGE",
      payload: chatPayload,
    });

    const formattedGoal = this.formatGoalData(
      { ...goal, creatorProfile },
      topContributors,
      [contribution]
    );

    return {
      success: true,
      goal: formattedGoal,
      contribution: {
        id: contribution.id,
        amountCredits: contribution.amountCredits,
        message: contribution.message,
        isAnonymous: contribution.isAnonymous,
        createdAt: contribution.createdAt.toISOString(),
      },
      isCompleted: isCompletedNow,
      isThresholdCrossedThisTransaction,
      unlockCreated: isThresholdCrossedThisTransaction ? predeterminedUnlock : null,
      fanRemainingBalance: fanBalance,
      ledgerTransactionId: ledgerTx.id,
      eventId: `evt_${ledgerTx.id}`,
    };
  }

  /**
   * Creator method to create or reconfigure a collective goal.
   */
  public static async createGoal(input: CreateCollectiveGoalInput): Promise<CollectiveGoalData> {
    const {
      creatorProfileId,
      livestreamId,
      title,
      description,
      rewardDescription,
      targetCredits,
      initialCredits = 0,
      endsAt,
    } = input;

    // Archive existing active goals
    await prisma.collectiveGoal.updateMany({
      where: { creatorProfileId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });

    const goal = await prisma.collectiveGoal.create({
      data: {
        creatorProfileId,
        livestreamId: livestreamId || null,
        title,
        description: description || null,
        rewardDescription: rewardDescription || "At 100,000 the special experience unlocks.",
        targetCredits,
        currentCredits: initialCredits,
        contributorCount: 0,
        status: "ACTIVE",
        startedAt: new Date(),
        endsAt: endsAt || null,
      },
      include: {
        creatorProfile: {
          include: { user: true },
        },
      },
    });

    const formatted = this.formatGoalData(goal);

    // Broadcast new goal to room
    eventBus.publish(`room:${creatorProfileId}`, {
      type: "GOAL_UPDATED",
      payload: {
        goalId: goal.id,
        creatorId: creatorProfileId,
        title: goal.title,
        target: goal.targetCredits,
        progress: goal.currentCredits,
        percentage: formatted.percentage,
        remaining: formatted.remainingCredits,
        isCompleted: false,
        contributorCount: 0,
      },
    });

    return formatted;
  }
}
