"use client";

import React, { useState, useEffect } from "react";
import { Users, Crown, Sparkles, ChevronRight } from "lucide-react";
import { FanPublicStatus } from "@/types/fan-status";
import { FanStatusBadge } from "./FanStatusBadge";
import { FAN_STATUS_STYLES } from "@/modules/relationship/fan-status.service";

interface LiveRoomFanStatusHUDProps {
  creatorId: string;
  isCreator: boolean;
  onSelectFan: (fan: FanPublicStatus) => void;
  className?: string;
}

export function LiveRoomFanStatusHUD({
  creatorId,
  isCreator,
  onSelectFan,
  className = "",
}: LiveRoomFanStatusHUDProps) {
  const [activeFans, setActiveFans] = useState<FanPublicStatus[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/live/${creatorId}/audience-status`)
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success && Array.isArray(payload.data)) {
          setActiveFans(payload.data);
        }
      })
      .catch(() => {});
  }, [creatorId]);

  if (activeFans.length === 0) return null;

  return (
    <div className={`select-none ${className}`}>
      {/* Sleek Mini-Bar: Shows active high-value fans */}
      <div className="flex items-center gap-1.5 p-1 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-1 pl-2 pr-1 text-[10px] font-bold text-zinc-400">
          <Users className="h-3 w-3 text-pink-400" />
          <span className="hidden sm:inline">Loyal Patrons</span>
        </div>

        {/* Fan Avatar Pills */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none max-w-[220px] sm:max-w-[320px]">
          {activeFans.map((fan) => {
            const style = FAN_STATUS_STYLES[fan.tier];
            return (
              <button
                key={fan.userId}
                onClick={() => onSelectFan(fan)}
                className={`group flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full border transition-all hover:scale-105 active:scale-95 ${style.bgClass} ${style.borderClass}`}
                title={`${fan.displayName} - ${style.label}`}
              >
                <div className="relative">
                  <img
                    src={fan.avatarUrl}
                    alt={fan.displayName}
                    className="h-5 w-5 rounded-full object-cover ring-1 ring-white/10"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 text-[8px] leading-none">
                    {style.symbol}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-zinc-200 truncate max-w-[65px] group-hover:text-white">
                  {fan.displayName}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
