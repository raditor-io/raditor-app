import { IconBrandGithub } from "@tabler/icons-react";
import { notFound } from "next/navigation";

import { RepoSelect } from "@/components/github/repo-select";
import { ActionForm } from "@/components/shared/action-form";
import { FormField, FormFieldGroup } from "@/components/shared/form-field";
import { INPUT_CLASSES } from "@/components/shared/form-styles";
import { requireOrgContext } from "@/services/org";
import {
  getRadar,
  listAvailableRepos,
  listTargets,
  SCAN_STRATEGIES,
} from "@/services/radar";

import {
  addRepoTargetAction,
  removeTargetAction,
  updateRadarAction,
} from "../../actions";

export const metadata = { title: "Radar settings | Raditor" };

export default async function RadarSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireOrgContext();
  const radar = await getRadar(id);
  if (!radar) notFound();

  const targets = await listTargets(id);
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

  if (!ctx.isAdmin) {
    return (
      <p className="text-sm text-muted">
        Only organization admins can configure radars.
      </p>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Radar settings
        </h2>
        <ActionForm action={updateRadarAction} requireDirty>
          <input type="hidden" name="radar_id" value={radar.id} />
          <FormField label="Name">
            <input
              name="name"
              defaultValue={radar.name}
              required
              maxLength={120}
              className={INPUT_CLASSES}
            />
          </FormField>
          <FormField
            label="Directive"
            description="What to watch and why it matters"
            isMultiline
          >
            <textarea
              name="directive_md"
              defaultValue={radar.directive_md}
              required
              rows={4}
              className={INPUT_CLASSES}
            />
          </FormField>
          <FormField label="Scan interval" description="Minutes">
            <input
              type="number"
              name="scan_interval_minutes"
              defaultValue={radar.scan_interval_minutes}
              min={5}
              max={10080}
              className={INPUT_CLASSES}
            />
          </FormField>
          <FormFieldGroup label="Scan strategies">
            <div className="space-y-1.5 text-sm text-muted">
              {SCAN_STRATEGIES.map((strategy) => (
                <label key={strategy} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    name={`strategy_${strategy}`}
                    defaultChecked={radar.scan_strategies.includes(strategy)}
                  />
                  {strategy.replaceAll("_", " ")}
                </label>
              ))}
            </div>
          </FormFieldGroup>
          <FormFieldGroup
            label="Scan summary signal"
            description="Useful for testing feeds and deliveries: every scan produces a signal, even when nothing new was found."
          >
            <label className="flex items-center gap-1.5 text-sm text-muted">
              <input
                type="checkbox"
                name="emit_scan_summary_as_signal"
                defaultChecked={radar.emit_scan_summary_as_signal}
              />
              Emit every scan summary as a signal
            </label>
          </FormFieldGroup>
        </ActionForm>
      </section>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Radar targets
        </h2>
        {targets.length === 0 ? (
          <p className="text-sm text-faint">
            No targets. The directive alone drives AI briefing scans; add a
            repository to also receive its events.
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
                <form action={removeTargetAction}>
                  <input type="hidden" name="radar_id" value={radar.id} />
                  <input type="hidden" name="target_id" value={target.id} />
                  <button
                    type="submit"
                    className="cursor-pointer text-xs text-accent-deep hover:underline"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 border-t border-border pt-4">
          <ActionForm action={addRepoTargetAction} submitLabel="Add target">
            <input type="hidden" name="radar_id" value={radar.id} />
            <FormField label="Repository target">
              <RepoSelect
                name="repo_choice"
                options={repoOptions}
                placeholder="Select a repository"
                returnTo={`/radars/${radar.id}/settings`}
                required
              />
            </FormField>
          </ActionForm>
        </div>
      </section>
    </div>
  );
}
