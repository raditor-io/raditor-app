import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Agents | Raditor" };

export default function AgentsPage() {
  return (
    <EmptyState
      title="No editor agents yet"
      description="An editor agent has a persona and serves one or more websites. Start from a preset persona and make it yours."
      phaseNote="Agent creation arrives in Phase 2"
    />
  );
}
