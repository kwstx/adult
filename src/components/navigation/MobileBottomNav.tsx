"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, MessageSquare, User, Plus } from "lucide-react";

export function MobileBottomNav() {
  const pathname = usePathname();

  const isHome = pathname === "/" || pathname === "/live";
  const isSearch = pathname === "/discover" || pathname.startsWith("/search") || pathname === "/matchmaking";
  const isMessages = pathname.startsWith("/messages");
  const isProfile = pathname.startsWith("/profile");

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 pointer-events-none flex flex-col items-center pb-2 select-none">
      {/* Ambient dock glow */}
      <div className="absolute bottom-6 w-72 h-8 bg-blue-500/10 blur-xl rounded-full pointer-events-none" />

      {/* Floating Capsule Dock */}
      <nav
        aria-label="Bottom Floating Navigation Dock"
        className="pointer-events-auto relative flex h-[58px] items-center justify-between px-6 w-[92%] max-w-[400px] rounded-full bg-[#0e0e13]/90 backdrop-blur-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.9)] transition-all"
      >
        {/* 1. Home */}
        <Link
          href="/"
          className={`relative flex items-center justify-center p-2 transition-all ${
            isHome ? "text-white" : "text-zinc-400 hover:text-zinc-200"
          }`}
          title="Home"
        >
          <Home
            className={`h-5 w-5 transition-transform ${
              isHome ? "fill-white text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" : "stroke-[1.8]"
            }`}
          />
        </Link>

        {/* 2. Search / Discover */}
        <Link
          href="/discover"
          className={`flex items-center justify-center p-2 transition-colors ${
            isSearch ? "text-white" : "text-zinc-400 hover:text-zinc-200"
          }`}
          title="Search"
        >
          <Search className="h-5 w-5 stroke-[1.8]" />
        </Link>

        {/* 3. Center Elevated Action Button (+) */}
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/creator/studio";
            }
          }}
          className="relative flex items-center justify-center -mt-6 h-12 w-12 rounded-full bg-gradient-to-b from-white via-zinc-100 to-zinc-300 text-zinc-950 font-bold shadow-[0_0_22px_rgba(255,255,255,0.45)] ring-4 ring-[#060608] hover:scale-105 active:scale-95 transition-all cursor-pointer group"
          title="Create or Broadcast"
        >
          <Plus className="h-6 w-6 stroke-[2.8] text-zinc-950 group-hover:rotate-90 transition-transform duration-300" />
        </button>

        {/* 4. Messages */}
        <Link
          href="/messages"
          className={`flex items-center justify-center p-2 transition-colors ${
            isMessages ? "text-white" : "text-zinc-400 hover:text-zinc-200"
          }`}
          title="Messages"
        >
          <MessageSquare className="h-5 w-5 stroke-[1.8]" />
        </Link>

        {/* 5. Profile */}
        <Link
          href="/profile"
          className={`flex items-center justify-center p-2 transition-colors ${
            isProfile ? "text-white" : "text-zinc-400 hover:text-zinc-200"
          }`}
          title="Profile"
        >
          <User className="h-5 w-5 stroke-[1.8]" />
        </Link>
      </nav>

      {/* iOS Home Indicator Bar */}
      <div className="h-1 w-32 bg-white/30 rounded-full mt-2 pointer-events-none" />
    </div>
  );
}
