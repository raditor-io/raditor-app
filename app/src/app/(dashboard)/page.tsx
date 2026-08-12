import { redirect } from "next/navigation";

import { CreateFeedModal } from "@/components/feeds/create-feed-modal";
import { requireOrgContext } from "@/services/org";
import { listFeeds } from "@/services/feed";

export const metadata = { title: "Feeds | Raditor" };

/** Org home: the feeds view. Opens the first feed; empty state otherwise. */
export default async function FeedsHomePage() {
  const ctx = await requireOrgContext();
  const feeds = await listFeeds();

  if (feeds.length > 0) {
    redirect(`/feeds/${feeds[0].id}`);
  }

  return (
    <div className="mt-6 rounded-lg border border-dashed border-border-strong bg-surface p-10 text-center">
      <h2 className="text-base font-medium text-foreground">No feeds yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        A feed collects signals from your radars so users, services, and
        agents can subscribe to them.
      </p>
      {ctx.isAdmin ? (
        <div className="mt-4 flex justify-center">
          <CreateFeedModal trigger="button" />
        </div>
      ) : null}
    </div>
  );
}
