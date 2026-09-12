"use client";

import React, { useState, useEffect } from "react";
import { Calendar, Clock, Ticket, Users, ShieldCheck, Play, Sparkles, AlertCircle } from "lucide-react";

export interface JointEventCoHostUI {
  creatorProfileId: string;
  stageName: string;
  avatarUrl?: string | null;
  role: string;
  splitPercentage: number;
}

export interface JointEventCountdownProps {
  id: string;
  title: string;
  description?: string | null;
  ticketPriceCredits: number;
  scheduledStartAt: string;
  status: "SCHEDULED" | "COUNTDOWN_ACTIVE" | "LIVE" | "ENDED" | "CANCELLED";
  coverImageUrl?: string | null;
  coHosts: JointEventCoHostUI[];
  hasTicket?: boolean;
  userWalletBalance?: number;
  onTicketPurchased?: (ticketResult: any) => void;
  onEnterRoom?: () => void;
}

export function JointEventCountdown({
  id,
  title,
  description,
  ticketPriceCredits,
  scheduledStartAt,
  status,
  coverImageUrl,
  coHosts,
  hasTicket = false,
  userWalletBalance = 0,
  onTicketPurchased,
  onEnterRoom,
}: JointEventCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [ticketOwned, setTicketOwned] = useState(hasTicket);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const calculateTime = () => {
      const target = new Date(scheduledStartAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, target - now);

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [scheduledStartAt]);

  const handleBuyTicket = async () => {
    if (userWalletBalance < ticketPriceCredits) {
      setError(`Insufficient credits. You need ${ticketPriceCredits} credits, but have ${userWalletBalance}.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/joint-events/${id}/ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to purchase ticket.");
      }

      setTicketOwned(true);
      if (onTicketPurchased) {
        onTicketPurchased(data.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isLive = status === "LIVE";

  return (
    <div className="relative w-full rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-2xl p-6 flex flex-col space-y-5">
      {/* Background Ambience Texture */}
      {coverImageUrl && (
        <div className="absolute inset-0 opacity-20 bg-cover bg-center pointer-events-none filter blur-sm" style={{ backgroundImage: `url(${coverImageUrl})` }} />
      )}

      {/* Top Banner */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isLive ? (
            <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold uppercase tracking-wider animate-pulse shadow-lg shadow-rose-950">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>LIVE NOW</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-600/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <span>CO-HOSTED LIVE EVENT</span>
            </span>
          )}
          <span className="flex items-center space-x-1 bg-black/60 px-2.5 py-1 rounded-full text-xs text-neutral-300 border border-neutral-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>2257 Verified Co-Performers</span>
          </span>
        </div>

        <div className="text-xs text-neutral-400 flex items-center space-x-1">
          <Clock className="w-3.5 h-3.5" />
          <span>{new Date(scheduledStartAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>

      {/* Title & Description */}
      <div className="relative z-10 space-y-1">
        <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
        {description && <p className="text-neutral-400 text-sm">{description}</p>}
      </div>

      {/* Synchronized Live Countdown Clock */}
      {!isLive && status !== "ENDED" && (
        <div className="relative z-10 grid grid-cols-4 gap-2 sm:gap-4 bg-neutral-950/80 border border-neutral-800 p-4 rounded-xl text-center">
          <div>
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">{timeLeft.days.toString().padStart(2, "0")}</span>
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block mt-0.5">Days</span>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">{timeLeft.hours.toString().padStart(2, "0")}</span>
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block mt-0.5">Hours</span>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">{timeLeft.minutes.toString().padStart(2, "0")}</span>
            <span className="text-[10px] text-neutral-400 uppercase font-semibold block mt-0.5">Mins</span>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-purple-400 font-mono animate-pulse">{timeLeft.seconds.toString().padStart(2, "0")}</span>
            <span className="text-[10px] text-purple-300 uppercase font-semibold block mt-0.5">Secs</span>
          </div>
        </div>
      )}

      {/* Co-Hosts Lineup */}
      <div className="relative z-10 space-y-2">
        <span className="text-xs font-semibold text-neutral-400 flex items-center space-x-1.5">
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span>Participating Co-Hosts ({coHosts.length})</span>
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {coHosts.map((h) => (
            <div key={h.creatorProfileId} className="flex items-center space-x-2 bg-neutral-950/90 border border-neutral-800 p-2 rounded-xl">
              {h.avatarUrl ? (
                <img src={h.avatarUrl} alt={h.stageName} className="w-8 h-8 rounded-full object-cover border border-purple-500/30" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white font-bold text-xs">
                  {h.stageName.substring(0, 1)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="text-white text-xs font-bold block truncate">{h.stageName}</span>
                <span className="text-[10px] text-purple-300 font-mono">{(h.splitPercentage * 100).toFixed(0)}% Split</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions & Ticket Gate */}
      <div className="relative z-10 pt-3 border-t border-neutral-800 flex items-center justify-between">
        <div className="flex items-baseline space-x-1.5">
          <span className="text-2xl font-black text-white font-mono">{ticketPriceCredits.toLocaleString()}</span>
          <span className="text-xs font-semibold text-purple-400">CR / Ticket</span>
          <span className="text-[11px] text-neutral-500">≈ €{(ticketPriceCredits / 100).toFixed(2)}</span>
        </div>

        {isLive && (ticketOwned || ticketPriceCredits === 0) ? (
          <button
            onClick={onEnterRoom}
            className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-rose-950 animate-bounce"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>ENTER LIVE ROOM</span>
          </button>
        ) : ticketOwned ? (
          <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
            <Ticket className="w-4 h-4" />
            <span>Ticket Active (Access Ready)</span>
          </div>
        ) : (
          <button
            onClick={handleBuyTicket}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition-all active:scale-95 disabled:opacity-50"
          >
            <Ticket className="w-4 h-4" />
            <span>{loading ? "Securing Ticket..." : `Get Ticket (${ticketPriceCredits} CR)`}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="relative z-10 flex items-center space-x-1 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/50 p-2.5 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
