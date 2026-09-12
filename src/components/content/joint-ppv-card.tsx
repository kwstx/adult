"use client";

import React, { useState } from "react";
import { Lock, Unlock, Play, ShieldCheck, Users, Sparkles, AlertCircle } from "lucide-react";

export interface JointCoStarUI {
  creatorProfileId: string;
  stageName: string;
  avatarUrl?: string | null;
  role: string;
  splitPercentage: number;
  is2257Verified: boolean;
}

export interface JointPPVCardProps {
  id: string;
  title: string;
  description?: string | null;
  priceCredits: number;
  previewUrl?: string | null;
  mediaDurationSeconds?: number | null;
  is2257Compliant: boolean;
  coCreators: JointCoStarUI[];
  isUnlocked?: boolean;
  userWalletBalance?: number;
  onUnlockSuccess?: (purchaseResult: any) => void;
}

export function JointPPVCard({
  id,
  title,
  description,
  priceCredits,
  previewUrl,
  mediaDurationSeconds,
  is2257Compliant,
  coCreators,
  isUnlocked = false,
  userWalletBalance = 0,
  onUnlockSuccess,
}: JointPPVCardProps) {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const durationFormatted = mediaDurationSeconds
    ? `${Math.floor(mediaDurationSeconds / 60)}:${(mediaDurationSeconds % 60).toString().padStart(2, "0")}`
    : "HD Video";

  const handleUnlock = async () => {
    if (userWalletBalance < priceCredits) {
      setError(`Insufficient balance. You need ${priceCredits} credits, but have ${userWalletBalance}.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/content/joint-ppv/${id}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to unlock Joint PPV.");
      }

      setUnlocked(true);
      if (onUnlockSuccess) {
        onUnlockSuccess(data.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl hover:border-purple-500/50 transition-all flex flex-col">
      {/* Thumbnail & Preview */}
      <div className="relative aspect-video bg-neutral-950 flex items-center justify-center overflow-hidden group">
        {previewUrl ? (
          <img src={previewUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-950/40 via-neutral-900 to-black flex items-center justify-center">
            <Play className="w-12 h-12 text-purple-400 opacity-60 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {/* 2257 Verified Compliance Seal */}
        <div className="absolute top-3 left-3 flex items-center space-x-1.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-500/40 shadow-lg text-emerald-400 text-[11px] font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>2257 Verified</span>
        </div>

        {/* Duration / Status Pill */}
        <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full border border-neutral-700 text-neutral-300 text-xs font-mono">
          {durationFormatted}
        </div>

        {/* Locked Overlay if not purchased */}
        {!unlocked && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-neutral-900/90 border border-neutral-700 flex items-center justify-center text-white shadow-xl">
              <Lock className="w-5 h-5 text-purple-400" />
            </div>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-purple-400 font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>JOINT COLLABORATION PPV</span>
          </div>
          <h4 className="text-white font-bold text-base line-clamp-1">{title}</h4>
          {description && <p className="text-neutral-400 text-xs line-clamp-2 mt-1">{description}</p>}
        </div>

        {/* Co-Stars Avatars and Distribution */}
        <div className="space-y-1.5 pt-1 border-t border-neutral-800">
          <span className="text-[11px] font-semibold text-neutral-400 flex items-center space-x-1">
            <Users className="w-3 h-3 text-cyan-400" />
            <span>Featuring Co-Stars ({coCreators.length})</span>
          </span>
          <div className="flex items-center space-x-2">
            {coCreators.map((c) => (
              <div key={c.creatorProfileId} className="flex items-center space-x-1.5 bg-neutral-950 px-2 py-1 rounded-lg border border-neutral-800 text-xs">
                {c.avatarUrl ? (
                  <img src={c.avatarUrl} alt={c.stageName} className="w-4 h-4 rounded-full object-cover" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center text-[9px] text-white font-bold">
                    {c.stageName.substring(0, 1)}
                  </div>
                )}
                <span className="text-neutral-200 text-[11px] font-medium truncate max-w-[80px]">{c.stageName}</span>
                <span className="text-purple-300 font-mono text-[10px]">{(c.splitPercentage * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Unlock Action Button & Pricing */}
        <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
          <div className="flex items-baseline space-x-1">
            <span className="text-lg font-black text-white font-mono">{priceCredits.toLocaleString()}</span>
            <span className="text-xs font-semibold text-purple-400">CR</span>
            <span className="text-[10px] text-neutral-500 ml-1">≈ €{(priceCredits / 100).toFixed(2)}</span>
          </div>

          {unlocked ? (
            <button
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold"
              disabled
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlocked</span>
            </button>
          ) : (
            <button
              onClick={handleUnlock}
              disabled={loading}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 transition-all active:scale-95 disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{loading ? "Unlocking..." : `Unlock for ${priceCredits} CR`}</span>
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center space-x-1 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/50 p-2 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
