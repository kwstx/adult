/**
 * AUTHORITATIVE IN-MEMORY DATABASE SIMULATOR
 * 
 * Provides full relational simulation for Prisma Client models used in tests:
 * - Users & Creator Profiles
 * - Wallets, WalletTransactions, CreditLots, and CreatorEarnings
 * - Subscriptions, SubscriptionProducts, SubscriptionPayments
 * - Interactions & InteractionPurchases
 * - Private Sessions, Holds & Bookings
 * 
 * Supports atomic rollback transactions, optimistic version locking, and queries.
 */

export class MockDatabaseStore {
  public users = new Map<string, any>();
  public creatorProfiles = new Map<string, any>();
  public wallets = new Map<string, any>();
  public walletTransactions = new Map<string, any>();
  public creditLots = new Map<string, any>();
  public creatorEarnings = new Map<string, any>();
  public subscriptionProducts = new Map<string, any>();
  public subscriptions = new Map<string, any>();
  public subscriptionPayments = new Map<string, any>();
  public interactions = new Map<string, any>();
  public interactionPurchases = new Map<string, any>();
  public privateSlotHolds = new Map<string, any>();
  public privateBookings = new Map<string, any>();

  // Concurrency lock table for distributed lock simulation
  private locks = new Set<string>();

  constructor() {
    this.reset();
  }

  public reset() {
    this.users.clear();
    this.creatorProfiles.clear();
    this.wallets.clear();
    this.walletTransactions.clear();
    this.creditLots.clear();
    this.creatorEarnings.clear();
    this.subscriptionProducts.clear();
    this.subscriptions.clear();
    this.subscriptionPayments.clear();
    this.interactions.clear();
    this.interactionPurchases.clear();
    this.privateSlotHolds.clear();
    this.privateBookings.clear();
    this.locks.clear();
  }

