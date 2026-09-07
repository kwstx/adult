import { FrontendStateManagementDemo } from "@/components/state-demo/FrontendStateManagementDemo";

export const metadata = {
  title: "Frontend State Management Architecture | AuraLive",
  description:
    "Demonstration of the architectural separation between Local UI State (ephemeral React component memory) and Server State (authoritative backend synchronization, cache invalidation, and SSE reconciliation).",
};

export default function StateDemoPage() {
  return <FrontendStateManagementDemo />;
}
