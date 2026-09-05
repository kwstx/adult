"use client";

import React, { useState } from "react";
import { X, Sparkles, Plus, Clock, Layers, ShieldCheck, Flame } from "lucide-react";
import type { MarketplaceItem, InteractionEligibility } from "@/types/control-room";

interface AddInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Omit<MarketplaceItem, "id">) => void;
}

const EMOJI_OPTIONS = ["💃", "🎡", "🎊", "⚡", "🍾", "👗", "🎁", "🔥", "🎤", "💖", "🎯", "👑"];

export function AddInteractionModal({ isOpen, onClose, onAdd }: AddInteractionModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<MarketplaceItem["category"]>("Request");
  const [basePriceTokens, setBasePriceTokens] = useState(150);
  const [durationSeconds, setDurationSeconds] = useState(30);
  const [hasQuantityLimit, setHasQuantityLimit] = useState(false);
  const [maxQuantity, setMaxQuantity] = useState(5);
  const [eligibility, setEligibility] = useState<InteractionEligibility>("ALL");
  const [icon, setIcon] = useState("💃");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({
      title: title.trim(),
      description: description.trim() || `${durationSeconds}s creator interaction`,
      category,
      priceTokens: basePriceTokens,
      basePriceTokens,
      durationSeconds,
      maxQuantityPerStream: hasQuantityLimit ? maxQuantity : null,
      remainingQuantity: hasQuantityLimit ? maxQuantity : null,
      eligibility,
      isEnabled: true,
      icon,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-black text-white">Add Live Interaction</h2>
              <p className="text-[11px] text-zinc-400">Configure a new item in your live marketplace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Emoji / Icon Selector */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              Icon Badge
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  type="button"
                  key={e}
                  onClick={() => setIcon(e)}
                  className={`h-9 w-9 text-lg rounded-xl flex items-center justify-center border transition-all ${
                    icon === e
                      ? "bg-pink-500/20 border-pink-500 text-white scale-110 shadow-lg shadow-pink-500/20"
                      : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              Action Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. VIP Champagne Pop 🍾"
              className="w-full rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-white border border-zinc-800 focus:border-pink-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will you perform live on camera?"
              className="w-full rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-zinc-300 border border-zinc-800 focus:border-pink-500 focus:outline-none"
            />
          </div>

          {/* Price & Duration Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Token Price (🪙)
              </label>
              <input
                type="number"
                min="10"
                step="10"
                required
                value={basePriceTokens}
                onChange={(e) => setBasePriceTokens(Number(e.target.value))}
                className="w-full rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-amber-400 font-bold border border-zinc-800 focus:border-amber-400 focus:outline-none"
              />
              <span className="text-[10px] text-zinc-500 mt-0.5 block">
                ≈ ${(basePriceTokens * 0.08).toFixed(2)} USD Net
              </span>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Duration (Seconds)
              </label>
              <input
                type="number"
                min="5"
                step="5"
                required
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                className="w-full rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-white font-bold border border-zinc-800 focus:border-pink-500 focus:outline-none"
              />
              <span className="text-[10px] text-zinc-500 mt-0.5 block">Queue countdown timer</span>
            </div>
          </div>

          {/* Category & Eligibility Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full rounded-2xl bg-zinc-900 px-3 py-2.5 text-xs text-white border border-zinc-800 focus:border-pink-500 focus:outline-none"
              >
                <option value="Request">Dance / Request</option>
                <option value="Visual">Visual / Animation</option>
                <option value="Toy">Toy Vibration</option>
                <option value="VIP">VIP Exclusive</option>
                <option value="Sound">Sound Trigger</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Audience Eligibility
              </label>
              <select
                value={eligibility}
                onChange={(e) => setEligibility(e.target.value as any)}
                className="w-full rounded-2xl bg-zinc-900 px-3 py-2.5 text-xs text-white border border-zinc-800 focus:border-pink-500 focus:outline-none"
              >
                <option value="ALL">Everyone in Room</option>
                <option value="FOLLOWERS">Followers Only</option>
                <option value="SUBSCRIBERS_ONLY">VIP Subscribers Only</option>
                <option value="MIN_FAN_LEVEL_5">Fan Level 5+ Only</option>
              </select>
            </div>
          </div>

          {/* Quantity Stock Cap Toggle */}
          <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-3 space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-zinc-200">Limit Available Quantity</span>
              <input
                type="checkbox"
                checked={hasQuantityLimit}
                onChange={(e) => setHasQuantityLimit(e.target.checked)}
                className="h-4 w-4 rounded text-pink-600 focus:ring-pink-500 bg-zinc-900 border-zinc-700"
              />
            </label>
            {hasQuantityLimit && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-zinc-400">Max per stream:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={maxQuantity}
                  onChange={(e) => setMaxQuantity(Number(e.target.value))}
                  className="w-20 rounded-xl bg-zinc-900 px-3 py-1 text-xs text-white font-bold border border-zinc-700 focus:border-pink-500"
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 px-6 py-2.5 text-xs font-black text-white shadow-xl shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500"
            >
              <Plus className="h-4 w-4" />
              Publish to Marketplace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
