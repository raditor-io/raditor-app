import { RepoSelect } from "@/components/github/repo-select";
import { ActionForm } from "@/components/shared/action-form";
import { INPUT_CLASSES, LABEL_CLASSES } from "@/components/shared/form-styles";
import { SITE_TYPES } from "@/lib/schemas/project-config";
import { requireOrgContext } from "@/services/org";
import { listAvailableRepos } from "@/services/radar";

import { createProjectAction } from "./actions";

export const metadata = { title: "New project | Raditor" };

export default async function NewProjectPage() {
  const ctx = await requireOrgContext();
  const availableRepos = ctx.isAdmin
    ? await listAvailableRepos().catch(() => [])
    : [];

  if (!ctx.isAdmin) {
    return (
      <p className="max-w-md rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        Creating projects requires the admin role.
      </p>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="rounded-lg border border-border bg-surface p-6">
        <ActionForm action={createProjectAction} submitLabel="Create project">
          <label className="block">
            <span className={LABEL_CLASSES}>Project name</span>
            <input
              name="display_name"
              required
              maxLength={120}
              className={INPUT_CLASSES}
              placeholder="Acme Docs"
            />
          </label>
          <label className="block">
            <span className={LABEL_CLASSES}>Site type</span>
            <select name="site_type" defaultValue="general" className={INPUT_CLASSES}>
              {SITE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={LABEL_CLASSES}>Repository (deploy target + source)</span>
            <RepoSelect
              name="repo_choice"
              options={availableRepos.map((repo) => ({
                value: `${repo.githubInstallationId}::${repo.fullName}::${repo.defaultBranch}`,
                label: repo.fullName,
              }))}
              placeholder="Choose later"
              returnTo="/projects/new"
            />
          </label>
        </ActionForm>
      </div>
    </div>
  );
}
