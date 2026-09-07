/**
 * ============================================================================
 * WALLET CONCURRENCY & DOUBLE-SPEND GUARD
 * ============================================================================
 * Prevents race conditions, double-spending exploits, and negative balances
 * using distributed Redis locks + atomic PostgreSQL Compare-And-Swap (CAS)
 * version increment checks (`wallet.version`).
 */

import redis from "@/lib/redis";
import prisma from "@/lib/db";
import crypto from "crypto";

export class ConcurrencyConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConcurrencyConflictError";
  }
}

export class InsufficientBalanceConcurrencyError extends Error {
  constructor(walletId: string, required: number, available: number) {
    super(
      `Atomic deduction failed: Wallet ${walletId} requires ${required} credits, but only has ${available}.`
    );
    this.name = "InsufficientBalanceConcurrencyError";
  }
}

export class WalletConcurrencyGuard {
  private static readonly DEFAULT_LOCK_TTL_MS = 5000;
  private static readonly MAX_CAS_RETRIES = 3;

  /**
   * Acquires a distributed Redis lock with a unique token.
   * Returns unlock callback.
   */
  static async acquireDistributedLock(
    walletId: string,
    ttlMs: number = this.DEFAULT_LOCK_TTL_MS
  ): Promise<() => Promise<void>> {
    const lockKey = `lock:wallet:${walletId}`;
    const lockToken = crypto.randomUUID();

    let acquired = false;
    try {
      if (redis.status === "ready" || redis.status === "connect") {
        const res = await redis.set(lockKey, lockToken, "PX", ttlMs, "NX");
        acquired = res === "OK";
      }
    } catch {
      // If Redis is unreachable, fallback gracefully to database CAS locks
    }

    if (!acquired && (redis.status === "ready" || redis.status === "connect")) {
      // Retry once after 50ms
      await new Promise((resolve) => setTimeout(resolve, 50));
      try {
        const retryRes = await redis.set(lockKey, lockToken, "PX", ttlMs, "NX");
        acquired = retryRes === "OK";
      } catch {}
    }

    // Release function using atomic Lua script to ensure only owner releases
    return async () => {
      try {
        if (acquired && (redis.status === "ready" || redis.status === "connect")) {
          const luaScript = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
              return redis.call("del", KEYS[1])
            else
              return 0
            end
          `;
          await redis.eval(luaScript, 1, lockKey, lockToken);
        }
      } catch {
        // Safe release ignore
      }
    };
  }

  /**
   * Executes a financial wallet deduction with CAS atomic version checking
   * and automatic optimistic concurrency retries.
   */
  static async executeAtomicDeduction<T>(
    walletId: string,
    deductCredits: number,
    operation: (tx: any, updatedWallet: any) => Promise<T>
  ): Promise<T> {
    const unlock = await this.acquireDistributedLock(walletId);

    try {
      let retries = 0;
      while (retries < this.MAX_CAS_RETRIES) {
        try {
          return await prisma.$transaction(
            async (tx) => {
              // 1. Fetch current wallet state
              const wallet = await tx.wallet.findUnique({
                where: { id: walletId },
              });

              if (!wallet) {
                throw new Error(`Wallet not found for ID: ${walletId}`);
              }

              if (wallet.status !== "ACTIVE") {
                throw new Error(
                  `Wallet ${walletId} is locked or suspended (${wallet.status}). Operations blocked.`
                );
              }

              const available = wallet.balance - wallet.lockedBalance;
              if (available < deductCredits) {
                throw new InsufficientBalanceConcurrencyError(
                  walletId,
                  deductCredits,
                  available
                );
              }

              // 2. Perform atomic Compare-And-Swap (CAS) update on balance and version
              const updateResult = await tx.wallet.updateMany({
                where: {
                  id: walletId,
                  version: wallet.version, // Guard against concurrent writes
                  balance: { gte: deductCredits },
                },
                data: {
                  balance: { decrement: deductCredits },
                  version: { increment: 1 },
                },
              });

              if (updateResult.count === 0) {
                // CAS conflict: version changed by parallel transaction
                throw new ConcurrencyConflictError(
                  `Concurrent modification detected on wallet ${walletId}. Version collision.`
                );
              }

              // 3. Fetch latest updated wallet record
              const updatedWallet = await tx.wallet.findUnique({
                where: { id: walletId },
              });

              // Strict non-negative balance invariant assertion
              if (updatedWallet && updatedWallet.balance < 0) {
                throw new Error(
                  `Critical financial invariant violated: Wallet balance fell below zero (${updatedWallet.balance}). Rolling back transaction.`
                );
              }

              // 4. Execute caller's inner business logic
              return await operation(tx, updatedWallet);
            },
            {
              maxWait: 5000,
              timeout: 10000,
            }
          );
        } catch (error: any) {
          if (error instanceof ConcurrencyConflictError) {
            retries++;
            // Exponential jittered backoff before retrying CAS
            await new Promise((resolve) =>
              setTimeout(resolve, Math.random() * 50 * retries + 20)
            );
            continue;
          }
          throw error;
        }
      }

      throw new ConcurrencyConflictError(
        `Failed to complete atomic wallet deduction after ${this.MAX_CAS_RETRIES} attempts due to high concurrency.`
      );
    } finally {
      await unlock();
    }
  }
}
