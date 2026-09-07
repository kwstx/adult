import React from "react";
import { CreatorCrmDashboard } from "@/components/creator-crm/CreatorCrmDashboard";

export const metadata = {
  title: "Creator Fan CRM & Audience Intelligence | Platform",
  description: "Private audience relationship management, 10-cohort segmentation, and targeted retention campaigns.",
};

export default function CreatorCrmPage() {
  return (
    <main className="min-h-screen bg-black text-white pt-4 pb-16">
      <CreatorCrmDashboard />
    </main>
  );
}
