import { IconBrandGithub } from "@tabler/icons-react";
import Link from "next/link";

import { listAssignedEditorIds } from "@/services/editor";
import { getProject } from "@/services/project";
import { listSubscribedSourceIds } from "@/services/source";

export const metadata = { title: "Overview | Raditor" };

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return null;

  const [sourceIds, editorIds] = await Promise.all([
    listSubscribedSourceIds(id),
    listAssignedEditorIds(id),
  ]);

  return (
    <div className="max-w-3xl">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Open suggestions" value="0" />
        <StatCard label="Subscribed sources" value={String(sourceIds.length)} />
        <StatCard label="Assigned editors" value={String(editorIds.length)} />
      </div>

      <section className="mt-6 rounded-lg border border-border bg-surface p-5">
        <h2 className="text-sm font-medium text-foreground">Deploy target</h2>
        {project.deploy_repo_full_name ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-muted">
            <IconBrandGithub size={16} stroke={1.75} />
            {project.deploy_repo_full_name}
            <span className="text-faint">
              ({project.deploy_base_branch}, {project.deploy_pr_mode} mode)
            </span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">
            No repository configured yet.{" "}
            <Link
              href={`/projects/${id}/settings`}
              className="text-accent hover:underline"
            >
              Set the deploy target
            </Link>
          </p>
        )}
        <p className="mt-2 text-sm text-faint">
          Site type: {project.site_type.replace("_", " ")} · Cadence:{" "}
          {project.suggestion_interval}, max{" "}
          {project.max_suggestions_per_interval} suggestions per interval
        </p>
      </section>

      {sourceIds.length === 0 || editorIds.length === 0 ? (
        <section className="mt-4 rounded-lg border border-dashed border-border-strong bg-surface p-5 text-sm text-muted">
          <p className="font-medium text-foreground">Finish the setup:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {sourceIds.length === 0 ? (
              <li>
                <Link
                  href={`/projects/${id}/settings`}
                  className="text-accent hover:underline"
                >
                  Subscribe a source
                </Link>{" "}
                so the radar has something to watch.
              </li>
            ) : null}
            {editorIds.length === 0 ? (
              <li>
                <Link
                  href={`/projects/${id}/editors`}
                  className="text-accent hover:underline"
                >
                  Assign an editor
                </Link>{" "}
                to evaluate signals and draft suggestions.
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
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
