import { requireOrgContext } from "@/services/org";

export default async function OverviewPage() {
  await requireOrgContext();

  return (
    <div>
      <p className="max-w-xl text-sm text-muted">
        Raditor watches your sources for signals and proposes content updates
        for your websites. Start by connecting GitHub under Sources, then
        create a website and assign an editor agent.
      </p>
      <div className="mt-6 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Websites" value="0" />
        <StatCard label="Sources" value="0" />
        <StatCard label="Open suggestions" value="0" />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="text-xs uppercase tracking-wide text-faint">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
