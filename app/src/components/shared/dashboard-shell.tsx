"use client";

/**
 * Dashboard chrome (dodi parent-shell pattern): a persistent left rail on
 * md+ viewports and a hamburger-triggered off-canvas drawer below that.
 * Logo + org-settings gear at the top of the rail, nav in the middle,
 * user info pinned to the bottom. The top bar carries the hamburger
 * (mobile only) and the breadcrumbs.
 */
import {
  IconMenu2,
  IconRadar2,
  IconRss,
  IconSettings,
  IconX,
} from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { UserMenu } from "@/components/shared/user-menu";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Feeds",
    icon: IconRss,
    isActive: (p: string) => p === "/" || p.startsWith("/feeds"),
  },
  {
    href: "/radars",
    label: "Radars",
    icon: IconRadar2,
    isActive: (p: string) => p.startsWith("/radars"),
  },
] as const;

export interface DashboardShellProps {
  organizationName: string;
  memberRole: string;
  userName: string | null;
  userEmail: string | null;
  children: React.ReactNode;
}

export function DashboardShell({
  organizationName,
  memberRole,
  userName,
  userEmail,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Nav-link taps close the drawer via onClick; this covers browser
  // back/forward, which also dismisses the open drawer.
  useEffect(() => {
    const onPopState = () => setIsDrawerOpen(false);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Close the drawer on Escape while it's open.
  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDrawerOpen]);

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      {/* Drawer backdrop (mobile only) */}
      <div
        onClick={() => setIsDrawerOpen(false)}
        aria-hidden
        className={`fixed inset-0 z-[55] bg-black/40 transition-opacity duration-300 md:hidden ${
          isDrawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Sidebar — off-canvas drawer on mobile, persistent rail on md+ */}
      <aside
        className={`fixed inset-y-0 left-0 z-[60] flex w-64 max-w-[84vw] shrink-0 flex-col border-r border-border bg-surface shadow-xl transition-transform duration-300 ${
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        } md:sticky md:top-0 md:z-auto md:h-screen md:w-56 md:translate-x-0 md:shadow-none`}
      >
        {/* Matches the top bar's h-14 so signet + gear center on its midline.
            pl-6 lines the signet up with the nav icons below (nav px-3 +
            link px-3). */}
        <div className="flex h-14 shrink-0 items-center gap-1 pl-6 pr-4">
          <Link
            href="/"
            aria-label="Raditor home"
            onClick={() => setIsDrawerOpen(false)}
            className="flex min-w-0 items-center gap-2.5"
          >
            <Image
              src="/images/raditor-signet.png"
              alt="Raditor"
              width={28}
              height={28}
              priority
              className="block size-7 shrink-0"
            />
            <span className="truncate text-sm font-semibold text-foreground">
              {organizationName}
            </span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {/* Org settings live behind the gear (dodi parent-view position). */}
            <Link
              href="/settings"
              aria-label="Organization settings"
              onClick={() => setIsDrawerOpen(false)}
              className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-foreground"
            >
              <IconSettings size={17} stroke={1.75} />
            </Link>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              aria-label="Close menu"
              className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-hover hover:text-foreground md:hidden"
            >
              <IconX size={17} stroke={1.75} />
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pt-3">
          {NAV_ITEMS.map((item) => {
            const isActive = item.isActive(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsDrawerOpen(false)}
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

        {/* User section pinned to the bottom of the rail */}
        <div className="mt-auto border-t border-border px-2.5 py-2.5">
          <UserMenu
            userName={userName}
            userEmail={userEmail}
            memberRole={memberRole}
          />
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 md:px-6">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open menu"
            className="-ml-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-hover hover:text-foreground md:hidden"
          >
            <IconMenu2 size={20} stroke={1.75} />
          </button>
          <div className="min-w-0 flex-1">
            <Breadcrumbs />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
