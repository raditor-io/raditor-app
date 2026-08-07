"use client";

/**
 * Top-bar breadcrumbs (dodi-style): organization first, then the section
 * trail from build-crumbs. Crumbs replace per-page content titles. When
 * switchable instances exist (multiple orgs, website detail routes), the
 * relevant crumb gains a switcher popover; with a single org the first crumb
 * simply links home.
 */
import { IconChevronRight } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { buildCrumbs } from "@/components/shared/build-crumbs";

export interface BreadcrumbsProps {
  organizationName: string;
}

export function Breadcrumbs({ organizationName }: BreadcrumbsProps) {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 items-center gap-1.5 text-sm"
    >
      <Link
        href="/"
        className={
          crumbs.length === 0
            ? "truncate font-medium text-foreground"
            : "truncate font-medium text-muted transition-colors hover:text-foreground"
        }
      >
        {organizationName}
      </Link>
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
