// ============================================================================
// THE QUEUE: AUTHORITATIVE BACKEND OBJECT & STATE MACHINE MODEL
// ============================================================================

export type QueueItemStatus =
  | "PENDING"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
  | "REFUNDED";

export type CreatorDecisionType =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "NONE";

export type RefundStatusType = "NONE" | "REQUESTED" | "PROCESSED" | "FAILED";

export interface QueueItemFan {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  fanLevel: number;
  relationshipTier: string;
  isVip: boolean;
  isSubscriber: boolean;
}

export interface QueueItemInteraction {
  id: string;
  title: string;
  description?: string;
  actionType: string;
  durationSeconds: number;
  customMessage?: string;
  intensityLevel?: number;
  soundAssetUrl?: string;
  toyCommandPattern?: string;
}

export interface QueueItemPrice {
  amountCredits: number;
  fiatEquivalentCents: number;
  platformFeeCredits: number;
  creatorNetCredits: number;
}

export interface QueueItemCreatorDecision {
  decision: CreatorDecisionType;
  decidedAt?: string;
  creatorNote?: string;
  rejectionReason?: string;
}

export interface QueueItemPotentialRefundState {
  isRefunded: boolean;
  refundStatus: RefundStatusType;
  refundedAmountCredits?: number;
  refundTransactionId?: string;
  refundedAt?: string;
  refundReason?: string;
}

export interface QueueItemData {
  id: string;
  creatorId: string;
  livestreamId?: string;
  fan: QueueItemFan;
  interaction: QueueItemInteraction;
  price: QueueItemPrice;
  purchaseTime: string; // ISO 8601
  position: number; // 1-based active rank (0 if completed/terminal)
  status: QueueItemStatus;
  creatorDecision: QueueItemCreatorDecision;
  startTime?: string; // Set when moved to IN_PROGRESS
  completionTime?: string; // Set when moved to COMPLETED
  timeRemainingSeconds?: number;
  potentialRefundState: QueueItemPotentialRefundState;
  createdAt: string;
  updatedAt: string;
}

export class InvalidStateTransitionError extends Error {
  constructor(public currentStatus: QueueItemStatus, public targetStatus: QueueItemStatus, public reason?: string) {
    super(
      `Invalid Queue Item state transition: Cannot transition from "${currentStatus}" to "${targetStatus}". ${reason || ""}`.trim()
    );
    this.name = "InvalidStateTransitionError";
  }
}

