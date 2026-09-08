"use client";

import React from "react";
import { CreatorOnboardingFlow } from "@/components/creator-onboarding/CreatorOnboardingFlow";

export default function CreatorOnboardingPage() {
  return (
    <div className="min-h-screen w-full bg-black py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      <CreatorOnboardingFlow />
    </div>
  );
}
