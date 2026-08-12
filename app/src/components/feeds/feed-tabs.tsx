"use client";

/**
 * The feeds home tab bar: every feed is a tab in the main area; the active
 * tab carries a dot (kebab) menu with Configure and Remove. "+" creates a
 * feed (admins).
 */
import { IconDots, IconRss } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { deleteFeedAction } from "@/app/(dashboard)/feeds/actions";
import { CreateFeedModal } from "@/components/feeds/create-feed-modal";

export interface FeedTab {
  id: string;
  name: string;
}

export function FeedTabs({
  feeds,
  isAdmin,
}: {
  feeds: FeedTab[];
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const activeFeedId =
    pathname.match(/^\/feeds\/([^/]+)/)?.[1] ?? null;

  return (
    <div className="flex items-center gap-1 border-b border-border">
      {feeds.map((feed) => {
        const isActive = feed.id === activeFeedId;
        return (
          <div
            key={feed.id}
            className={`flex items-center rounded-t-md border-b-2 ${
              isActive
                ? "border-accent bg-surface"
                : "border-transparent hover:bg-hover"
            }`}
          >
            <Link
              href={`/feeds/${feed.id}`}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm ${
                isActive
                  ? "font-medium text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <IconRss size={15} stroke={1.75} className="shrink-0" />
              <span className="max-w-40 truncate">{feed.name}</span>
            </Link>
            {isActive && isAdmin ? (
              <FeedTabMenu feedId={feed.id} feedName={feed.name} />
            ) : null}
          </div>
        );
      })}
      {isAdmin ? <CreateFeedModal trigger="tab" /> : null}
      {feeds.length === 0 && !isAdmin ? (
        <p className="px-3 py-2 text-sm text-faint">
          No feeds yet. An admin can create one.
        </p>
      ) : null}
    </div>
  );
}

function FeedTabMenu({
  feedId,
  feedName,
}: {
  feedId: string;
  feedName: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const removeFormRef = useRef<HTMLFormElement>(null);

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

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={`Feed menu for ${feedName}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`mr-1 flex size-6 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-foreground ${isOpen ? "bg-hover text-foreground" : ""}`}
      >
        <IconDots size={15} stroke={1.75} />
      </button>
      {isOpen ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              router.push(`/feeds/${feedId}/settings`);
            }}
            className="flex w-full cursor-pointer items-center rounded-md px-2.5 py-2 text-left text-sm text-muted transition-colors hover:bg-hover hover:text-foreground"
          >
            Configure
          </button>
          <form action={deleteFeedAction} ref={removeFormRef}>
            <input type="hidden" name="feed_id" value={feedId} />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                if (
                  window.confirm(
                    `Remove the feed "${feedName}"? Its subscriptions and items are deleted; signals stay on their radars.`,
                  )
                ) {
                  removeFormRef.current?.requestSubmit();
                }
                setIsOpen(false);
              }}
              className="flex w-full cursor-pointer items-center rounded-md px-2.5 py-2 text-left text-sm text-accent-deep transition-colors hover:bg-hover"
            >
              Remove
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
