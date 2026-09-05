import prisma from "@/lib/db";

export class AuditService {
  /**
   * Log sensitive domain actions for compliance and safety auditability.
   */
  static async logAction(params: {
    actorId?: string;
    action: string;
    targetType: "USER" | "WALLET" | "STREAM" | "TRANSACTION" | "COMPLIANCE_2257";
    targetId: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }) {
    return await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadataJson: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  }
}
