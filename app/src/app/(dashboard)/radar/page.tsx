import { IconRadar2 } from "@tabler/icons-react";

import { EmptyState } from "@/components/empty-state";
import { listProjects } from "@/services/project";
import { listEvaluations, listSignals } from "@/services/radar";

export const metadata = { title: "Radars | Raditor" };

const EVAL_LABELS: Record<string, string> = {
  pending: "pending",
  deferred: "deferred (cadence)",
  skipped_irrelevant: "skipped",
  suggested: "suggested",
  failed: "failed",
};

/** Org-level radar: the signal stream and its fan-out across projects. */
export default async function RadarPage() {
  const signals = await listSignals();

  if (signals.length === 0) {
    return (
      <EmptyState
        title="The radar is quiet"
        description="Observed signals from your connected sources appear here, with their evidence, clustering, and which projects they fan out to."
        phaseNote="Push, merge, or release in a watched repo to see the first signal"
      />
    );
  }

  const [projects, evaluations] = await Promise.all([
    listProjects(),
    listEvaluations({ signalIds: signals.map((s) => s.id) }),
  ]);
  const projectNames = Object.fromEntries(
    projects.map((p) => [p.id, p.display_name]),
  );

  return (
    <div className="max-w-3xl space-y-2">
      {signals.map((signal) => {
        const signalEvaluations = evaluations.filter(
          (e) => e.signal_id === signal.id,
        );
        return (
          <div
            key={signal.id}
            className="rounded-lg border border-border bg-surface px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2.5">
                <IconRadar2
                  size={18}
                  stroke={1.75}
                  className="mt-0.5 shrink-0 text-muted"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {signal.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">
                    {signal.summary_md}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-xs text-faint">
                {new Date(signal.created_at).toLocaleString()}
              </span>
            </div>
            {signalEvaluations.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5 pl-7">
                {signalEvaluations.map((evaluation) => (
                  <span
                    key={evaluation.id}
                    className="rounded-full border border-border px-2 py-0.5 text-xs text-muted"
                  >
                    {projectNames[evaluation.project_id] ?? "project"}:{" "}
                    {EVAL_LABELS[evaluation.status] ?? evaluation.status}
                    {evaluation.relevance_score !== null
                      ? ` (${evaluation.relevance_score})`
                      : ""}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 pl-7 text-xs text-faint">
                No subscribed project with an assigned editor yet.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
