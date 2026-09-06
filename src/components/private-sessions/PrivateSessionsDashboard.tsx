"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Coins,
  DollarSign,
  ShieldCheck,
  Sparkles,
  Video,
  CheckCircle2,
  AlertCircle,
  Bell,
  Save,
  ChevronRight,
  ExternalLink,
  Users,
  Settings,
  RefreshCw,
} from "lucide-react";
import { useUser } from "@/lib/user-context";
import {
  CreatorSessionSettings,
  DEFAULT_SESSION_TIERS,
  DEFAULT_WEEKLY_SCHEDULE,
  PrivateBookingRecord,
  SessionPricingTier,
} from "@/modules/private-sessions/types";
import Link from "next/link";

export function PrivateSessionsDashboard() {
  const { currentUser } = useUser();
  const creatorId = currentUser.role === "CREATOR" ? currentUser.id : "creator_maya";

  const [settings, setSettings] = useState<CreatorSessionSettings | null>(null);
  const [bookings, setBookings] = useState<PrivateBookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"tiers" | "availability" | "bookings">("tiers");

  // Real-time toast for incoming booking
  const [liveToast, setLiveToast] = useState<{
    bookingId: string;
    fanName: string;
    time: string;
    duration: number;
    amount: string;
  } | null>(null);

  // 1. Fetch Creator Configuration & Bookings
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [configRes, bookingsRes] = await Promise.all([
        fetch(`/api/private-sessions/config?creatorId=${creatorId}`),
        fetch(`/api/private-sessions/bookings?creatorProfileId=${creatorId}&role=CREATOR`),
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        setSettings(configData.settings);
      }

      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setBookings(bookingsData.bookings || []);
      }
    } catch (err) {
      console.error("Failed to load private sessions data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [creatorId]);

  // 2. Save Pricing Tiers or Availability
  const handleSaveSettings = async () => {
    if (!settings) return;
    try {
      setIsSaving(true);
      const res = await fetch("/api/private-sessions/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId,
          pricingTiers: settings.pricingTiers,
          weeklySchedule: settings.weeklySchedule,
          bufferTimeMinutes: settings.bufferTimeMinutes,
          timezone: settings.timezone,
        }),
      });

      if (res.ok) {
        setSaveSuccessMessage("Settings successfully saved and published!");
        setTimeout(() => setSaveSuccessMessage(null), 4000);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Pricing Tier
  const toggleTier = (tierId: string) => {
    if (!settings) return;
    const updatedTiers = settings.pricingTiers.map((t) =>
      t.id === tierId ? { ...t, isEnabled: !t.isEnabled } : t
    );
    setSettings({ ...settings, pricingTiers: updatedTiers });
  };

  // Update Tier Price
  const updateTierPrice = (tierId: string, priceEur: number) => {
    if (!settings) return;
    const priceCents = Math.round(priceEur * 100);
    const tokenEquivalent = Math.round(priceEur * 10);
    const updatedTiers = settings.pricingTiers.map((t) =>
      t.id === tierId
        ? {
            ...t,
            priceFiatCents: priceCents,
            tokenEquivalent,
            title: `${t.durationMinutes} minutes — €${priceEur}`,
          }
        : t
    );
    setSettings({ ...settings, pricingTiers: updatedTiers });
  };

  // Toggle Day Availability
  const toggleDay = (dayOfWeek: number) => {
    if (!settings) return;
    const updatedSchedule = settings.weeklySchedule.map((d) =>
      d.dayOfWeek === dayOfWeek ? { ...d, isEnabled: !d.isEnabled } : d
    );
    setSettings({ ...settings, weeklySchedule: updatedSchedule });
  };

  // Update Day Hours
  const updateDayHours = (
    dayOfWeek: number,
    windowIndex: number,
    startTime: string,
    endTime: string
  ) => {
    if (!settings) return;
    const updatedSchedule = settings.weeklySchedule.map((d) => {
      if (d.dayOfWeek === dayOfWeek) {
        const windows = [...d.timeWindows];
        windows[windowIndex] = { startTime, endTime };
        return { ...d, timeWindows: windows };
      }
      return d;
    });
    setSettings({ ...settings, weeklySchedule: updatedSchedule });
  };

  // Trigger test reminder
  const handleTriggerReminder = async (bookingId: string) => {
    try {
      const res = await fetch("/api/private-sessions/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      if (res.ok) {
        alert("Reminder dispatched to Fan and Creator!");
        loadData();
      }
    } catch (err) {
      console.error("Reminder error:", err);
    }
  };

  const totalEarnings = bookings
    .filter((b) => b.status === "CONFIRMED" || b.status === "COMPLETED" || b.status === "REMINDER_SENT")
    .reduce((acc, b) => acc + (b.creatorNetCents || 0), 0);

  if (isLoading) {
    return (
      <div className="flex h-96 w-full items-center justify-center text-zinc-400">
        <RefreshCw className="h-8 w-8 animate-spin text-pink-500 mr-3" />
        <span className="text-sm font-semibold">Loading Private Sessions Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ------------------------------------------------------------- */}
      {/* LIVE INCOMING BOOKING TOAST                                   */}
      {/* ------------------------------------------------------------- */}
      {liveToast && (
        <div className="fixed top-20 right-6 z-50 animate-bounce rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 p-4 text-white shadow-2xl border border-pink-400/40 max-w-sm">
          <div className="flex items-start gap-3">
            <Sparkles className="h-6 w-6 text-amber-300 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-pink-200">
                New Private Booking Received! 🎉
              </p>
              <p className="text-sm font-bold text-white mt-0.5">
                {liveToast.fanName} booked {liveToast.duration} min at {liveToast.time}
              </p>
              <p className="text-xs text-pink-100 mt-1">Earnings: {liveToast.amount}</p>
              <button
                onClick={() => setLiveToast(null)}
                className="mt-2 rounded-lg bg-black/40 px-3 py-1 text-[11px] font-bold text-white hover:bg-black/60"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* HEADER & TELEMETRY HUD                                        */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6 sm:p-8 border border-zinc-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-64 w-64 bg-pink-600/10 blur-3xl pointer-events-none rounded-full" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1.5 rounded-full bg-pink-500/10 px-3 py-1 text-xs font-bold text-pink-400 border border-pink-500/20">
                <Video className="h-3.5 w-3.5" />
                VIP 1-on-1 Shows
              </span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-3.5 w-3.5" />
                Authoritative System
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Private Sessions Command Center
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
              Configure session duration rates (€100/30m, €140/45m, €180/60m), set your availability windows, and manage VIP bookings.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 px-4 py-3 text-center min-w-[110px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Confirmed Bookings
              </p>
              <p className="text-xl font-black text-white mt-0.5">
                {bookings.filter((b) => b.status === "CONFIRMED" || b.status === "REMINDER_SENT").length}
              </p>
            </div>

            <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 px-4 py-3 text-center min-w-[110px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Net Earnings
              </p>
              <p className="text-xl font-black text-emerald-400 mt-0.5">
                €{(totalEarnings / 100).toFixed(0)}
              </p>
            </div>

            <Link
              href={`/book/mayavelvet`}
              target="_blank"
              className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-pink-600/30 hover:brightness-110 transition-all"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Preview Fan View</span>
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-8 border-b border-zinc-800/80 pb-px">
          <button
            onClick={() => setActiveTab("tiers")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
              activeTab === "tiers"
                ? "border-pink-500 text-pink-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <DollarSign className="h-4 w-4" />
            Pricing Tiers (€100 / €140 / €180)
          </button>

          <button
            onClick={() => setActiveTab("availability")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
              activeTab === "availability"
                ? "border-pink-500 text-pink-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Calendar className="h-4 w-4" />
            Availability & Slots
          </button>

          <button
            onClick={() => setActiveTab("bookings")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
              activeTab === "bookings"
                ? "border-pink-500 text-pink-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Users className="h-4 w-4" />
            Bookings Schedule ({bookings.length})
          </button>
        </div>
      </div>

      {saveSuccessMessage && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-4 text-xs font-bold text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {saveSuccessMessage}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: PRICING TIERS CONFIGURATION                           */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "tiers" && settings && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Private Session Pricing Tiers</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                The creator chooses available session durations and their rates.
              </p>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-pink-600 px-4 py-2 text-xs font-bold text-white hover:bg-pink-500 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Pricing Tiers"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {settings.pricingTiers.map((tier) => (
              <div
                key={tier.id}
                className={`rounded-3xl p-6 border transition-all relative overflow-hidden ${
                  tier.isEnabled
                    ? "bg-zinc-950 border-pink-500/40 shadow-xl shadow-pink-500/5"
                    : "bg-zinc-950/50 border-zinc-800/80 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-500/10 text-pink-400 border border-pink-500/20 font-black text-sm">
                      {tier.durationMinutes}m
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{tier.durationMinutes} Minutes</h4>
                      <p className="text-[11px] text-zinc-400">1-on-1 HD Private Show</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tier.isEnabled}
                      onChange={() => toggleTier(tier.id)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
                  </label>
                </div>

                <div className="space-y-3 mt-4 pt-4 border-t border-zinc-800/80">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Price in EUR (€)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-zinc-500 font-bold">€</span>
                      <input
                        type="number"
                        value={tier.priceFiatCents / 100}
                        onChange={(e) => updateTierPrice(tier.id, Number(e.target.value))}
                        className="w-full rounded-xl bg-zinc-900 border border-zinc-800 pl-7 pr-3 py-2 text-sm font-bold text-white focus:border-pink-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5 text-amber-400" />
                      Token Equivalent:
                    </span>
                    <span className="font-bold text-amber-400">
                      {tier.tokenEquivalent.toLocaleString()} Tokens
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Creator Net (80%):</span>
                    <span className="font-bold text-emerald-400">
                      €{((tier.priceFiatCents * 0.8) / 100).toFixed(0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Platform Rake (20%):</span>
                    <span className="font-bold text-zinc-400">
                      €{((tier.priceFiatCents * 0.2) / 100).toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-zinc-900/60 p-4 border border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-pink-400" />
              Standard platform defaults: 30m (€100), 45m (€140), 60m (€180).
            </span>
            <span className="text-zinc-500">Authoritative Escrow Protection Active</span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: AVAILABILITY & SLOT GENERATOR CONFIG                  */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "availability" && settings && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Weekly Availability Schedule</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Define the hours you are available. The system automatically turns your schedule into bookable slots (e.g. 19:00, 20:00, 21:30).
              </p>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-pink-600 px-4 py-2 text-xs font-bold text-white hover:bg-pink-500 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Availability"}
            </button>
          </div>

          {/* Buffer Times & Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-zinc-950 p-4 border border-zinc-800">
              <label className="text-xs font-bold text-zinc-300 block mb-1">
                Buffer Time Between Sessions
              </label>
              <select
                value={settings.bufferTimeMinutes}
                onChange={(e) =>
                  setSettings({ ...settings, bufferTimeMinutes: Number(e.target.value) })
                }
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-pink-500"
              >
                <option value={5}>5 minutes buffer</option>
                <option value={10}>10 minutes buffer</option>
                <option value={15}>15 minutes buffer (Recommended)</option>
                <option value={30}>30 minutes buffer</option>
              </select>
            </div>

            <div className="rounded-2xl bg-zinc-950 p-4 border border-zinc-800">
              <label className="text-xs font-bold text-zinc-300 block mb-1">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-pink-500"
              >
                <option value="Europe/Paris">Europe/Paris (CET)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="UTC">UTC Universal</option>
              </select>
            </div>
          </div>

          {/* Days List */}
          <div className="space-y-3">
            {settings.weeklySchedule.map((day) => (
              <div
                key={day.dayOfWeek}
                className={`rounded-2xl p-4 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  day.isEnabled
                    ? "bg-zinc-950 border-zinc-800"
                    : "bg-zinc-950/40 border-zinc-900 opacity-50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-[140px]">
                  <input
                    type="checkbox"
                    checked={day.isEnabled}
                    onChange={() => toggleDay(day.dayOfWeek)}
                    className="h-4 w-4 rounded bg-zinc-800 border-zinc-700 text-pink-600 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-sm font-bold text-white">{day.dayName}</span>
                </div>

                {day.isEnabled ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">From:</span>
                      <input
                        type="time"
                        value={day.timeWindows[0]?.startTime || "18:00"}
                        onChange={(e) =>
                          updateDayHours(
                            day.dayOfWeek,
                            0,
                            e.target.value,
                            day.timeWindows[0]?.endTime || "23:00"
                          )
                        }
                        className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-pink-500"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">To:</span>
                      <input
                        type="time"
                        value={day.timeWindows[0]?.endTime || "23:00"}
                        onChange={(e) =>
                          updateDayHours(
                            day.dayOfWeek,
                            0,
                            day.timeWindows[0]?.startTime || "18:00",
                            e.target.value
                          )
                        }
                        className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-500 italic">Unavailable on this day</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: BOOKINGS SCHEDULE & UPCOMING SESSIONS                  */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "bookings" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Bookings & Scheduled Sessions</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                All confirmed private sessions. At the scheduled time, both you and the fan receive authorization to enter the private media room.
              </p>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-300 border border-zinc-800 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          {bookings.length === 0 ? (
            <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-12 text-center">
              <Calendar className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white">No Bookings Yet</h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                When fans book private sessions from your profile, they will appear here with instant room entry buttons.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-3xl bg-zinc-950 p-5 border border-zinc-800/90 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={booking.fan.avatarUrl}
                      alt={booking.fan.displayName}
                      className="h-12 w-12 rounded-2xl object-cover ring-1 ring-zinc-700"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {booking.fan.displayName}
                        </span>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold text-emerald-400 border border-emerald-500/20">
                          {booking.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                        <span className="flex items-center gap-1 text-zinc-300 font-semibold">
                          <Calendar className="h-3.5 w-3.5 text-pink-400" />
                          {booking.displayDate}
                        </span>
                        <span className="flex items-center gap-1 text-zinc-300 font-semibold">
                          <Clock className="h-3.5 w-3.5 text-pink-400" />
                          {booking.displayStartTime} - {booking.displayEndTime} ({booking.durationMinutes} min)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-zinc-800">
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-400">
                        Net: €{(booking.creatorNetCents / 100).toFixed(0)}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        Total Paid: {booking.priceFiatFormatted}
                      </p>
                    </div>

                    <button
                      onClick={() => handleTriggerReminder(booking.id)}
                      className="flex items-center gap-1 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-300 border border-zinc-800 hover:text-white"
                      title="Send instant reminder notification to fan"
                    >
                      <Bell className="h-3.5 w-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Send Reminder</span>
                    </button>

                    <Link
                      href={`/private-room/${booking.id}`}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-pink-600/30 hover:brightness-110"
                    >
                      <Video className="h-3.5 w-3.5" />
                      <span>Enter Private Room</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
