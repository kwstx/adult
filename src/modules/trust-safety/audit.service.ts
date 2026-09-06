/**
 * ============================================================================
 * AUTHORITATIVE AUDIT LOG & IMMUTABLE TRAIL ENGINE
 * ============================================================================
 * 
 * Core Requirement: "Everything important gets an audit event."
 * 
 * Provides tamper-evident, cryptographically chained audit logging for all
 * state changes, moderation actions, KYC approvals, compliance queries,
 * and security escalations.
 */

import crypto from "crypto";
import prisma from "@/lib/db";
import { AuditLogInput, AuditVerificationResult, SecurityContext } from "./types";

export class AuditService {
  private static readonly HASH_SALT = process.env.AUDIT_HASH_SALT || "platform_trust_safety_audit_salt_2026";

  /**
   * Generates a cryptographic SHA-256 seal for an audit record.
   */
  private static computeRecordHash(params: {
    previousHash: string;
    actorId?: string;
    actorType: string;
    action: string;
    targetEntityType: string;
    targetEntityId: string;
    oldState?: string;
    newState?: string;
    timestamp: string;
    metadataJson?: string;
  }): string {
    const payload = [
      params.previousHash,
      params.actorId || "anonymous",
      params.actorType,
      params.action,
      params.targetEntityType,
      params.targetEntityId,
      params.oldState || "",
      params.newState || "",
      params.timestamp,
      params.metadataJson || "",
      this.HASH_SALT,
    ].join("|");

    return crypto.createHash("sha256").update(payload).digest("hex");
  }

  /**
   * Log an authoritative audit event to the persistent ledger.
   */
  static async logEvent(input: AuditLogInput, context?: SecurityContext) {
    const actorId = input.actorId || context?.actorId;
    const actorType = input.actorType || context?.actorType || "SYSTEM_AUTOMATION";
    const ipAddress = input.ipAddress || context?.ipAddress;
    const userAgent = input.userAgent || context?.userAgent;
    const timestamp = new Date();

    const oldValuesJson = input.oldValues ? JSON.stringify(input.oldValues) : null;
    const newValuesJson = input.newValues ? JSON.stringify(input.newValues) : null;
    const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

    // Fetch previous audit event for hash chain linkage
    const lastEvent = await prisma.auditEvent.findFirst({
      where: {
        targetEntityType: input.targetEntityType,
        targetEntityId: input.targetEntityId,
      },
      orderBy: { createdAt: "desc" },
      select: { hashChecksum: true },
    });

    const previousHash = lastEvent?.hashChecksum || "GENESIS_BLOCK_ZERO_HASH";

    const hashChecksum = this.computeRecordHash({
      previousHash,
      actorId,
      actorType,
      action: input.action,
      targetEntityType: input.targetEntityType,
      targetEntityId: input.targetEntityId,
      oldState: input.oldState,
      newState: input.newState,
      timestamp: timestamp.toISOString(),
      metadataJson: metadataJson || undefined,
    });

    return await prisma.auditEvent.create({
      data: {
        actorId: actorId || null,
        actorType,
        action: input.action,
        targetEntityType: input.targetEntityType,
        targetEntityId: input.targetEntityId,
        oldState: input.oldState || null,
        newState: input.newState || null,
        oldValues: oldValuesJson,
        newValues: newValuesJson,
        reason: input.reason || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadataJson: metadataJson,
        hashChecksum,
        createdAt: timestamp,
      },
    });
  }

  /**
   * Specialized helper to log a state transition for an entity.
   */
  static async logStateTransition(params: {
    targetEntityType: "Content" | "User" | "CreatorProfile" | "ModerationCase";
    targetEntityId: string;
    oldState: string;
    newState: string;
    reason: string;
    actionName?: string;
    context?: SecurityContext;
    metadata?: Record<string, unknown>;
  }) {
    return await this.logEvent(
      {
        action: params.actionName || `${params.targetEntityType.toUpperCase()}_STATE_TRANSITION`,
        targetEntityType: params.targetEntityType,
        targetEntityId: params.targetEntityId,
        oldState: params.oldState,
        newState: params.newState,
        reason: params.reason,
        actorId: params.context?.actorId,
        actorType: params.context?.actorType,
        ipAddress: params.context?.ipAddress,
        userAgent: params.context?.userAgent,
        metadata: {
          ...params.metadata,
          transitionTimestamp: new Date().toISOString(),
        },
      },
      params.context
    );
  }

  /**
   * Verify cryptographic integrity of an entity's audit history chain.
   */
  static async verifyAuditChain(
    targetEntityType: string,
    targetEntityId: string
  ): Promise<AuditVerificationResult> {
    const events = await prisma.auditEvent.findMany({
      where: {
        targetEntityType,
        targetEntityId,
      },
      orderBy: { createdAt: "asc" },
    });

    if (events.length === 0) {
      return {
        isValid: true,
        totalEventsChecked: 0,
        checkedAt: new Date().toISOString(),
      };
    }

    let previousHash = "GENESIS_BLOCK_ZERO_HASH";

    for (const event of events) {
      const expectedHash = this.computeRecordHash({
        previousHash,
        actorId: event.actorId || undefined,
        actorType: event.actorType,
        action: event.action,
        targetEntityType: event.targetEntityType,
        targetEntityId: event.targetEntityId,
        oldState: event.oldState || undefined,
        newState: event.newState || undefined,
        timestamp: event.createdAt.toISOString(),
        metadataJson: event.metadataJson || undefined,
      });

      if (event.hashChecksum && event.hashChecksum !== expectedHash) {
        return {
          isValid: false,
          totalEventsChecked: events.length,
          lastEventId: event.id,
          tamperedEventId: event.id,
          checkedAt: new Date().toISOString(),
        };
      }

      previousHash = event.hashChecksum || expectedHash;
    }

    return {
      isValid: true,
      totalEventsChecked: events.length,
      lastEventId: events[events.length - 1].id,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Query audit history with flexible filtering.
   */
  static async queryAuditLogs(params: {
    targetEntityType?: string;
    targetEntityId?: string;
    actorId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (params.targetEntityType) where.targetEntityType = params.targetEntityType;
    if (params.targetEntityId) where.targetEntityId = params.targetEntityId;
    if (params.actorId) where.actorId = params.actorId;
    if (params.action) where.action = params.action;

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    const [total, events] = await Promise.all([
      prisma.auditEvent.count({ where }),
      prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: params.limit || 50,
        skip: params.offset || 0,
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              displayName: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      limit: params.limit || 50,
      offset: params.offset || 0,
      events,
    };
  }
}
