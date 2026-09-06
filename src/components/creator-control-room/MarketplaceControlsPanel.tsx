"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Plus,
  Zap,
  Coins,
  Clock,
  Layers,
  Shield,
  Trash2,
  Lock,
  Pause,
  Play,
  Sliders,
} from "lucide-react";
import type {
  MarketplaceItem,
  SurgeMultiplier,
  InteractionEligibility,
} from "@/types/control-room";

interface MarketplaceControlsPanelProps {
  marketplaceItems: MarketplaceItem[];
  surgeMultiplier: SurgeMultiplier;
  onApplySurgeMultiplier: (multiplier: SurgeMultiplier) => void;
  onOpenAddModal: () => void;
  onUpdatePrice: (id: string, newPrice: number) => void;
  onToggleItemEnabled: (id: string) => void;
  onSetQuantity: (id: string, quantity: number | null) => void;
  onSetDuration: (id: string, duration: number) => void;
  onSetEligibility: (id: string, eligibility: InteractionEligibility) => void;
  onDeleteItem: (id: string) => void;
}

export function MarketplaceControlsPanel({
  marketplaceItems,
  surgeMultiplier,
  onApplySurgeMultiplier,
  onOpenAddModal,
  onUpdatePrice,
  onToggleItemEnabled,
  onSetQuantity,
  onSetDuration,
  onSetEligibility,
  onDeleteItem,
}: MarketplaceControlsPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const filteredItems =
    selectedCategory === "ALL"
      ? marketplaceItems
      : marketplaceItems.filter((i) => i.category === selectedCategory);

  return (
    <div className="flex flex-col h-full bg-zinc-950/80 border-l border-zinc-800/80 w-full overflow-hidden select-none">
      {/* Panel Header */}
      <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/40 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Live Marketplace
              </h3>
              <span className="text-[10px] text-zinc-400">Dynamic pricing & stock engine</span>
            </div>
          </div>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 px-3.5 py-1.5 text-xs font-black text-white shadow-md shadow-pink-600/30 hover:opacity-95 transition-all active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Add interaction
          </button>
        </div>

        {/* Surge Pricing Multipliers */}
        <div className="rounded-2xl bg-zinc-950 p-2.5 border border-zinc-800 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-zinc-300 flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-400" />
              Surge Pricing Multiplier
            </span>
            <span className="font-black text-amber-400">{surgeMultiplier}x Rate</span>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {([1.0, 1.25, 1.5, 2.0] as SurgeMultiplier[]).map((rate) => (
              <button
                key={rate}
                onClick={() => onApplySurgeMultiplier(rate)}
                className={`py-1 text-[10px] font-extrabold rounded-xl border transition-all ${
                  surgeMultiplier === rate
                    ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/20"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {rate === 1.0 ? "1.0x (Norm)" : `${rate}x`}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px] font-bold">
          {["ALL", "Question", "Activity", "Challenge", "Priority", "Custom"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl px-2.5 py-1 transition-all shrink-0 ${
                selectedCategory === cat
                  ? "bg-pink-600 text-white shadow-sm"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Marketplace Items Card Stack */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl p-3 border transition-all space-y-3 ${
              item.isEnabled
                ? "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 shadow-sm"
                : "bg-zinc-950/80 border-zinc-900 opacity-60"
            }`}
          >
            {/* Top Bar: Icon, Title & Enable/Pause Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl shrink-0">{item.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate">{item.title}</span>
                    <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[8px] font-mono text-zinc-400">
                      {item.category}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 block truncate">{item.description}</span>
                </div>
              </div>

              {/* Pause / Enable Toggle Switch */}
              <button
                onClick={() => onToggleItemEnabled(item.id)}
                className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-bold border transition-all shrink-0 ${
                  item.isEnabled
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"
                }`}
              >
                {item.isEnabled ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                {item.isEnabled ? "Active" : "Paused"}
              </button>
            </div>

            {/* Inline Price & Stock Controls */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Price Editor */}
              <div className="rounded-xl bg-zinc-950 p-2 border border-zinc-800">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">
                  Price (🪙 Tokens)
                </span>
                <div className="flex items-center gap-1 mt-1">
                  <Coins className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <input
                    type="number"
                    min="10"
                    step="10"
                    value={item.basePriceTokens}
                    onChange={(e) => onUpdatePrice(item.id, Number(e.target.value))}
                    className="w-full bg-transparent text-amber-400 font-bold focus:outline-none text-xs"
                  />
                </div>
                <span className="text-[9px] text-zinc-500 block mt-0.5">
                  Live: {item.priceTokens} 🪙 (~${(item.priceTokens * 0.08).toFixed(2)})
                </span>
              </div>

              {/* Quantity Stock Limiter */}
              <div className="rounded-xl bg-zinc-950 p-2 border border-zinc-800">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">
                  Stock Limit
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-zinc-300 font-bold text-xs">
                    {item.remainingQuantity !== null ? `${item.remainingQuantity} left` : "Unlimited"}
                  </span>
                  <button
                    onClick={() =>
                      onSetQuantity(
                        item.id,
                        item.maxQuantityPerStream !== null ? null : 5
                      )
                    }
                    className="text-[9px] text-pink-400 hover:text-pink-300 font-semibold"
                  >
                    {item.maxQuantityPerStream !== null ? "Clear" : "Cap (5)"}
                  </button>
                </div>
              </div>
            </div>

            {/* Duration & Eligibility Selector Bar */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/80 text-[10px]">
              {/* Duration Setting */}
              <div className="flex items-center gap-1 text-zinc-400">
                <Clock className="h-3 w-3 text-pink-400" />
                <select
                  value={item.durationSeconds}
                  onChange={(e) => onSetDuration(item.id, Number(e.target.value))}
                  className="bg-zinc-950 rounded-lg px-2 py-0.5 text-zinc-200 border border-zinc-800 focus:outline-none"
                >
                  <option value={10}>10s</option>
                  <option value={15}>15s</option>
                  <option value={30}>30s</option>
                  <option value={60}>60s</option>
                  <option value={120}>120s</option>
                </select>
              </div>

              {/* Eligibility Gate */}
              <div className="flex items-center gap-1 text-zinc-400">
                <Shield className="h-3 w-3 text-purple-400" />
                <select
                  value={item.eligibility}
                  onChange={(e) => onSetEligibility(item.id, e.target.value as any)}
                  className="bg-zinc-950 rounded-lg px-2 py-0.5 text-zinc-200 border border-zinc-800 focus:outline-none"
                >
                  <option value="ALL">Everyone</option>
                  <option value="FOLLOWERS">Followers</option>
                  <option value="SUBSCRIBERS_ONLY">VIP Subs</option>
                  <option value="MIN_FAN_LEVEL_5">Level 5+</option>
                </select>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => onDeleteItem(item.id)}
                className="text-zinc-500 hover:text-rose-400 p-1"
                title="Remove Item"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
