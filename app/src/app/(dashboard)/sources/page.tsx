import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Sources | Raditor" };

export default function SourcesPage() {
  return (
    <EmptyState
      title="No sources connected"
      description="Sources are org-level connections the radar watches, starting with your GitHub repositories. Websites subscribe to the sources they care about."
      phaseNote="GitHub connect arrives in Phase 2"
    />
  );
}
