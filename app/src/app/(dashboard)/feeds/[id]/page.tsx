import { IconRss } from "@tabler/icons-react";
import { notFound } from "next/navigation";

import { ListParamSelect } from "@/components/shared/list-controls";
import {
  ListEmpty,
  ListFooter,
  ListHeader,
  ListTable,
  ListView,
  type ListColumn,
} from "@/components/shared/list-view";
import { RowMenu, type RowMenuItem } from "@/components/shared/row-menu";
import { parseListParams } from "@/lib/list-params";
import { requireOrgContext } from "@/services/org";
import {
  getFeed,
  listFeedItemKinds,
  listFeedItemsPaged,
} from "@/services/feed";
import { listSubscriptions } from "@/services/subscription";

import { subscribeInAppAction, unsubscribeInAppAction } from "../actions";

export const metadata = { title: "Feed | Raditor" };

interface EvidenceEntry {
  url?: string | null;
  title?: string | null;
}

const COLUMNS: ListColumn[] = [
  { label: "Signal" },
  { label: "Kind", className: "hidden w-36 sm:table-cell" },
  { label: "Occurred", className: "hidden w-48 md:table-cell" },
  { label: "Actions", className: "w-14", isLabelHidden: true },
];

export default async function FeedPage({
  params: routeParams,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await routeParams;
  const ctx = await requireOrgContext();
  const feed = await getFeed(id);
  if (!feed) notFound();

  const params = parseListParams(await searchParams);
  const [{ rows: items, total }, kinds, subscriptions] = await Promise.all([
    listFeedItemsPaged(id, params),
    listFeedItemKinds(id),
    listSubscriptions(id),
  ]);
  const hasOwnInAppSubscription = subscriptions.some(
    (sub) => sub.transport === "in_app" && sub.userId === ctx.user.id,
  );

  return (
    <ListView>
      {feed.description_md ? (
        <p className="mb-3 text-sm text-muted">{feed.description_md}</p>
      ) : null}

      <ListHeader
        searchPlaceholder="Search this feed..."
        params={params}
        filter={
          kinds.length > 0 ? (
            <ListParamSelect
              name="kind"
              value={params.kind}
              ariaLabel="Filter by kind"
              options={[
                { value: "", label: "All kinds" },
                ...kinds.map((kind) => ({
                  value: kind,
                  label: kind.replaceAll("_", " "),
                })),
              ]}
            />
          ) : null
        }
        action={
          <form
            action={
              hasOwnInAppSubscription
                ? unsubscribeInAppAction
                : subscribeInAppAction
            }
            className="shrink-0"
          >
            <input type="hidden" name="feed_id" value={feed.id} />
            <button
              type="submit"
              className="cursor-pointer rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground hover:bg-hover"
            >
              {hasOwnInAppSubscription ? "Unsubscribe" : "Subscribe"}
            </button>
          </form>
        }
      />

      <ListTable columns={COLUMNS}>
        {items.length === 0 ? (
          <ListEmpty colSpan={COLUMNS.length}>
            {params.q || params.kind
              ? "No items match your filters."
              : "Nothing in this feed yet. Attach radars in the feed's configuration; new signals land here as items from then on."}
          </ListEmpty>
        ) : (
          items.map((item) => {
            const evidence = Array.isArray(item.signal.evidence)
              ? (item.signal.evidence as EvidenceEntry[])
              : [];
            const menuItems: RowMenuItem[] = [
              {
                label: "Open radar",
                href: `/radars/${item.signal.radar_id}`,
              },
              ...evidence
                .filter((entry) => entry.url)
                .slice(0, 3)
                .map((entry) => ({
                  label: `Source: ${entry.title || entry.url}`,
                  href: entry.url as string,
                  isExternal: true,
                })),
            ];
            return (
              <tr key={item.id} className="transition-colors hover:bg-hover">
                <td className="px-4 py-3">
                  <span className="flex min-w-0 items-start gap-2.5">
                    <IconRss
                      size={16}
                      stroke={1.75}
                      className="mt-0.5 shrink-0 text-muted"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {item.signal.title}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted">
                        {item.signal.summary_md}
                      </span>
                      {evidence.length > 0 ? (
                        <span className="mt-1 flex flex-wrap gap-2">
                          {evidence.slice(0, 3).map((entry, i) =>
                            entry.url ? (
                              <a
                                key={i}
                                href={entry.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="cursor-pointer truncate text-xs text-accent hover:underline"
                              >
                                {entry.title || entry.url}
                              </a>
                            ) : null,
                          )}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </td>
                <td className="hidden px-4 py-3 align-top sm:table-cell">
                  <span className="inline-block max-w-full truncate rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                    {item.signal.kind.replaceAll("_", " ")}
                  </span>
                </td>
                <td className="hidden px-4 py-3 align-top md:table-cell">
                  <time className="block truncate text-xs text-faint">
                    {new Date(item.signal.occurred_at).toLocaleString()}
                  </time>
                </td>
                <td className="py-3 pl-2 pr-3 align-top">
                  <RowMenu
                    label={`Actions for ${item.signal.title}`}
                    items={menuItems}
                  />
                </td>
              </tr>
            );
          })
        )}
      </ListTable>

      <ListFooter
        basePath={`/feeds/${id}`}
        params={params}
        total={total}
        shownCount={items.length}
      />
    </ListView>
  );
}
