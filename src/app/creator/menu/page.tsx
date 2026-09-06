"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Plus, Trash2, Save, Coins, Flame, Clock, Shield, Layers, HelpCircle, Activity, Crown, Zap } from "lucide-react";
import { useUser } from "@/lib/user-context";
import { AddInteractionDrawer } from "@/components/creator-control-room/drawers/AddInteractionDrawer";
import { InteractionConfig } from "@/types/interaction";

export default function CreatorMenuConfigPage() {
  const { currentUser } = useUser();
  const creatorProfileId = currentUser.username === "mayavelvet" ? "creator_maya" : currentUser.id;

  const [goalTitle, setGoalTitle] = useState("Dance celebration at 500 tokens! 💃");
  const [goalTarget, setGoalTarget] = useState(500);
  const [interactions, setInteractions] = useState<InteractionConfig[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate interactions from API
  useEffect(() => {
    fetch(`/api/creators/${creatorProfileId}/interactions`)
      .then((res) => res.json())
      .then((data) => {
        if (data.interactions && Array.isArray(data.interactions)) {
          setInteractions(data.interactions);
        }
      })
      .catch((err) => console.error("Failed to load interactions:", err))
      .finally(() => setIsLoading(false));
  }, [creatorProfileId]);

  const handleRemoveItem = (id: string) => {
    setInteractions((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            Interaction Marketplace & Menu
            <span className="rounded-full bg-pink-500/20 border border-pink-500/30 px-2.5 py-0.5 text-xs font-bold text-pink-400">
              Live Configuration
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Configure the live interaction menu items, price rates, eligibility, and broadcast goals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/creator/studio"
            className="flex items-center gap-2 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-pink-500/40 px-5 py-3 text-xs font-bold text-zinc-300 hover:text-white transition-all"
          >
            Enter Studio Control Room 🎙️
          </a>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 px-6 py-3 text-xs font-bold text-white shadow-xl shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500 transition-all"
          >
            <Save className="h-4 w-4" />
            {isSaved ? "Saved Successfully!" : "Save Configuration"}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Stream Goal Card */}
        <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="h-5 w-5 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Live Stream Milestone Goal
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
                Goal Title
              </label>
              <input
                type="text"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                className="w-full rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-white border border-zinc-800 focus:border-pink-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
                Target Tokens
              </label>
              <input
                type="number"
                value={goalTarget}
                onChange={(e) => setGoalTarget(Number(e.target.value))}
                className="w-full rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-white border border-zinc-800 focus:border-pink-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Interaction Items List */}
        <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-pink-400" />
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Active Interaction Menu ({interactions.length})
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Published items are broadcast instantly to audience viewers in real time
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-pink-600/30 hover:opacity-95 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Add interaction
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              Loading interactions...
            </div>
          ) : interactions.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-2xl">
              No interactions published yet. Click &quot;Add interaction&quot; to create your first live action!
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {interactions.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-xl border border-zinc-700/50">
                      {item.icon || "✨"}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-black text-white truncate">{item.name}</h4>
                        <span className="rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30 px-2 py-0.2 text-[9px] font-black">
                          {item.type}
                        </span>
                        {item.requiresAcceptance && (
                          <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[9px] text-zinc-300 font-medium">
                            Needs Acceptance
                          </span>
                        )}
                        {item.entersQueue && (
                          <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[9px] text-pink-300 font-medium">
                            Enters Queue
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{item.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 font-black text-xs">
                      <Coins className="h-3.5 w-3.5" />
                      <span>{item.price} Tokens</span>
                    </div>

                    <div className="flex items-center gap-1 text-zinc-400 text-xs">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{item.duration}s</span>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="rounded-xl p-2 text-zinc-500 hover:bg-rose-950/60 hover:text-rose-400 transition-colors"
                      title="Delete Interaction"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Interaction Drawer */}
      <AddInteractionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        creatorId={creatorProfileId}
        onInteractionPublished={(newInteraction) => {
          setInteractions((prev) => [newInteraction, ...prev]);
        }}
      />
    </div>
  );
}
