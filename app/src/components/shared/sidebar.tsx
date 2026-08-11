"use client";

/**
 * Scope-aware sidebar nav: org items at org level, project items on
 * /projects/[id]/* (Vercel-style; the nav binds to the selected project).
 */
import {
  IconArrowLeft,
  IconFileText,
  IconLayoutDashboard,
  IconLayoutGrid,
  IconRadar2,
  IconSettings,
  IconUserHexagon,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { activeProjectId } from "@/components/shared/build-crumbs";

const ORG_ITEMS = [
  { href: "/", label: "Projects", icon: IconLayoutGrid },
  { href: "/content", label: "Content", icon: IconFileText },
  { href: "/radar", label: "Radars", icon: IconRadar2 },
  { href: "/editors", label: "Editors", icon: IconUserHexagon },
  { href: "/settings", label: "Settings", icon: IconSettings },
] as const;

function projectItems(projectId: string) {
  const base = `/projects/${projectId}`;
  return [
    { href: base, label: "Overview", icon: IconLayoutDashboard },
    { href: `${base}/content`, label: "Content", icon: IconFileText },
    { href: `${base}/radar`, label: "Radars", icon: IconRadar2 },
    { href: `${base}/editors`, label: "Editors", icon: IconUserHexagon },
    { href: `${base}/settings`, label: "Settings", icon: IconSettings },
  ] as const;
}

export function SidebarNav() {
  const pathname = usePathname();
  const projectId = activeProjectId(pathname);
  const items = projectId ? projectItems(projectId) : ORG_ITEMS;

  return (
    <nav className="flex-1 space-y-0.5 px-3">
      {projectId ? (
        <Link
          href="/"
          className="mb-2 flex items-center gap-2 rounded-md px-3 py-2 text-xs text-faint hover:bg-hover hover:text-foreground"
        >
          <IconArrowLeft size={14} stroke={1.75} className="shrink-0" />
          All projects
        </Link>
      ) : null}
      {items.map((item) => {
        const isActive =
          item.href === pathname ||
          (item.href !== "/" &&
            item.href !== `/projects/${projectId}` &&
            pathname.startsWith(`${item.href}/`)) ||
          pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm ${
              isActive
                ? "bg-hover font-medium text-foreground"
                : "text-muted hover:bg-hover hover:text-foreground"
            }`}
          >
            <item.icon size={18} stroke={1.75} className="shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
