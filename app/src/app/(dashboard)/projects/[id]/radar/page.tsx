import { IconRadar2 } from "@tabler/icons-react";
import Link from "next/link";

import { CreateRadarModal } from "@/components/radars/create-radar-modal";
import { serverClient } from "@/lib/supabase/server";
import { requireOrgContext } from "@/services/org";
import {
  listAvailableRepos,
  listEvaluations,
  listRadars,
} from "@/services/radar";

export const metadata = { title: "Radars | Raditor" };

const EVAL_STYLES: Record<string, string> = {
  suggested: "text-success border-success/40",
  pending: "text-muted border-border",
  deferred: "text-accent border-accent/40",
  skipped_irrelevant: "text-faint border-border",
  failed: "text-accent-deep border-accent-deep/40",
};

export default async function ProjectRadarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireOrgContext();
  const [radars, evaluations] = await Promise.all([
    listRadars(id),
    listEvaluations({ projectId: id }),
  ]);
  const availableRepos = ctx.isAdmin
    ? await listAvailableRepos().catch(() => [])
    : [];
  const repoOptions = availableRepos.map((repo) => ({
    value: `${repo.githubInstallationId}::${repo.fullName}`,
    label: repo.fullName,
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <section>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted">
            Radars watch their targets for this project and turn what they find into
            signals.
          </p>
          {ctx.isAdmin ? (
            <CreateRadarModal projectId={id} repoOptions={repoOptions} />
          ) : null}
        </div>

        {radars.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-border-strong bg-surface p-10 text-center">
            <h2 className="text-base font-medium text-foreground">
              No radars yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Create a radar with a one-sentence directive to start watching
              your repositories (and, from Phase 7, the open web).
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {radars.map((radar) => (
              <li key={radar.id}>
                <Link
                  href={`/projects/${id}/radar/${radar.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-border-strong"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <IconRadar2
                      size={18}
                      stroke={1.75}
                      className="shrink-0 text-muted"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {radar.name}
                      </span>
                      <span className="block truncate text-xs text-faint">
                        {radar.directive_md}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {radar.scan_strategies.map((strategy) => (
                      <span
                        key={strategy}
                        className="rounded-full border border-border px-2 py-0.5 text-xs text-muted"
                      >
                        {strategy.replaceAll("_", " ")}
                      </span>
                    ))}
                    <span className="text-xs text-faint">
                      {radar.last_scanned_at
                        ? `scanned ${new Date(radar.last_scanned_at).toLocaleString()}`
                        : "never scanned"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {evaluations.length > 0 ? (
        <section>
          <h2 className="text-sm font-medium text-foreground">
            Signal evaluations
          </h2>
          <EvaluationList projectId={id} evaluations={evaluations} />
        </section>
      ) : null}
    </div>
  );
}

async function EvaluationList({
  projectId,
  evaluations,
}: {
  projectId: string;
  evaluations: Awaited<ReturnType<typeof listEvaluations>>;
}) {
  const supabase = await serverClient();
  const { data: signals } = await supabase
    .from("signals")
    .select("id, title")
    .in("id", evaluations.map((e) => e.signal_id));
  const signalById = Object.fromEntries((signals ?? []).map((s) => [s.id, s]));

  return (
    <div className="mt-3 space-y-2">
      {evaluations.map((evaluation) => (
        <div
          key={evaluation.id}
          className="rounded-lg border border-border bg-surface px-4 py-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {signalById[evaluation.signal_id]?.title ?? "Signal"}
              </p>
              {evaluation.rationale_md ? (
                <p className="mt-0.5 text-sm text-muted">
                  {evaluation.rationale_md}
                </p>
              ) : null}
              {evaluation.error_message ? (
                <p className="mt-0.5 font-mono text-xs text-accent-deep">
                  {evaluation.error_message}
                </p>
              ) : null}
              {evaluation.suggestion_id ? (
                <Link
                  href={`/projects/${projectId}/content/${evaluation.suggestion_id}`}
                  className="mt-1 inline-block text-sm text-accent hover:underline"
                >
                  View suggestion
                </Link>
              ) : null}
            </div>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${EVAL_STYLES[evaluation.status] ?? "text-muted border-border"}`}
            >
              {evaluation.status.replace("_", " ")}
              {evaluation.relevance_score !== null
                ? ` (${evaluation.relevance_score})`
                : ""}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
