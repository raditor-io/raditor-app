import { IconBrandGithub } from "@tabler/icons-react";
import { notFound } from "next/navigation";

import { RepoSelect } from "@/components/github/repo-select";
import { ActionForm } from "@/components/shared/action-form";
import { INPUT_CLASSES, LABEL_CLASSES } from "@/components/shared/form-styles";
import { requireOrgContext } from "@/services/org";
import {
  getRadar,
  listAvailableRepos,
  listScans,
  listTargets,
  SCAN_STRATEGIES,
  ACTIVE_SCAN_STRATEGIES,
} from "@/services/radar";

import {
  addRepoTargetAction,
  removeTargetAction,
  updateRadarAction,
} from "../actions";

export const metadata = { title: "Radar | Raditor" };

export default async function RadarDetailPage({
  params,
}: {
  params: Promise<{ id: string; radarId: string }>;
}) {
  const { id, radarId } = await params;
  const ctx = await requireOrgContext();
  const radar = await getRadar(radarId);
  if (!radar || radar.project_id !== id) notFound();

  const [targets, scans] = await Promise.all([
    listTargets(radarId),
    listScans(radarId),
  ]);
  const availableRepos = ctx.isAdmin
    ? await listAvailableRepos().catch(() => [])
    : [];
  const targetRepoNames = new Set(
    targets.map((t) => t.github_repo_full_name).filter(Boolean),
  );
  const repoOptions = availableRepos
    .filter((repo) => !targetRepoNames.has(repo.fullName))
    .map((repo) => ({
      value: `${repo.githubInstallationId}::${repo.fullName}`,
      label: repo.fullName,
    }));

  return (
    <div className="max-w-2xl space-y-4">
      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Radar settings
        </h2>
        {ctx.isAdmin ? (
          <ActionForm action={updateRadarAction} requireDirty>
            <input type="hidden" name="project_id" value={id} />
            <input type="hidden" name="radar_id" value={radar.id} />
            <label className="block">
              <span className={LABEL_CLASSES}>Name</span>
              <input
                name="name"
                defaultValue={radar.name}
                required
                maxLength={120}
                className={INPUT_CLASSES}
              />
            </label>
            <label className="block">
              <span className={LABEL_CLASSES}>
                Directive (what to watch and why it matters)
              </span>
              <textarea
                name="directive_md"
                defaultValue={radar.directive_md}
                required
                rows={4}
                className={INPUT_CLASSES}
              />
            </label>
            <label className="block">
              <span className={LABEL_CLASSES}>Scan interval (minutes)</span>
              <input
                type="number"
                name="scan_interval_minutes"
                defaultValue={radar.scan_interval_minutes}
                min={5}
                max={10080}
                className={INPUT_CLASSES}
              />
            </label>
            <fieldset>
              <legend className={LABEL_CLASSES}>Scan strategies</legend>
              <div className="space-y-1.5 text-sm text-muted">
                {SCAN_STRATEGIES.map((strategy) => {
                  const isActive = ACTIVE_SCAN_STRATEGIES.includes(strategy);
                  return (
                    <label
                      key={strategy}
                      className={`flex items-center gap-1.5 ${isActive ? "" : "opacity-50"}`}
                    >
                      <input
                        type="checkbox"
                        name={`strategy_${strategy}`}
                        defaultChecked={radar.scan_strategies.includes(strategy)}
                        disabled={!isActive}
                      />
                      {strategy.replaceAll("_", " ")}
                      {isActive ? "" : " — arrives in Phase 7"}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </ActionForm>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="text-foreground">{radar.name}</p>
            <p className="text-muted">{radar.directive_md}</p>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">Radar targets</h2>
        {targets.length === 0 ? (
          <p className="text-sm text-faint">
            No targets. The directive alone will drive AI briefing scans from
            Phase 7; add a repository to receive its events now.
          </p>
        ) : (
          <ul className="space-y-2">
            {targets.map((target) => (
              <li
                key={target.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                  <IconBrandGithub
                    size={16}
                    stroke={1.75}
                    className="shrink-0 text-muted"
                  />
                  <span className="truncate">
                    {target.github_repo_full_name ?? target.target_kind}
                  </span>
                </span>
                {ctx.isAdmin ? (
                  <form action={removeTargetAction}>
                    <input type="hidden" name="project_id" value={id} />
                    <input type="hidden" name="radar_id" value={radar.id} />
                    <input type="hidden" name="target_id" value={target.id} />
                    <button
                      type="submit"
                      className="text-xs text-accent-deep hover:underline"
                    >
                      Remove
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {ctx.isAdmin ? (
          <div className="mt-4 border-t border-border pt-4">
            <ActionForm action={addRepoTargetAction} submitLabel="Add target">
              <input type="hidden" name="project_id" value={id} />
              <input type="hidden" name="radar_id" value={radar.id} />
              <label className="block">
                <span className={LABEL_CLASSES}>Add a repository target</span>
                <RepoSelect
                  name="repo_choice"
                  options={repoOptions}
                  placeholder="Select a repository"
                  returnTo={`/projects/${id}/radar/${radar.id}`}
                  required
                />
              </label>
            </ActionForm>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Recent scans
        </h2>
        {scans.length === 0 ? (
          <p className="text-sm text-faint">
            No scans yet. Scans run on the interval, or immediately when
            events arrive from a target.
          </p>
        ) : (
          <ul className="space-y-2">
            {scans.map((scan) => {
              const stats = (scan.stats ?? {}) as Record<string, unknown>;
              return (
                <li
                  key={scan.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm"
                >
                  <span className="min-w-0">
                    <span className="text-foreground">
                      {new Date(scan.started_at).toLocaleString()}
                    </span>
                    <span className="ml-2 text-xs text-faint">
                      {scan.trigger === "target_events"
                        ? "event-triggered"
                        : "interval"}{" "}
                      · {Number(stats.events_consumed ?? 0)} events ·{" "}
                      {Number(stats.outputs_created ?? 0)} outputs ·{" "}
                      {Number(stats.evaluations_enqueued ?? 0)} evaluations
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${
                      scan.status === "succeeded"
                        ? "border-success/40 text-success"
                        : scan.status === "failed"
                          ? "border-accent-deep/40 text-accent-deep"
                          : "border-border text-muted"
                    }`}
                  >
                    {scan.status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
