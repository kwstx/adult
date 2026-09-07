"use client";

import React, { useState } from "react";
import { FrontendStateManagementDemo } from "@/components/state-demo/FrontendStateManagementDemo";
import { OptimisticVsConservativeDemo } from "@/components/state-demo/OptimisticVsConservativeDemo";
import { ServerStateProvider, LiveRoomUIProvider } from "@/hooks/state";
import { Zap, Layers } from "lucide-react";

export default function StateDemoPage() {
  const [activeTab, setActiveTab] = useState<"optimistic-vs-conservative" | "full-architecture">(
    "optimistic-vs-conservative"
  );

  return (
    <ServerStateProvider>
      <LiveRoomUIProvider>
        <div className="min-h-screen bg-zinc-950 text-white">
          {/* Top Switcher Navigation */}
          <div className="border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-14">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-pink-600/30 text-pink-400 border border-pink-500/40">
                  <Zap className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
                  State Architecture Showcase
                </span>
              </div>

              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveTab("optimistic-vs-conservative")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === "optimistic-vs-conservative"
                      ? "bg-pink-600 text-white shadow-md shadow-pink-600/30"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Optimistic vs. Conservative UI</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("full-architecture")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === "full-architecture"
                      ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Full Cache & UI State Engine</span>
                </button>
              </div>
            </div>
          </div>

          {/* Render Active View */}
          <div className="py-6">
            {activeTab === "optimistic-vs-conservative" ? (
              <OptimisticVsConservativeDemo />
            ) : (
              <FrontendStateManagementDemo />
            )}
          </div>
        </div>
      </LiveRoomUIProvider>
    </ServerStateProvider>
  );
}
