import prisma from "@/lib/db";
import {
  CreateSubscriptionProductInput,
  UpdateSubscriptionProductInput,
  SubscriptionProductRecord,
  SubscriptionTier,
} from "./types";

export class SubscriptionProductService {
  /**
   * Initializes standard default tiers (Fan €9.99 and VIP €24.99) for a creator if none exist.
   */
  static async initializeDefaultTiersForCreator(
    creatorProfileId: string,
    currency = "EUR",
    db: any = prisma
  ): Promise<SubscriptionProductRecord[]> {
    const existing = await db.subscriptionProduct.findMany({
      where: { creatorProfileId, isArchived: false },
    });

    if (existing.length > 0) {
      return existing as unknown as SubscriptionProductRecord[];
    }

    const defaultTiers = [
      {
        creatorProfileId,
        name: "Fan",
        tier: SubscriptionTier.BASIC,
        tierLevel: 1,
        description: "Access subscriber-only content, chat badges, and follower perks.",
        priceFiatCents: 999, // €9.99/month
        currency,
        creditPriceMonthly: 200,
        billingInterval: "MONTHLY",
        entitlements: "SUBSCRIBER_CONTENT,SUBSCRIBER_CHAT,CUSTOM_BADGE",
        badgeIconUrl: "/assets/badges/fan-badge.svg",
        badgeColorHex: "#3B82F6",
        isActive: true,
        isArchived: false,
      },
      {
        creatorProfileId,
        name: "VIP",
        tier: SubscriptionTier.VIP,
        tierLevel: 2,
        description: "All Fan perks + subscriber-only live streams, VIP media vault, and DM access.",
        priceFiatCents: 2499, // €24.99/month
        currency,
        creditPriceMonthly: 500,
        billingInterval: "MONTHLY",
        entitlements: "SUBSCRIBER_CONTENT,SUBSCRIBER_CHAT,SUBSCRIBER_LIVE,VIP_MEDIA,DIRECT_MESSAGES,CUSTOM_BADGE,VOD_RECORDINGS",
        badgeIconUrl: "/assets/badges/vip-badge.svg",
        badgeColorHex: "#9333EA",
        isActive: true,
        isArchived: false,
      },
    ];

    const createdTiers = await Promise.all(
      defaultTiers.map((tier) =>
        db.subscriptionProduct.create({
          data: tier,
        })
      )
    );

    return createdTiers as unknown as SubscriptionProductRecord[];
  }

  /**
   * Create a new subscription product / tier for a creator.
   */
  static async createProduct(
    input: CreateSubscriptionProductInput,
    db: any = prisma
  ): Promise<SubscriptionProductRecord> {
    const {
      creatorProfileId,
      name,
      tier = SubscriptionTier.VIP,
      tierLevel = 1,
      description,
      priceFiatCents,
      currency = "EUR",
      creditPriceMonthly,
      billingInterval = "MONTHLY",
      entitlements = ["SUBSCRIBER_CONTENT", "SUBSCRIBER_CHAT", "SUBSCRIBER_LIVE"],
      badgeIconUrl,
      badgeColorHex = "#9333EA",
    } = input;

    if (priceFiatCents <= 0) {
      throw new Error("Subscription product price must be greater than zero.");
    }

    const entitlementsString = Array.isArray(entitlements)
      ? entitlements.join(",")
      : entitlements;

    const product = await db.subscriptionProduct.create({
      data: {
        creatorProfileId,
        name,
        tier,
        tierLevel,
        description,
        priceFiatCents,
        currency: currency.toUpperCase(),
        creditPriceMonthly: creditPriceMonthly ?? Math.round(priceFiatCents / 5),
        billingInterval,
        entitlements: entitlementsString,
        badgeIconUrl,
        badgeColorHex,
        isActive: true,
        isArchived: false,
      },
    });

    return product as unknown as SubscriptionProductRecord;
  }

