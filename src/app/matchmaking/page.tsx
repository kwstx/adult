import React from "react";
import { MatchmakingScreen } from "@/components/matchmaking/MatchmakingScreen";

export const metadata = {
  title: "Matchmaking Decision Engine | AuraLive",
  description:
    "Intent-based live matchmaking decision engine. Instantly routes you to live interactive creators, chats, private shows, and VIP lounges.",
};

export default function MatchmakingPage() {
  return <MatchmakingScreen />;
}
