"use client";

import React, { useState } from "react";
import { X, Search, Radio, Flame, Sparkles } from "lucide-react";

interface SearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTag: string;
  onSelectTag: (tag: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryTags: string[];
}

export function SearchDrawer({
  isOpen,
  onClose,
  selectedTag,
  onSelectTag,
  searchQuery,
  onSearchChange,
  categoryTags,
}: SearchDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950/95 p-5 shadow-2xl backdrop-blur-2xl animate-slide-up mt-12">
        {/* Search Bar */}
        <div className="relative flex items-center mb-4">
          <Search className="absolute left-4 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search creators, stream titles, tags..."
            className="w-full rounded-2xl bg-zinc-900/90 pl-11 pr-10 py-3 text-xs font-medium text-white placeholder-zinc-500 border border-zinc-800 focus:border-pink-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="absolute right-3 rounded-full p-1 text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Categories / Tags */}
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2 block">
            Filter by Category
          </label>
          <div className="flex flex-wrap gap-2">
            {categoryTags.map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  onSelectTag(tag);
                  onClose();
                }}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold capitalize transition-all ${
                  selectedTag === tag
                    ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-600/30"
                    : "bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800"
                }`}
              >
                {tag === "All" ? "🔥 All Live Streams" : `#${tag}`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
