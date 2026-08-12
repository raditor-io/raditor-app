import { FeedTabs } from "@/components/feeds/feed-tabs";
import { requireOrgContext } from "@/services/org";
import { listFeeds } from "@/services/feed";

export default async function FeedsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireOrgContext();
  const feeds = await listFeeds();

  return (
    <div className="mx-auto w-full max-w-6xl">
      <FeedTabs
        feeds={feeds.map((feed) => ({ id: feed.id, name: feed.name }))}
        isAdmin={ctx.isAdmin}
      />
      <div className="mt-5">{children}</div>
    </div>
  );
}
