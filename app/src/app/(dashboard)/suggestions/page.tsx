import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Suggestions | Raditor" };

export default function SuggestionsPage() {
  return (
    <EmptyState
      title="No suggestions yet"
      description="When the radar detects signals in your sources, editor agents propose evidence-backed content updates here for review."
      phaseNote="The radar arrives in Phase 3"
    />
  );
}
