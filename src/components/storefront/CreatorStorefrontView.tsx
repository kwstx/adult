"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/lib/user-context";
import {
  StorefrontData,
  StorefrontPillarTab,
  CheckoutItemPayload,
} from "./types";
import { CreatorStorefrontHeader } from "./CreatorStorefrontHeader";
import { StorefrontNavigation } from "./StorefrontNavigation";
import { LivePillar } from "./pillars/LivePillar";
import { SubscriptionPillar } from "./pillars/SubscriptionPillar";
import { ContentPillar } from "./pillars/ContentPillar";
import { PrivatePillar } from "./pillars/PrivatePillar";
import { ExperiencesPillar } from "./pillars/ExperiencesPillar";
import { UnifiedStorefrontCheckoutModal } from "./UnifiedStorefrontCheckoutModal";
import { WalletModal } from "@/components/wallet/WalletModal";
import { Loader2, AlertCircle } from "lucide-react";

interface CreatorStorefrontViewProps {
  creatorId: string;
}

export function CreatorStorefrontView({ creatorId }: CreatorStorefrontViewProps) {
  const { currentUser } = useUser();
  const [data, setData] = useState<StorefrontData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<StorefrontPillarTab>("live");
  const [checkoutItem, setCheckoutItem] = useState<CheckoutItemPayload | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Load Storefront Aggregator Data
  const fetchStorefrontData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(
        `/api/creators/${creatorId}/storefront?fanUserId=${currentUser?.id || ""}`
      );
      if (!res.ok) {
        throw new Error(`Failed to load creator storefront (${res.status})`);
      }
      const json = await res.json();
      setData(json);

      // If creator is not currently live, default to SUBSCRIPTION or CONTENT tab for high conversion
      if (!json.live?.isLive && activeTab === "live") {
        setActiveTab("subscription");
      }
    } catch (err: any) {
      console.error("Failed to load storefront:", err);
      setError(err.message || "Failed to load storefront.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStorefrontData();
  }, [creatorId, currentUser?.id]);

  // Handle Follow / Unfollow
  const handleToggleFollow = async () => {
    if (!data) return;
    setIsFollowLoading(true);
    try {
      const res = await fetch(`/api/creators/${creatorId}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fanUserId: currentUser.id,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setData((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            creator: {
              ...prev.creator,
              totalFollowers: result.totalFollowers,
            },
            fanState: {
              ...prev.fanState,
              isFollowing: result.isFollowing,
            },
          };
        });
      }
    } catch (err) {
      console.error("Follow toggle failed:", err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  // Open Checkout for any item across the 5 pillars
  const handleOpenCheckout = (item: CheckoutItemPayload) => {
    setCheckoutItem(item);
    setIsCheckoutOpen(true);
  };

  // Purchase Success Callback
  const handlePurchaseSuccess = (checkoutType: string) => {
    // Re-fetch storefront to reflect new unlocked status, subscriptions, or inventory
    fetchStorefrontData();
  };

  if (isLoading && !data) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Loading Unified Storefront...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg py-24 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/40 mx-auto mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-black text-white">Storefront Unavailable</h3>
        <p className="text-xs text-zinc-400 mt-1 mb-6">
          {error || `Unable to load commercial storefront for "${creatorId}".`}
        </p>
        <button
          onClick={fetchStorefrontData}
          className="rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-pink-500/40 px-5 py-2.5 text-xs font-bold text-white transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white pb-32">
      {/* 1. Creator Identity & Top Commercial Header */}
      <CreatorStorefrontHeader
        creator={data.creator}
        live={data.live}
        subscription={data.subscription}
        fanState={data.fanState}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenSubscribeCheckout={() => {
          const tier = data.subscription.tiers[1] || data.subscription.tiers[0];
          if (tier) {
            handleOpenCheckout({
              checkoutType: "SUBSCRIPTION",
              title: `${tier.name} VIP Membership`,
              subtitle: tier.description || `Monthly subscription to ${data.creator.displayName}`,
              priceCredits: tier.creditPriceMonthly,
              priceFiatFormatted: tier.priceFiatFormatted,
              badge: `${tier.name} Tier`,
              creatorProfileId: data.creator.id,
              productId: tier.id,
            });
          }
        }}
        onToggleFollow={handleToggleFollow}
        isFollowLoading={isFollowLoading}
      />

      {/* 2. Unified 5-Pillar Navigation Bar */}
      <div className="mt-8">
        <StorefrontNavigation
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          isLive={data.live.isLive}
          liveViewerCount={data.live.viewerCount}
          subscriptionCount={data.subscription.tiers.length}
          contentCount={data.content.items.length}
          privateSlotsCount={data.private.durationTiers.length}
          experiencesCount={data.experiences.products.length}
        />
      </div>

      {/* 3. The 5 Unified Commercial Pillars */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-8">
        {activeTab === "live" && (
          <LivePillar
            creator={data.creator}
            live={data.live}
            onOpenCheckout={handleOpenCheckout}
          />
        )}

        {activeTab === "subscription" && (
          <SubscriptionPillar
            creator={data.creator}
            subscription={data.subscription}
            onOpenCheckout={handleOpenCheckout}
          />
        )}

        {activeTab === "content" && (
          <ContentPillar
            creator={data.creator}
            content={data.content}
            isSubscribed={data.subscription.isSubscribed}
            onOpenCheckout={handleOpenCheckout}
          />
        )}

        {activeTab === "private" && (
          <PrivatePillar
            creator={data.creator}
            privateData={data.private}
            onOpenCheckout={handleOpenCheckout}
          />
        )}

        {activeTab === "experiences" && (
          <ExperiencesPillar
            creator={data.creator}
            experiences={data.experiences}
            onOpenCheckout={handleOpenCheckout}
          />
        )}
      </div>

      {/* 4. Universal Unified Checkout Bottom Sheet */}
      <UnifiedStorefrontCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        item={checkoutItem}
        creator={data.creator}
        onPurchaseSuccess={handlePurchaseSuccess}
        onOpenWalletTopup={() => setIsWalletOpen(true)}
      />

      {/* 5. Wallet Top-up Modal */}
      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
    </main>
  );
}
