"use client";

import React from "react";
import { FanslyReelViewer } from "@/components/fansly/FanslyReelViewer";

export default function DiscoverPage() {
  return (
    <div className="fixed inset-0 z-0 bg-black pb-14 lg:pb-0 lg:pl-[72px]">
      <FanslyReelViewer />
    </div>
  );
}
