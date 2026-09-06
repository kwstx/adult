"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  HelpCircle,
  Activity,
  Flame,
  Zap,
  Crown,
  Clock,
  Coins,
  ShieldCheck,
  Layers,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Info,
  Sliders,
  Check,
} from "lucide-react";
import {
  InteractionType,
  PurchaseEligibility,
  INTERACTION_TYPE_DEFINITIONS,
  InteractionConfig,
} from "@/types/interaction";

interface AddInteractionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  creatorId: string;
  onInteractionPublished?: (interaction: InteractionConfig) => void;
}

const TYPE_CARDS: {
  type: InteractionType;
  title: string;
  badgeText: string;
  icon: string;
  iconComponent: React.ComponentType<{ className?: string }>;
  description: string;
  samplePlaceholder: string;
  defaultPrice: number;
  defaultDuration: number;
  defaultAcceptance: boolean;
  defaultQueue: boolean;
  gradient: string;
  borderActive: string;
}[] = [
  {
    type: "QUESTION",
    title: "Question",
    badgeText: "AMA & Direct Chat",
    icon: "💬",
    iconComponent: HelpCircle,
    description: "Viewer asks a question live with guaranteed prioritized answer",
    samplePlaceholder: "e.g., Ask Maya Anything (Live Answer) 💬",
    defaultPrice: 100,
    defaultDuration: 30,
    defaultAcceptance: true,
    defaultQueue: true,
    gradient: "from-blue-600/20 to-cyan-500/10",
    borderActive: "border-blue-500 shadow-blue-500/20",
  },
  {
    type: "ACTIVITY",
    title: "Activity",
    badgeText: "Live Action",
    icon: "💃",
    iconComponent: Activity,
    description: "Perform a live dance, fitness routine, singing song, or demonstration",
    samplePlaceholder: "e.g., 45s Freestyle Salsa Dance 💃",
    defaultPrice: 200,
    defaultDuration: 45,
    defaultAcceptance: false,
    defaultQueue: true,
    gradient: "from-pink-600/20 to-rose-500/10",
    borderActive: "border-pink-500 shadow-pink-500/20",
  },
  {
    type: "CHALLENGE",
    title: "Challenge",
    badgeText: "Audience Dare",
    icon: "🎯",
    iconComponent: Flame,
    description: "Audience dares the creator to complete a live endurance or comedic dare",
    samplePlaceholder: "e.g., 20 Push-up Challenge / Spicy Snack Dare 🎯",
    defaultPrice: 350,
    defaultDuration: 60,
    defaultAcceptance: true,
    defaultQueue: true,
    gradient: "from-amber-600/20 to-orange-500/10",
    borderActive: "border-amber-500 shadow-amber-500/20",
  },
  {
    type: "PRIORITY_INTERACTION",
    title: "Priority interaction",
    badgeText: "VIP Fast-Track",
    icon: "⚡",
    iconComponent: Zap,
    description: "Jump to front of queue with special room spotlight toast and banner",
    samplePlaceholder: "e.g., Front-Row Champagne Pop & VIP Toast 🍾",
    defaultPrice: 500,
    defaultDuration: 20,
    defaultAcceptance: false,
    defaultQueue: true,
    gradient: "from-purple-600/20 to-indigo-500/10",
    borderActive: "border-purple-500 shadow-purple-500/20",
  },
  {
    type: "CUSTOM_EXPERIENCE",
    title: "Custom experience",
    badgeText: "Bespoke Moments",
    icon: "✨",
    iconComponent: Crown,
    description: "Tailored 1-on-1 fan request, cosplay switch, or special roleplay segment",
    samplePlaceholder: "e.g., Fan-Chosen Cosplay Outfit Switch 👗",
    defaultPrice: 1000,
    defaultDuration: 120,
    defaultAcceptance: true,
    defaultQueue: true,
    gradient: "from-emerald-600/20 to-teal-500/10",
    borderActive: "border-emerald-500 shadow-emerald-500/20",
  },
];

const DURATION_PRESETS = [15, 30, 45, 60, 120, 300];

