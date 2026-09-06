import React from "react";
import { NotificationBenchmarkPanel } from "@/components/notifications/notification-benchmark-panel";
import { Navbar } from "@/components/layout/Navbar";

export const metadata = {
  title: "Notifications Engine & Benchmark | AuraLive",
  description: "High-throughput asynchronous notification infrastructure and background batch processing simulator.",
};

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <NotificationBenchmarkPanel />
      </main>
    </div>
  );
}
