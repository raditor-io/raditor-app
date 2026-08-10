import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Content | Raditor" };

/** Org-level content view: suggestions and shipped work across all projects. */
export default function ContentPage() {
  return (
    <EmptyState
      title="No content activity yet"
      description="Suggestions and shipped updates across all projects appear here. When the radar detects signals, editors propose evidence-backed content updates for review."
      phaseNote="Suggestions arrive in Phase 3"
    />
  );
}
