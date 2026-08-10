"use client";

/**
 * Top-bar breadcrumbs (dodi-style): organization first, then on project
 * routes the project crumb with a switcher popover, then the section trail
 * from build-crumbs. Crumbs replace per-page content titles.
 */
import {
  IconCheck,
  IconChevronRight,
  IconSwitchVertical,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  useBreadcrumbContext,
  type BreadcrumbProject,
} from "@/components/shared/breadcrumb-context";
import { activeProjectId, buildCrumbs } from "@/components/shared/build-crumbs";

export interface BreadcrumbsProps {
  organizationName: string;
}

export function Breadcrumbs({ organizationName }: BreadcrumbsProps) {
  const pathname = usePathname();
  const { project, projects } = useBreadcrumbContext();
  const crumbs = buildCrumbs(pathname);
  const projectId = activeProjectId(pathname);
  const showProjectCrumb = projectId !== null && project?.id === projectId;
  const isOrgLeaf = crumbs.length === 0 && !showProjectCrumb;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 items-center gap-1.5 text-sm"
    >
      <Link
        href="/"
        className={
          isOrgLeaf
            ? "truncate font-medium text-foreground"
            : "truncate font-medium text-muted transition-colors hover:text-foreground"
        }
      >
        {organizationName}
      </Link>

      {showProjectCrumb ? (
        <div className="flex min-w-0 items-center gap-1.5">
          <IconChevronRight
            size={16}
            stroke={1.75}
            className="shrink-0 text-faint"
          />
          {crumbs.length > 0 ? (
            <Link
              href={`/projects/${project.id}`}
              className="truncate font-medium text-muted transition-colors hover:text-foreground"
            >
              {project.name}
            </Link>
          ) : (
            <span className="truncate font-medium text-foreground">
              {project.name}
            </span>
          )}
          {projects.length > 1 ? (
            <ProjectSwitcher
              projects={projects}
              activeId={project.id}
              pathname={pathname}
            />
          ) : null}
        </div>
      ) : null}

      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <div key={i} className="flex min-w-0 items-center gap-1.5">
            <IconChevronRight
              size={16}
              stroke={1.75}
              className="shrink-0 text-faint"
            />
            {crumb.href && !isLast ? (
              <Link
                href={crumb.href}
                className="truncate font-medium text-muted transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className={
                  isLast
                    ? "truncate font-medium text-foreground"
                    : "truncate font-medium text-muted"
                }
              >
                {crumb.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/**
 * Compact popover that swaps the project id in the current path, keeping the
 * sub-route (so /projects/[id]/radar stays on radar). Outside-click/Escape
 * pattern mirrored from dodi's kid switcher.
 */
function ProjectSwitcher({
  projects,
  activeId,
  pathname,
}: {
  projects: BreadcrumbProject[];
  activeId: string;
  pathname: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  function pick(projectId: string) {
    setIsOpen(false);
    if (projectId === activeId) return;
    router.push(pathname.replace(/(\/projects\/)[^/]+/, `$1${projectId}`));
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Switch project"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`flex size-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-foreground ${isOpen ? "bg-hover text-foreground" : ""}`}
      >
        <IconSwitchVertical size={14} stroke={1.75} />
      </button>
      {isOpen ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          {projects.map((candidate) => {
            const isActive = candidate.id === activeId;
            return (
              <button
                key={candidate.id}
                type="button"
                role="menuitem"
                onClick={() => pick(candidate.id)}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? "font-semibold text-foreground"
                    : "text-muted hover:bg-hover hover:text-foreground"
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{candidate.name}</span>
                {isActive ? (
                  <IconCheck size={16} stroke={2} className="text-accent" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
