"use client";

import React from "react";
import {
  Gift,
  Film,
  Sparkles,
  Zap,
  Package,
  Crown,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { ExperiencesPillarData, CreatorIdentity, CheckoutItemPayload } from "../types";

interface ExperiencesPillarProps {
  creator: CreatorIdentity;
  experiences: ExperiencesPillarData;
  onOpenCheckout: (item: CheckoutItemPayload) => void;
}

export function ExperiencesPillar({
  creator,
  experiences,
  onOpenCheckout,
}: ExperiencesPillarProps) {
  const getProductTypeIcon = (type: string) => {
    switch (type) {
      case "SHOUTOUT":
        return <Film className="h-4 w-4 text-pink-400" />;
      case "TOY_CONTROL_PASS":
        return <Zap className="h-4 w-4 text-amber-400" />;
      case "PHYSICAL_MERCH":
        return <Package className="h-4 w-4 text-emerald-400" />;
      case "VIP_PASS":
        return <Crown className="h-4 w-4 text-purple-400" />;
      default:
        return <Gift className="h-4 w-4 text-teal-400" />;
    }
  };

  const getProductTypeBadge = (type: string) => {
    switch (type) {
      case "SHOUTOUT":
        return "4K Video Greeting";
      case "TOY_CONTROL_PASS":
        return "Interactive Live Pass";
      case "PHYSICAL_MERCH":
        return "Signed Collector Merch";
      case "VIP_PASS":
        return "Permanent VIP Access";
      default:
        return "Creator Experience";
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Experiences Hero */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-950/30 via-zinc-950 to-zinc-950 border border-emerald-500/30 p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              Bespoke Experiences & Creator Merchandise
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300">
              Personalized video commissions, signed collector polaroids, interactive control passes, and exclusive backstage memberships.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Experiences Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {experiences.products.map((prod) => (
          <div
            key={prod.id}
            className="group flex flex-col sm:flex-row justify-between rounded-3xl bg-zinc-950 border border-zinc-800/90 overflow-hidden hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all"
          >
            {/* Thumbnail */}
            <div className="relative sm:w-2/5 aspect-video sm:aspect-auto overflow-hidden bg-zinc-900 shrink-0">
              <img
                src={
                  prod.thumbnailUrl ||
                  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80"
                }
                alt={prod.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

              {/* Product Type Tag */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-black text-zinc-200 border border-white/10">
                {getProductTypeIcon(prod.productType)}
                <span>{getProductTypeBadge(prod.productType)}</span>
              </div>
            </div>

            {/* Content Details */}
            <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors">
                    {prod.title}
                  </h4>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  {prod.description}
                </p>

                {prod.inventoryCount !== null && (
                  <span className="inline-block rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 mb-3">
                    🔥 Limited Edition: Only {prod.inventoryCount} items remaining
                  </span>
                )}
              </div>

              {/* Price & Action */}
              <div className="pt-3 border-t border-zinc-900 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-black text-amber-400">
                    <Coins className="h-4 w-4" />
                    <span>{prod.priceCredits} Tokens</span>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    {prod.priceFiatFormatted} value
                  </span>
                </div>

                <button
                  onClick={() =>
                    onOpenCheckout({
                      checkoutType: "PRODUCT_EXPERIENCE",
                      title: prod.title,
                      subtitle: prod.description,
                      priceCredits: prod.priceCredits,
                      priceFiatFormatted: prod.priceFiatFormatted,
                      badge: getProductTypeBadge(prod.productType),
                      creatorProfileId: creator.id,
                      productId: prod.id,
                      customNotesRequired: prod.productType === "SHOUTOUT",
                      customNotesLabel:
                        prod.productType === "SHOUTOUT"
                          ? "Enter your name & what you want the creator to say in the video:"
                          : "Optional shipping / customization instructions:",
                    })
                  }
                  className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2 text-xs font-black text-white shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
                >
                  <span>Order Experience</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Discrete Shipping & Guarantee Notice */}
      <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-5 flex items-center gap-3 text-xs text-zinc-400 shadow-lg">
        <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
        <p>
          <strong className="text-zinc-200">Discrete Fulfillment & Direct Creator Delivery:</strong> All digital videos and voice notes are delivered directly to your inbox within 48 hours. Physical merchandise items are shipped in 100% discrete, unmarked protective packaging.
        </p>
      </div>
    </div>
  );
}
