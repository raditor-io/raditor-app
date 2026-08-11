import { RepoSelect } from "@/components/github/repo-select";
import { ActionForm } from "@/components/shared/action-form";
import { INPUT_CLASSES, LABEL_CLASSES } from "@/components/shared/form-styles";
import { SITE_TYPES, SUGGESTION_INTERVALS } from "@/lib/schemas/project-config";
import { requireOrgContext } from "@/services/org";
import { getProject } from "@/services/project";
import { listAvailableRepos } from "@/services/radar";

import {
  updateCadenceAction,
  updateDeployAction,
  updateGeneralAction,
  updateUrlMappingAction,
} from "./actions";

export const metadata = { title: "Project settings | Raditor" };

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireOrgContext();
  const project = await getProject(id);
  if (!project) return null;

  // Repo listing needs the GitHub App env + an installation; degrade quietly.
  const availableRepos = await listAvailableRepos().catch(() => []);
  const settingsPath = `/projects/${id}/settings`;

  if (!ctx.isAdmin) {
    return (
      <div className="max-w-2xl space-y-4">
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
          Settings are read-only for your role. Ask an org admin for changes.
        </p>
        <Section title="General">
          <Dl
            rows={[
              ["Name", project.display_name],
              ["Site type", project.site_type],
              ["Cadence", `${project.suggestion_interval}, max ${project.max_suggestions_per_interval}`],
              ["Deploy repo", project.deploy_repo_full_name ?? "not set"],
            ]}
          />
        </Section>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Section title="General">
        <ActionForm action={updateGeneralAction} requireDirty>
          <input type="hidden" name="project_id" value={project.id} />
          <label className="block">
            <span className={LABEL_CLASSES}>Project name</span>
            <input
              name="display_name"
              defaultValue={project.display_name}
              required
              className={INPUT_CLASSES}
            />
          </label>
          <label className="block">
            <span className={LABEL_CLASSES}>Site type</span>
            <select
              name="site_type"
              defaultValue={project.site_type}
              className={INPUT_CLASSES}
            >
              {SITE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={LABEL_CLASSES}>
              Purpose (markdown briefing for the editors)
            </span>
            <textarea
              name="purpose_md"
              defaultValue={project.purpose_md}
              rows={6}
              className={INPUT_CLASSES}
              placeholder="Why does this site exist and what does good look like?"
            />
          </label>
          <label className="block">
            <span className={LABEL_CLASSES}>Do not write about (policies)</span>
            <textarea
              name="do_not_write_md"
              defaultValue={project.do_not_write_md}
              rows={3}
              className={INPUT_CLASSES}
              placeholder="Topics, unreleased features, legal constraints..."
            />
          </label>
        </ActionForm>
      </Section>


      <Section title="Cadence">
        <ActionForm action={updateCadenceAction} requireDirty>
          <input type="hidden" name="project_id" value={project.id} />
          <div className="flex gap-3">
            <label className="block flex-1">
              <span className={LABEL_CLASSES}>Suggestion interval</span>
              <select
                name="suggestion_interval"
                defaultValue={project.suggestion_interval}
                className={INPUT_CLASSES}
              >
                {SUGGESTION_INTERVALS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </label>
            <label className="block flex-1">
              <span className={LABEL_CLASSES}>Max suggestions per interval</span>
              <input
                type="number"
                name="max_suggestions_per_interval"
                defaultValue={project.max_suggestions_per_interval}
                min={1}
                max={50}
                className={INPUT_CLASSES}
              />
            </label>
          </div>
        </ActionForm>
      </Section>

      <Section title="Deploy target">
        <ActionForm action={updateDeployAction} requireDirty>
          <input type="hidden" name="project_id" value={project.id} />
          <label className="block">
            <span className={LABEL_CLASSES}>Repository</span>
            <RepoSelect
              name="repo_choice"
              options={availableRepos.map((repo) => ({
                value: `${repo.githubInstallationId}::${repo.fullName}::${repo.defaultBranch}`,
                label: repo.fullName,
              }))}
              placeholder={
                project.deploy_repo_full_name
                  ? `Keep ${project.deploy_repo_full_name}`
                  : "Select a repository"
              }
              returnTo={settingsPath}
            />
          </label>
          <label className="block">
            <span className={LABEL_CLASSES}>Base branch</span>
            <input
              name="deploy_base_branch"
              defaultValue={project.deploy_base_branch}
              required
              className={INPUT_CLASSES}
            />
          </label>
          <label className="block">
            <span className={LABEL_CLASSES}>
              Path allowlist (one repo-relative folder or glob per line;
              Raditor only ever writes inside these)
            </span>
            <textarea
              name="allowlist_text"
              defaultValue={project.deploy_path_allowlist.join("\n")}
              rows={3}
              className={INPUT_CLASSES}
              placeholder={"content/blog\ndocs/updates"}
            />
          </label>
          <label className="block">
            <span className={LABEL_CLASSES}>PR mode</span>
            <select
              name="deploy_pr_mode"
              defaultValue={project.deploy_pr_mode}
              className={INPUT_CLASSES}
            >
              <option value="direct">
                Direct: branches and PRs in your repo (human-gated)
              </option>
              <option value="fork" disabled>
                Fork-based: PRs from a fork (arrives in Phase 9)
              </option>
            </select>
          </label>
        </ActionForm>
      </Section>

      <Section title="URL mapping">
        <ActionForm action={updateUrlMappingAction} requireDirty>
          <input type="hidden" name="project_id" value={project.id} />
          <label className="block">
            <span className={LABEL_CLASSES}>
              Ordered JSON rules mapping files to URLs (first match wins);
              needed for correct links and sitemaps
            </span>
            <textarea
              name="url_mapping_json"
              defaultValue={JSON.stringify(project.url_mapping_config, null, 2)}
              rows={6}
              className={`${INPUT_CLASSES} font-mono`}
              placeholder='[{"pattern": "content/blog/*.mdx", "url": "/blog/{slug}"}]'
            />
          </label>
        </ActionForm>
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  headerRight,
  children,
}: {
  title: string;
  description?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-muted">{description}</p>
          ) : null}
        </div>
        {headerRight}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Dl({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="space-y-1 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-2">
          <dt className="text-faint">{label}:</dt>
          <dd className="text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