export function AddInteractionDrawer({
  isOpen,
  onClose,
  creatorId,
  onInteractionPublished,
}: AddInteractionDrawerProps) {
  // 1. Chosen Type
  const [selectedType, setSelectedType] = useState<InteractionType>("ACTIVITY");

  // 2. Form Fields
  const [name, setName] = useState("Mini Freestyle Dance 💃");
  const [description, setDescription] = useState("30-second live custom dance performance on stream");
  const [price, setPrice] = useState<number>(150);
  const [duration, setDuration] = useState<number>(30);
  const [hasQuantityLimit, setHasQuantityLimit] = useState(false);
  const [quantity, setQuantity] = useState<number>(5);
  const [whoCanPurchase, setWhoCanPurchase] = useState<PurchaseEligibility>("ALL");
  const [requiresAcceptance, setRequiresAcceptance] = useState<boolean>(false);
  const [entersQueue, setEntersQueue] = useState<boolean>(true);
  const [icon, setIcon] = useState<string>("💃");

  // 3. UI Status States
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);

  if (!isOpen) return null;

  // Handle choosing one of the 5 interaction types
  const handleSelectType = (card: typeof TYPE_CARDS[0]) => {
    setSelectedType(card.type);
    setIcon(card.icon);
    setName(card.samplePlaceholder.replace("e.g., ", ""));
    setDescription(card.description);
    setPrice(card.defaultPrice);
    setDuration(card.defaultDuration);
    setRequiresAcceptance(card.defaultAcceptance);
    setEntersQueue(card.defaultQueue);
    setErrorMessages({});
    setGeneralError(null);
  };

  // Authoritative Form Submission & Backend Publication
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPublishing(true);
    setErrorMessages({});
    setGeneralError(null);

    // Client-side pre-validation
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Please enter an interaction name.";
    if (price < 10) errors.price = "Price must be at least 10 tokens.";
    if (duration < 5) errors.duration = "Duration must be at least 5 seconds.";
    if (hasQuantityLimit && (!quantity || quantity < 1)) {
      errors.quantity = "Please specify a quantity limit of at least 1.";
    }

    if (Object.keys(errors).length > 0) {
      setErrorMessages(errors);
      setIsPublishing(false);
      return;
    }

    try {
      const payload = {
        type: selectedType,
        name: name.trim(),
        description: description.trim() || `${duration}s creator live interaction`,
        price: Number(price),
        duration: Number(duration),
        quantity: hasQuantityLimit ? Number(quantity) : null,
        whoCanPurchase,
        requiresAcceptance,
        entersQueue,
        icon,
      };

      const res = await fetch(`/api/creators/${creatorId}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          setErrorMessages(data.details);
        } else {
          setGeneralError(data.error || "Failed to publish interaction.");
        }
        setIsPublishing(false);
        return;
      }

      // Success! Backend validated configuration, activated interaction, and broadcasted to viewers
      setPublishSuccess(true);
      if (onInteractionPublished && data.interaction) {
        onInteractionPublished(data.interaction);
      }

      setTimeout(() => {
        setPublishSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setGeneralError(err.message || "Network error while publishing interaction.");
    } finally {
      setIsPublishing(false);
    }
  };

  const activeCard = TYPE_CARDS.find((c) => c.type === selectedType) || TYPE_CARDS[0];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-md animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-over Drawer Panel */}
      <div className="relative z-10 flex h-full w-full max-w-xl flex-col bg-zinc-950 border-l border-zinc-800 shadow-2xl overflow-hidden animate-slide-left text-white">
        {/* ------------------------------------------------------------- */}
        {/* DRAWER HEADER                                                 */}
        {/* ------------------------------------------------------------- */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-6 py-4 bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-500 text-white shadow-lg shadow-pink-600/30">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                Create Live Interaction
                <span className="rounded-full bg-pink-500/20 border border-pink-500/30 px-2 py-0.5 text-[10px] font-bold text-pink-400">
                  Real-Time Engine
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Configure and publish an interactive experience to your live audience
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-850 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* DRAWER BODY (SCROLLABLE FORM)                                 */}
        {/* ------------------------------------------------------------- */}
        <form onSubmit={handlePublish} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* General Error Banner */}
          {generalError && (
            <div className="flex items-center gap-2 rounded-2xl bg-rose-950/80 border border-rose-500/50 p-3.5 text-xs text-rose-300 animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Success Banner */}
          {publishSuccess && (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 p-4 text-xs font-bold text-emerald-300 animate-fade-in shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <p className="font-extrabold text-white text-sm">Interaction Published Successfully! ⚡</p>
                <p className="text-[11px] text-emerald-300 font-normal mt-0.5">
                  The real-time system has broadcast &quot;New interaction available&quot; to all connected viewers.
                </p>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------- */}
          {/* STEP 1: CHOOSE INTERACTION TYPE                             */}
          {/* ----------------------------------------------------------- */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <span>1. Select Interaction Type</span>
              </label>
              <span className="text-[11px] text-pink-400 font-bold">
                {activeCard.title} Selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TYPE_CARDS.map((card) => {
                const isSelected = selectedType === card.type;
                const Icon = card.iconComponent;
                return (
                  <button
                    key={card.type}
                    type="button"
                    onClick={() => handleSelectType(card)}
                    className={`relative flex flex-col text-left p-3.5 rounded-2xl border transition-all text-xs group ${
                      isSelected
                        ? `bg-gradient-to-br ${card.gradient} ${card.borderActive} scale-[1.01] shadow-lg`
                        : "bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-400"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{card.icon}</span>
                        <span className={`font-black text-xs ${isSelected ? "text-white" : "text-zinc-200"}`}>
                          {card.title}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-black text-xs font-bold">
                          <Check className="h-3 w-3 text-white" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {card.description}
                    </p>
                  </button>
                );
              })}
            </div>
            {errorMessages.type && (
              <span className="text-[11px] text-rose-400 block">{errorMessages.type}</span>
            )}
          </div>

          {/* ----------------------------------------------------------- */}
          {/* STEP 2: NAME & DESCRIPTION                                  */}
          {/* ----------------------------------------------------------- */}
          <div className="space-y-4 rounded-3xl bg-zinc-900/40 border border-zinc-800/80 p-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Interaction Name <span className="text-pink-500">*</span>
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">{name.length}/100</span>
              </div>
              <input
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={activeCard.samplePlaceholder}
                className={`w-full rounded-2xl bg-zinc-900 px-4 py-3 text-xs text-white font-bold border transition-colors focus:outline-none ${
                  errorMessages.name
                    ? "border-rose-500 focus:border-rose-400"
                    : "border-zinc-800 focus:border-pink-500"
                }`}
              />
              {errorMessages.name && (
                <span className="text-[11px] text-rose-400 mt-1 block font-medium">
                  {errorMessages.name}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Description
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">{description.length}/500</span>
              </div>
              <textarea
                rows={2}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will happen on screen when a viewer purchases this?"
                className="w-full rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-zinc-300 border border-zinc-800 focus:border-pink-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* STEP 3: PRICE & DURATION CONFIGURATION                      */}
          {/* ----------------------------------------------------------- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Price (Tokens / Credits) */}
            <div className="rounded-3xl bg-zinc-900/40 border border-zinc-800/80 p-4 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center justify-between">
                <span>Price (🪙 Tokens)</span>
                <span className="text-amber-400 font-black">Tokens</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={10}
                  max={500000}
                  step={10}
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full rounded-2xl bg-zinc-900 pl-4 pr-12 py-3 text-sm font-black text-amber-400 border border-zinc-800 focus:border-amber-400 focus:outline-none"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-amber-400">
                  <Coins className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5">
                <span>Estimated Payout:</span>
                <span className="font-bold text-zinc-300">
                  ≈ ${(price * 0.08).toFixed(2)} USD Net
                </span>
              </div>
              {errorMessages.price && (
                <span className="text-[11px] text-rose-400 block">{errorMessages.price}</span>
              )}
            </div>

            {/* Duration (Seconds) */}
            <div className="rounded-3xl bg-zinc-900/40 border border-zinc-800/80 p-4 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center justify-between">
                <span>Duration</span>
                <span className="text-pink-400 font-bold">{duration} Seconds</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={5}
                  max={3600}
                  step={5}
                  required
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full rounded-2xl bg-zinc-900 pl-4 pr-12 py-3 text-sm font-black text-white border border-zinc-800 focus:border-pink-500 focus:outline-none"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-zinc-400">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              {/* Quick Presets */}
              <div className="flex items-center gap-1 overflow-x-auto pt-1">
                {DURATION_PRESETS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setDuration(sec)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                      duration === sec
                        ? "bg-pink-500/20 border-pink-500 text-pink-300"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {sec < 60 ? `${sec}s` : `${sec / 60}m`}
                  </button>
                ))}
              </div>
              {errorMessages.duration && (
                <span className="text-[11px] text-rose-400 block">{errorMessages.duration}</span>
              )}
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* STEP 4: QUANTITY & WHO CAN PURCHASE                         */}
          {/* ----------------------------------------------------------- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Quantity Stock Limit */}
            <div className="rounded-3xl bg-zinc-900/40 border border-zinc-800/80 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Quantity Limit
                </label>
                <button
                  type="button"
                  onClick={() => setHasQuantityLimit(!hasQuantityLimit)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    hasQuantityLimit ? "bg-pink-600" : "bg-zinc-800"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                      hasQuantityLimit ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {hasQuantityLimit ? (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full rounded-2xl bg-zinc-900 px-3.5 py-2 text-xs text-white font-bold border border-zinc-700 focus:border-pink-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-zinc-400 whitespace-nowrap">slots left</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 block">
                    Auto-disables when all slots are purchased
                  </span>
                </div>
              ) : (
                <div className="py-2">
                  <span className="rounded-xl bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    Unlimited per stream
                  </span>
                </div>
              )}
              {errorMessages.quantity && (
                <span className="text-[11px] text-rose-400 block">{errorMessages.quantity}</span>
              )}
            </div>

            {/* Who Can Purchase (Eligibility) */}
            <div className="rounded-3xl bg-zinc-900/40 border border-zinc-800/80 p-4 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 block">
                Who Can Purchase
              </label>
              <select
                value={whoCanPurchase}
                onChange={(e) => setWhoCanPurchase(e.target.value as PurchaseEligibility)}
                className="w-full rounded-2xl bg-zinc-900 px-3.5 py-2.5 text-xs text-white font-bold border border-zinc-800 focus:border-pink-500 focus:outline-none"
              >
                <option value="ALL">Everyone in Room (Public)</option>
                <option value="FOLLOWERS">Followers Only</option>
                <option value="SUBSCRIBERS_ONLY">VIP Subscribers Only</option>
                <option value="MIN_FAN_LEVEL_5">Fan Level 5+ Supporters</option>
              </select>
              <span className="text-[10px] text-zinc-500 block">
                Restricts purchasing to qualified room audience
              </span>
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* STEP 5: ACCEPTANCE & QUEUE LOGIC SWITCHES                   */}
          {/* ----------------------------------------------------------- */}
          <div className="rounded-3xl bg-zinc-900/40 border border-zinc-800/80 p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-pink-400" />
              Live Execution Rules
            </h4>

            {/* Whether it requires acceptance */}
            <div className="flex items-start justify-between gap-3 pt-1 border-t border-zinc-800/60">
              <div>
                <label className="text-xs font-bold text-zinc-200 block cursor-pointer">
                  Requires Creator Acceptance
                </label>
                <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                  You review and manually approve the request before executing on camera
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRequiresAcceptance(!requiresAcceptance)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out mt-1 ${
                  requiresAcceptance ? "bg-emerald-600" : "bg-zinc-800"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out ${
                    requiresAcceptance ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Whether it enters a queue */}
            <div className="flex items-start justify-between gap-3 pt-3 border-t border-zinc-800/60">
              <div>
                <label className="text-xs font-bold text-zinc-200 block cursor-pointer">
                  Enters Broadcast Queue
                </label>
                <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                  Places item in live studio countdown queue for timed execution
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEntersQueue(!entersQueue)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out mt-1 ${
                  entersQueue ? "bg-pink-600" : "bg-zinc-800"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out ${
                    entersQueue ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </form>

        {/* ------------------------------------------------------------- */}
        {/* DRAWER FOOTER: PUBLISH ACTION                                 */}
        {/* ------------------------------------------------------------- */}
        <div className="border-t border-zinc-800/80 px-6 py-4 bg-zinc-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="text-xl">{icon}</span>
            <div>
              <span className="font-bold text-white block">{name || "Untitled Interaction"}</span>
              <span className="text-[10px] text-amber-400 font-extrabold">{price} 🪙 Tokens</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPublishing}
              className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing || publishSuccess}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 px-6 py-3 text-xs font-black text-white shadow-xl shadow-pink-600/30 hover:opacity-95 active:scale-95 disabled:opacity-50 transition-all"
            >
              {isPublishing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Validating & Publishing...</span>
                </>
              ) : publishSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span>Published!</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Publish</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
