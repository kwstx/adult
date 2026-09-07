"use client";

import React from "react";
import { ContentPerformanceMetrics } from "@/modules/analytics/types";
import { Video, Image, Lock, ArrowUpRight, CheckCircle2 } from "lucide-react";

interface ContentPerformanceTableProps {
  content: ContentPerformanceMetrics[];
}

export const ContentPerformanceTable: React.FC<ContentPerformanceTableProps> = ({ content }) => {
  return (
    <div className="rounded-3xl bg-zinc-950/80 border border-zinc-800/80 p-6 lg:p-8 space-y-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white">Content Performance & PPV Catalog</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-900 border border-zinc-800 text-zinc-400">
              {content.length} Monetized Assets
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Individual PPV video, photo, and album unlock rates, views, and revenue generated
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800/80 overflow-hidden bg-zinc-950">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-900/80 text-zinc-400 font-bold border-b border-zinc-800 text-[10px] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3.5">Media Asset</th>
              <th className="px-4 py-3.5">Format & Price</th>
              <th className="px-4 py-3.5">Views / Impressions</th>
              <th className="px-4 py-3.5">Total Unlocks</th>
              <th className="px-4 py-3.5">Unlock Conversion %</th>
              <th className="px-4 py-3.5 text-right">Gross Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900 text-zinc-300">
            {content.map((item) => (
              <tr key={item.contentId} className="hover:bg-zinc-900/40 transition-colors">
                {/* Media Asset */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.thumbnailUrl || "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&auto=format&fit=crop&q=80"}
                      alt={item.title}
                      className="h-10 w-14 rounded-xl object-cover ring-1 ring-zinc-800 shrink-0"
                    />
                    <div className="max-w-[260px]">
                      <div className="font-bold text-white truncate">{item.title}</div>
                      <span className="text-[10px] text-zinc-400 font-mono">ID: {item.contentId}</span>
                    </div>
                  </div>
                </td>

                {/* Format & Price */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-300">
                      {item.contentType}
                    </span>
                    <span className="font-mono font-bold text-white">{item.priceCredits} cr</span>
                  </div>
                </td>

                {/* Views */}
                <td className="px-4 py-3.5 font-mono text-zinc-300">
                  {item.totalViews.toLocaleString()} views
                </td>

                {/* Unlocks */}
                <td className="px-4 py-3.5">
                  <div className="font-mono font-bold text-white">
                    {item.totalPurchases.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-zinc-400">paying fans</span>
                </td>

                {/* Conversion Rate */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-400">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    <span>{item.conversionRatePercent}%</span>
                  </div>
                </td>

                {/* Gross Revenue */}
                <td className="px-4 py-3.5 text-right font-mono">
                  <div className="text-sm font-black text-white">{item.grossRevenueCredits.toLocaleString()} cr</div>
                  <div className="text-[10px] text-zinc-400">€{(item.grossRevenueCredits / 100).toFixed(2)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
