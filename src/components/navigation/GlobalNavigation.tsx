"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { DesktopNavRail } from "./DesktopNavRail";
import { CreatorNavRail } from "./CreatorNavRail";
import { MobileBottomNav } from "./MobileBottomNav";

export function GlobalNavigation() {
  const pathname = usePathname();
  const isCreatorArea = pathname.startsWith("/creator");

  return (
    <>
      {/* Desktop Navigation Rails (Fixed Left, w-[72px]) */}
      {isCreatorArea ? <CreatorNavRail /> : <DesktopNavRail />}

      {/* Mobile Bottom Navigation (Fixed Bottom, h-14) */}
      <MobileBottomNav />
    </>
  );
}
