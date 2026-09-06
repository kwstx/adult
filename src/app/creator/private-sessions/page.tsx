"use client";

import React from "react";
import { PrivateSessionsDashboard } from "@/components/private-sessions/PrivateSessionsDashboard";
import Link from "next/link";
import { ArrowLeft, Radio, Video } from "lucide-react";

export default function CreatorPrivateSessionsPage() {
  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/creator/studio"
            className="flex items-center gap-2 rounded-xl bg-zinc-900/80 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Creator OS</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-pink-500/10 px-3 py-1 text-xs font-bold text-pink-400 border border-pink-500/20">
              <Radio className="h-3 w-3" />
              Creator Control Room
            </span>
          </div>
        </div>

        {/* Master Private Sessions Dashboard */}
        <PrivateSessionsDashboard />
      </div>
    </main>
  );
}
