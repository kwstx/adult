import { SlotReservationHold } from "./types";

/**
 * TEMPORARY RESERVATION HOLD & CONCURRENCY LOCK SERVICE
 * 
 * Manages atomic temporary reservation holds when a fan selects a time slot.
 * Ensures that:
 * 1. A selected slot is temporarily locked for 10 minutes (600s).
 * 2. No other fan can select or double-book the same slot while the hold is active.
 * 3. If checkout completes, the hold is converted to a confirmed booking.
 * 4. If the fan abandons checkout or the 10-minute timer expires, the hold is released.
 */

const HOLD_DURATION_SECONDS = 600; // 10 minutes

class ReservationLockService {
  // In-memory atomic store for holds (backed by process singleton)
  private activeHolds: Map<string, SlotReservationHold> = new Map();

  /**
   * Acquire a temporary reservation hold for a slot.
   */
  public acquireHold(params: {
    creatorProfileId: string;
    fanId: string;
    startTimeUtc: string;
    endTimeUtc: string;
    displayTime: string;
    durationMinutes: number;
    priceFiatCents: number;
    priceTokens: number;
  }): { success: boolean; hold?: SlotReservationHold; error?: string } {
    this.cleanExpiredHolds();

    const start = new Date(params.startTimeUtc).getTime();
    const end = new Date(params.endTimeUtc).getTime();

    // Check for conflicting active holds on the same creator
    for (const [id, existing] of this.activeHolds.entries()) {
      if (
        existing.creatorProfileId === params.creatorProfileId &&
        existing.status === "ACTIVE"
      ) {
        const existStart = new Date(existing.startTimeUtc).getTime();
        const existEnd = new Date(existing.endTimeUtc).getTime();

        // Check time overlap: (StartA < EndB) and (EndA > StartB)
        if (start < existEnd && end > existStart) {
          if (existing.fanId === params.fanId) {
            // Re-use / refresh the hold for the same fan
            const updated = this.refreshHold(id);
            return { success: true, hold: updated };
          }
          return {
            success: false,
            error: "This time slot is currently temporarily held by another user in checkout. Please select another slot.",
          };
        }
      }
    }

    const reservationId = `hold_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + HOLD_DURATION_SECONDS * 1000);

    const newHold: SlotReservationHold = {
      reservationId,
      creatorProfileId: params.creatorProfileId,
      fanId: params.fanId,
      startTimeUtc: params.startTimeUtc,
      endTimeUtc: params.endTimeUtc,
      displayTime: params.displayTime,
      durationMinutes: params.durationMinutes,
      priceFiatCents: params.priceFiatCents,
      priceTokens: params.priceTokens,
      holdExpiresAt: expiresAt.toISOString(),
      ttlRemainingSeconds: HOLD_DURATION_SECONDS,
      status: "ACTIVE",
      createdAt: now.toISOString(),
    };

    this.activeHolds.set(reservationId, newHold);
    return { success: true, hold: newHold };
  }

  /**
   * Get an active hold by ID.
   */
  public getHold(reservationId: string): SlotReservationHold | null {
    this.cleanExpiredHolds();
    const hold = this.activeHolds.get(reservationId);
    if (!hold || hold.status !== "ACTIVE") return null;

    const remainingSeconds = Math.max(
      0,
      Math.floor((new Date(hold.holdExpiresAt).getTime() - Date.now()) / 1000)
    );

    if (remainingSeconds === 0) {
      hold.status = "EXPIRED";
      return null;
    }

    hold.ttlRemainingSeconds = remainingSeconds;
    return hold;
  }

  /**
   * Check if a specific time window is currently held by any user.
   */
  public isWindowHeld(
    creatorProfileId: string,
    startTimeUtc: string,
    endTimeUtc: string,
    excludeReservationId?: string
  ): boolean {
    this.cleanExpiredHolds();
    const start = new Date(startTimeUtc).getTime();
    const end = new Date(endTimeUtc).getTime();

    for (const [id, existing] of this.activeHolds.entries()) {
      if (excludeReservationId && id === excludeReservationId) continue;
      if (
        existing.creatorProfileId === creatorProfileId &&
        existing.status === "ACTIVE"
      ) {
        const existStart = new Date(existing.startTimeUtc).getTime();
        const existEnd = new Date(existing.endTimeUtc).getTime();
        if (start < existEnd && end > existStart) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Release or cancel a temporary hold.
   */
  public releaseHold(reservationId: string): boolean {
    const hold = this.activeHolds.get(reservationId);
    if (hold) {
      hold.status = "CANCELLED";
      this.activeHolds.delete(reservationId);
      return true;
    }
    return false;
  }

  /**
   * Mark a hold as confirmed into a booking.
   */
  public confirmHold(reservationId: string): SlotReservationHold | null {
    const hold = this.getHold(reservationId);
    if (!hold) return null;
    hold.status = "CONFIRMED";
    this.activeHolds.delete(reservationId);
    return hold;
  }

  /**
   * Refresh a hold's TTL for another 10 minutes.
   */
  public refreshHold(reservationId: string): SlotReservationHold | undefined {
    const hold = this.activeHolds.get(reservationId);
    if (hold) {
      const expiresAt = new Date(Date.now() + HOLD_DURATION_SECONDS * 1000);
      hold.holdExpiresAt = expiresAt.toISOString();
      hold.ttlRemainingSeconds = HOLD_DURATION_SECONDS;
      hold.status = "ACTIVE";
      return hold;
    }
    return undefined;
  }

  /**
   * Clean up expired holds.
   */
  private cleanExpiredHolds(): void {
    const now = Date.now();
    for (const [id, hold] of this.activeHolds.entries()) {
      if (new Date(hold.holdExpiresAt).getTime() <= now) {
        hold.status = "EXPIRED";
        this.activeHolds.delete(id);
      }
    }
  }
}

// Global Singleton for Next.js process
const globalLockStore = globalThis as unknown as {
  __reservationLockService?: ReservationLockService;
};

export const reservationLockService =
  globalLockStore.__reservationLockService ?? new ReservationLockService();

if (process.env.NODE_ENV !== "production") {
  globalLockStore.__reservationLockService = reservationLockService;
}
