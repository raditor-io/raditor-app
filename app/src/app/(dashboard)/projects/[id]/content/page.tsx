import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Content | Raditor" };

export default function ProjectContentPage() {
  return (
    <EmptyState
      title="No content activity yet"
      description="Suggestions for this project, shipped updates, and the content graph appear here once the radar starts proposing."
      phaseNote="Suggestions arrive in Phase 3"
    />
  );
}
