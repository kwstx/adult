"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Mail, Bell } from "lucide-react";

export function MobileBottomNav() {
  const pathname = usePathname();

  // If inside creator studio, keep studio controls accessible or clean
  const isCreatorStudio = pathname.startsWith("/creator/studio");

  const isHome = pathname === "/" || pathname === "/live";
  const isSearch = pathname === "/discover" || pathname.startsWith("/search") || pathname === "/matchmaking";
  const isMessages = pathname.startsWith("/messages");
  const isNotifications = pathname.startsWith("/notifications");

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden pointer-events-auto bg-[#101216] border-t border-white/5 pb-[env(safe-area-inset-bottom)]">
      <nav
        aria-label="Fansly Mobile Navigation Bar"
        className="flex h-14 items-center justify-around px-4 max-w-md mx-auto select-none"
      >
        {/* 1. Home */}
        <Link
          href="/"
          className={`flex items-center justify-center p-2.5 transition-colors ${
            isHome ? "text-[#00a2f8]" : "text-zinc-400 hover:text-white"
          }`}
          title="Home"
        >
          <Home
            className={`h-6 w-6 stroke-[2.2] transition-transform ${
              isHome ? "scale-105 fill-[#00a2f8]" : ""
            }`}
          />
        </Link>

        {/* 2. Search / Discover */}
        <Link
          href="/discover"
          className={`flex items-center justify-center p-2.5 transition-colors ${
            isSearch ? "text-[#00a2f8]" : "text-zinc-400 hover:text-white"
          }`}
          title="Search"
        >
          <Search
            className={`h-6 w-6 stroke-[2.2] transition-transform ${
              isSearch ? "scale-105 stroke-[2.8]" : ""
            }`}
          />
        </Link>

        {/* 3. Messages / Mail */}
        <Link
          href="/messages"
          className={`flex items-center justify-center p-2.5 transition-colors ${
            isMessages ? "text-[#00a2f8]" : "text-zinc-400 hover:text-white"
          }`}
          title="Messages"
        >
          <Mail
            className={`h-6 w-6 stroke-[2.2] transition-transform ${
              isMessages ? "scale-105 stroke-[2.8]" : ""
            }`}
          />
        </Link>

        {/* 4. Notifications */}
        <Link
          href="/notifications"
          className={`flex items-center justify-center p-2.5 transition-colors ${
            isNotifications ? "text-[#00a2f8]" : "text-zinc-400 hover:text-white"
          }`}
          title="Notifications"
        >
          <Bell
            className={`h-6 w-6 stroke-[2.2] transition-transform ${
              isNotifications ? "scale-105 stroke-[2.8]" : ""
            }`}
          />
        </Link>
      </nav>
    </div>
  );
}
