"use client";

/**
 * User section at the bottom of the sidebar: avatar + email row with a
 * three-dot trigger that opens a popover menu above it (account header,
 * settings link, red log-out). Outside-click/Escape dismissal mirrors the
 * switcher popovers.
 */
import { IconDots, IconLogout, IconSettings } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface UserMenuProps {
  userName: string | null;
  userEmail: string | null;
  memberRole: string;
}

function initialsOf(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/[\s._@-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? (parts[1]?.[0] ?? "") : "";
  return `${first}${second}`.toUpperCase();
}

export function UserMenu({ userName, userEmail, memberRole }: UserMenuProps) {
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

  const initials = initialsOf(userName, userEmail);
  const displayName = userName?.trim() || userEmail || "Account";

  return (
    <div className="relative" ref={ref}>
      {isOpen ? (
        <div
          role="menu"
          className="absolute inset-x-0 bottom-full z-50 mb-2 overflow-hidden rounded-lg border border-border bg-surface p-1.5 shadow-lg"
        >
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
              {initials}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium text-foreground">
                  {displayName}
                </span>
                <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] capitalize text-muted">
                  {memberRole}
                </span>
              </span>
              <span className="block truncate text-xs text-muted">
                {userEmail}
              </span>
            </span>
          </div>

          <div className="my-1 border-t border-border" />

          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted transition-colors hover:bg-hover hover:text-foreground"
          >
            <IconSettings size={16} stroke={1.75} className="shrink-0" />
            Organization settings
          </Link>

          <div className="my-1 border-t border-border" />

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-accent-deep transition-colors hover:bg-hover"
            >
              <IconLogout size={16} stroke={1.75} className="shrink-0" />
              Log out
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-hover ${
          isOpen ? "bg-hover" : ""
        }`}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
          {initials}
        </span>
        <span className="min-w-0 flex-1 truncate text-left text-sm text-muted">
          {userEmail}
        </span>
        <IconDots size={16} stroke={1.75} className="shrink-0 text-faint" />
      </button>
    </div>
  );
}
