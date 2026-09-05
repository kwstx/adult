"use client";

import React, { useState } from "react";
import { X, Flame, Sparkles, Check } from "lucide-react";
import type { StreamGoal } from "@/types/control-room";

interface EditGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: StreamGoal;
  onUpdate: (title: string, targetTokens: number, rewardDescription: string) => void;
}

export function EditGoalModal({ isOpen, onClose, goal, onUpdate }: EditGoalModalProps) {
  const [title, setTitle] = useState(goal.title);
  const [targetTokens, setTargetTokens] = useState(goal.targetTokens);
  const [rewardDescription, setRewardDescription] = useState(goal.rewardDescription);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || targetTokens <= 0) return;

    onUpdate(title.trim(), targetTokens, rewardDescription.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md rounded-3xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Flame className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-black text-white">Edit Stream Goal</h2>
              <p className="text-[11px] text-zinc-400">Update the live collective milestone & reward</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              Goal Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Neon Dance Celebration at 3000 tokens! 💃"
              className="w-full rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-white border border-zinc-800 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              Target Tokens (🪙)
            </label>
            <input
              type="number"
              min="100"
              step="100"
              required
              value={targetTokens}
              onChange={(e) => setTargetTokens(Number(e.target.value))}
              className="w-full rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-amber-400 font-bold border border-zinc-800 focus:border-amber-400 focus:outline-none"
            />
            <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1">
              <span>Current Tokens: {goal.currentTokens} 🪙</span>
              <span>≈ ${(targetTokens * 0.08).toFixed(2)} USD Gross</span>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              Reward / Performance Description
            </label>
            <textarea
              rows={2}
              value={rewardDescription}
              onChange={(e) => setRewardDescription(e.target.value)}
              placeholder="What will you perform live when this milestone is unlocked?"
              className="w-full rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs text-zinc-300 border border-zinc-800 focus:border-amber-400 focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 px-6 py-2.5 text-xs font-black text-white shadow-xl shadow-amber-500/30 hover:from-amber-400 hover:to-rose-500"
            >
              <Check className="h-4 w-4" />
              Save Goal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
