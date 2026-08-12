"use client";

/**
 * Per-row dot menu for table lists: a right-aligned trigger opening a
 * popover of link items. Server pages pass plain {label, href} items so
 * the props stay serializable across the RSC boundary. Outside-click/
 * Escape dismissal mirrors the feed-tab menu.
 */
import { IconDots } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface RowMenuItem {
  label: string;
  href: string;
  /** Open in a new tab (external links, e.g. evidence sources). */
  isExternal?: boolean;
}

export function RowMenu({
  label,
  items,
}: {
  /** Accessible name for the trigger, e.g. "Actions for Release radar". */
  label: string;
  items: RowMenuItem[];
}) {
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

  if (items.length === 0) return null;

  const itemClasses =
    "block truncate rounded-md px-2.5 py-2 text-sm text-muted transition-colors hover:bg-hover hover:text-foreground";

  return (
    <div className="relative flex justify-end" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`flex size-7 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-foreground ${
          isOpen ? "bg-hover text-foreground" : ""
        }`}
      >
        <IconDots size={16} stroke={1.75} />
      </button>
      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          {items.map((item, i) =>
            item.isExternal ? (
              <a
                key={i}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className={itemClasses}
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={i}
                href={item.href}
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className={itemClasses}
              >
                {item.label}
              </Link>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
