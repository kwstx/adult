"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PrivateSessionBookingModal } from "@/components/private-sessions/PrivateSessionBookingModal";
import {
  Calendar,
  Clock,
  Coins,
  ShieldCheck,
  Sparkles,
  Video,
  ArrowLeft,
  Heart,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { useUser } from "@/lib/user-context";

export default function FanBookingProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = (params?.creatorUsername as string) || "mayavelvet";
  const { currentUser } = useUser();

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Mock creator display info
  const creator = {
    id: "creator_maya",
    displayName: "Maya Velvet ✨",
    username: "mayavelvet",
    bio: "Professional dancer, fitness model & VIP entertainer. Book a private 1-on-1 session for exclusive private video chat!",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
    bannerUrl:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=80",
    rating: "4.98 ★",
    reviewsCount: 342,
    tiers: [
      { duration: 30, priceEur: 100, tokens: 1000, desc: "Personal 1-on-1 private HD video session with creator" },
      { duration: 45, priceEur: 140, tokens: 1400, desc: "Extended private show with interactive requests and private chat" },
      { duration: 60, priceEur: 180, tokens: 1800, desc: "Ultimate VIP 1-hour private show and full attention" },
    ],
  };

  return (
    <main className="min-h-screen bg-black text-white pb-24">
      {/* Top Banner & Header */}
      <div className="relative h-64 sm:h-80 w-full overflow-hidden">
        <img
          src={creator.bannerUrl}
          alt={creator.displayName}
          className="h-full w-full object-cover brightness-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-black/60 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-white border border-white/10 hover:bg-black/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Discover</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-3.5 w-3.5" />
              2257 Verified & Age Assured
            </span>
          </div>
        </div>
      </div>

      {/* Main Profile & Booking Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-24 relative z-10 space-y-8">
        {/* Creator Info Card */}
        <div className="rounded-3xl bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <img
            src={creator.avatarUrl}
            alt={creator.displayName}
            className="h-28 w-28 rounded-3xl object-cover ring-4 ring-pink-500/50 shadow-2xl shadow-pink-500/20 shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white">{creator.displayName}</h1>
                <p className="text-xs text-pink-400 font-bold">@{creator.username}</p>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400 border border-amber-500/20">
                  {creator.rating} ({creator.reviewsCount} reviews)
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-zinc-300 mt-3">{creator.bio}</p>
          </div>
        </div>

        {/* Private Sessions Booking Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Video className="h-5 w-5 text-pink-500" />
                Book a Private 1-on-1 Session
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Select your preferred session duration to view available bookable slots.
              </p>
            </div>
          </div>

          {/* Pricing Tiers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {creator.tiers.map((tier) => (
              <div
                key={tier.duration}
                className="rounded-3xl bg-zinc-950 border border-zinc-800/90 p-6 shadow-xl flex flex-col justify-between hover:border-pink-500/50 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-400 font-black text-sm border border-pink-500/20">
                      {tier.duration}m
                    </span>
                    <span className="text-xl font-black text-white">€{tier.priceEur}</span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-pink-300 transition-colors">
                    {tier.duration} Minutes
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{tier.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800/80">
                  <button
                    onClick={() => setIsBookingModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 py-3 text-xs font-black text-white shadow-lg shadow-pink-600/30 hover:brightness-110 transition-all"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>View Bookable Slots</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <PrivateSessionBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        creatorId={creator.id}
        creatorDisplayName={creator.displayName}
        creatorAvatarUrl={creator.avatarUrl}
        creatorUsername={creator.username}
      />
    </main>
  );
}