// Map of permitted state machine transitions
export const ALLOWED_QUEUE_TRANSITIONS: Record<QueueItemStatus, QueueItemStatus[]> = {
  PENDING: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["IN_PROGRESS", "CANCELLED", "REJECTED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED", "REFUNDED"],
  COMPLETED: ["REFUNDED"],
  REJECTED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export class QueueItem {
  private data: QueueItemData;

  constructor(data: QueueItemData) {
    this.data = { ...data };
  }

  public toJSON(): QueueItemData {
    return { ...this.data };
  }

  public get id(): string {
    return this.data.id;
  }

  public get creatorId(): string {
    return this.data.creatorId;
  }

  public get status(): QueueItemStatus {
    return this.data.status;
  }

  public get position(): number {
    return this.data.position;
  }

  public set position(pos: number) {
    this.data.position = pos;
    this.data.updatedAt = new Date().toISOString();
  }

  public get fan(): QueueItemFan {
    return this.data.fan;
  }

  public get interaction(): QueueItemInteraction {
    return this.data.interaction;
  }

  public get price(): QueueItemPrice {
    return this.data.price;
  }

  public get purchaseTime(): string {
    return this.data.purchaseTime;
  }

  public get creatorDecision(): QueueItemCreatorDecision {
    return this.data.creatorDecision;
  }

  public get startTime(): string | undefined {
    return this.data.startTime;
  }

  public get completionTime(): string | undefined {
    return this.data.completionTime;
  }

  public get timeRemainingSeconds(): number | undefined {
    return this.data.timeRemainingSeconds;
  }

  public set timeRemainingSeconds(sec: number | undefined) {
    this.data.timeRemainingSeconds = sec;
  }

  public get potentialRefundState(): QueueItemPotentialRefundState {
    return this.data.potentialRefundState;
  }

  public canTransitionTo(targetStatus: QueueItemStatus): boolean {
    const allowed = ALLOWED_QUEUE_TRANSITIONS[this.data.status] || [];
    return allowed.includes(targetStatus);
  }

  /**
   * Transition: PENDING -> ACCEPTED
   * Creator agrees to perform this interaction.
   */
  public accept(creatorNote?: string): void {
    if (!this.canTransitionTo("ACCEPTED")) {
      throw new InvalidStateTransitionError(this.data.status, "ACCEPTED");
    }

    const now = new Date().toISOString();
    this.data.status = "ACCEPTED";
    this.data.creatorDecision = {
      decision: "ACCEPTED",
      decidedAt: now,
      creatorNote,
    };
    this.data.updatedAt = now;
  }

  /**
   * Transition: ACCEPTED -> IN_PROGRESS
   * Creator starts performing on camera. Countdown begins.
   */
  public startProgress(): void {
    if (!this.canTransitionTo("IN_PROGRESS")) {
      throw new InvalidStateTransitionError(this.data.status, "IN_PROGRESS");
    }

    const now = new Date().toISOString();
    this.data.status = "IN_PROGRESS";
    this.data.startTime = now;
    this.data.timeRemainingSeconds = this.data.interaction.durationSeconds || 30;
    this.data.updatedAt = now;
  }

  /**
   * Transition: IN_PROGRESS -> COMPLETED
   * Interaction fulfilled successfully.
   */
  public complete(): void {
    if (!this.canTransitionTo("COMPLETED")) {
      throw new InvalidStateTransitionError(this.data.status, "COMPLETED");
    }

    const now = new Date().toISOString();
    this.data.status = "COMPLETED";
    this.data.completionTime = now;
    this.data.position = 0;
    this.data.timeRemainingSeconds = 0;
    this.data.updatedAt = now;
  }

  /**
   * Transition: PENDING / ACCEPTED -> REJECTED
   * Creator declines request. Authoritative refund triggered.
   */
  public reject(reason: string, refundTxId?: string): void {
    if (!this.canTransitionTo("REJECTED")) {
      throw new InvalidStateTransitionError(this.data.status, "REJECTED");
    }

    const now = new Date().toISOString();
    this.data.status = "REJECTED";
    this.data.position = 0;
    this.data.timeRemainingSeconds = 0;
    this.data.creatorDecision = {
      decision: "REJECTED",
      decidedAt: now,
      rejectionReason: reason,
    };
    this.data.potentialRefundState = {
      isRefunded: true,
      refundStatus: "PROCESSED",
      refundedAmountCredits: this.data.price.amountCredits,
      refundTransactionId: refundTxId || `ref_${Date.now()}`,
      refundedAt: now,
      refundReason: reason || "Creator rejected interaction request",
    };
    this.data.updatedAt = now;
  }

  /**
   * Transition: PENDING / ACCEPTED / IN_PROGRESS -> CANCELLED
   * Either creator or fan cancels before completion.
   */
  public cancel(reason: string, actor: "CREATOR" | "FAN" | "SYSTEM" = "CREATOR", refundTxId?: string): void {
    if (!this.canTransitionTo("CANCELLED")) {
      throw new InvalidStateTransitionError(this.data.status, "CANCELLED");
    }

    const now = new Date().toISOString();
    this.data.status = "CANCELLED";
    this.data.position = 0;
    this.data.timeRemainingSeconds = 0;
    this.data.creatorDecision = {
      ...this.data.creatorDecision,
      decision: "CANCELLED",
      decidedAt: now,
      creatorNote: `Cancelled by ${actor}: ${reason}`,
    };
    this.data.potentialRefundState = {
      isRefunded: true,
      refundStatus: "PROCESSED",
      refundedAmountCredits: this.data.price.amountCredits,
      refundTransactionId: refundTxId || `ref_cancel_${Date.now()}`,
      refundedAt: now,
      refundReason: reason || `Cancelled by ${actor}`,
    };
    this.data.updatedAt = now;
  }

  /**
   * Transition: IN_PROGRESS / COMPLETED -> REFUNDED
   * Creator or moderator issues direct refund.
   */
  public refund(reason: string, refundTxId?: string, partialCredits?: number): void {
    if (!this.canTransitionTo("REFUNDED")) {
      throw new InvalidStateTransitionError(this.data.status, "REFUNDED");
    }

    const now = new Date().toISOString();
    const refundAmt = partialCredits !== undefined ? partialCredits : this.data.price.amountCredits;
    this.data.status = "REFUNDED";
    this.data.position = 0;
    this.data.timeRemainingSeconds = 0;
    this.data.potentialRefundState = {
      isRefunded: true,
      refundStatus: "PROCESSED",
      refundedAmountCredits: refundAmt,
      refundTransactionId: refundTxId || `ref_direct_${Date.now()}`,
      refundedAt: now,
      refundReason: reason || "Creator refunded interaction",
    };
    this.data.updatedAt = now;
  }
}

/**
 * The Queue: Authoritative backend object managing the ordered queue of interactions for a creator / stream.
 */
export class InteractionQueue {
  private creatorId: string;
  private items: Map<string, QueueItem> = new Map();

  constructor(creatorId: string, initialItems: QueueItemData[] = []) {
    this.creatorId = creatorId;
    for (const itemData of initialItems) {
      this.items.set(itemData.id, new QueueItem(itemData));
    }
    this.recalculatePositions();
  }

  public getCreatorId(): string {
    return this.creatorId;
  }

  /**
   * Add a newly purchased interaction to the end of the queue.
   */
  public enqueue(params: {
    fan: QueueItemFan;
    interaction: QueueItemInteraction;
    price: QueueItemPrice;
    livestreamId?: string;
  }): QueueItem {
    const id = `iq_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();

    // 1-based active rank
    const activeItems = this.getActiveItems();
    const nextPosition = activeItems.length + 1;

    const itemData: QueueItemData = {
      id,
      creatorId: this.creatorId,
      livestreamId: params.livestreamId,
      fan: params.fan,
      interaction: params.interaction,
      price: params.price,
      purchaseTime: now,
      position: nextPosition,
      status: "PENDING",
      creatorDecision: {
        decision: "PENDING",
      },
      potentialRefundState: {
        isRefunded: false,
        refundStatus: "NONE",
      },
      createdAt: now,
      updatedAt: now,
    };

    const queueItem = new QueueItem(itemData);
    this.items.set(id, queueItem);
    this.recalculatePositions();
    return queueItem;
  }

  public getItem(itemId: string): QueueItem | null {
    return this.items.get(itemId) || null;
  }

  public getAllItems(): QueueItemData[] {
    return Array.from(this.items.values()).map((i) => i.toJSON());
  }

  public getActiveItems(): QueueItemData[] {
    return Array.from(this.items.values())
      .filter((i) => i.status === "PENDING" || i.status === "ACCEPTED" || i.status === "IN_PROGRESS")
      .sort((a, b) => a.position - b.position)
      .map((i) => i.toJSON());
  }

  public getExecutingItem(): QueueItemData | null {
    const item = Array.from(this.items.values()).find((i) => i.status === "IN_PROGRESS");
    return item ? item.toJSON() : null;
  }

  /**
   * Recalculates 1..N queue positions for active items.
   */
  public recalculatePositions(): void {
    const activeItems = Array.from(this.items.values()).filter(
      (i) => i.status === "PENDING" || i.status === "ACCEPTED" || i.status === "IN_PROGRESS"
    );

    activeItems.forEach((item, index) => {
      item.position = index + 1;
    });

    const inactiveItems = Array.from(this.items.values()).filter(
      (i) => i.status !== "PENDING" && i.status !== "ACCEPTED" && i.status !== "IN_PROGRESS"
    );

    inactiveItems.forEach((item) => {
      item.position = 0;
    });
  }

  public accept(itemId: string, creatorNote?: string): QueueItem {
    const item = this.items.get(itemId);
    if (!item) throw new Error(`Queue item ${itemId} not found in creator ${this.creatorId} queue.`);
    item.accept(creatorNote);
    return item;
  }

  public startProgress(itemId: string): QueueItem {
    const item = this.items.get(itemId);
    if (!item) throw new Error(`Queue item ${itemId} not found in creator ${this.creatorId} queue.`);
    item.startProgress();
    return item;
  }

  public complete(itemId: string): QueueItem {
    const item = this.items.get(itemId);
    if (!item) throw new Error(`Queue item ${itemId} not found in creator ${this.creatorId} queue.`);
    item.complete();
    this.recalculatePositions();
    return item;
  }

  public reject(itemId: string, reason: string, refundTxId?: string): QueueItem {
    const item = this.items.get(itemId);
    if (!item) throw new Error(`Queue item ${itemId} not found in creator ${this.creatorId} queue.`);
    item.reject(reason, refundTxId);
    this.recalculatePositions();
    return item;
  }

  public cancel(itemId: string, reason: string, actor: "CREATOR" | "FAN" | "SYSTEM" = "CREATOR", refundTxId?: string): QueueItem {
    const item = this.items.get(itemId);
    if (!item) throw new Error(`Queue item ${itemId} not found in creator ${this.creatorId} queue.`);
    item.cancel(reason, actor, refundTxId);
    this.recalculatePositions();
    return item;
  }

  public refund(itemId: string, reason: string, refundTxId?: string, partialCredits?: number): QueueItem {
    const item = this.items.get(itemId);
    if (!item) throw new Error(`Queue item ${itemId} not found in creator ${this.creatorId} queue.`);
    item.refund(reason, refundTxId, partialCredits);
    this.recalculatePositions();
    return item;
  }
}
