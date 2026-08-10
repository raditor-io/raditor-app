import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Radar | Raditor" };

export default function ProjectRadarPage() {
  return (
    <EmptyState
      title="The radar is quiet"
      description="Signals that reached this project, their relevance evaluations, involved editors, and deferrals appear here."
      phaseNote="The radar arrives in Phase 3"
    />
  );
}
