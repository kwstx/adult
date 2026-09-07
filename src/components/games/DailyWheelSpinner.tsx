"use client";

import React, { useState, useEffect, useRef } from "react";
import { FreeGamePrizeWedge } from "@/modules/games/types";
import { Sparkles, Trophy } from "lucide-react";

interface DailyWheelSpinnerProps {
  wedges: readonly FreeGamePrizeWedge[];
  isSpinning: boolean;
  targetAngleDegrees?: number;
  spinDurationMs?: number;
  onSpinClick: () => void;
  onSpinComplete: () => void;
  canSpin: boolean;
}

export const DailyWheelSpinner: React.FC<DailyWheelSpinnerProps> = ({
  wedges,
  isSpinning,
  targetAngleDegrees = 0,
  spinDurationMs = 4500,
  onSpinClick,
  onSpinComplete,
  canSpin,
}) => {
  const [currentRotation, setCurrentRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const numWedges = wedges.length;
  const sliceAngle = 360 / numWedges;

  // Trigger rotation when server returns target angle
  useEffect(() => {
    if (isSpinning && targetAngleDegrees > 0 && !isAnimating) {
      setIsAnimating(true);
      setCurrentRotation(targetAngleDegrees);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsAnimating(false);
        onSpinComplete();
      }, spinDurationMs + 200);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isSpinning, targetAngleDegrees, spinDurationMs, isAnimating, onSpinComplete]);

  // Color palette for slices
  const wedgePalette = [
    { bg: "#0284c7", text: "#ffffff", border: "#38bdf8" }, // Blue / Cyan
    { bg: "#e11d48", text: "#ffffff", border: "#fb7185" }, // Rose / Pink
    { bg: "#d97706", text: "#ffffff", border: "#fde047" }, // Gold / Amber
    { bg: "#ea580c", text: "#ffffff", border: "#fdba74" }, // Orange / Fire
    { bg: "#7e22ce", text: "#ffffff", border: "#c084fc" }, // Purple / Violet
    { bg: "#059669", text: "#ffffff", border: "#34d399" }, // Emerald / Mint
    { bg: "#0369a1", text: "#ffffff", border: "#7dd3fc" }, // Sky / Cyan
    { bg: "#c026d3", text: "#ffffff", border: "#f0abfc" }, // Fuchsia / Neon
  ];

  return (
    <div className="relative flex flex-col items-center justify-center select-none py-4">
      {/* Outer Neon Glow Ring */}
      <div className="relative w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-rose-500/20 blur-xl animate-pulse pointer-events-none" />

        {/* Top Fixed Needle / Ticker */}
        <div className="absolute -top-3 z-30 flex flex-col items-center drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
          <div className="w-6 h-8 bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-600 clip-triangle shadow-lg transform rotate-180" />
          <div className="w-3 h-3 rounded-full bg-amber-200 -mt-1 shadow-[0_0_8px_#fde047]" />
        </div>

        {/* Rotating Wheel Container */}
        <div
          className="relative w-full h-full rounded-full border-4 border-zinc-800 shadow-[0_0_40px_rgba(0,0,0,0.9)] overflow-hidden bg-zinc-950"
          style={{
            transform: `rotate(${currentRotation}deg)`,
            transition: isAnimating
              ? `transform ${spinDurationMs}ms cubic-bezier(0.15, 0.9, 0.2, 1.0)`
              : "none",
          }}
        >
          {/* SVG Pie Slices */}
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full transform -rotate-90"
          >
            {wedges.map((wedge, idx) => {
              const startAngle = idx * sliceAngle;
              const endAngle = startAngle + sliceAngle;
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;

              const x1 = 50 + 50 * Math.cos(startRad);
              const y1 = 50 + 50 * Math.sin(startRad);
              const x2 = 50 + 50 * Math.cos(endRad);
              const y2 = 50 + 50 * Math.sin(endRad);

              const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;
              const colors = wedgePalette[idx % wedgePalette.length];

              // Label angle & position
              const midAngle = startAngle + sliceAngle / 2;
              const midRad = (midAngle * Math.PI) / 180;
              const textX = 50 + 32 * Math.cos(midRad);
              const textY = 50 + 32 * Math.sin(midRad);

              return (
                <g key={wedge.id}>
                  <path
                    d={pathData}
                    fill={colors.bg}
                    stroke="#18181b"
                    strokeWidth="0.8"
                    className="transition-colors hover:brightness-110"
                  />
                  {/* Slice Text and Icon */}
                  <g
                    transform={`translate(${textX}, ${textY}) rotate(${midAngle + 90})`}
                  >
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      fontSize="3.8"
                      fontWeight="bold"
                      className="font-sans tracking-tight"
                      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
                    >
                      {wedge.shortLabel}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Perimeter Accent Studs */}
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_6px_#fde047]"
              style={{
                top: "50%",
                left: "50%",
                transform: `rotate(${i * 22.5}deg) translate(0, -${175}px)`,
              }}
            />
          ))}
        </div>

        {/* Center Spin Button & Core Cap */}
        <div className="absolute z-20 flex items-center justify-center">
          <button
            onClick={onSpinClick}
            disabled={!canSpin || isSpinning || isAnimating}
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 font-black uppercase tracking-wider flex flex-col items-center justify-center transition-all duration-300 shadow-[0_0_25px_rgba(0,0,0,0.8)] ${
              canSpin && !isSpinning && !isAnimating
                ? "bg-gradient-to-b from-amber-400 via-amber-500 to-yellow-600 border-amber-300 text-zinc-950 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.6)] cursor-pointer"
                : "bg-zinc-800 border-zinc-700 text-zinc-500 cursor-not-allowed"
            }`}
          >
            <Sparkles className="w-4 h-4 mb-0.5 text-amber-950" />
            <span className="text-xs sm:text-sm font-extrabold leading-none">
              {isSpinning || isAnimating ? "Spinning" : "Free Spin"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
