import { IconBrandGithub, IconPlus, IconWorld } from "@tabler/icons-react";
import Link from "next/link";

import { requireOrgContext } from "@/services/org";
import { listProjects } from "@/services/project";

export const metadata = { title: "Projects | Raditor" };

/** Org home: the project selection screen (Vercel-style). */
export default async function ProjectsPage() {
  const ctx = await requireOrgContext();
  const projects = await listProjects();

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">
          A project binds a repository, a purpose, goals, and policies.
          Editors propose content updates for it.
        </p>
        {ctx.isAdmin ? (
          <Link
            href="/projects/new"
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-white hover:bg-accent-deep"
          >
            <IconPlus size={16} stroke={2} />
            New project
          </Link>
        ) : null}
      </div>

      {projects.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border-strong bg-surface p-10 text-center">
          <h2 className="text-base font-medium text-foreground">
            No projects yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Create your first project to connect a repository and let the
            radar scan for signals.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="rounded-lg border border-border bg-surface p-5 transition-colors hover:border-border-strong"
            >
              <div className="flex items-center gap-2">
                <IconWorld size={18} stroke={1.75} className="text-muted" />
                <span className="truncate text-sm font-medium text-foreground">
                  {project.display_name}
                </span>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-faint">
                <IconBrandGithub size={14} stroke={1.75} />
                {project.deploy_repo_full_name ?? "no repository yet"}
              </p>
              <p className="mt-1 text-xs capitalize text-faint">
                {project.site_type.replace("_", " ")} ·{" "}
                {project.suggestion_interval} cadence
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
