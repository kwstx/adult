/**
 * ============================================================================
 * AUTHORITATIVE ACCOUNT MODERATION SERVICE
 * ============================================================================
 * 
 * Moderation States for Accounts:
 * - Active
 * - Restricted
 * - Suspended
 * - Banned
 * - Under review
 * 
 * Enforces account penalties, permission matrices, session invalidations,
 * and immutable audit tracking.
 */

import prisma from "@/lib/db";
import {
  AccountModerationState,
  AccountPermissions,
  SecurityContext,
} from "./types";
import { AccountStateMachine } from "./state-machine";
import { AuditService } from "./audit.service";
import { EnforcementService } from "./enforcement.service";

export class AccountModerationService {
  /**
   * Authoritatively transition a user account to a new moderation state.
   */
  static async transitionState(
    userId: string,
    targetState: AccountModerationState,
    reason: string,
    context?: SecurityContext,
    durationHours?: number,
    metadata?: Record<string, unknown>
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { creatorProfile: true },
    });

    if (!user) {
      throw new Error(`User account with ID ${userId} does not exist.`);
    }

    const currentState = user.moderationState;

    // Validate transition through AccountStateMachine
    AccountStateMachine.validateTransition(currentState, targetState, context, reason);

    // Update User model
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        moderationState: targetState,
        isBanned: targetState === "BANNED",
        banReason: targetState === "BANNED" || targetState === "SUSPENDED" ? reason : null,
      },
    });

    // If Suspended or Banned, immediately invalidate all active sessions
    if (targetState === "SUSPENDED" || targetState === "BANNED") {
      await EnforcementService.invalidateUserSessions(userId, reason, context);

      // If user is also a live creator, immediately terminate any live streams
      if (user.creatorProfile?.isLive) {
        const activeLivestream = await prisma.livestream.findFirst({
          where: {
            creatorProfileId: user.creatorProfile.id,
            status: "LIVE",
          },
        });
        if (activeLivestream) {
          await EnforcementService.terminateLivestream(
            activeLivestream.id,
            `Broadcaster account transitioned to ${targetState}: ${reason}`,
            context
          );
        }
      }
    }

    // Authoritative Audit Log
    await AuditService.logStateTransition({
      targetEntityType: "User",
      targetEntityId: userId,
      oldState: currentState,
      newState: targetState,
      reason,
      actionName: "ACCOUNT_MODERATION_STATE_CHANGE",
      context,
      metadata: {
        ...metadata,
        username: user.username,
        role: user.role,
        durationHours: durationHours || null,
      },
    });

    return updatedUser;
  }

  /**
   * Evaluate the authoritative permission matrix for an account.
   */
  static async evaluatePermissions(userId: string): Promise<AccountPermissions> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        moderationState: true,
        role: true,
        isBanned: true,
        banReason: true,
      },
    });

    if (!user) {
      return {
        canLogin: false,
        canBrowse: false,
        canChat: false,
        canSendTips: false,
        canPurchasePPV: false,
        canSubscribe: false,
        canBroadcastLive: false,
        canWithdrawFunds: false,
        isRestrictedMode: true,
        restrictionReason: "User account not found.",
      };
    }

    switch (user.moderationState) {
      case "ACTIVE":
        return {
          canLogin: true,
          canBrowse: true,
          canChat: true,
          canSendTips: true,
          canPurchasePPV: true,
          canSubscribe: true,
          canBroadcastLive: user.role === "CREATOR" || user.role === "ADMIN",
          canWithdrawFunds: true,
          isRestrictedMode: false,
        };

      case "RESTRICTED":
        return {
          canLogin: true,
          canBrowse: true,
          canChat: false, // Chat muted
          canSendTips: true,
          canPurchasePPV: true,
          canSubscribe: true,
          canBroadcastLive: false, // Broadcasting suspended
          canWithdrawFunds: false, // Withdrawals on hold
          isRestrictedMode: true,
          restrictionReason: "Account is in Restricted mode due to policy warnings.",
        };

      case "UNDER_REVIEW":
        return {
          canLogin: true,
          canBrowse: true,
          canChat: false,
          canSendTips: false,
          canPurchasePPV: false,
          canSubscribe: false,
          canBroadcastLive: false,
          canWithdrawFunds: false, // Financial freeze during review
          isRestrictedMode: true,
          restrictionReason: "Account is currently under compliance review.",
        };

      case "SUSPENDED":
        return {
          canLogin: false, // Cannot access active account features
          canBrowse: false,
          canChat: false,
          canSendTips: false,
          canPurchasePPV: false,
          canSubscribe: false,
          canBroadcastLive: false,
          canWithdrawFunds: false,
          isRestrictedMode: true,
          restrictionReason: user.banReason || "Account temporarily suspended for safety violations.",
        };

      case "BANNED":
        return {
          canLogin: false,
          canBrowse: false,
          canChat: false,
          canSendTips: false,
          canPurchasePPV: false,
          canSubscribe: false,
          canBroadcastLive: false,
          canWithdrawFunds: false,
          isRestrictedMode: true,
          restrictionReason: user.banReason || "Account permanently banned for Terms of Service violations.",
        };

      default:
        return {
          canLogin: false,
          canBrowse: false,
          canChat: false,
          canSendTips: false,
          canPurchasePPV: false,
          canSubscribe: false,
          canBroadcastLive: false,
          canWithdrawFunds: false,
          isRestrictedMode: true,
          restrictionReason: "Unknown account state.",
        };
    }
  }
}
