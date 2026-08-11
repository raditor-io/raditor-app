import { EmptyState } from "@/components/empty-state";
import { SuggestionList } from "@/components/suggestions/suggestion-list";
import { listProjects } from "@/services/project";
import { listSuggestions } from "@/services/suggestion";

export const metadata = { title: "Content | Raditor" };

/** Org-level content view: suggestions across all projects. */
export default async function ContentPage() {
  const [suggestions, projects] = await Promise.all([
    listSuggestions(),
    listProjects(),
  ]);

  if (suggestions.length === 0) {
    return (
      <EmptyState
        title="No content activity yet"
        description="Suggestions and shipped updates across all projects appear here. When the radar detects signals, editors propose evidence-backed content updates for review."
        phaseNote="Waiting for the first signal"
      />
    );
  }

  const projectNames = Object.fromEntries(
    projects.map((p) => [p.id, p.display_name]),
  );

  return (
    <div className="max-w-3xl">
      <SuggestionList suggestions={suggestions} projectNames={projectNames} />
    </div>
  );
}