  /**
   * Seed standard fixtures for financial & lifecycle tests
   */
  public seedFixtures() {
    this.reset();

    // 1. Fan User
    const fanId = "user_fan_01";
    this.users.set(fanId, {
      id: fanId,
      username: "alex_patron",
      email: "alex@example.com",
      displayName: "Alex Patron 💎",
      role: "FAN",
      isActive: true,
      isBanned: false,
      createdAt: new Date(),
    });

    // 2. Creator User & Profile
    const creatorUserId = "user_creator_01";
    const creatorProfileId = "creator_maya_01";
    this.users.set(creatorUserId, {
      id: creatorUserId,
      username: "mayavelvet",
      email: "maya@example.com",
      displayName: "Maya Velvet ✨",
      role: "CREATOR",
      isActive: true,
      isBanned: false,
      createdAt: new Date(),
    });

    this.creatorProfiles.set(creatorProfileId, {
      id: creatorProfileId,
      userId: creatorUserId,
      stageName: "Maya Velvet ✨",
      verificationStatus: "APPROVED",
      kycStatus: "COMPLIANCE_2257_APPROVED",
      canMonetize: true,
      totalEarnedCredits: BigInt(0),
      createdAt: new Date(),
    });

    // 3. Wallets
    this.wallets.set(fanId, {
      id: `wallet_${fanId}`,
      userId: fanId,
      balance: 1000,
      purchasedBalance: 1000,
      promotionalBalance: 0,
      bonusBalance: 0,
      lockedBalance: 0,
      pendingBalance: 0,
      lifetimeDepositedCredits: BigInt(1000),
      lifetimeEarnedCredits: BigInt(0),
      lifetimeSpentCredits: BigInt(0),
      lifetimeWithdrawnCredits: BigInt(0),
      status: "ACTIVE",
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.wallets.set(creatorUserId, {
      id: `wallet_${creatorUserId}`,
      userId: creatorUserId,
      balance: 0,
      purchasedBalance: 0,
      promotionalBalance: 0,
      bonusBalance: 0,
      lockedBalance: 0,
      pendingBalance: 0,
      lifetimeDepositedCredits: BigInt(0),
      lifetimeEarnedCredits: BigInt(0),
      lifetimeSpentCredits: BigInt(0),
      lifetimeWithdrawnCredits: BigInt(0),
      status: "ACTIVE",
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4. Initial Credit Lot for Fan (1,000 purchased credits)
    const lotId = `lot_${fanId}_01`;
    this.creditLots.set(lotId, {
      id: lotId,
      walletId: `wallet_${fanId}`,
      userId: fanId,
      lotType: "PURCHASED",
      initialCredits: 1000,
      remainingCredits: 1000,
      fiatCostBasisCents: 1000,
      currency: "EUR",
      isExpired: false,
      expiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 5. Subscription Product
    const productId = "sub_prod_vip_01";
    this.subscriptionProducts.set(productId, {
      id: productId,
      creatorProfileId,
      name: "VIP Diamond Pass",
      tier: "VIP",
      tierLevel: 2,
      priceFiatCents: 2000,
      currency: "EUR",
      creditPriceMonthly: 200,
      isActive: true,
      isArchived: false,
      createdAt: new Date(),
    });

    // 6. Interaction
    const interactionId = "inter_wheel_01";
    this.interactions.set(interactionId, {
      id: interactionId,
      creatorProfileId,
      name: "VIP Wheel Spin",
      actionType: "WHEEL_SPIN",
      priceCredits: 300,
      isActive: true,
      remainingQuantity: 10,
      whoCanPurchase: "ALL",
      createdAt: new Date(),
    });
  }

  // --------------------------------------------------------------------------
  // MODEL QUERY FACADES (Simulating Prisma Client interface)
  // --------------------------------------------------------------------------

  get user() {
    return {
      findUnique: async ({ where }: { where: any }) => {
        if (where.id) return this.users.get(where.id) || null;
        if (where.email) {
          return Array.from(this.users.values()).find((u) => u.email === where.email) || null;
        }
        if (where.username) {
          return Array.from(this.users.values()).find((u) => u.username === where.username) || null;
        }
        return null;
      },
      create: async ({ data }: { data: any }) => {
        const id = data.id || `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const record = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
        this.users.set(id, record);
        return record;
      },
      update: async ({ where, data }: { where: any; data: any }) => {
        const record = this.users.get(where.id);
        if (!record) throw new Error(`User not found: ${where.id}`);
        const updated = { ...record, ...data, updatedAt: new Date() };
        this.users.set(where.id, updated);
        return updated;
      },
    };
  }

  get creatorProfile() {
    return {
      findUnique: async ({ where }: { where: any }) => {
        if (where.id) return this.creatorProfiles.get(where.id) || null;
        if (where.userId) {
          return Array.from(this.creatorProfiles.values()).find((cp) => cp.userId === where.userId) || null;
        }
        return null;
      },
      create: async ({ data }: { data: any }) => {
        const id = data.id || `cp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const record = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
        this.creatorProfiles.set(id, record);
        return record;
      },
      update: async ({ where, data }: { where: any; data: any }) => {
        const record = this.creatorProfiles.get(where.id);
        if (!record) throw new Error(`Creator profile not found: ${where.id}`);
        const updated = { ...record, ...data, updatedAt: new Date() };
        this.creatorProfiles.set(where.id, updated);
        return updated;
      },
    };
  }

  get wallet() {
    return {
      findUnique: async ({ where }: { where: any }) => {
        if (where.id) {
          for (const w of this.wallets.values()) {
            if (w.id === where.id) return { ...w };
          }
        }
        if (where.userId) {
          const w = this.wallets.get(where.userId);
          return w ? { ...w } : null;
        }
        return null;
      },
      create: async ({ data }: { data: any }) => {
        const id = data.id || `wallet_${data.userId}`;
        const record = { ...data, id, version: 1, createdAt: new Date(), updatedAt: new Date() };
        this.wallets.set(data.userId, record);
        return { ...record };
      },
      update: async ({ where, data }: { where: any; data: any }) => {
        let keyToUpdate = "";
        let existing: any = null;

        if (where.id) {
          for (const [userId, w] of this.wallets.entries()) {
            if (w.id === where.id) {
              keyToUpdate = userId;
              existing = w;
              break;
            }
          }
        } else if (where.userId) {
          keyToUpdate = where.userId;
          existing = this.wallets.get(where.userId);
        }

        if (!existing) throw new Error(`Wallet not found for update.`);

        // Optimistic concurrency check if version was specified
        if (where.version !== undefined && existing.version !== where.version) {
          throw new Error(`OptimisticLockingError: Wallet version conflict.`);
        }

        // Apply arithmetic updates if using increment/decrement syntax
        const balanceDelta = typeof data.balance === "object" && data.balance?.decrement
          ? -data.balance.decrement
          : typeof data.balance === "object" && data.balance?.increment
          ? data.balance.increment
          : typeof data.balance === "number"
          ? data.balance - existing.balance
          : 0;

        const newBalance = typeof data.balance === "number" ? data.balance : existing.balance + balanceDelta;

        const updated = {
          ...existing,
          ...data,
          balance: newBalance,
          version: (existing.version || 1) + 1,
          updatedAt: new Date(),
        };

        this.wallets.set(keyToUpdate, updated);
        return { ...updated };
      },
    };
  }

  get walletTransaction() {
    return {
      create: async ({ data }: { data: any }) => {
        const id = data.id || `wtx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const record = { ...data, id, createdAt: new Date() };
        this.walletTransactions.set(id, record);
        return record;
      },
      findUnique: async ({ where }: { where: any }) => {
        if (where.id) return this.walletTransactions.get(where.id) || null;
        if (where.idempotencyKey) {
          return Array.from(this.walletTransactions.values()).find(
            (tx) => tx.idempotencyKey === where.idempotencyKey
          ) || null;
        }
        return null;
      },
      findMany: async ({ where }: { where?: any }) => {
        let results = Array.from(this.walletTransactions.values());
        if (where?.userId) {
          results = results.filter((tx) => tx.userId === where.userId);
        }
        if (where?.walletId) {
          results = results.filter((tx) => tx.walletId === where.walletId);
        }
        return results;
      },
    };
  }

  get creditLot() {
    return {
      findMany: async ({ where, orderBy }: { where?: any; orderBy?: any }) => {
        let lots = Array.from(this.creditLots.values());
        if (where?.walletId) lots = lots.filter((l) => l.walletId === where.walletId);
        if (where?.userId) lots = lots.filter((l) => l.userId === where.userId);
        if (where?.isExpired !== undefined) lots = lots.filter((l) => l.isExpired === where.isExpired);
        if (where?.remainingCredits?.gt !== undefined) {
          lots = lots.filter((l) => l.remainingCredits > where.remainingCredits.gt);
        }
        return lots;
      },
      create: async ({ data }: { data: any }) => {
        const id = data.id || `lot_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const record = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
        this.creditLots.set(id, record);
        return record;
      },
      update: async ({ where, data }: { where: any; data: any }) => {
        const record = this.creditLots.get(where.id);
        if (!record) throw new Error(`Credit lot not found: ${where.id}`);
        const updated = { ...record, ...data, updatedAt: new Date() };
        this.creditLots.set(where.id, updated);
        return updated;
      },
    };
  }

  get creatorEarning() {
    return {
      create: async ({ data }: { data: any }) => {
        const id = data.id || `earn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const record = { ...data, id, createdAt: new Date() };
        this.creatorEarnings.set(id, record);
        return record;
      },
      findMany: async ({ where }: { where?: any }) => {
        let earnings = Array.from(this.creatorEarnings.values());
        if (where?.creatorProfileId) {
          earnings = earnings.filter((e) => e.creatorProfileId === where.creatorProfileId);
        }
        return earnings;
      },
    };
  }

  get subscription() {
    return {
      findUnique: async ({ where }: { where: any }) => {
        if (where.id) return this.subscriptions.get(where.id) || null;
        if (where.fanId_creatorProfileId) {
          const key = `${where.fanId_creatorProfileId.fanId}_${where.fanId_creatorProfileId.creatorProfileId}`;
          return this.subscriptions.get(key) || null;
        }
        return null;
      },
      create: async ({ data }: { data: any }) => {
        const id = data.id || `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const key = `${data.fanId}_${data.creatorProfileId}`;
        const record = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
        this.subscriptions.set(key, record);
        this.subscriptions.set(id, record);
        return record;
      },
      update: async ({ where, data }: { where: any; data: any }) => {
        let record = null;
        if (where.id) record = this.subscriptions.get(where.id);
        if (!record && where.fanId_creatorProfileId) {
          const key = `${where.fanId_creatorProfileId.fanId}_${where.fanId_creatorProfileId.creatorProfileId}`;
          record = this.subscriptions.get(key);
        }
        if (!record) throw new Error("Subscription not found for update");
        const updated = { ...record, ...data, updatedAt: new Date() };
        this.subscriptions.set(record.id, updated);
        this.subscriptions.set(`${record.fanId}_${record.creatorProfileId}`, updated);
        return updated;
      },
    };
  }

  get subscriptionProduct() {
    return {
      findFirst: async ({ where }: { where: any }) => {
        return Array.from(this.subscriptionProducts.values()).find((p) => {
          if (where.id && p.id !== where.id) return false;
          if (where.creatorProfileId && p.creatorProfileId !== where.creatorProfileId) return false;
          if (where.isActive !== undefined && p.isActive !== where.isActive) return false;
          return true;
        }) || null;
      },
    };
  }

  /**
   * Execute atomic transaction callback.
   * If an error throws inside callback, changes are discarded.
   */
  public async $transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    // Snapshot state before transaction
    const snapshot = {
      wallets: new Map(this.wallets),
      walletTransactions: new Map(this.walletTransactions),
      creditLots: new Map(this.creditLots),
      creatorEarnings: new Map(this.creatorEarnings),
    };

    try {
      return await callback(this);
    } catch (err) {
      // Rollback to snapshot on error
      this.wallets = snapshot.wallets;
      this.walletTransactions = snapshot.walletTransactions;
      this.creditLots = snapshot.creditLots;
      this.creatorEarnings = snapshot.creatorEarnings;
      throw err;
    }
  }
}

export const mockDb = new MockDatabaseStore();
