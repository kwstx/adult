"use client";

import React, { useState } from "react";
import {
  X,
  Send,
  Sparkles,
  Gift,
  Tag,
  ShieldCheck,
  Users,
  MessageSquare,
  Bell,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { CrmFanCohort, CampaignChannel, CampaignPerkAttachment } from "@/modules/creator-crm/types";
import { COHORTS_CONFIG } from "./CohortFilterBar";

interface CampaignBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCohort?: CrmFanCohort;
  cohortCounts: Record<CrmFanCohort, number>;
  onCreateCampaign: (campaign: {
    title: string;
    targetCohort: CrmFanCohort;
    channel: CampaignChannel;
    messageBody: string;
    perkAttached?: CampaignPerkAttachment;
    dispatchImmediately: boolean;
  }) => Promise<void>;
}

export function CampaignBuilderModal({
  isOpen,
  onClose,
  initialCohort = "EXPIRING_SUBSCRIBERS",
  cohortCounts,
  onCreateCampaign,
}: CampaignBuilderModalProps) {
  const [targetCohort, setTargetCohort] = useState<CrmFanCohort>(initialCohort);
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState<CampaignChannel>("DIRECT_MESSAGE");
  const [messageBody, setMessageBody] = useState("");
  const [includePerk, setIncludePerk] = useState(false);
  const [perkType, setPerkType] = useState<CampaignPerkAttachment["type"]>("DISCOUNT_CODE");
  const [perkTitle, setPerkTitle] = useState("20% Off Next Interaction");
  const [discountPercent, setDiscountPercent] = useState(20);
  const [dispatchImmediately, setDispatchImmediately] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const targetCount = cohortCounts[targetCohort] || 0;

  // Preset Template Helper
  const applyPresetTemplate = (type: "WELCOME" | "RENEWAL" | "WIN_BACK" | "VIP") => {
    if (type === "RENEWAL") {
      setTargetCohort("EXPIRING_SUBSCRIBERS");
      setTitle("VIP Subscription Renewal Thank-You & Bonus Drop");
      setMessageBody(
        "Hey! Your VIP pass is renewing in a few days. As a token of gratitude for your incredible support, I've attached an exclusive 4K backstage set unlocked just for you!"
      );
      setIncludePerk(true);
      setPerkType("FREE_CONTENT_UNLOCK");
      setPerkTitle("Exclusive 4K Backstage Set");
    } else if (type === "WELCOME") {
      setTargetCohort("NEW_FANS");
      setTitle("Welcome to the Community & Friday Live Invite");
      setMessageBody(
        "Welcome to the room! So happy you found the community. I'm going live this Friday at 8 PM UTC with interactive toy controls — here's a 20% discount on your first custom action!"
      );
      setIncludePerk(true);
      setPerkType("DISCOUNT_CODE");
      setPerkTitle("20% Off First Custom Action");
      setDiscountPercent(20);
    } else if (type === "WIN_BACK") {
      setTargetCohort("INACTIVE_FANS");
      setTitle("We Miss You! Exclusive Comeback Perk");
      setMessageBody(
        "Hey! Haven't seen you in the room for a couple weeks. We've got a brand-new interactive setup — come say hi during tonight's broadcast!"
      );
      setIncludePerk(true);
      setPerkType("DISCOUNT_CODE");
      setPerkTitle("100 Credits Bonus on Next Deposit");
    } else if (type === "VIP") {
      setTargetCohort("VIPS");
      setTitle("Exclusive VIP Devotee Backstage Announcement");
      setMessageBody(
        "To my top supporters: I'm hosting an exclusive VIP private room broadcast this Sunday. You're on the priority guest list!"
      );
      setIncludePerk(true);
      setPerkType("PRIORITY_CHAT_PASS");
      setPerkTitle("VIP Stage Pass & Priority Shoutout");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !messageBody.trim()) return;

    setIsSubmitting(true);
    try {
      const perk: CampaignPerkAttachment | undefined = includePerk
        ? {
            type: perkType,
            title: perkTitle,
            valueDescription: perkType === "DISCOUNT_CODE" ? `${discountPercent}% discount` : "Free exclusive unlock",
            discountPercentage: perkType === "DISCOUNT_CODE" ? discountPercent : undefined,
          }
        : undefined;

      await onCreateCampaign({
        title,
        targetCohort,
        channel,
        messageBody,
        perkAttached: perk,
        dispatchImmediately,
      });

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fadeIn select-none">
      <div className="relative w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl flex flex-col space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Send className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-white">Create Targeted Fan Campaign</h3>
              <p className="text-xs text-zinc-400">Dispatch personalized perks, renewal incentives & re-engagement DMs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
            Quick Campaign Presets
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => applyPresetTemplate("RENEWAL")}
              className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-2.5 text-left hover:bg-orange-500/15 transition-colors"
            >
              <p className="text-[11px] font-bold text-orange-300">Renewal Incentive</p>
              <p className="text-[9px] text-zinc-400">Expiring Subscribers</p>
            </button>
            <button
              type="button"
              onClick={() => applyPresetTemplate("WELCOME")}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-left hover:bg-emerald-500/15 transition-colors"
            >
              <p className="text-[11px] font-bold text-emerald-300">Welcome Series</p>
              <p className="text-[9px] text-zinc-400">New Fans (&lt;14d)</p>
            </button>
            <button
              type="button"
              onClick={() => applyPresetTemplate("WIN_BACK")}
              className="rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 text-left hover:bg-zinc-800 transition-colors"
            >
              <p className="text-[11px] font-bold text-zinc-300">Win-Back Promo</p>
              <p className="text-[9px] text-zinc-400">Inactive Fans</p>
            </button>
            <button
              type="button"
              onClick={() => applyPresetTemplate("VIP")}
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-left hover:bg-rose-500/15 transition-colors"
            >
              <p className="text-[11px] font-bold text-rose-300">VIP Backstage</p>
              <p className="text-[9px] text-zinc-400">Devotee Tiers</p>
            </button>
          </div>
        </div>

        {/* Campaign Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Cohort & Channel Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-300">Target Audience Cohort</label>
              <select
                value={targetCohort}
                onChange={(e) => setTargetCohort(e.target.value as CrmFanCohort)}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs font-semibold text-white focus:border-rose-500 focus:outline-none"
              >
                {COHORTS_CONFIG.map((c) => (
                  <option key={c.cohort} value={c.cohort}>
                    {c.title} ({cohortCounts[c.cohort] || 0} fans)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-300">Communication Channel</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setChannel("DIRECT_MESSAGE")}
                  className={`flex items-center justify-center gap-1.5 rounded-2xl border p-2 text-xs font-bold transition-all ${
                    channel === "DIRECT_MESSAGE"
                      ? "border-rose-500 bg-rose-500/20 text-rose-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Direct DM</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("SYSTEM_NOTIFICATION")}
                  className={`flex items-center justify-center gap-1.5 rounded-2xl border p-2 text-xs font-bold transition-all ${
                    channel === "SYSTEM_NOTIFICATION"
                      ? "border-rose-500 bg-rose-500/20 text-rose-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                  }`}
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span>Notification</span>
                </button>
              </div>
            </div>
          </div>

          {/* Campaign Title */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-300">Internal Campaign Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. VIP Renewal Bonus Drop — September"
              required
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
            />
          </div>

          {/* Message Body */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-zinc-300">Message Content</label>
              <span className="text-[10px] text-zinc-500">Personalized with creator identity</span>
            </div>
            <textarea
              rows={3}
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="Type your message to the targeted fans..."
              required
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none resize-none"
            />
          </div>

          {/* Optional Attached Perk */}
          <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-pink-400" />
                <span className="text-xs font-bold text-white">Attach Exclusive Perk / Incentive</span>
              </div>
              <input
                type="checkbox"
                checked={includePerk}
                onChange={(e) => setIncludePerk(e.target.checked)}
                className="h-4 w-4 rounded accent-rose-500 cursor-pointer"
              />
            </div>

            {includePerk && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80">
                <input
                  type="text"
                  value={perkTitle}
                  onChange={(e) => setPerkTitle(e.target.value)}
                  placeholder="Perk Title (e.g. 20% Off Next Interaction)"
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none"
                />
                <select
                  value={perkType}
                  onChange={(e) => setPerkType(e.target.value as any)}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none"
                >
                  <option value="DISCOUNT_CODE">Discount Voucher</option>
                  <option value="FREE_CONTENT_UNLOCK">Free PPV Unlock Voucher</option>
                  <option value="EXCLUSIVE_MEDIA_TEASER">Exclusive Media Teaser</option>
                  <option value="PRIORITY_CHAT_PASS">Priority Chat Pass</option>
                </select>
              </div>
            )}
          </div>

          {/* Audience Reach & Privacy Suppression Summary */}
          <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800/60 p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-rose-400" />
              <span className="text-zinc-300">
                Target Reach: <span className="font-bold text-white">{targetCount} fans</span>
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Auto-suppresses muted & blocked fans</span>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-zinc-800 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || targetCount === 0}
              className="flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-2.5 text-xs font-black text-white hover:bg-rose-500 shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>{isSubmitting ? "Dispatching..." : `Launch Campaign (${targetCount} Fans)`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
