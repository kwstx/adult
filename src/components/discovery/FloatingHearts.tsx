"use client";

import React, { useEffect, useState } from "react";

export interface HeartParticle {
  id: number;
  x: number; // offset in px
  color: string;
  size: number;
  rotation: number;
}

interface FloatingHeartsProps {
  triggerKey: number;
}

const HEART_COLORS = [
  "#ec4899", // pink-500
  "#f43f5e", // rose-500
  "#fb7185", // rose-400
  "#a855f7", // purple-500
  "#f59e0b", // amber-500
  "#ffffff", // white
];

export function FloatingHearts({ triggerKey }: FloatingHeartsProps) {
  const [hearts, setHearts] = useState<HeartParticle[]>([]);

  useEffect(() => {
    if (triggerKey === 0) return;

    // Spawn 1-3 hearts per trigger
    const count = Math.floor(Math.random() * 2) + 1;
    const newHearts: HeartParticle[] = Array.from({ length: count }).map(() => ({
      id: Date.now() + Math.random(),
      x: (Math.random() - 0.5) * 60,
      color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
      size: Math.floor(Math.random() * 12) + 18,
      rotation: (Math.random() - 0.5) * 45,
    }));

    setHearts((prev) => [...prev.slice(-20), ...newHearts]);

    // Clean up older hearts after animation completes
    const timer = setTimeout(() => {
      setHearts((prev) => prev.filter((h) => !newHearts.some((nh) => nh.id === h.id)));
    }, 1800);

    return () => clearTimeout(timer);
  }, [triggerKey]);

  return (
    <div className="pointer-events-none absolute bottom-16 right-4 z-40 h-72 w-28 overflow-hidden">
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="absolute bottom-0 right-6 animate-float-heart transition-opacity"
          style={{
            transform: `translateX(${heart.x}px) rotate(${heart.rotation}deg)`,
            color: heart.color,
            fontSize: `${heart.size}px`,
          }}
        >
          ❤️
        </div>
      ))}
    </div>
  );
}
