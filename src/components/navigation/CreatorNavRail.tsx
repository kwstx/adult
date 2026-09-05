"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Radio,
  Sliders,
  Sparkles,
  Lock,
  Wallet,
  ShieldCheck,
  ArrowLeft,
  Flame,
  Tv,
} from "lucide-react";
import { useUser } from "@/lib/user-context";

interface CreatorNavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  matchPrefix?: boolean;
}

const CREATOR_NAV_ITEMS: CreatorNavItem[] = [
  { name: "Studio", href: "/creator/studio", icon: Radio },
  { name: "Menu", href: "/creator/menu", icon: Sparkles },
  { name: "Wallet", href: "/wallet", icon: Wallet },
  { name: "2257", href: "/trust/mod-queue", icon: ShieldCheck },
];

export function CreatorNavRail() {
  const pathname = usePathname();
  const { currentUser } = useUser();

  return (
    <aside
      aria-label="Creator Operating System Rail"
      className="fixed top-0 bottom-0 left-0 z-40 hidden lg:flex w-[72px] flex-col items-center justify-between border-r border-rose-500/20 bg-zinc-950/95 py-4 backdrop-blur-2xl select-none"
    >
      {/* Top: Creator OS Badge & Exit back to Fan app */}
      <div className="flex flex-col items-center gap-3">
        <Link
          href="/creator/studio"
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-600/30 ring-1 ring-rose-500/50"
          title="Creator Studio OS"
        >
          <Radio className="h-5 w-5" />
        </Link>
        <span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-rose-300">
          Studio
        </span>
      </div>

      {/* Middle: Creator Tools Rail Items */}
      <nav className="flex flex-col items-center gap-3 my-auto">
        {CREATOR_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group relative flex h-12 w-12 flex-col items-center justify-center rounded-2xl transition-all ${
                isActive
                  ? "bg-rose-500/20 text-rose-300 font-bold ring-1 ring-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
              }`}
              title={item.name}
            >
              {isActive && (
                <span className="absolute -left-3 h-5 w-1 rounded-r-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
              )}

              <Icon
                className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                  isActive ? "text-rose-400" : "text-zinc-400 group-hover:text-zinc-100"
                }`}
              />
              <span
                className={`mt-1 text-[9px] font-semibold tracking-tight transition-colors ${
                  isActive ? "text-rose-200" : "text-zinc-500 group-hover:text-zinc-300"
                }`}
              >
                {item.name}
              </span>

              {/* Tooltip */}
              <span className="pointer-events-none absolute left-16 z-50 whitespace-nowrap rounded-xl bg-zinc-900/95 px-2.5 py-1 text-xs font-semibold text-white opacity-0 shadow-xl border border-zinc-800 transition-opacity group-hover:opacity-100">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Exit Creator Mode back to Consumer Live Discovery */}
      <div className="flex flex-col items-center gap-2">
        <Link
          href="/"
          className="group relative flex h-11 w-11 flex-col items-center justify-center rounded-2xl bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-pink-500/40 hover:text-pink-400 hover:bg-pink-500/10 transition-all shadow-md"
          title="Exit to Fan Discovery"
        >
          <Tv className="h-4 w-4 transition-transform group-hover:scale-110" />
          <span className="mt-0.5 text-[8px] font-bold">Fan App</span>

          <span className="pointer-events-none absolute left-16 z-50 whitespace-nowrap rounded-xl bg-zinc-900/95 px-2.5 py-1 text-xs font-semibold text-pink-300 opacity-0 shadow-xl border border-pink-500/30 transition-opacity group-hover:opacity-100">
            Exit to Fan Discovery
          </span>
        </Link>
      </div>
    </aside>
  );
}
