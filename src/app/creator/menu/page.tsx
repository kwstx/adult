"use client";

import React, { useState } from "react";
import { Sparkles, Plus, Trash2, Save, Coins, Flame } from "lucide-react";
import { useUser } from "@/lib/user-context";

export default function CreatorMenuConfigPage() {
  const { currentUser } = useUser();
  const [goalTitle, setGoalTitle] = useState("Dance celebration at 500 tokens! 💃");
  const [goalTarget, setGoalTarget] = useState(500);
  const [menuItems, setMenuItems] = useState([
    { id: "1", title: "Mini Dance (30s)", cost: 50, desc: "Freestyle dance performance" },
    { id: "2", title: "Spin the Wheel 🎡", cost: 100, desc: "Live wheel prize spin" },
    { id: "3", title: "Neon Confetti Pop 🎊", cost: 250, desc: "Room celebration popper" },
  ]);
  const [isSaved, setIsSaved] = useState(false);

  const handleAddItem = () => {
    setMenuItems([
      ...menuItems,
      {
        id: String(Date.now()),
        title: "New Interaction",
        cost: 50,
        desc: "Custom interaction description",
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setMenuItems(menuItems.filter((item) => item.id !== id));
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Interaction Menu & Goal Setup</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Configure the tip actions and progress goal displayed on your live room.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/creator/studio"
            className="flex items-center gap-2 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-pink-500/40 px-5 py-3 text-xs font-bold text-zinc-300 hover:text-white transition-all"
          >
            Enter Control Room Studio 🎙️
          </a>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-600 px-6 py-3 text-xs font-bold text-white shadow-xl shadow-pink-600/30 hover:from-pink-500 hover:to-rose-500 transition-all"
          >
            <Save className="h-4 w-4" />
            {isSaved ? "Saved Successfully!" : "Save Menu Configuration"}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Stream Goal Card */}
        <div className="rounded-3xl bg-zinc-950 border border-zinc-800/80 p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="h-5 w-5 text-amber-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Live Stream Goal
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-pink-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Interaction Menu Items
              </h2>
            </div>
            <button
              onClick={handleAddItem}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-bold text-zinc-300 border border-zinc-800 hover:bg-zinc-800 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Item
            </button>
          </div>

          <div className="space-y-3">
            {menuItems.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800"
              >
                <div className="flex-1">
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => {
                      const updated = [...menuItems];
                      updated[idx].title = e.target.value;
                      setMenuItems(updated);
                    }}
                    placeholder="Action Title"
                    className="w-full rounded-xl bg-zinc-900 px-3 py-1.5 text-xs text-white font-bold border border-zinc-800 focus:border-pink-500 focus:outline-none"
                  />
                </div>
                <div className="w-28 flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <input
                    type="number"
                    value={item.cost}
                    onChange={(e) => {
                      const updated = [...menuItems];
                      updated[idx].cost = Number(e.target.value);
                      setMenuItems(updated);
                    }}
                    placeholder="Tokens"
                    className="w-full rounded-xl bg-zinc-900 px-2.5 py-1.5 text-xs text-amber-400 font-bold border border-zinc-800 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="rounded-xl p-2 text-zinc-500 hover:bg-rose-950/60 hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