  /**
   * Updates a subscription product.
   * 
   * CRITICAL BUSINESS RULE:
   * "The creator cannot simply modify an active customer’s current price without your
   * subscription rules handling it correctly."
   * 
   * When priceFiatCents is changed:
   * - By default (grandfatherExisting = true), existing active subscribers maintain their locked price.
   * - Their Subscription records are explicitly marked with isPriceGrandfathered = true and retain their original billingPriceCents.
   * - New subscribers who checkout after this point will pay the new price.
   */
  static async updateProduct(
    input: UpdateSubscriptionProductInput,
    db: any = prisma
  ): Promise<{
    product: SubscriptionProductRecord;
    activeSubscribersGrandfatheredCount: number;
    priceChanged: boolean;
    previousPriceCents: number;
    newPriceCents: number;
  }> {
    const { productId, creatorProfileId, pricePolicy, ...updates } = input;

    const currentProduct = await db.subscriptionProduct.findFirst({
      where: {
        id: productId,
        creatorProfileId,
      },
    });

    if (!currentProduct) {
      throw new Error("Subscription product not found or not owned by this creator.");
    }

    const priceChanged =
      updates.priceFiatCents !== undefined &&
      updates.priceFiatCents !== currentProduct.priceFiatCents;

    let activeSubscribersGrandfatheredCount = 0;

    const runInTx = db.$transaction ? (cb: any) => db.$transaction(cb) : async (cb: any) => cb(db);

    const result = await runInTx(async (tx: any) => {
      // 1. If price is changing and grandfather policy is enabled (default true)
      if (priceChanged && updates.priceFiatCents !== undefined) {
        const grandfatherPolicy = pricePolicy?.grandfatherExisting ?? true;

        if (grandfatherPolicy) {
          const activeSubs = await tx.subscription.findMany({
            where: {
              productId: currentProduct.id,
              status: { in: ["ACTIVE", "PAST_DUE", "PAUSED"] },
            },
            select: { id: true, billingPriceCents: true, isPriceGrandfathered: true },
          });

          for (const sub of activeSubs) {
            await tx.subscription.update({
              where: { id: sub.id },
              data: {
                isPriceGrandfathered: true,
                grandfatheredOriginalPriceCents: sub.billingPriceCents,
              },
            });
          }

          activeSubscribersGrandfatheredCount = activeSubs.length;
        } else {
          await tx.subscription.updateMany({
            where: {
              productId: currentProduct.id,
              status: { in: ["ACTIVE", "PAST_DUE", "PAUSED"] },
            },
            data: {
              billingPriceCents: updates.priceFiatCents,
              isPriceGrandfathered: false,
            },
          });
        }
      }

      // 2. Prepare product update data
      const dataToUpdate: any = {};
      if (updates.name !== undefined) dataToUpdate.name = updates.name;
      if (updates.description !== undefined) dataToUpdate.description = updates.description;
      if (updates.priceFiatCents !== undefined) dataToUpdate.priceFiatCents = updates.priceFiatCents;
      if (updates.currency !== undefined) dataToUpdate.currency = updates.currency.toUpperCase();
      if (updates.creditPriceMonthly !== undefined) dataToUpdate.creditPriceMonthly = updates.creditPriceMonthly;
      if (updates.badgeIconUrl !== undefined) dataToUpdate.badgeIconUrl = updates.badgeIconUrl;
      if (updates.badgeColorHex !== undefined) dataToUpdate.badgeColorHex = updates.badgeColorHex;
      if (updates.isActive !== undefined) dataToUpdate.isActive = updates.isActive;
      if (updates.isArchived !== undefined) dataToUpdate.isArchived = updates.isArchived;
      if (updates.entitlements !== undefined) {
        dataToUpdate.entitlements = Array.isArray(updates.entitlements)
          ? updates.entitlements.join(",")
          : updates.entitlements;
      }

      const updated = await tx.subscriptionProduct.update({
        where: { id: productId },
        data: dataToUpdate,
      });

      return updated;
    });

    return {
      product: result as unknown as SubscriptionProductRecord,
      activeSubscribersGrandfatheredCount,
      priceChanged,
      previousPriceCents: currentProduct.priceFiatCents,
      newPriceCents: result.priceFiatCents,
    };
  }

  /**
   * Retrieves all subscription products for a creator.
   */
  static async getProductsForCreator(
    creatorProfileId: string,
    includeArchived = false,
    db: any = prisma
  ): Promise<SubscriptionProductRecord[]> {
    const products = await db.subscriptionProduct.findMany({
      where: {
        creatorProfileId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: { tierLevel: "asc" },
    });

    if (products.length === 0) {
      return await this.initializeDefaultTiersForCreator(creatorProfileId, "EUR", db);
    }

    return products as unknown as SubscriptionProductRecord[];
  }

  /**
   * Retrieves a single subscription product by ID.
   */
  static async getProductById(productId: string, db: any = prisma): Promise<SubscriptionProductRecord | null> {
    const product = await db.subscriptionProduct.findUnique({
      where: { id: productId },
    });
    return product as unknown as SubscriptionProductRecord | null;
  }
}
