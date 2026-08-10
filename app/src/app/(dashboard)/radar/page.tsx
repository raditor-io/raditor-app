import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Radar | Raditor" };

/** Org-level radar view: the signal stream across all sources and projects. */
export default function RadarPage() {
  return (
    <EmptyState
      title="The radar is quiet"
      description="Observed signals from your connected sources appear here, with their evidence, clustering, and which projects they fan out to."
      phaseNote="The radar arrives in Phase 3"
    />
  );
}
