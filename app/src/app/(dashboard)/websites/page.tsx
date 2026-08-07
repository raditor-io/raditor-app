import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Websites | Raditor" };

export default function WebsitesPage() {
  return (
    <EmptyState
      title="No websites yet"
      description="A website binds a GitHub deploy target, a purpose, goals, and policies. Editor agents propose content updates for it."
      phaseNote="Website creation arrives in Phase 2"
    />
  );
}
