import { EmptyState } from "@/components/empty-state";
import { SuggestionList } from "@/components/suggestions/suggestion-list";
import { listSuggestions } from "@/services/suggestion";

export const metadata = { title: "Content | Raditor" };

export default async function ProjectContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const suggestions = await listSuggestions({ projectId: id });

  if (suggestions.length === 0) {
    return (
      <EmptyState
        title="No content activity yet"
        description="Suggestions for this project appear here once the radar picks up signals and an assigned editor proposes updates."
        phaseNote="Waiting for the first signal"
      />
    );
  }

  return (
    <div className="max-w-3xl">
      <SuggestionList suggestions={suggestions} />
    </div>
  );
}
