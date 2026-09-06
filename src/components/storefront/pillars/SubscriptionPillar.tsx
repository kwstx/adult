"use client";

import React from "react";
import {
  Crown,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Lock,
  Radio,
  MessageSquare,
  Video,
  Coins,
  ArrowRight,
  Flame,
} from "lucide-react";
import { SubscriptionPillarData, CreatorIdentity, CheckoutItemPayload } from "../types";

interface SubscriptionPillarProps {
  creator: CreatorIdentity;
  subscription: SubscriptionPillarData;
  onOpenCheckout: (item: CheckoutItemPayload) => void;
}

export function SubscriptionPillar({
  creator,
  subscription,
  onOpenCheckout,
}: SubscriptionPillarProps) {
  const { tiers, isSubscribed, activeSubscription, grandfatherGuarantee } = subscription;

  const defaultPerksByTierLevel: Record<number, string[]> = {
    1: [
      "Access all Subscriber-Only 4K Photos & Albums",
      "Special Subscriber Chat Badge & Emotes",
      "Ad-free stream viewing & priority chat message color",
      "5% Discount on all 1-on-1 Private Sessions",
    ],
    2: [
      "All Fan Tier Perks Included",
      "Access to Subscriber-Only VIP Livestreams & VODs",
      "Full Access to the Exclusive 4K PPV Media Vault",
      "Priority Direct Messaging & Reduced Message Rates",
      "15% Discount on all 1-on-1 Private Sessions",
      "Front-of-Line Interaction Queue Priority",
    ],
    3: [
      "All VIP Tier Perks Included",
      "Monthly 15-Minute Dedicated 1-on-1 Video Session",
      "Exclusive Signed Physical Polaroid mailed to you",
      "Permanent Diamond Patron Gold Badge in Room",
      "25% Lifetime Discount across entire storefront",
    ],
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Active Subscription Hero Banner (if already subscribed) */}
      {isSubscribed && activeSubscription && (
        <div className="rounded-3xl bg-gradient-to-r from-purple-950/60 via-zinc-900 to-zinc-950 border border-purple-500/40 p-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-purple-600 text-white shadow-lg">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-300">
                    Active Membership
                  </span>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                    Auto-Renew Active
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">
                  {activeSubscription.product?.name || "VIP Devotee"} Tier Member
                </h3>
                <p className="text-xs text-zinc-400">
                  Renews on{" "}
                  <strong className="text-zinc-200">
                    {new Date(activeSubscription.renewalDate || Date.now() + 30 * 86400000).toLocaleDateString()}
                  </strong>{" "}
                  • Grandfathered Price: <span className="text-amber-400 font-bold">€{(activeSubscription.billingPriceCents / 100).toFixed(2)}/mo</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 rounded-xl bg-purple-500/10 px-3.5 py-2 text-xs font-bold text-purple-300 border border-purple-500/20">
                <Sparkles className="h-4 w-4 text-purple-400" />
                All Perks Unlocked
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Grandfather Guarantee Pill */}
      {grandfatherGuarantee && (
        <div className="flex items-center gap-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4 text-xs text-zinc-300 shadow-lg">
          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
          <p>
            <strong className="text-white font-bold">Price Lock Guarantee:</strong> When you subscribe today, your monthly rate is locked in permanently. You will never be affected by future creator tier price increases as long as your membership remains active.
          </p>
        </div>
      )}

      {/* 3. Subscription Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const perks = defaultPerksByTierLevel[tier.tierLevel] || defaultPerksByTierLevel[1];
          const isCurrentTier = isSubscribed && activeSubscription?.productId === tier.id;

          return (
            <div
              key={tier.id}
              className={`relative flex flex-col justify-between rounded-3xl p-6 sm:p-7 border transition-all ${
                tier.isPopular
                  ? "bg-gradient-to-b from-purple-950/30 via-zinc-950 to-zinc-950 border-purple-500/60 shadow-2xl shadow-purple-500/10 ring-1 ring-purple-500/40"
                  : "bg-zinc-950 border-zinc-800/90 hover:border-zinc-700 shadow-xl"
              }`}
            >
              {/* Popular Badge */}
              {tier.isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 px-3.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-lg">
                  Most Popular VIP Choice
                </span>
              )}

              <div>
                {/* Tier Name & Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-black text-white">{tier.name}</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">{tier.description}</p>
                  </div>
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl shadow-md border"
                    style={{
                      backgroundColor: `${tier.badgeColorHex || "#9333EA"}20`,
                      borderColor: `${tier.badgeColorHex || "#9333EA"}40`,
                      color: tier.badgeColorHex || "#9333EA",
                    }}
                  >
                    👑
                  </span>
                </div>

                {/* Price Display */}
                <div className="flex items-baseline gap-2 py-3 border-y border-zinc-900 mb-5">
                  <span className="text-3xl font-black text-white">
                    {tier.priceFiatFormatted}
                  </span>
                  <span className="text-xs font-semibold text-zinc-400">/ month</span>
                  <span className="ml-auto flex items-center gap-1 rounded-xl bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/20">
                    <Coins className="h-3 w-3" />
                    {tier.creditPriceMonthly} Tokens
                  </span>
                </div>

                {/* Perks Checklist */}
                <div className="space-y-3 mb-6">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Included Entitlements:
                  </p>
                  {perks.map((perk, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-zinc-900">
                {isCurrentTier ? (
                  <button
                    disabled
                    className="w-full rounded-2xl bg-zinc-900 py-3.5 text-xs font-black text-zinc-400 border border-zinc-800 cursor-default"
                  >
                    Current Active Tier ✓
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      onOpenCheckout({
                        checkoutType: "SUBSCRIPTION",
                        title: `${tier.name} Subscription`,
                        subtitle: tier.description || `Monthly VIP Access to ${creator.displayName}`,
                        priceCredits: tier.creditPriceMonthly,
                        priceFiatFormatted: tier.priceFiatFormatted,
                        badge: `${tier.name} VIP`,
                        creatorProfileId: creator.id,
                        productId: tier.id,
                      })
                    }
                    className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-xl transition-all active:scale-95 ${
                      tier.isPopular
                        ? "bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 shadow-purple-600/30 hover:brightness-110"
                        : "bg-gradient-to-r from-pink-600 to-rose-600 shadow-pink-600/20 hover:from-pink-500 hover:to-rose-500"
                    }`}
                  >
                    <span>Subscribe Now</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
