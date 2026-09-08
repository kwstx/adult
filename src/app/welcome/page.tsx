"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FanOnboardingFlow } from "@/components/fan-onboarding/FanOnboardingFlow";

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-2 sm:p-6">
      <FanOnboardingFlow
        onCompleted={(creatorId) => {
          if (creatorId) {
            router.push(`/live/${creatorId}`);
          } else {
            router.push("/");
          }
        }}
      />
    </div>
  );
}
