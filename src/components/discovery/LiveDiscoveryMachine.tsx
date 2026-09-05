"use client";

import React from "react";
import { LiveFeedSlidingWindow } from "./LiveFeedSlidingWindow";
import { DiscoveryFeed } from "./DiscoveryFeed";

interface LiveDiscoveryMachineProps {
  initialCreatorId?: string;
}

export function LiveDiscoveryMachine({ initialCreatorId }: LiveDiscoveryMachineProps) {
  return <LiveFeedSlidingWindow initialCreatorId={initialCreatorId} />;
}

export { DiscoveryFeed, LiveFeedSlidingWindow };
